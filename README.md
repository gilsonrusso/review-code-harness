# Review Agent 🤖

### Plataforma de Code Review Inteligente Baseada em Skills e OpenCode

O **Review Agent** é uma plataforma universal e agnóstica para revisão automática de código em Pull Requests (PRs). Ele utiliza o **OpenCode** como engine local de IA para interpretar e aplicar regras de negócios, restrições arquiteturais e convenções declaradas por você ou pelo seu time através de **Skills** em formato Markdown.

---

## 🚀 Como Funciona a Filosofia do Produto

1. **Agnóstico a Tecnologias**: Não há regras hardcoded sobre React, FastAPI, Spring Boot, etc.
2. **Skills como Fonte da Verdade**: Toda inteligência específica do repositório é descrita em arquivos Markdown dentro de uma pasta configurável (ex: `.skills/`).
3. **Engine Centrada no OpenCode**: A engine roda localmente dentro do ambiente de execução (GitHub Runner / Contêiner Docker), garantindo segurança máxima para repositórios privados e total visibilidade do workspace de arquivos.

---

## 🗺️ Fluxo Geral de Execução

```text
Pull Request (GitHub)
     │
     ▼
GitHub Action (Runner faz checkout e monta volume)
     │
     ▼
Docker Container (review-agent)
     │
     ├── 1. Carrega configurações (.review-agent.yml)
     ├── 2. Carrega diretrizes (.skills/*.md)
     ├── 3. Captura alterações (git diff origin/main...HEAD)
     ├── 4. Constrói contexto / prompt unificado
     ├── 5. Invocação local do OpenCode CLI
     ├── 6. Parser e Validação de Findings (JSON Zod Schema)
     └── 7. Publica comentários e sumário no PR
     │
     ▼
GitHub PR (Feedbacks criados de forma legível e detalhada)
```

---

## 📁 Estrutura de Diretórios do Projeto

```text
review-agent/
├── src/
│   ├── cli/
│   │   └── index.ts          # CLI com Commander (comandos run, init)
│   ├── core/
│   │   ├── config.ts         # Parser de .review-agent.yml
│   │   ├── context.ts        # Gerador de prompt/instruções para OpenCode
│   │   ├── engine.ts         # Coordenador de fluxo do Review Agent
│   │   └── loaders.ts        # Carregador de Skills e Git Diff
│   ├── github/
│   │   └── publisher.ts      # Publicação de comentários (GitHub API)
│   ├── models/
│   │   └── types.ts          # Interfaces e tipos de dados compartilhados
│   ├── opencode/
│   │   └── adapter.ts        # Execução e adapter da CLI do OpenCode
│   └── parsers/
│       └── findings.ts       # Extrator e validador do JSON de descobertas via Zod
├── tests/
│   ├── config.test.ts        # Testes de carga e validação das configurações
│   ├── loaders.test.ts       # Testes de Git Diff e Skill Loader
│   ├── findings.test.ts      # Testes de parsing e validação de JSONs complexos
│   └── ...                   # Testes de adapter e publisher
├── Dockerfile                # Imagem docker de distribuição (multi-stage)
├── package.json              # Scripts e dependências de produção/desenvolvimento
└── tsconfig.json             # Configuração de compilação TypeScript (target Node 22)
```

---

## 🛠️ Comandos de Desenvolvimento e Produção

### 1. Instalar dependências
```bash
npm install
```

### 2. Compilar o projeto (TypeScript -> JavaScript)
```bash
npm run build
```

### 3. Executar testes unitários (Vitest)
```bash
npm run test
```

### 4. Inicializar estrutura do Review Agent em outro projeto
```bash
node dist/cli/index.js init
```

---

## 📖 Documentação Detalhada do Sistema

Para entender os contratos, integrações e como testar, consulte os arquivos markdown dedicados:

- **[Product Requirement Document (PRD)](file:///home/gilson-russo/development/professional/review-code-harness/prd.md)**: Visão do produto, escopo, restrições e roadmap de evolução das próximas fases.
- **[Especificação Técnica (Specs)](file:///home/gilson-russo/development/professional/review-code-harness/specs.md)**: Assinaturas de classes/métodos, modelos de dados, schemas Zod, variáveis de ambiente e mapeamento Docker.
- **[Guia de Instalação no GitHub Actions](file:///home/gilson-russo/development/professional/review-code-harness/docs/github_actions.md)**: Passo a passo de configuração do workflow YAML, segredos do GitHub (Secrets) e chaves da LLM.
- **[Guia de Teste Local e Manual](file:///home/gilson-russo/development/professional/review-code-harness/docs/local_testing.md)**: Passo a passo ilustrado de como simular branches de Pull Request e rodar análises em modo local (`--dry-run`).
- **[Instalação do OpenCode no Docker e Variáveis de LLM](file:///home/gilson-russo/development/professional/review-code-harness/docs/docker_opencode.md)**: Como empacotar o OpenCode dentro do Dockerfile e como passar chaves e endpoints de LLMs customizadas.
