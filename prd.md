# Product Requirement Document (PRD) - Review Agent MVP (Fase 1)

## 1. Visão Geral do Produto
O **Review Agent** é uma plataforma de revisão automática de código para Pull Requests (PRs) executada em ambientes de CI/CD (GitHub Actions), utilizando o **OpenCode** como engine principal de análise de IA. 

O produto é agnóstico a linguagens de programação e frameworks. A inteligência e as regras de revisão são definidas pelo próprio projeto através de **Skills** declaradas em formato Markdown e configuradas por um arquivo YAML na raiz do repositório.

---

## 2. Decisões Arquiteturais Centrais

### 2.1. Exclusividade do OpenCode no MVP
A análise de código será realizada de forma exclusiva pelo OpenCode no MVP.
- **Segurança**: O OpenCode executa localmente dentro do contêiner no GitHub Runner, sendo ideal para repositórios privados.
- **Acesso ao Workspace**: O OpenCode consegue ler arquivos do projeto, analisar imports, dependências e contextos adicionais além do diff isolado do PR.

### 2.2. Distribuição via Docker
O Review Agent será distribuído como uma imagem Docker contendo:
- Node.js 22
- Git
- OpenCode CLI
- Review Agent CLI (TypeScript compiled)

Isso simplifica a instalação no GitHub Actions, dispensando a instalação de dependências e binários complexos no runner host.

---

## 3. Fluxo de Execução

```text
Pull Request (GitHub)
     │
     ▼
GitHub Action (Runner envia segredos e faz checkout)
     │
     ▼
Docker Container (review-agent:latest)
     │
     ├── 1. Lê arquivo de configuração (.review-agent.yml)
     ├── 2. Skill Loader: Carrega regras de .skills/
     ├── 3. Diff Loader: Obtém o patch de git diff origin/main...HEAD
     ├── 4. Context Builder: Gera instruções e contexto para o OpenCode
     ├── 5. OpenCode Adapter: Executa o OpenCode CLI localmente
     ├── 6. Findings Parser: Valida e parseia findings JSON do OpenCode
     └── 7. GitHub Publisher: Publica comentários consolidados no PR
     │
     ▼
GitHub PR (comentários de revisão criados)
```

---

## 4. Requisitos Funcionais

### RF-01: Configuração do Projeto (.review-agent.yml)
- O sistema deve carregar as diretrizes de execução a partir do arquivo `.review-agent.yml` localizado na raiz do projeto.
- Exemplo de estrutura:
  ```yaml
  version: 1
  skills:
    path: .skills
  review:
    max_findings: 20
  output:
    format: github-pr
  ```

### RF-02: Carregamento de Skills (Skill Loader)
- O sistema deve ler os arquivos Markdown de regras (ex: `architecture.md`, `security.md`) do diretório indicado na configuração (padrão: `.skills/`).
- Essas skills serão concatenadas ou indexadas como parte do prompt/diretrizes do orquestrador enviadas ao OpenCode.

### RF-03: Obtenção de Alterações (Diff Loader)
- Deve executar `git diff origin/main...HEAD` via subprocesso assíncrono para identificar a lista de arquivos alterados e obter o conteúdo do diff (patch).

### RF-04: Orquestração e Integração com OpenCode (OpenCode Adapter)
- O Review Agent deve rodar em conjunto com o OpenCode local.
- Ele gera o arquivo de instruções de revisão (incluindo o diff, a lista de skills e o prompt do revisor).
- Invoca o OpenCode CLI passando as instruções de entrada.
- O OpenCode, possuindo acesso completo ao workspace, realiza a análise e cospe as descobertas.

### RF-05: Formato Padronizado de Findings
O Review Agent extrai e valida as descobertas do OpenCode. O formato de saída produzido pela IA deve respeitar o seguinte JSON estrito:
```json
{
  "findings": [
    {
      "severity": "high",
      "file": "src/service.ts",
      "line": 32,
      "title": "Large Function",
      "description": "Function exceeds project conventions.",
      "suggestion": "Split into smaller units."
    }
  ]
}
```
**Severidades permitidas**: `critical`, `high`, `medium`, `low`, `info`.

### RF-06: Publicação no GitHub (GitHub Publisher)
- Lê a variável de ambiente `GITHUB_TOKEN`.
- Publica no Pull Request um comentário de revisão consolidado (Review Summary) listando a quantidade de ocorrências por severidade e uma tabela explicativa dos findings.

---

## 5. Requisitos Não Funcionais

### RNF-01: Linguagem e Runtime
- Código do orquestrador Review Agent desenvolvido em **TypeScript** executando no **Node.js 22+**.

### RNF-02: Performance e Execução Local
- Utilização de `execa` para invocar subprocessos de comandos git e do CLI do OpenCode.
- Parsing e validação de schemas de entrada/saída utilizando a biblioteca `zod`.

### RNF-03: Empacotamento
- O código compilado de TypeScript e as dependências serão empacotados e publicados dentro de um container Docker (ex: no GitHub Container Registry - GHCR).

---

## 6. Estrutura do Projeto Proposta

```text
review-agent/
├── src/
│   ├── cli/
│   │   └── index.ts          # CLI com Commander (opções run, init, validate)
│   ├── core/
│   │   ├── config.ts         # Leitor e validador do .review-agent.yml
│   │   ├── loaders.ts        # SkillLoader e DiffLoader
│   │   ├── context.ts        # ContextBuilder (gerador de prompt/instruções para OpenCode)
│   │   └── engine.ts         # Coordenador de fluxo do Review Agent
│   ├── opencode/
│   │   └── adapter.ts        # Invocação do OpenCode CLI e captura de resultados
│   ├── parsers/
│   │   └── findings.ts       # Validador de findings estruturados usando Zod
│   ├── github/
│   │   └── publisher.ts      # Publicação de comentários na API do GitHub
│   ├── models/
│   │   └── types.ts          # Interfaces e tipos TypeScript de skills, diffs e findings
│   ├── prompts/
│   │   └── templates.ts      # Templates de prompts do revisor
│   └── index.ts
├── tests/
│   ├── config.test.ts
│   ├── loaders.test.ts
│   ├── adapter.test.ts
│   └── publisher.test.ts
├── Dockerfile                # Montagem da imagem com Node + Git + OpenCode + Review Agent
├── package.json
├── tsconfig.json
├── pnpm-lock.yaml
└── README.md
```

---

## 7. Roadmap do Produto

- **MVP (Fase 1)**: Execução local do OpenCode, carregamento de `.skills/`, leitura de `git diff`, parsing do JSON de findings e publicação de um Comentário Geral / Resumo de Review no GitHub PR.
- **Fase 2**: Suporte a Comentários Inline (Threads por linha/arquivo no Pull Request do GitHub).
- **Fase 3**: Classificação inteligente e filtragem de findings repetidos ou falso-positivos.
- **Fase 4**: Categorização de revisões por Skill específica (ex: revisão exclusiva de segurança ou de performance).
- **Fase 5**: Criação de Skill Packs distribuídos (packs pré-prontos para React, Terraform, etc.).


##Resumo do Trabalho Realizado:
Infraestrutura: Configurados os arquivos 

package.json
 (com scripts de dev/test/build) e 

tsconfig.json
 (target ES2022/NodeNext). As dependências foram instaladas com sucesso no ambiente.
Tipos e Schemas: Criados os modelos TypeScript compartilhados em 

types.ts
 e o validador de findings baseado em Zod em 

findings.ts
.
Módulos Core:
Implementada a leitura robusta de configuração do .review-agent.yml em 

config.ts
.
Criados os carregadores de Skills (.skills/*.md) e Diff (com múltiplos fallbacks e git diff parser estruturado) em 

loaders.ts
.
Implementado o compilador de prompts estruturados para o OpenCode em 

context.ts
.
Adapters & Integrações:
Desenvolvido o adaptador do CLI do OpenCode em 

adapter.ts
 (com escrita temporária de arquivo e limpeza no final).
Criado o publicador de comentários no GitHub PR utilizando Octokit em 

publisher.ts
 (com tabelas markdown ricas e fallback para terminal).
CLI & Orquestrador:
Criado o coordenador principal do fluxo em 

engine.ts
.
Implementada a CLI com comandos run e init usando Commander em 

index.ts
.
Dockerfile: Criado o 

Dockerfile
 multi-stage contendo Node 22, Git e o CLI globalmente registrado para distribuição simplificada via contêiner.
Testes e Build:
Escritos 18 testes unitários cobrindo todos os fluxos críticos sob o diretório tests/.
Executados os testes com 100% de sucesso via Vitest.
Executada a compilação do TypeScript com sucesso (npm run build).