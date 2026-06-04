# Review Agent 🤖

### Plataforma de Code Review Inteligente Baseada em Skills e OpenCode

O **Review Agent** é uma ferramenta universal para revisão automática de código em Pull Requests (PRs). Ele atua como um **orquestrador leve** que integra o ambiente de CI/CD (GitHub Actions) com a engine local de IA **OpenCode**.

Toda a inteligência de revisão, análise de contexto e regras são definidas através de **Skills** (arquivos Markdown na pasta `.skills/`) e configuradas por um arquivo YAML na raiz do seu projeto.

---

## 🚀 Filosofia de Design e Decisões Arquiteturais

Na versão 2.0, o Review Agent passou por uma profunda simplificação técnica com foco em robustez, manutenibilidade e delegação inteligente.

### 1. O OpenCode é o Revisor

A IA do **OpenCode** possui acesso completo ao workspace do projeto durante a execução. Ela é capaz de rodar `git diff`, abrir arquivos adicionais para entender dependências, imports, documentações e testes. Portanto, o Review Agent **não possui analisadores de código, detectores de linguagem ou analisadores de diff**. Toda a inteligência de revisão pertence ao OpenCode.

### 2. Validação Híbrida de Coordenadas (Ajuste Técnico Importante)

Para evitar falhas na API do GitHub ao tentar criar comentários inline em linhas não modificadas ou inexistentes, o Review Agent inclui o componente `DiffCoordinateValidator`. Ele obtém as linhas adicionadas ou de contexto modificadas no diff:

- Primeiro tenta consultar o **Git local** (altamente eficiente e independente de rede).
- Caso falhe (por exemplo, devido a um checkout raso/shallow clone em CI), faz uma requisição de fallback à **API do GitHub** (`pulls.listFiles`).
- Qualquer achado da IA em linhas fora do diff é omitido dos comentários inline, mas mantido no sumário Markdown consolidado do PR.

### 3. Estatísticas Calculadas no Wrapper

Embora o OpenCode possa tentar gerar estatísticas de ocorrências por severidade, as IAs podem falhar em contas simples. O Review Agent calcula localmente a contagem de ocorrências por severidade (`critical`, `high`, `medium`, `low`, `info`) a partir da lista de findings, garantindo consistência estatística de 100% no relatório final.

### 4. Transação Única com `createReview`

Em vez de disparar dezenas de requisições de comentários individuais (que podem causar bloqueios de rate limit e flood de e-mails/notificações para o desenvolvedor), o publicador agrupa o resumo Markdown e todos os comentários inline validados em uma única submissão atômica usando a API `pulls.createReview`.

---

## 🗺️ Fluxo de Execução Simplificado

```mermaid
graph TD
    A[Pull Request Criado/Atualizado] --> B[GitHub Action Inicia]
    B --> C[Checkout do Código e Execução do Container]
    C --> D[Review Agent Carrega .review-agent.yml]
    D --> E[Review Agent Inicializa DiffCoordinateValidator]
    E --> F[Review Agent Gera Prompt de Instruções Restritivas]
    F --> G[OpenCode Adapter executa OpenCode CLI com Timeout/Retry]
    G --> H[OpenCode analisa workspace, skills e git diff]
    H --> I[OpenCode cospe findings estruturados em JSON]
    I --> J[Review Agent extrai JSON e valida via Zod]
    J --> K[DiffCoordinateValidator filtra findings fora do diff]
    K --> L[GitHub Publisher submete pulls.createReview em lote]
```

---

## 📁 Estrutura de Diretórios do Projeto

```text
review-agent/
├── src/
│   ├── cli/
│   │   └── index.ts          # CLI com Commander (comandos run, init)
│   ├── core/
│   │   ├── config.ts         # Leitor e validador do arquivo .review-agent.yml
│   │   ├── diff-validator.ts # Validador híbrido de coordenadas do diff (Git + GitHub API)
│   │   ├── prompt.ts         # Gerador de prompt/instruções para o OpenCode
│   │   └── engine.ts         # Coordenador de fluxo (Orquestrador) do Review Agent
│   ├── github/
│   │   └── publisher.ts      # Formatador de Markdown e publicador via API do GitHub
│   ├── models/
│   │   └── types.ts          # Interfaces TypeScript de Findings e ReviewResult
│   └── opencode/
│       └── adapter.ts        # Invocação da CLI do OpenCode com timeout, retry e parser JSON
├── tests/
│   ├── config.test.ts        # Testes de carga de configurações YAML
│   ├── diff-validator.test.ts # Testes de parse do diff e validação de linhas
│   ├── adapter.test.ts       # Testes de retry, timeout e parser de JSON do OpenCode
│   ├── findings.test.ts      # Testes de conformidade do schema Zod de findings
│   └── publisher.test.ts     # Testes de Markdown e cálculo do summary local
├── Dockerfile                # Imagem docker de distribuição (multi-stage)
├── package.json              # Scripts npm e dependências
└── tsconfig.json             # Configuração do TypeScript (ES2022/NodeNext)
```

---

## ⚙️ Arquivo de Configuração `.review-agent.yml`

O arquivo de configuração deve ser mantido na raiz do repositório a ser revisado. Exemplo completo:

```yaml
version: 1

skills:
  path: .skills # Pasta contendo os arquivos Markdown com regras de negócios

review:
  max_findings: 20 # Limite máximo de ocorrências a reportar no PR
  timeoutSeconds: 300 # Tempo limite (em segundos) de execução por tentativa da IA
  maxRetries: 3 # Tentativas automáticas em caso de falha ou timeout do OpenCode

output:
  mode:
    both # Modos aceitos:
    # - 'summary': publica apenas o comentário de resumo geral
    # - 'inline': publica apenas comentários nas linhas afetadas
    # - 'both': publica o resumo e os comentários inline juntos
```

---

## 🛠️ Comandos de Desenvolvimento e Teste

### Instalar Dependências e Compilar

```bash
npm install
npm run build
```

### Executar Testes Unitários (Vitest)

```bash
npm run test
```

---

## 📖 Como Funciona a Execução e Como Configurar no Seu Projeto

### ❓ O Review Agent é uma GitHub Action?

**Sim!** O Review Agent foi projetado para rodar de forma nativa e automática como uma **GitHub Action** (empacotada em uma imagem Docker publicada no GitHub Container Registry - GHCR).

Quando um desenvolvedor abre ou atualiza um Pull Request no seu repositório alvo:

1. O GitHub Actions inicia um workflow.
2. Faz o checkout do código.
3. Invoca o contêiner do **Review Agent** passando o diretório do projeto como volume (`-v $PWD:/workspace`).
4. O Review Agent lê as configurações e regras de dentro do próprio repositório, roda a IA do OpenCode localmente e publica os comentários diretamente no PR.

---

## 🛠️ Como Configurar em Qualquer Repositório Alvo

Para ativar o Review Agent no seu repositório (FastAPI, React, Spring, etc.), você **não precisa rodar comandos de compilação ou instalar Node.js localmente**. Basta criar manualmente os arquivos de configuração abaixo no seu repositório.

### Passo 1: Criar o arquivo de configurações `.review-agent.yml`

Crie este arquivo na **raiz do seu repositório**:

```yaml
version: 1

skills:
  path: .skills # Diretório contendo as regras de negócio

review:
  max_findings: 20 # Limite de descobertas reportadas no PR
  timeoutSeconds: 300 # Tempo limite (segundos) por análise da IA
  maxRetries: 3 # Tentativas adicionais caso a CLI falhe

output:
  mode: both # 'summary' (apenas resumo), 'inline' (apenas inline) ou 'both' (ambos)
```

### Passo 2: Criar a pasta `.skills/` e seus arquivos de regras

Crie a pasta `.skills/` na raiz do seu repositório e adicione arquivos Markdown contendo as diretrizes que a IA deve validar.

**Exemplo: `.skills/architecture.md`**

```markdown
# Regras Arquiteturais

- Funções não devem possuir mais do que 50 linhas de código.
- Arquivos na pasta `controllers` não devem fazer consultas SQL diretas; use a camada de `services` ou ORM.
- Evite acoplamentos desnecessários e favoreça injeção de dependências.
```

**Exemplo: `.skills/security.md`**

```markdown
# Regras de Segurança

- Nunca salve chaves de API, senhas ou tokens expostos em variáveis hardcoded.
- Toda query SQL dinâmica ou vinda de inputs do usuário deve utilizar parâmetros para evitar SQL Injection.
- Sanitize todos os dados recebidos externamente antes de processá-los.
```

### Passo 3: Criar o arquivo do workflow do GitHub Actions

Crie o arquivo `.github/workflows/review-agent.yml` no seu repositório:

```yaml
name: Review Agent

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # IMPORTANTE: Necessário para carregar o histórico de commits para que o diff funcione

      - name: Run Review Agent Action
        run: |
          docker run --rm \
            -v $PWD:/workspace \
            -e GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }} \
            -e GITHUB_REPOSITORY=${{ github.repository }} \
            -e GITHUB_EVENT_PATH=/workspace/${{ github.event_path }} \
            -e GOOGLE_GENERATIVE_AI_API_KEY=${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }} \
            -e OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }} \
            -e ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }} \
            -e OPENCODE_API_URL=${{ secrets.OPENCODE_API_URL }} \
            -e OPENCODE_MODEL=${{ secrets.OPENCODE_MODEL }} \
            ghcr.io/seu-usuario/review-agent:latest
```

---

## 🧪 Como Testar e Desenvolver Localmente (Para Contribuidores)

Se você estiver desenvolvendo ou testando modificações no próprio orquestrador do **Review Agent**, siga os passos abaixo para simular execuções em modo local.

### 1. Compilar o Projeto

```bash
npm run build
```

### 2. Simular Análise (Modo Dry-Run)

Crie um script mock do OpenCode para simular os findings gerados pela IA sem precisar de uma chave de LLM ativa.

Crie o arquivo `mock-opencode.sh` na pasta de testes:

```bash
#!/bin/bash
echo '{
  "findings": [
    {
      "severity": "critical",
      "file": "src/service.ts",
      "line": 4,
      "title": "Chave Exposta",
      "description": "Hardcoded secret encontrada.",
      "suggestion": "Mova a chave para variáveis de ambiente."
    }
  ]
}'
```

Dê permissão de execução: `chmod +x mock-opencode.sh`.

Execute a revisão local simulada:

```bash
OPENCODE_BIN=./mock-opencode.sh node dist/cli/index.js run --dry-run
```

O orquestrador fará o checkout virtual, executará a validação de linhas alteradas contra o git diff local do seu branch atual, calculará as severidades e imprimirá no console a tabela consolidada de descobertas!
