# Backlog de Melhorias e Correções: review-code-harness 📋

Este documento lista as tarefas pendentes para estabilizar o Review Agent e torná-lo pronto para produção.

---

## 🔴 Correções Críticas (Prioridade Alta)

- [x] **Task 1: Corrigir a Paginação no `diff-validator.ts`**
  * **Problema**: `pulls.listFiles` recupera apenas até 30 arquivos alterados por padrão.
  * **Ação**: Alterar a chamada do Octokit para usar o `octokit.paginate` em vez de `octokit.rest.pulls.listFiles`.
  * **Arquivo**: [src/core/diff-validator.ts](../src/core/diff-validator.ts)
  * **Complexidade**: Baixa

- [x] **Task 2: Refatorar a Extração de JSON (Resiliência + Remoção de Duplicação)**
  * **Problema**: O parser de JSON baseado no `indexOf('"findings"')` quebra se a IA adicionar preâmbulos com o termo "findings" em aspas. A lógica de extração e validação do Zod está duplicada em `OpenCodeAdapter` e `parseFindings`.
  * **Ação**: 
    1. Mesclar a lógica duplicada. Fazer o `OpenCodeAdapter` reutilizar o `parseFindings` de `findings.ts`.
    2. Melhorar o parser para iterar sobre todos os `{` no texto até encontrar um bloco balanceado que de fato contenha a chave `"findings"`.
  * **Arquivos**: [src/opencode/adapter.ts](../src/opencode/adapter.ts), [src/parsers/findings.ts](../src/parsers/findings.ts)
  * **Complexidade**: Média

- [x] **Task 3: Prevenir a Sujeira de Workspace (`opencode.json` temporário)**
  * **Problema**: Cancelamentos do runner de CI/CD ou travamentos locais impedem a restauração do arquivo `opencode.json` no bloco `finally`, sujando o diretório.
  * **Ação**: Implementar capturas de sinais no processo Node.js (`process.on('SIGINT')`, `process.on('SIGTERM')`) para interceptar abortos e rodar a rotina de cleanup do arquivo `opencode.json`.
  * **Arquivos**: [src/opencode/adapter.ts](../src/opencode/adapter.ts), [src/cli/index.ts](../src/cli/index.ts)
  * **Complexidade**: Média

---

## 🟡 Melhorias de Código e Usabilidade (Prioridade Média)

- [x] **Task 4: Tornar `run-local.sh` Portável para macOS**
  * **Problema**: O uso de `xargs -d '\n'` quebra no macOS.
  * **Ação**: Substituir por um loop nativo de leitura `while read` do Bash para carregar o arquivo `.env`.
  * **Arquivo**: [run-local.sh](../run-local.sh)
  * **Complexidade**: Baixa

- [x] **Task 5: Corrigir Linha `0` no Diff Parser**
  * **Problema**: `parsePatchToLines` adiciona a coordenada `0` no Set de modificações ao ler o cabeçalho do diff (`+++ b/file`).
  * **Ação**: Adicionar uma condicional para só registrar coordenadas se a variável `currentLine > 0` (isto é, somente após entrar no primeiro bloco de hunk `@@`).
  * **Arquivo**: [src/core/diff-validator.ts](../src/core/diff-validator.ts)
  * **Complexidade**: Baixa

- [x] **Task 6: Enriquecer o Prompt com JSON Schema**
  * **Problema**: O prompt atual explica o JSON em texto simples, aumentando o risco de formatação errada ou incompleta pela IA.
  * **Ação**: Atualizar o `buildInstructions` para injetar a especificação formal do JSON Schema correspondente às regras do Zod.
  * **Arquivo**: [src/core/prompt.ts](../src/core/prompt.ts)
  * **Complexidade**: Baixa

---

## 🔒 Segurança (Boas Práticas)

- [x] **Task 7: Documentação de Avisos de Segurança no `README.md`**
  * **Ação**: Adicionar um aviso explícito de segurança desaconselhando o uso do gatilho `pull_request_target` com o Review Agent em repositórios abertos, explicando a possibilidade de vazamento de segredos via injeção de prompt por PRs de forks maliciosos.
  * **Arquivo**: [README.md](../README.md)
  * **Complexidade**: Baixa

---

## 🚀 Evolução e Resiliência de PRs (Próxima Fase)

- [x] **Task 8: Atualização In-place do Resumo de Revisão (Evitar Duplicação)**
  * **Problema**: Cada commit novo enviado ao PR cria um novo comentário de revisão, enchendo a timeline de resumos redundantes.
  * **Ação**: Injetar uma tag HTML oculta (`<!-- review-agent-summary-anchor -->`) no Markdown do resumo e buscar comentários existentes no PR via API do GitHub para editar o resumo anterior em vez de criar um novo.
  * **Arquivo**: [src/github/publisher.ts](../src/github/publisher.ts)
  * **Complexidade**: Baixa-Média

- [x] **Task 9: Deduplicação de Comentários Inline no PR**
  * **Problema**: O bot reenvia comentários inline já existentes ou que o desenvolvedor já resolveu caso o arquivo e linha continuem inalterados no push.
  * **Ação**: Consultar os comentários inline existentes do bot via `octokit.rest.pulls.listReviewComments` e filtrar as ocorrências já relatadas antes de submeter uma nova revisão.
  * **Arquivo**: [src/github/publisher.ts](../src/github/publisher.ts)
  * **Complexidade**: Média

