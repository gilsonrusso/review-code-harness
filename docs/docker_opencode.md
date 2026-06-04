# Instalação do OpenCode no Docker e Variáveis da LLM

Este documento orienta sobre como embutir a CLI do **OpenCode** dentro da imagem Docker do Review Agent e como configurar a URL de endpoint e a chave de API da LLM (como OpenAI, Anthropic, Gemini, ou servidor local).

---

## 1. Como Inserir o OpenCode na Imagem Docker

Como o OpenCode executa localmente dentro do contêiner, o executável dele precisa estar disponível no PATH global do sistema (`/usr/local/bin/opencode`).

No arquivo [Dockerfile](file:///home/gilson-russo/development/professional/review-code-harness/Dockerfile), você pode estruturar essa instalação de duas maneiras no estágio de execução (`runner`):

### Opção A: Instalação Global via NPM (Adotada por Padrão)
Como o OpenCode oficial é open source e está publicado no registro do NPM sob o nome **`opencode-ai`**, a forma mais recomendada e limpa de disponibilizá-lo é instalando-o globalmente no contêiner com uma versão travada (ex: `1.15.13`):

```dockerfile
# Instala o Git e a CLI do opencode-ai globalmente
RUN apt-get update && apt-get install -y git \
    && npm install -g opencode-ai@1.15.13 \
    && rm -rf /var/lib/apt/lists/*
```
*Isso criará o executável `opencode` no PATH global do Linux automaticamente.*

### Opção B: Copiar um Binário Compilado (Ideal se for nativo em Go/Rust/Python)
Se você estiver utilizando uma versão compilada privada do OpenCode, coloque o executável correspondente na pasta `./bin/opencode` do seu projeto e copie-o durante a build:

```dockerfile
COPY ./bin/opencode /usr/local/bin/opencode
RUN chmod +x /usr/local/bin/opencode
```

---

## 2. Configurando o Provedor de IA (LLM) e Chaves de API

O orquestrador do **Review Agent** não faz chamadas de rede ou conexões diretas aos provedores de inteligência artificial; ele delega a análise e o parsing de código ao **OpenCode**. 

O OpenCode, por sua vez, detecta e lê as credenciais de autenticação diretamente das **variáveis de ambiente** fornecidas ao contêiner Docker.

### 2.1. Variáveis por Provedor de IA

Dependendo de qual IA você deseja utilizar para fazer a revisão do código, configure as seguintes variáveis no seu ambiente ou contêiner:

| Provedor | Variável de Ambiente | Modelos Recomendados |
| :--- | :--- | :--- |
| **Google Gemini** | `-e GOOGLE_GENERATIVE_AI_API_KEY="AIzaSy..."` | `gemini-2.5-pro`, `gemini-2.5-flash` |
| **OpenAI (ChatGPT)** | `-e OPENAI_API_KEY="sk-..."` | `gpt-4o`, `gpt-4-turbo` |
| **Anthropic (Claude)** | `-e ANTHROPIC_API_KEY="sk-ant-..."` | `claude-3-5-sonnet-20240620` |
| **Proxy / Gateway Customizado** | `-e LLM_API_KEY="chave-proxy..."` <br> `-e OPENCODE_API_URL="https://api.empresa.com/v1"` <br> `-e OPENCODE_MODEL="modelo-custom"` | Qualquer modelo mapeado no seu gateway compatível com a API da OpenAI. |

---

## 3. Como Executar e Testar Localmente via Docker

Para validar e testar a imagem Docker com o OpenCode de forma 100% isolada no seu ambiente de desenvolvimento (sem instalar pacotes na sua máquina física):

1. **Faça o build da imagem local** a partir da raiz do `review-code-harness`:
   ```bash
   docker build -t review-agent:local .
   ```

2. **Execute o contêiner no seu repositório pessoal de testes** (ex: FastAPI ou React) passando a pasta do projeto como volume e a chave do seu provedor favorito (exemplo usando o **Gemini**):
   ```bash
   docker run --rm \
     -v $PWD:/workspace \
     -e GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyExemploChave12345" \
     review-agent:local run --dry-run
   ```

   * **`--dry-run`**: Garante que os findings e a tabela markdown de revisão sejam impressos diretamente na saída do terminal do host, sem fazer chamadas externas ou requisições de revisão à API do GitHub.

---

## 4. Execução no GitHub Actions (CI/CD)

No seu pipeline do GitHub Actions, a injeção das variáveis de ambiente é realizada de maneira equivalente, puxando os segredos registrados nas configurações do repositório (`Secrets`):

```yaml
      - name: Run Review Agent Action 🤖
        run: |
          docker run --rm \
            -v $PWD:/workspace \
            -e GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }} \
            -e GITHUB_REPOSITORY=${{ github.repository }} \
            -e GITHUB_EVENT_PATH=/workspace/${{ github.event_path }} \
            -e GOOGLE_GENERATIVE_AI_API_KEY=${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }} \
            ghcr.io/seu-usuario/review-agent:latest
```
