# Análise do Ecossistema OpenCode 🤖

Este documento consolida o mapeamento técnico da documentação oficial do **OpenCode**, destacando configurações avançadas, provedores suportados, agentes customizados, habilidades (skills) e ferramentas personalizadas, visando subsidiar a evolução do **Review Agent**.

---

## ⚙️ 1. Configurações e Precedência de Carga

O OpenCode utiliza um mecanismo de mesclagem (merge) de configurações baseadas em arquivos JSON/JSONC (JSON com Comentários). Os arquivos de configuração não são totalmente sobrescritos; em vez disso, suas chaves são combinadas, mantendo chaves não conflitantes de camadas inferiores.

### Ordem de Precedência (Carregamento da Base para o Topo)
As fontes de configuração são carregadas na seguinte sequência de prioridade (fontes posteriores sobrescrevem chaves conflitantes de fontes anteriores):

1. **Configuração Remota** (obtida de `.well-known/opencode`) — Padrões organizacionais.
2. **Configuração Global** (`~/.config/opencode/opencode.json`) — Preferências do usuário da máquina host.
3. **Configuração Personalizada** (caminho definido pela variável de ambiente `OPENCODE_CONFIG`) — Substituições manuais.
4. **Configuração do Projeto** (`opencode.json` na raiz do projeto) — Configurações específicas do repositório.
5. **Diretórios `.opencode`** — Pasta local do projeto contendo agentes, comandos e plugins.
6. **Configuração Inline** (conteúdo JSON definido pela variável de ambiente `OPENCODE_CONFIG_CONTENT`) — Substituições dinâmicas de runtime.

> [!NOTE]
> Essa precedência garante que o arquivo `opencode.json` temporário criado pelo Review Agent no workspace tenha prioridade máxima de aplicação em relação a configurações globais ou remotas da máquina que executa o contêiner.

---

## 🔌 2. Provedores e Variáveis de Ambiente

O OpenCode utiliza internamente o **Vercel AI SDK**, sendo compatível com a grande maioria dos provedores LLM de mercado.

### 2.1. Credenciais Dinâmicas (Mapeamento de Variáveis)
Diferente de wrappers que centralizam a chamada de rede, o OpenCode lê as chaves diretamente de variáveis de ambiente do provedor selecionado. Abaixo estão as chaves padrões esperadas:

*   **Google Gemini**: `GOOGLE_GENERATIVE_AI_API_KEY` (modelos prefixados com `google/`)
*   **OpenAI**: `OPENAI_API_KEY` (modelos prefixados com `openai/`)
*   **Anthropic**: `ANTHROPIC_API_KEY` (modelos prefixados com `anthropic/`)
*   **Groq**: `GROQ_API_KEY`
*   **DeepSeek**: `DEEPSEEK_API_KEY`
*   **xAI (Grok)**: `XAI_API_KEY`

### 2.2. Configurações Específicas de Provedor
No arquivo `opencode.json`, cada provedor pode receber configurações adicionais sob a chave `provider`:
```json
{
  "provider": {
    "anthropic": {
      "options": {
        "timeout": 600000,
        "setCacheKey": true
      }
    }
  }
}
```
*   `timeout`: Limite de requisição em milissegundos (padrão de 300.000 ms / 5 minutos). Pode ser definido como `false` para desativar.
*   `setCacheKey`: Força o uso de chaves de cache (útil para otimização de custo/tokens em provedores como a Anthropic).

### 2.3. Amazon Bedrock e Autenticação Corporativa
O Bedrock possui suporte nativo a configurações do ecossistema AWS:
```json
{
  "provider": {
    "amazon-bedrock": {
      "options": {
        "region": "us-east-1",
        "profile": "my-aws-profile",
        "endpoint": "https://bedrock-runtime.us-east-1.vpce-xxxxx.amazonaws.com"
      }
    }
  }
}
```
*   O campo `endpoint` atua como alias para a chave genérica `baseURL`.
*   Chaves e tokens temporários (`AWS_BEARER_TOKEN_BEDROCK`) possuem precedência sobre a autenticação baseada em perfis locais (`~/.aws/credentials`).

---

## 🤖 3. Agentes Especializados (Custom Agents)

O OpenCode permite definir agentes dedicados no arquivo `opencode.json` ou utilizando arquivos Markdown na pasta `.opencode/agents/`.

### Exemplo de Definição de Agente Revisor Restrito:
```jsonc
{
  "agent": {
    "code-reviewer": {
      "description": "Revisa código para melhores práticas e potenciais problemas de segurança",
      "model": "google/gemini-2.5-flash",
      "prompt": "Você é um revisor de código rigoroso. Foque em segurança, performance e manutenibilidade. Apenas aponte problemas reais baseados em diretrizes.",
      "tools": {
        // Desabilita modificações de código durante a revisão
        "write": false,
        "edit": false,
        "bash": false
      }
    }
  },
  "default_agent": "code-reviewer"
}
```

### Oportunidade de Evolução:
*   **Isolamento Sanitário (Sandboxing)**: Ao desativar as ferramentas `write`, `edit` e `bash` na definição do agente de revisão, mitigamos o risco de uma alucinação da LLM tentar modificar arquivos fontes do projeto original durante a execução em pipelines de CI/CD.

---

## 📜 4. Habilidades do Agente (Skills)

As habilidades são conjuntos de instruções Markdown descobertas pelo OpenCode sob demanda através da ferramenta nativa `skill`.

### 4.1. Estrutura do arquivo `SKILL.md`
Cada habilidade é representada por um arquivo `SKILL.md` contido dentro de uma subpasta com o nome correspondente (ex: `.opencode/skills/naming-conventions/SKILL.md`).
O arquivo deve começar obrigatoriamente com o frontmatter YAML abaixo:
```markdown
---
name: naming-conventions
description: Guidelines for naming classes, variables, and components in the project.
license: MIT
compatibility: >=1.0.0
---
# Naming Conventions Rules
- react components must be written in PascalCase.
- utility helper files must use camelCase.
```

### 4.2. Regras de Nomes e Diretórios
*   O campo `name` deve ser estritamente alfanumérico em minúsculas com separadores de hífen simples, casando com a regex `^[a-z0-9]+(-[a-z0-9]+)*$` e com o nome do diretório pai.
*   O campo `description` deve ter entre 1 e 1024 caracteres. O OpenCode usa a descrição para decidir inteligentemente qual habilidade carregar em RAM usando a tool `skill`.

---

## 🛠️ 5. Ferramentas Personalizadas (Custom Tools)

Ferramentas customizadas estendem o OpenCode com capacidades de execução de funções arbitrárias escritas em qualquer linguagem de programação.

### 5.1. Criação e Estrutura
As ferramentas são arquivos TypeScript ou JavaScript localizados em `.opencode/tools/` (do projeto) ou `~/.config/opencode/tools/` (globais). Embora a definição da ferramenta utilize Node.js, ela pode executar scripts externos de Python, Go ou Bash.

```typescript
import { tool } from "@opencode-ai/plugin";

export default tool({
  description: "Executar checagens com eslint no arquivo fornecido",
  args: {
    filePath: tool.schema.string().describe("Caminho do arquivo para rodar linter")
  },
  async execute({ filePath }) {
    // Lógica para executar a CLI do eslint via execa/subprocess
    return "Resultado da execução do linter";
  }
});
```

*   **Identificação**: O nome do arquivo TypeScript define o nome da ferramenta (ex: `eslint.ts` gera a tool `eslint`).
*   **Múltiplas exportações**: Um único arquivo pode exportar múltiplas ferramentas, que serão registradas sob a nomenclatura `<filename>_<exportname>`.

### Oportunidade de Evolução:
*   **Revisões Híbridas (IA + Estática)**: Podemos embutir ferramentas na imagem de execução para que o OpenCode as invoque durante a revisão. Por exemplo, a IA pode rodar o linter localmente no arquivo do diff e analisar os erros apontados pela ferramenta estática para redigir a melhor sugestão corretiva.
