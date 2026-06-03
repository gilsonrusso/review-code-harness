# Instalação do OpenCode no Docker e Variáveis da LLM

Este documento orienta sobre como embutir a CLI do **OpenCode** dentro da imagem Docker do Review Agent e como configurar a URL de endpoint e a chave de API da LLM (como OpenAI, Anthropic, Gemini, ou servidor local).

---

## 1. Como Inserir o OpenCode na Imagem Docker

Como o OpenCode executa localmente dentro do contêiner, o executável dele precisa estar disponível no path do sistema (`/usr/local/bin/opencode`). 

No arquivo [Dockerfile](file:///home/gilson-russo/development/professional/review-code-harness/Dockerfile), você pode instalar o OpenCode de duas formas no estágio de runtime (`runner`):

### Opção A: Baixar via cURL/Wget durante a build (Recomendado se for público)
No final do seu `Dockerfile` (no estágio `runner`), adicione as linhas para fazer o download do binário correspondente à arquitetura do seu contêiner (geralmente Linux x64):

```dockerfile
# ... (conteúdo anterior do estágio runner)

# Baixa a CLI do OpenCode e torna o executável global
RUN apt-get update && apt-get install -y curl \
    && curl -L https://caminho-para-o-binario-do-opencode/opencode-cli-linux -o /usr/local/bin/opencode \
    && chmod +x /usr/local/bin/opencode \
    && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
```

### Opção B: Copiar um binário pré-baixado (Ideal para binários privados)
Baixe o executável do OpenCode em sua máquina local, coloque-o em uma pasta no seu repositório (ex: `./bin/opencode`) e modifique o `Dockerfile` para copiá-lo para dentro da imagem:

```dockerfile
# ... (estágio runner)

# Copia o binário baixado previamente
COPY ./bin/opencode /usr/local/bin/opencode
RUN chmod +x /usr/local/bin/opencode
```

---

## 2. Onde passar o Endpoint e Token da LLM?

O orquestrador do **Review Agent** não faz chamadas HTTP diretas à LLM; ele delega isso à CLI do **OpenCode**. Por sua vez, o OpenCode lê as credenciais de autenticação diretamente das **variáveis de ambiente** que você passar ao contêiner Docker.

### 2.1. Execução Local via Docker (`docker run`)
Quando for rodar a imagem Docker compilada em sua máquina local para testar, você deve passar o token e o endpoint da sua LLM usando a flag `-e` do Docker.

Exemplo usando **OpenAI** (com endpoint customizado):
```bash
docker run --rm \
  -v $PWD:/workspace \
  -e GITHUB_TOKEN="seu_github_token" \
  -e OPENAI_API_KEY="seu_token_da_openai" \
  -e OPENAI_API_BASE="https://seu-endpoint-customizado-llm.com/v1" \
  -e OPENCODE_MODEL="gpt-4o" \
  review-agent:latest
```

Exemplo usando **OpenCode Gateway / LLM própria**:
Se você tem uma API própria baseada nos padrões OpenAI, passe as variáveis equivalentes:
```bash
docker run --rm \
  -v $PWD:/workspace \
  -e GITHUB_TOKEN="seu_github_token" \
  -e LLM_API_KEY="seu_token_de_acesso_llm" \
  -e OPENCODE_API_URL="https://api.opencode.empresa.com/v1" \
  -e OPENCODE_MODEL="modelo-personalizado" \
  review-agent:latest
```

### 2.2. Execução no GitHub Actions
No GitHub Actions, conforme especificado no arquivo [github_actions.md](file:///home/gilson-russo/development/professional/review-code-harness/docs/github_actions.md), a injeção é configurada na seção `run` da Action puxando os segredos do repositório:

```yaml
      - name: Run Review Agent
        run: |
          docker run --rm \
            -v $PWD:/workspace \
            -e GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }} \
            -e GITHUB_REPOSITORY=${{ github.repository }} \
            -e GITHUB_EVENT_PATH=/workspace/${{ github.event_path }} \
            -e LLM_API_KEY=${{ secrets.LLM_API_KEY }} \
            -e OPENCODE_API_URL=${{ secrets.OPENCODE_API_URL }} \
            -e OPENCODE_MODEL=${{ secrets.OPENCODE_MODEL }} \
            ghcr.io/seu-usuario/review-agent:latest
```
*(Nota: Substitua `LLM_API_KEY` e `OPENCODE_API_URL` pelas variáveis exatas que a CLI do seu OpenCode espera receber)*.
