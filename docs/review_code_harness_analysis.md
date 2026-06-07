# Relatório de Análise Técnica: review-code-harness 🤖

Este documento apresenta uma análise técnica aprofundada do projeto **review-code-harness** para avaliar a sua viabilidade de uso como produto em produção.

---

## 🎯 Veredito de Prontidão para Produção

> [!WARNING]
> **Status: Beta / MVP (Não recomendado para Produção Imediata)**
>
> Embora o projeto possua uma excelente decisão arquitetural de separar a lógica do orquestrador da IA (usando o OpenCode como motor de análise), utilize validação de coordenadas local para evitar erros no GitHub API e execute comentários agrupados em lote (`pulls.createReview`), ele **não está pronto para produção imediata**. Existem problemas de limite de paginação da API do GitHub, fragilidade no parser de JSON e risco de poluição de workspace local em execuções canceladas.

---

## 🔴 Problemas Críticos Encontrados

### 1. Limitação de Paginação do `pulls.listFiles` no GitHub API
No arquivo [diff-validator.ts](../src/core/diff-validator.ts#L143-L158), a API `octokit.rest.pulls.listFiles` é chamada sem paginação:
```typescript
const { data: files } = await octokit.rest.pulls.listFiles({
  owner: this.gitMetadata.owner,
  repo: this.gitMetadata.repo,
  pull_number: this.gitMetadata.pullNumber
});
```
* **Impacto**: Por padrão, o GitHub pagina a resposta e retorna apenas **30 arquivos**. Se um Pull Request modificar mais de 30 arquivos, os arquivos do 31º em diante não serão catalogados no `changedLinesMap`. Isso fará com que o validador considere todas as linhas desses arquivos como "não modificadas" e **descarte silenciosamente** todos os comentários inline gerados para eles.

### 2. Fragilidade no Parser de JSON ( Brace-Matching por `indexOf` )
A extração de JSON da resposta do OpenCode está implementada de forma idêntica em [adapter.ts](../src/opencode/adapter.ts#L153-L163) e em [findings.ts](../src/parsers/findings.ts#L45-L56). Ela busca `"findings"` (com aspas duplas) para iniciar o mapeamento:
```typescript
const findingsIndex = rawOutput.indexOf('"findings"');
// ...
while (firstBrace !== -1 && firstBrace < findingsIndex) {
```
* **Impacto**: Se a LLM (OpenCode) produzir qualquer texto de introdução livre contendo a palavra `"findings"` com aspas antes de abrir o JSON (ex: `Aqui está o JSON contendo as "findings": ...`), o `findingsIndex` será posicionado no cabeçalho e a busca pela chave `{` falhará (ou truncará), gerando um erro de parsing e interrompendo o fluxo da pipeline no CI/CD.

### 3. Risco de Poluição Física de Workspace (`opencode.json` Sujo)
Em [adapter.ts](../src/opencode/adapter.ts#L80-L142), o orquestrador cria/sobrescreve temporariamente um arquivo `opencode.json` na raiz do projeto para aplicar permissões restritas e restaurá-lo no bloco `finally`.
* **Impacto**: Se o fluxo do GitHub Actions ou a execução local for abortada bruscamente (cancelamento do job pelo usuário, timeout global da pipeline, sinais `SIGKILL` ou `SIGTERM`), o bloco `finally` **nunca será executado**. Isso deixará o arquivo temporário gravado no disco, fazendo com que o desenvolvedor possa cometer o erro de incluir essas credenciais e configurações de sandbox no commit ou perca as configurações originais que tinha localmente.

---

## 🤝 Decisão de Design Alinhada: Prompt Schema + `findings.ts`

Ficou acordada a seguinte estratégia combinada para otimização e estabilização da resposta da IA:

1. **Manter o `findings.ts` como Guardrail Determinístico**:
   * O parser e validador Zod continuam no wrapper. Eles garantem que qualquer instabilidade de formato na resposta final da IA seja barrada antes de disparar requisições para a API do GitHub, prevenindo falhas de integração (`HTTP 422`).
2. **Incluir a Especificação do JSON Schema no Prompt**:
   * O prompt de instruções da IA (`src/core/prompt.ts`) será enriquecido com a especificação formal do JSON Schema correspondente ao validador Zod. Isto guiará o modelo a gerar a resposta de forma estruturada e em conformidade estrita logo na primeira tentativa, reduzindo drasticamente as falhas de parsing.

---

## 🟡 Melhorias e Pontos de Atenção Técnicos

### 1. Incompatibilidade com macOS no script `run-local.sh`
O script de execução local [run-local.sh](../run-local.sh#L7) utiliza a opção `-d` no comando `xargs`:
```bash
export $(grep -v '^#' .env | xargs -d '\n' 2>/dev/null)
```
* **Impacto**: A flag `-d` é uma extensão GNU. Em sistemas macOS (amplamente utilizados no ambiente de desenvolvimento profissional), o comando `xargs` padrão do BSD falhará com o erro `xargs: illegal option -- d`, quebrando a inicialização do container local.
* **Solução**: Usar um loop nativo bash para ler o `.env` de forma portátil.

### 2. Tratamento Incorreto de Linha `0` no Diff Parser
No arquivo [diff-validator.ts](../src/core/diff-validator.ts#L27-L37), a função `parsePatchToLines` incrementa a linha e adiciona ao Set antes de encontrar o primeiro hunk header (`@@`):
```typescript
if (line.startsWith('+') || line.startsWith(' ') || line.trim() === '') {
  lines.add(currentLine);
  currentLine++;
}
```
* **Impacto**: Metadados da diff, como a linha de arquivo adicionada (`+++ b/src/auth.ts`), iniciam com `+`. Isso faz com que a linha `0` seja registrada no `changedLinesMap`. Embora seja inofensivo porque o GitHub não usa linha `0`, é uma falha na lógica de parsing que gera dados inconsistentes em memória RAM.

### 3. Violação do Princípio DRY (Código Duplicado)
A extração de JSON do output e a validação do Zod estão duplicadas em dois módulos diferentes:
* `OpenCodeAdapter` (`extractJson` e `validate`)
* `parseFindings` em `src/parsers/findings.ts`
* **Solução**: `OpenCodeAdapter` deve importar e reutilizar diretamente a função utilitária `parseFindings`.

### 4. Alerta de Segurança: Riscos com `pull_request_target`
O manual de configuração sugere usar o gatilho `pull_request`. Caso o time decida no futuro alterar para `pull_request_target` (para permitir revisões em forks com secrets ativos), a LLM terá acesso a secrets do repositório principal e, através de injeção de prompt nas Skills, um atacante externo poderia fazer a LLM utilizar a ferramenta `bash` configurada no sandbox (via `permission.bash: 'allow'`) para enviar segredos do repositório principal a servidores externos.

---

## 🛠️ Proposta de Correção e Refatoração (Exemplos de Diffs)

### Correção da Paginação no `diff-validator.ts`
```diff
-        const { data: files } = await octokit.rest.pulls.listFiles({
-          owner: this.gitMetadata.owner,
-          repo: this.gitMetadata.repo,
-          pull_number: this.gitMetadata.pullNumber
-        });
-
-        for (const file of files) {
-          if (file.patch) {
-            const lines = parsePatchToLines(file.patch);
-            this.changedLinesMap.set(file.filename, lines);
-          }
-        }
+        const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
+          owner: this.gitMetadata.owner,
+          repo: this.gitMetadata.repo,
+          pull_number: this.gitMetadata.pullNumber,
+          per_page: 100
+        });
+
+        for (const file of files) {
+          if (file.patch) {
+            const lines = parsePatchToLines(file.patch);
+            this.changedLinesMap.set(file.filename, lines);
+          }
+        }
```

### Correção no Diff Parser (`parsePatchToLines`)
Para evitar salvar a linha `0` ao ler headers:
```diff
-    // Linhas adicionadas (+), linhas de contexto (iniciadas com espaço) ou linhas em branco no hunk
-    if (line.startsWith('+') || line.startsWith(' ') || line.trim() === '') {
-      lines.add(currentLine);
-      currentLine++;
-    }
+    // Linhas adicionadas (+), de contexto ( ) ou em branco, apenas se já estivermos dentro de um Hunk
+    if (currentLine > 0 && (line.startsWith('+') || line.startsWith(' ') || line.trim() === '')) {
+      lines.add(currentLine);
+      currentLine++;
+    }
```

### Leitura Portátil do `.env` no `run-local.sh`
```diff
-if [ -f .env ]; then
-  # Extrai apenas as linhas válidas, ignorando comentários
-  export $(grep -v '^#' .env | xargs -d '\n' 2>/dev/null)
-fi
+if [ -f .env ]; then
+  while IFS= read -r line || [ -n "$line" ]; do
+    if [[ ! "$line" =~ ^# ]] && [[ ! -z "$line" ]]; then
+      export "$line"
+    fi
+  done < .env
+fi
```
