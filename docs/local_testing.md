# Guia de Teste Manual e Local do Review Agent

Este guia orienta detalhadamente como testar localmente o **Review Agent**, separando claramente as ações que devem ser executadas na pasta do **Review Agent** (onde o código da ferramenta foi desenvolvido) e na pasta do **seu projeto alvo** (onde está o código que você deseja revisar, por exemplo, o seu repositório FastAPI/LangChain).

---

## Estrutura de Pastas de Exemplo
Para os fins deste guia, utilizaremos os seguintes caminhos locais de exemplo:
- **Pasta do Review Agent**: `/home/gilson-russo/development/professional/review-code-harness`
- **Pasta do Seu Projeto Alvo**: `/home/gilson-russo/development/personal/assistant-ai-fastapi-langchain/backend`

---

## Parte 1: Preparação do Review Agent (Na pasta do Review Agent)

Antes de testar, precisamos garantir que o código em TypeScript do Review Agent esteja devidamente compilado em JavaScript.

1. **Abra o terminal na pasta do Review Agent**:
   ```bash
   cd /home/gilson-russo/development/professional/review-code-harness
   ```

2. **Compile o projeto**:
   ```bash
   npm run build
   ```
   *Isso gerará a pasta `dist/` contendo o binário executável em `dist/cli/index.js`*.

---

## Parte 2: Preparação do Projeto Alvo (Na pasta do seu Projeto Alvo)

Agora, vamos preparar o seu repositório pessoal de testes para receber o Review Agent.

1. **Abra o terminal na pasta do seu Projeto Alvo**:
   ```bash
   cd /home/gilson-russo/development/personal/assistant-ai-fastapi-langchain/backend
   ```

2. **Garanta que o repositório possua Git inicializado e commits anteriores**:
   Como a nossa ferramenta compara ramos via `git diff`, o repositório precisa ter pelo menos um commit inicial na branch principal (`master` ou `main`).
   ```bash
   git init
   git config user.email "dev@example.com"
   git config user.name "Developer"
   git add .
   git commit -m "feat: commit inicial do código do projeto"
   ```

3. **Inicialize as configurações do Review Agent**:
   Rode o comando `init` do Review Agent de dentro da pasta do seu projeto alvo, apontando para o binário da ferramenta:
   ```bash
   node /home/gilson-russo/development/professional/review-code-harness/dist/cli/index.js init
   ```
   *Esse comando criará automaticamente a pasta `.skills/` (com templates de regras em markdown) e o arquivo de configurações `.review-agent.yml` na raiz do seu projeto alvo*.

4. **Registre as novas configurações no Git**:
   ```bash
   git add .skills/ .review-agent.yml
   git commit -m "chore: adicionar configuracoes do review-agent"
   ```

5. **Crie uma branch e faça uma alteração de código (Simulação de Pull Request)**:
   Mude para uma nova branch de desenvolvimento, faça uma edição e comite-a:
   ```bash
   git checkout -b feature/test-review
   echo "# Comentário de teste para validar o Review Agent" >> main.py
   git add main.py
   git commit -m "feat: adicionar comentarios de teste"
   ```

---

## Parte 3: Executando a Revisão Local (Na pasta do seu Projeto Alvo)

Por fim, vamos simular a execução do revisor utilizando o OpenCode mockado.

1. **Garanta a existência do script simulador do OpenCode**:
   Crie o arquivo `mock-opencode.sh` na raiz do seu **Projeto Alvo** com o conteúdo a seguir:
   ```bash
   #!/bin/bash
   echo '{
     "findings": [
       {
         "severity": "high",
         "file": "main.py",
         "line": 10,
         "title": "Violacao de Regra do FastAPI",
         "description": "Falta validacao de dados no endpoint utilizando pydantic.",
         "suggestion": "Quebre a lógica em schemas estruturados."
       }
     ]
   }'
   ```

2. **Dê permissão de execução ao simulador**:
   ```bash
   chmod +x mock-opencode.sh
   ```

3. **Rode o Review Agent localmente (Modo Dry-Run)**:
   De dentro da pasta do seu **Projeto Alvo**, execute o orquestrador configurando a variável `OPENCODE_BIN` para apontar para o script simulador:
   ```bash
   OPENCODE_BIN=./mock-opencode.sh node /home/gilson-russo/development/professional/review-code-harness/dist/cli/index.js run --dry-run
   ```

4. **Observe os Resultados**:
   O Review Agent irá carregar a configuração local, o diff da branch `master...feature/test-review`, extrairá o JSON mockado do OpenCode e imprimirá o resumo e a tabela Markdown de findings diretamente no seu console!
