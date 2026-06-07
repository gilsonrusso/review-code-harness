# Especificação Técnica (Specs) - Review Agent MVP (Versão 2.0)

Este documento define os detalhes de especificação técnica, assinaturas de métodos, esquemas de dados (Zod), configurações de ambiente e fluxos de dados para o **Review Agent MVP v2.0**.

---

## 🏛️ Decisões Arquiteturais Centrais

Para guiar o desenvolvimento do **Review Agent** e facilitar a colaboração de futuros desenvolvedores, foram adotadas as seguintes diretrizes arquiteturais essenciais:

### 1. Desacoplamento Completo da Análise (OpenCode como Revisor Único)
* **Decisão**: O wrapper (Review Agent) atua estritamente como orquestrador de execução e interface de publicação. Ele **não** possui lógica para detecção de linguagens, parsing de código-fonte, ou análise de segurança/arquitetura.
* **Motivo**: A inteligência de IA é centralizada no OpenCode, que já possui acesso direto ao workspace de arquivos e histórico Git. Evita duplicação de responsabilidades, reduz a complexidade e custos de manutenção no wrapper, e permite que a IA analise o contexto geral (como imports e estruturas complementares) em vez de ficar limitada a patches textuais isolados do diff.

### 2. Validação Híbrida de Coordenadas de Linha
* **Decisão**: Antes de publicar qualquer comentário inline, o orquestrador valida se a coordenada (`file` e `line`) informada nos findings pertence às linhas modificadas no PR, buscando do Git local (principal) ou da API do GitHub (fallback).
* **Motivo**: A API do GitHub retorna erro `HTTP 422` e aborta a execução inteira do workflow caso receba um comentário para uma linha intocada no PR. A validação serve como um **guardrail operacional** contra alucinações de coordenadas por parte das LLMs, garantindo robustez no pipeline de CI/CD. Os findings com coordenadas inválidas são logados e reportados somente no resumo Markdown geral do PR.

### 3. Cálculo Consistente de Estatísticas no Cliente
* **Decisão**: A contagem de severidades (`critical`, `high`, `medium`, etc.) exibida no resumo Markdown é calculada diretamente pelo orquestrador com base nos findings estruturados recebidos, em vez de confiar nas estatísticas produzidas pela IA.
* **Motivo**: Modelos de linguagem (LLMs) são notórios por falhar em operações matemáticas e de contagem simples ou por omitir campos. Computar os dados localmente no wrapper assegura 100% de precisão e integridade estatística nas tabelas geradas no GitHub.

### 4. Transações Únicas e Otimizadas (`createReview`)
* **Decisão**: O orquestrador agrupa o sumário Markdown geral e todos os comentários inline validados em uma única chamada de API (`pulls.createReview`).
* **Motivo**: A criação individualizada de comentários de revisão gera grande consumo de limites de taxa (rate limits) na API e bombardeia os desenvolvedores com notificações repetitivas. A publicação agrupada simula a experiência de ferramentas de mercado (como o CodeRabbit), gerando uma única revisão consolidada e atômica.

### 5. Extração de JSON Resiliente por Hunk/Brace-Matching e Fallback de Resiliência (Estratégia A)
* **Decisão**: Implementação de um algoritmo determinístico de correspondência de chaves (`{}`) para extrair o objeto JSON que engloba a propriedade `"findings"`, em vez de recorrer a Regex ou cortes estáticos de texto. Adicionalmente, caso o bloco JSON não seja localizado e o texto retornado pela IA seja puramente conversacional (sem a presença da substring `"findings"`), o parser intercepta o erro e retorna de forma resiliente o objeto `{ findings: [] }`. Se o preâmbulo contiver `"findings"` mas falhar no balanceamento de chaves, o erro é propagado por ser considerado um JSON incompleto ou truncado.
* **Motivo**: Respostas de LLMs frequentemente contêm textos explicativos, saudações ou blocos markdown (```json ... ```). O parse por balanceamento de parênteses garante a extração correta e à prova de quebras da string JSON mais externa, ignorando chaves adicionais precedentes (ex: `"summary"`). O fallback para respostas puramente conversacionais previne quebras catastróficas na execução do CI/CD quando a IA responde de forma bem-sucedida em linguagem natural.

### 6. Isolamento de Stdin e Streaming de Logs do Subprocesso
* **Decisão**: A CLI do OpenCode é invocada usando `execa` com `stdin: 'ignore'`, redirecionamento de logs de diagnóstico (`stderr`) direto via pipe e streaming em tempo real do stdout (enquanto acumula os dados em buffers). Adicionalmente, caso não exista um arquivo `opencode.json` local, um arquivo temporário com permissões de auto-approve (`allow` para comandos de bash e edições de arquivo) é criado na raiz do workspace.
* **Motivo**: Em ambientes não interativos (como pipelines de CI/CD ou containers sem TTY), a execução do OpenCode pode congelar indefinidamente se a CLI tentar solicitar confirmações ou interações do usuário. Configurar permissões automáticas e isolar o `stdin` previne travamentos e timeouts silenciosos, enquanto o streaming imediato das saídas evita logs truncados ou ausência de feedback em execuções demoradas.

### 7. Tolerância a Nulidade em Campos Opcionais da LLM (Nullish Schema Resolution)
* **Decisão**: A validação Zod de campos estruturados opcionais, como `suggestion`, é configurada para aceitar strings, `null` ou `undefined` via `.nullish().transform(val => val ?? undefined)`, mapeando as nulidades implicitamente para `undefined`.
* **Motivo**: Modelos de linguagem (como `gemini-2.5-flash`) costumam gerar explicitamente `"suggestion": null` no JSON em vez de simplesmente omitir o campo. Permitir e normalizar valores nulos localmente no parser previne falhas catastróficas de validação mantendo a compatibilidade estrita com a tipagem TypeScript (`suggestion?: string`).

### 8. Paginação de Arquivos via API do GitHub
* **Decisão**: A recuperação de arquivos modificados via API do GitHub para fallback de shallow clones utiliza `octokit.paginate` em vez de apenas consultar `pulls.listFiles`.
* **Motivo**: A chamada padrão de listagem limita-se a 30 arquivos por página. Paginar de forma explícita garante consistência total da validação mesmo em Pull Requests de grande escala, evitando que comentários válidos sejam omitidos.

### 9. Sanitização de Workspace contra Abortos e Cancelamentos (Signal Trapping)
* **Decisão**: O ciclo de vida do subprocesso CLI do OpenCode possui tratamento active de interrupções de processo (`SIGINT`/`SIGTERM`) para limpar e restaurar a configuração do workspace (`opencode.json`).
* **Motivo**: Se a GitHub Action for cancelada pelo usuário ou estourar o timeout global do workflow, evitamos que o arquivo temporário de sandbox fique poluindo fisicamente o repositório do desenvolvedor, garantindo a integridade dos commits futuros.

### 10. Prompting Baseado em JSON Schema e Resposta Vazia Padronizada (Estratégia B)
* **Decisão**: A instrução estruturada passada no prompt (`buildInstructions`) contém uma especificação formal em formato JSON Schema Draft-07 detalhando as propriedades, severidades permitidas e campos obrigatórios. Também instrui explicitamente a IA a retornar exatamente `{ "findings": [] }` caso não seja encontrado nenhum problema de código ou violação de Skill no Pull Request.
* **Motivo**: LLMs reduzem consideravelmente a taxa de erros de sintaxe ou de chaves ausentes quando instruídas usando o formato estruturado do JSON Schema, em vez de descrições textuais livres de chaves. Padronizar o comportamento de retorno para casos de sucesso (zero findings) evita variações na saída e reduz o risco de quebras inesperadas no parsing.

---

## 1. Configuração do Projeto (`.review-agent.yml`)

O comportamento do Review Agent é regido pelo arquivo `.review-agent.yml` localizado na raiz do repositório alvo.

```yaml
version: 1                    # Versão da configuração (obrigatório: 1)

review:
  max_findings: 20            # Limite máximo de ocorrências a reportar no PR. Padrão: 20
  timeoutSeconds: 300         # Tempo limite (segundos) por tentativa do OpenCode. Padrão: 300
  maxRetries: 3               # Tentativas adicionais em caso de falha da CLI. Padrão: 3
  commits: all                # Controle do diff local (número ou "all"). Padrão: all
  baseBranch: main            # Branch base local caso commits seja "all". (Opcional)

output:
  mode: both                  # Modo de publicação no GitHub. Padrão: summary.
                              # Opções: summary (apenas resumo), inline (apenas comentários inline), both (ambos)
```

---

## 2. Tipos de Dados e Modelos

### 2.1. Interfaces TypeScript (`src/models/types.ts`)

```typescript
export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file: string;
  line: number;
  title: string;
  description: string;
  suggestion?: string; // Opcional
}

export interface ReviewResult {
  findings: Finding[];
  summary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  }; // Opcional
}
```

### 2.2. Esquemas de Validação Zod (`src/parsers/findings.ts`)

```typescript
import { z } from 'zod';

export const FindingSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  file: z.string().min(1),
  line: z.number().int().nonnegative(),
  title: z.string().min(1),
  description: z.string().min(1),
  suggestion: z.string().nullish().transform(val => val ?? undefined)
});

export const ReviewResultSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.object({
    critical: z.number().int().nonnegative().default(0),
    high: z.number().int().nonnegative().default(0),
    medium: z.number().int().nonnegative().default(0),
    low: z.number().int().nonnegative().default(0),
    info: z.number().int().nonnegative().default(0)
  }).optional()
});
```

---

## 3. Especificação de Componentes

### 3.1. `PromptBuilder` (`src/core/prompt.ts`)
Gera o texto de instrução estruturado enviado como input para a engine do OpenCode.
* **Assinatura**: `function buildInstructions(): string`
* **Comportamento**: Retorna uma instrução extremamente restritiva exigindo que a IA consulte as habilidades registradas no projeto utilizando a ferramenta nativa `skill`, retornando os achados exclusivamente no formato JSON de findings e vetando qualquer explicação adicional.

### 3.2. `OpenCodeAdapter` (`src/opencode/adapter.ts`)
Gerencia o ciclo de vida e a invocação da CLI do OpenCode.
* **Assinatura**:
  * `async run(instructions: string, timeoutSeconds: number, maxRetries: number): Promise<string>`
  * `extractJson(rawOutput: string): string`
  * `validate(jsonStr: string): ReviewResult`
* **Comportamento**:
  * Sempre ignora o arquivo `opencode.json` existente na raiz do projeto (fazendo backup de seu conteúdo em memória) e o sobrescreve temporariamente com a nossa configuração padrão e restritiva de sandbox (`tools.write: false`, `tools.edit: false`, `share: "disabled"`, desativação de telemetria e regras de exclusão no `watcher.ignore`) para evitar prompts interativos de TTY e garantir isolamento sanitário total contra modificações acidentais de arquivos no repositório.
  * Executa a CLI do OpenCode (`opencode run "<instructions>"`) via `execa` com timeout definido e parâmetro `stdin: 'ignore'`.
  * Redireciona a saída de erro (`stderr`) e faz o streaming da saída padrão (`stdout`) em tempo real no console do wrapper, enquanto acumula a saída do terminal.
  * Restaura o conteúdo original de `opencode.json` (ou o remove caso não existisse previamente) no bloco `finally` ao término da execução.
  * Implementa novas tentativas com intervalo de 1s em caso de estouro de timeout ou falha na invocação.
  * Utiliza algoritmo de brace-matching para extrair o JSON e faz a validação estrutural via Zod.

### 3.3. `DiffCoordinateValidator` (`src/core/diff-validator.ts`)
Validador de arquivos e linhas modificadas no PR para segurança das chamadas de API.
* **Assinatura**:
  * `async initialize(): Promise<void>`
  * `isLineChanged(file: string, line: number): boolean`
* **Comportamento**:
  * Executa `git diff` localmente para extrair os hunks de modificação.
  * Em caso de falha de git (shallow clone), executa fallback requisitando o diff do PR na API do GitHub (`pulls.listFiles`).
  * Constrói um mapa `Map<string, Set<number>>` contendo as linhas que sofreram alteração na nova versão dos arquivos.

> [!NOTE]
> **Decisão Arquitetural e Uso de Memória**:
> O `DiffCoordinateValidator` é inicializado precocemente na **Etapa E** (antes da invocação do OpenCode) por duas razões de design:
> 1. **Estratégia Fail-Fast (Falha Rápida)**: Caso o repositório ou as permissões de CI/CD estejam configuradas de forma errada (erros de Git ou credenciais de API do GitHub inválidas), o processo falha logo no início. Isso impede o desperdício de chamadas e de tokens de processamento de LLM do OpenCode.
> 2. **Validação Rápida em RAM**: Ao ler o diff e guardá-lo em cache na memória RAM do processo Node.js na inicialização, a checagem de cada achado posterior da IA ocorre em tempo constante $O(1)$ (`isLineChanged`), evitando que tenhamos de executar chamadas de rede ou subprocessos repetitivos no final.


### 3.4. `GitHubPublisher` (`src/github/publisher.ts`)
Formata e publica os feedbacks agregados no GitHub.
* **Assinatura**:
  * `function calculateSummary(findings: Finding[]): SeveritySummary`
  * `function formatFindingsMarkdown(findings: Finding[], summary: SeveritySummary): string`
  * `async publishReview(reviewResult: ReviewResult, mode: 'summary' | 'inline' | 'both', validator?: DiffCoordinateValidator, dryRun = false, commitSha?: string): Promise<void>`
* **Comportamento**:
  * Conta localmente as severidades para assegurar a integridade estatística.
  * Filtra ocorrências inline comparando com o `DiffCoordinateValidator`.
  * Cria ou atualiza a revisão em lote utilizando a API do GitHub:
    * **Deduplicação de Resumo**: O Markdown de resumo gerado por `formatFindingsMarkdown` injeta a tag de âncora `<!-- review-agent-summary-anchor -->`. Durante a publicação, busca-se por comentários anteriores que contenham esta tag via `issues.listComments` e, caso encontrados, utiliza-se `issues.updateComment` para editá-los em tempo real, mitigando resumos duplicados.
    * **Deduplicação de Ocorrências Inline**: Busca os comentários inline já postados pelo bot através de `pulls.listReviewComments` e filtra novos comentários cujo arquivo, linha e assinatura sejam idênticos a ocorrências já existentes, prevenindo poluição visual por reenvio de feedbacks.
    * Envia a revisão agregada contendo apenas os novos comentários inline associados ao resumo in-place.


---

## 4. Variáveis de Ambiente

| Variável | Descrição |
| :--- | :--- |
| `GITHUB_TOKEN` | Token de autenticação para a API do GitHub Actions (`secrets.GITHUB_TOKEN`). |
| `GITHUB_EVENT_PATH` | Caminho para o arquivo JSON contendo os metadados do evento disparador (PR). |
| `GITHUB_REPOSITORY` | String no formato `owner/repo` indicando o repositório em execução. |
| `GITHUB_SHA` | SHA hash do commit cabeça (head) para ancorar os comentários inline. |
| `OPENCODE_BIN` | Caminho opcional do binário para simulações e mocks do OpenCode. |
