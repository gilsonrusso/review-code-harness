# Plano de Evolução do Review Agent 🚀

Este documento propõe um plano de desenvolvimento e maturidade para a nossa ferramenta **Review Agent** com base nos recursos recém-mapeados da documentação oficial do OpenCode.

---

## 🗺️ Roadmap de Evolução Técnica

### Fase 1: Sandboxing e Segurança Operacional (Curto Prazo)
*   **Objetivo**: Garantir que a execução do contêiner em esteiras de CI/CD (Pull Requests) seja 100% segura contra modificações acidentais ou maliciosas no código-fonte do repositório (segurança de escrita).
*   **Ações**:
    *   Configurar o `opencode.json` temporário gerado pelo `OpenCodeAdapter` para conter desativação de ferramentas de escrita:
        ```json
        {
          "tools": {
            "write": false,
            "edit": false
          }
        }
        ```
    *   Validar se o OpenCode continua funcionando perfeitamente em modo de leitura (Read-Only) para a geração de relatórios estruturados.

---

### Fase 2: Transição para Skills Nativas do OpenCode (Médio Prazo)
*   **Objetivo**: Substituir o comportamento de concatenar manualmente regras de negócio no prompt principal (PromptBuilder) pelo sistema nativo de Skills sob demanda do OpenCode.
*   **Ações**:
    *   No início do fluxo, em vez de carregar os arquivos da pasta `.skills/` e injetá-los textualmente nas instruções, o Review Agent copiará as regras para o padrão de descoberta do OpenCode: `.opencode/skills/<nome-da-regra>/SKILL.md`.
    *   O cabeçalho (frontmatter YAML) será gerado automaticamente com o nome da skill e a descrição.
    *   **Benefício**: O OpenCode só lerá as skills de fato úteis para o arquivo/diff sendo analisado através de sua ferramenta interna `skill`, economizando significativamente o uso e custo de tokens de contexto do modelo.

---

### Fase 3: Revisão Híbrida (Linter Local + IA) (Médio Prazo)
*   **Objetivo**: Cruzar análises de analisadores estáticos tradicionais (Linters/Compiladores) com o poder explicativo da IA.
*   **Ações**:
    *   Criar ferramentas customizadas locais (na pasta temporária `.opencode/tools/`) para invocar analisadores estáticos locais no repositório (ex: `eslint`, `pip-audit`, ou `tsc`).
    *   Permitir que a LLM do OpenCode execute essas ferramentas locais, capture o output dos erros estáticos reais e gere sugestões inteligentes baseadas nessas falhas físicas.
    *   **Benefício**: Evita que a IA aponte falsos positivos de tipagem ou sintaxe, focando o relatório em correções tangíveis apontadas pelo próprio linter do projeto.

---

### Fase 4: Suporte Nativo a Modelos Locais e Enterprise (Longo Prazo)
*   **Objetivo**: Facilitar a adoção do Review Agent em repositórios corporativos privados sem dependência de APIs proprietárias pagas (Gemini/OpenAI).
*   **Ações**:
    *   Expandir as opções do arquivo `.review-agent.yml` para suportar chaves `endpoint` e `provider_options` sob o bloco `review`.
    *   Configurar o Review Agent para mapear automaticamente essas configurações para servidores locais como o **Ollama** ou gateways internos da empresa compatíveis com a OpenAI, mapeando a autenticação de forma transparente.

---

## 💬 Tópicos para Discussão
1. **Sandboxing**: Devemos aplicar a limitação de ferramentas de escrita (`write: false`) imediatamente como padrão no Review Agent?
2. **Skills**: A estrutura de pastas `.skills/*.md` atual é mais amigável ao usuário do que criar diretórios `.opencode/skills/name/SKILL.md`. Faz sentido mantermos a configuração simples e o wrapper converter os arquivos sob demanda antes de chamar o OpenCode?
3. **Revisão Híbrida**: Quais ferramentas estáticas (linters) seriam mais valiosas para embutir na imagem de contêiner inicial do Review Agent?
