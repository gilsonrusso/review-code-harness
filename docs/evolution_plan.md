# Plano de Evolução do Review Agent 🚀

Este documento consolida o plano de desenvolvimento e maturidade do **Review Agent** com base nos recursos do OpenCode e nas escolhas arquiteturais efetuadas.

---

## 🗺️ Roadmap de Evolução Técnica

### Fase 1: Sandboxing e Segurança Operacional (Implementado)
*   **Objetivo**: Garantir que a execução do contêiner em esteiras de CI/CD (Pull Requests) seja 100% segura contra modificações acidentais ou maliciosas no código-fonte do repositório (segurança de escrita).
*   **Ações Concluídas**:
    *   O `OpenCodeAdapter` agora **sempre** intercepta a execução da CLI e força um arquivo `opencode.json` seguro e isolado, contendo:
        ```json
        {
          "share": "disabled",
          "tools": {
            "write": false,
            "edit": false
          }
        }
        ```
    *   Caso o usuário possua um arquivo `opencode.json` customizado na raiz do projeto, o Review Agent realiza um backup temporário em memória RAM, sobrescreve o arquivo com a configuração restritiva e restaura o arquivo original intacto após a conclusão da análise (no bloco `finally`).

---

### Fase 2: Transição para Habilidades Nativas do OpenCode (Implementado)
*   **Objetivo**: Substituir o comportamento de concatenar manualmente regras de negócio no prompt pelo sistema nativo de Habilidades (Skills) sob demanda do OpenCode.
*   **Ações Concluídas**:
    *   Eliminação completa do diretório legada `.skills/` e de qualquer fluxo de concatenação manual no wrapper.
    *   A CLI (`review-agent init`) agora inicializa as regras padrões em formato nativo: `.opencode/skills/frontend-react/SKILL.md` e `.opencode/skills/backend-fastapi/SKILL.md`, contendo cabeçalho frontmatter YAML.
    *   O prompt principal foi atualizado para instruir o OpenCode a usar a tool nativa `skill` para mapear e consumir as Habilidades úteis sob demanda, economizando tokens e otimizando o contexto.

---

### Fase 3: Revisão Híbrida (Linter Local + IA) (Implementado)
*   **Objetivo**: Cruzar análises de analisadores estáticos tradicionais (Linters/Compiladores) com o poder explicativo da IA.
*   **Ações Concluídas**:
    *   A imagem Docker final do Review Agent foi enriquecida com analisadores estáticos prontos para uso:
        *   **Node.js / React / TypeScript**: `eslint` e `typescript` (`tsc` global).
        *   **Python**: `python3`, `pip3`, `venv`, `ruff` (linter/formatter ultra rápido em Rust) e `uv` (gerenciador de dependências de alto desempenho).
    *   **Prompt Híbrido**: O prompt mestre (`src/core/prompt.ts`) foi atualizado com uma diretiva específica encorajando a IA a utilizar sua capacidade de acesso ao terminal (shell) para disparar esses linters/formatadores diretamente no código do PR, baseando assim seus achados (findings) em erros reais de AST/tipagem, e não apenas em análises estáticas contextuais.

---

### Fase 4: Suporte Nativo a Modelos Locais e Enterprise (Longo Prazo)
*   **Objetivo**: Facilitar a adoção do Review Agent em repositórios corporativos privados sem dependência de APIs proprietárias pagas (Gemini/OpenAI).
*   **Ações**:
    *   Expandir as opções do arquivo `.review-agent.yml` para suportar chaves `endpoint` e `provider_options` sob o bloco `review`.
    *   Configurar o Review Agent para mapear automaticamente essas configurações para servidores locais como o **Ollama** ou gateways internos da empresa compatíveis com a OpenAI, mapeando a autenticação de forma transparente.

---

## 💬 Tópicos Concluídos de Discussão
1. **Sandboxing**: Limitação aplicada por padrão e de forma inviolável (substituindo qualquer `opencode.json` temporariamente e restaurando em seguida).
2. **Skills**: Mudança definitiva para a estrutura nativa `.opencode/skills/<name>/SKILL.md`. O processo de conversão manual foi eliminado.
3. **Revisão Híbrida**: Linters e gerenciadores (`eslint`, `typescript`, `ruff`, `uv`) incorporados à imagem básica de execução do Review Agent.
