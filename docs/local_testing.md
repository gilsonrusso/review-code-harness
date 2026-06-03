# Guia de Teste Manual e Local do Review Agent

Este guia detalha o passo a passo de como rodar, depurar e testar o **Review Agent** em sua máquina local de forma controlada e sem a necessidade de publicar imagens Docker ou configurar fluxos reais do GitHub.

---

## Próximos Passos & Pré-requisitos

Certifique-se de possuir instalado em sua máquina:
- **Node.js 22+**
- **npm** (ou yarn / pnpm)
- **Git**

---

## Passo 1: Inicialização do Repositório Git Local
O `DiffLoader` necessita de um repositório git ativo e histórico de commits para comparar as alterações. Se o seu projeto de testes ainda não possui o Git inicializado, execute na pasta do projeto:

```bash
git init
git config user.email "dev@example.com"
git config user.name "Developer"
git add .
git commit -m "feat: commit inicial do projeto"
```

---

## Passo 2: Inicializar as Configurações do Review Agent
Utilize o comando `init` exposto pela CLI para gerar as pastas padrão de regras e o arquivo de configuração `.review-agent.yml`:

```bash
npx tsx src/cli/index.ts init
```

Esse comando irá criar:
- A pasta `.skills/` com arquivos markdown de exemplo (`architecture.md` e `security.md`).
- O arquivo de configuração padrão `.review-agent.yml` na raiz.

Adicione e comite as regras geradas no Git:
```bash
git add .skills/ .review-agent.yml
git commit -m "chore: inicializar configuracoes do review-agent"
```

---

## Passo 3: Criar um Diff de Teste (Simular PR)
Crie uma nova branch local e faça uma alteração de código qualquer para simularmos um Pull Request:

```bash
git checkout -b feature/test-review
echo "// Comentário adicionado para testar o diff" >> src/cli/index.ts
git add src/cli/index.ts
git commit -m "feat: fazer alteracao na cli"
```

---

## Passo 4: Criar o Script Simulador do OpenCode
Caso você não possua o binário oficial do OpenCode instalado localmente, crie um script mockup chamado `mock-opencode.sh` na raiz do seu projeto para simular a saída da IA:

```bash
#!/bin/bash
# mock-opencode.sh

echo '{
  "findings": [
    {
      "severity": "high",
      "file": "src/cli/index.ts",
      "line": 15,
      "title": "Função muito extensa",
      "description": "A função action do comando run ultrapassou o limite recomendado pelas regras de arquitetura.",
      "suggestion": "Extraia a lógica interna para uma função auxiliar ou método na classe engine."
    },
    {
      "severity": "critical",
      "file": "src/cli/index.ts",
      "line": 2,
      "title": "Importação insegura",
      "description": "Detectou-se uma dependência importada diretamente sem sanitização.",
      "suggestion": "Certifique-se de que os inputs da CLI sejam estritamente validados com zod."
    }
  ]
}'
```

Dê permissões de execução para o script simulador:
```bash
chmod +x mock-opencode.sh
```

---

## Passo 5: Executar a CLI em Modo Local (Dry-Run)
Para executar a revisão completa e exibir o resumo estruturado e os findings diretamente no seu terminal, sem realizar requisições ou tentar postar comentários na API do GitHub, execute:

```bash
OPENCODE_BIN=./mock-opencode.sh npx tsx src/cli/index.ts run --dry-run
```

### O que esperar no output do terminal:
1. Logs do orquestrador carregando as configurações e as skills Markdown.
2. A invocação do seu script `mock-opencode.sh` simulando a análise.
3. A exibição de um relatório Markdown com tabelas organizando os findings por severidade, arquivos e descrições técnicas.
