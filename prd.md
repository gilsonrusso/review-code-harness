# Review Agent MVP

## Arquitetura Simplificada Baseada em OpenCode

Versão: 2.0

Status: Decisão Arquitetural Oficial

---

# Objetivo

Construir uma ferramenta de revisão automática de Pull Requests utilizando OpenCode como engine principal de análise.

O sistema deve ser simples.

O sistema não deve duplicar responsabilidades já existentes no OpenCode.

O sistema deve aproveitar a capacidade do OpenCode de:

* Navegar no repositório
* Ler arquivos
* Obter diffs
* Compreender contexto
* Aplicar regras
* Produzir findings

---

# Princípio Fundamental

## O OpenCode é o Revisor

O OpenCode deve ser considerado o responsável pela análise.

Ele possui acesso ao workspace completo.

Ele possui capacidade de:

```text
Executar git diff
Abrir arquivos
Buscar referências
Ler documentação
Analisar testes
Compreender contexto
```

Portanto não devemos reconstruir essas capacidades no Review Agent.

---

# O Que NÃO Construiremos

Não implementar:

```text
Diff Parser
Patch Parser
File Classifier
Language Detector
Architecture Analyzer
Security Analyzer
Finding Generator
Context Builder
Rule Engine
```

Motivo:

Tudo isso pode ser executado pelo OpenCode.

Duplicar essas responsabilidades aumenta:

* Complexidade
* Manutenção
* Custo
* Acoplamento

Sem gerar benefícios reais.

---

# Filosofia da Solução

Arquitetura tradicional:

```text
Review Agent
│
├── Diff Parser
├── Skill Loader
├── Context Builder
├── Analyzer
├── Finding Generator
└── GitHub Publisher
```

Arquitetura escolhida:

```text
Review Agent
│
├── Config Loader
├── OpenCode Adapter
└── GitHub Publisher
```

O OpenCode faz todo o trabalho de análise.

---

# Responsabilidades

## Review Agent

Responsável apenas por:

### Configuração

Ler:

```text
.review-agent.yml
```

---

### Execução

Invocar OpenCode.

---

### Integração GitHub

Publicar resultado.

---

### Logging

Registrar execução.

---

## OpenCode

Responsável por:

### Ler Skills

```text
.opencode/skills/
```

---

### Obter Diff

Executar internamente:

```bash
git diff
```

ou qualquer estratégia que julgar adequada.

---

### Navegar Projeto

Abrir:

```text
Arquivos
Diretórios
Testes
Documentação
Dependências
```

---

### Aplicar Regras

Interpretar Skills.

---

### Produzir Findings

Gerar resultado final.

---

# Estrutura do Projeto

```text
review-agent/

src/

├── cli/
│
├── config/
│
├── github/
│
├── opencode/
│
├── models/
│
└── tests/
```

---

# Estrutura do Projeto do Usuário

```text
repository/

├── src/
├── tests/
│
├── .opencode/
│   └── skills/
│       ├── architecture/
│       │   └── SKILL.md
│       └── security/
│           └── SKILL.md
│
└── .review-agent.yml
```

---

# Arquivo de Configuração

Local:

```text
.review-agent.yml
```

Exemplo:

```yaml
version: 1


review:
  max_findings: 20
  timeoutSeconds: 300
  maxRetries: 3

output:
  mode: both
```

---

# Skill System

As Skills são a única fonte de conhecimento específica do projeto.

Exemplo:

```md
# Architecture

- Controllers não devem conter regra de negócio.
- Funções acima de 50 linhas devem ser refatoradas.
- Dependências devem ser injetadas.
```

---

Exemplo:

```md
# Security

- Nunca armazenar segredos no código.
- Validar toda entrada externa.
- Utilizar queries parametrizadas.
```

---

# Fluxo de Execução

## Passo 1

GitHub Action inicia.

```text
Pull Request Aberto
```

---

## Passo 2

Checkout do repositório.

```yaml
- uses: actions/checkout@v4
```

---

## Passo 3

Executar container.

```yaml
docker run review-agent
```

---

## Passo 4

Review Agent inicia.

Carrega:

```text
.review-agent.yml
```

---

## Passo 5

Review Agent monta instrução para OpenCode.

Exemplo:

```text
Você é um Senior Code Reviewer.

Consulte as Habilidades (Skills) registradas no projeto utilizando a ferramenta nativa 'skill' para obter as diretrizes e regras de negócio que devem ser validadas no Pull Request.

Analise exclusivamente o Pull Request atual.

Você possui acesso ao workspace completo.

Retorne EXCLUSIVAMENTE JSON.

Formato obrigatório:

{
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "file": "...",
      "line": 123,
      "title": "...",
      "description": "...",
      "suggestion": "..."
    }
  ]
}

Não produza markdown.

Não produza texto explicativo.

Não produza comentários fora do JSON.
```

---

## Passo 6

OpenCode executa.

O OpenCode decide:

```text
Quais arquivos abrir
Quais testes analisar
Como obter o diff
Como navegar no projeto
```

Nenhuma dessas decisões pertence ao Review Agent.

---

## Passo 7

OpenCode produz resultado.

---

# Formato de Saída

Decisão arquitetural:

Utilizar JSON estruturado.

Exemplo:

```json
{
  "findings": [
    {
      "file": "src/auth.ts",
      "line": 57,
      "severity": "high",
      "title": "Missing Authorization Check",
      "description": "Authorization validation is missing.",
      "suggestion": "Validate permissions before execution."
    }
  ]
}
```

---

# Motivo para Utilizar JSON

Permite:

### Comentário Geral

Gerar automaticamente:

```text
Review Summary

Critical: 1
High: 2
Medium: 3
```

---

### Comentários Inline

GitHub exige:

```text
arquivo
linha
```

Exemplo:

```text
src/auth.ts
linha 57
```

Portanto precisamos de saída estruturada.

Markdown puro não é suficiente para comentários inline.

---

# GitHub Publisher

Responsável por:

### Publicar Resumo

Comentário geral.

---

### Publicar Comentários Inline

Quando existir:

```json
{
  "file": "...",
  "line": ...
}
```

---

# Estratégia de Publicação

## MVP

Publicar:

```text
1 comentário geral
```

e opcionalmente:

```text
Comentários inline apenas para:

critical
high
```

---

# Docker

## Imagem Oficial

```text
ghcr.io/company/review-agent
```

---

## Conteúdo

```text
Node.js 22
Git
OpenCode
Review Agent
```

---

# GitHub Action

Exemplo:

```yaml
name: Review Agent

on:
  pull_request:

jobs:

  review:

    runs-on: ubuntu-latest

    steps:

      - uses: actions/checkout@v4

      - name: Run Review Agent
        run: |
          docker run \
            -v $PWD:/workspace \
            -e GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }} \
            -e OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }} \
            ghcr.io/company/review-agent
```

---

# Roadmap

## MVP

Implementar:

```text
Config Loader
OpenCode Adapter
JSON Output
GitHub Summary Comment
```

---

## V2

Implementar:

```text
Inline Comments
```

---

## V3

Implementar:

```text
Confidence Score
```

Exemplo:

```json
{
  "confidence": 0.93
}
```

---

## V4

Implementar:

```text
Skill Packs
```

Exemplos:

```text
React
NestJS
Go
Terraform
Kubernetes
```

---

# Decisão Final

A arquitetura oficial do produto será:

```text
Review Agent = Orquestrador

OpenCode = Revisor
```

O Review Agent não deve compreender código.

O Review Agent não deve analisar diffs.

O Review Agent não deve gerar findings.

O Review Agent apenas:

```text
Configura
Executa
Recebe Resultado
Publica Resultado
```

Toda a inteligência de revisão pertence ao OpenCode apoiado pelas Skills fornecidas pelo projeto.