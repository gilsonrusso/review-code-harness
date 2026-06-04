# --- Estágio 1: Build da Aplicação ---
FROM node:22-slim AS builder

WORKDIR /app

# Copia arquivos de dependência
COPY package.json package-lock.json* ./

# Instala todas as dependências
RUN npm install

# Copia código fonte e configurações
COPY tsconfig.json ./
COPY src/ ./src/

# Compila o TypeScript
RUN npm run build

# --- Estágio 2: Imagem final de Execução ---
FROM node:22-slim AS runner

# Instala Git, Python3, Pip, Venv, e as ferramentas estáticas / gerenciadores globais
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    python3-pip \
    python3-venv \
    && npm install -g opencode-ai@1.15.13 eslint typescript \
    && pip3 install ruff uv --break-system-packages \
    && rm -rf /var/lib/apt/lists/*

# Configura o Git para aceitar qualquer diretório (evita fatal: detected dubious ownership em montagens de volume)
RUN git config --global --add safe.directory '*'

WORKDIR /app

# Copia arquivos de dependências de produção
COPY package.json package-lock.json* ./

# Instala apenas dependências de produção
RUN npm install --omit=dev

# Copia a build do estágio anterior
COPY --from=builder /app/dist ./dist

# Registra o comando globalmente no contêiner
RUN npm link

# Define o workspace padrão como /workspace
WORKDIR /workspace

# Entrypoint padrão executa o review-agent
ENTRYPOINT ["review-agent"]
CMD ["run"]
