#!/bin/bash
# Script para facilitar a execução local (dry-run) do Review Agent via Docker

# 1. Tenta carregar as variáveis de ambiente do arquivo .env (se existir) de forma portátil
if [ -f .env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    # Ignora comentários e linhas em branco
    if [[ ! "$line" =~ ^# ]] && [[ ! -z "$line" ]]; then
      export "$line"
    fi
  done < .env
fi

# 2. Define o modelo padrão caso não esteja configurado no ambiente
MODEL=${OPENCODE_MODEL:-"google/gemini-2.5-flash"}

# 3. Captura os argumentos passados na execução do script. 
# Se nenhum argumento for passado, o padrão será "run --dry-run --commits 2"
ARGS=${@:-"run --dry-run --commits 2"}

echo "🚀 Iniciando execução local via Docker..."
echo "📦 Modelo: $MODEL"
echo "🔧 Executando: review-agent:local $ARGS"
echo "--------------------------------------------------------"

# 4. Executa o contêiner repassando as variáveis de ambiente
docker run --rm \
  -v "$PWD:/workspace" \
  -e GOOGLE_GENERATIVE_AI_API_KEY="$GOOGLE_GENERATIVE_AI_API_KEY" \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e OPENCODE_API_URL="$OPENCODE_API_URL" \
  -e OPENCODE_MODEL="$MODEL" \
  review-agent:local $ARGS
