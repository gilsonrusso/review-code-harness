# Integração com GitHub Actions e Variáveis de Ambiente

Este guia orienta sobre como configurar o **Review Agent** no repositório do seu projeto utilizando GitHub Actions, incluindo as chaves de API e variáveis necessárias.

---

## 1. Variáveis e Segredos Necessários (Secrets)

Para que o revisor funcione corretamente em ambientes privados e publique comentários no seu Pull Request, você deve configurar os seguintes segredos no painel do seu repositório no GitHub (em **Settings > Secrets and variables > Actions > New repository secret**):

| Nome do Secret | Tipo | Descrição |
| :--- | :---: | :--- |
| `GITHUB_TOKEN` | Automático | Gerado automaticamente pelo GitHub, usado para autenticação na API do GitHub para criar comentários no PR. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Condicional | Chave de API para o Google Gemini (caso use modelos `google/*`). |
| `OPENAI_API_KEY` | Condicional | Chave de API para a OpenAI (caso use modelos `openai/*` ou gateways compatíveis). |
| `ANTHROPIC_API_KEY` | Condicional | Chave de API para a Anthropic (caso use modelos `anthropic/*`). |
| `OPENCODE_API_URL` | Opcional | URL do endpoint personalizado do modelo ou gateway da LLM (caso você utilize um proxy local ou servidor self-hosted). |
| `OPENCODE_MODEL` | Opcional | Identificador do modelo de LLM que o OpenCode executará (ex: `google/gemini-2.5-flash`, `gpt-4o`, `claude-3-5-sonnet`, etc.). |

---

## 2. Exemplo de Workflow do GitHub Actions (`.github/workflows/review.yml`)

Crie um arquivo chamado `.github/workflows/review.yml` na raiz do seu repositório com o conteúdo abaixo:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    name: Skill-Based Review
    runs-on: ubuntu-latest

    steps:
      # 1. Faz o checkout do código completo do PR (incluindo histórico para diffs)
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Necessário para carregar o histórico de branch e gerar git diff

      # 2. Instala dependências do Frontend (essencial para que linters locais como o ESLint encontrem seus módulos)
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json # Ajuste se o package.json estiver na raiz

      - name: Install Frontend Dependencies
        run: |
          cd frontend # Ou a pasta onde está o frontend
          npm ci

      # 3. Executa o contêiner Docker do Review Agent
      - name: Run Review Agent
        run: |
          docker run --rm \
            -v $PWD:/workspace \
            -e GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }} \
            -e GITHUB_EVENT_PATH=/workspace/${{ github.event_path }} \
            -e GITHUB_REPOSITORY=${{ github.repository }} \
            -e GOOGLE_GENERATIVE_AI_API_KEY=${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }} \
            -e OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }} \
            -e ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }} \
            -e OPENCODE_API_URL=${{ secrets.OPENCODE_API_URL }} \
            -e OPENCODE_MODEL=${{ secrets.OPENCODE_MODEL }} \
            ghcr.io/seu-usuario/review-agent:latest
```

> [!IMPORTANT]
> **Por que instalar as dependências antes de rodar o Review Agent?**
> Se o seu repositório possui linters ou analisadores estáticos que dependem de dependências locais (por exemplo, configurações de ESLint que importam `@eslint/js` ou `eslint-plugin-react`), a execução do linter falhará por falta de módulo se a pasta `node_modules` não estiver presente.
> Como a pasta do runner é montada como um volume (`-v $PWD:/workspace`), rodar `npm ci` no runner antes do contêiner garante que todos os módulos locais fiquem acessíveis para as ferramentas executadas pela IA.

---

## 3. Funcionamento Interno no CI/CD
1. O runner do GitHub faz o checkout de toda a estrutura do projeto.
2. O contêiner Docker do **Review Agent** é montado expondo a pasta de trabalho atual como volume no diretório interno `/workspace`.
3. As variáveis e chaves de API (`GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`, etc.) são injetadas no contêiner para que o OpenCode consiga se comunicar com a LLM externa configurada.
4. O comentário de review consolidado é gerado e postado diretamente no Pull Request que disparou a Action.
