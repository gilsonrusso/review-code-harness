# Especificação Técnica (Specs) - Review Agent MVP

Este documento define os detalhes técnicos, assinaturas de classes/funções, esquemas de dados (Zod), configurações de ambiente e contratos de API para a implementação do **Review Agent MVP**.

---

## 1. Configuração do Projeto (`.review-agent.yml`)

O comportamento da aplicação é regido por um arquivo YAML opcional chamado `.review-agent.yml` na raiz do projeto.

### 1.1. Esquema YAML e Valores Padrão
```yaml
version: 1                    # Versão da configuração (obrigatório: 1)

skills:
  path: .skills               # Diretório onde as skills markdown estão localizadas. Default: .skills

review:
  max_findings: 20            # Limite máximo de comentários publicados no PR. Default: 20

output:
  format: github-pr           # Formato de publicação. Default: github-pr. Opções: github-pr, console
```

---

## 2. Tipos de Dados e Modelos (TypeScript & Zod)

### 2.1. Interfaces TypeScript (`src/models/types.ts`)
```typescript
export interface Skill {
  path: string;
  name: string;
  content: string;
}

export interface DiffFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  patch?: string; // Trecho do diff contendo as alterações
}

export interface Diff {
  files: DiffFile[];
  rawPatch: string;
}

export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file: string;
  line: number;
  title: string;
  description: string;
  suggestion: string;
}

export interface ReviewResult {
  findings: Finding[];
}

export interface ReviewContext {
  config: {
    skillsPath: string;
    maxFindings: number;
    outputFormat: 'github-pr' | 'console';
  };
  skills: Skill[];
  diff: Diff;
  gitMetadata: {
    owner: string;
    repo: string;
    pullNumber?: number;
    commitSha: string;
  };
}
```

### 2.2. Esquema de Validação Zod (`src/parsers/findings.ts`)
O formato de resposta JSON do OpenCode deve obrigatoriamente satisfazer o esquema a seguir:
```typescript
import { z } from 'zod';

export const FindingSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  file: z.string().min(1),
  line: z.number().int().nonnegative(),
  title: z.string().min(1),
  description: z.string().min(1),
  suggestion: z.string().min(1)
});

export const ReviewResultSchema = z.object({
  findings: z.array(FindingSchema)
});
```

---

## 3. Especificação de Módulos e Funções

### 3.1. `SkillLoader` (`src/core/loaders.ts`)
Responsável por buscar e carregar as regras.
- **Assinatura**: `async function loadSkills(skillsPath: string): Promise<Skill[]>`
- **Comportamento**:
  - Varre o diretório `skillsPath`.
  - Se o diretório não existir, loga um aviso (warning) e retorna um array vazio.
  - Para cada arquivo `.md`, lê o conteúdo e extrai o nome do arquivo (sem extensão) como identificador.

### 3.2. `DiffLoader` (`src/core/loaders.ts`)
Responsável por extrair as alterações do Git.
- **Assinatura**: `async function loadDiff(workspaceRoot: string): Promise<Diff>`
- **Comportamento**:
  - Inicializa o `simple-git` no diretório do projeto.
  - Executa `git diff origin/main...HEAD` (ou branch padrão detectada) para extrair o patch bruto.
  - Parseia o patch bruto para estruturar a lista de objetos `DiffFile`.

### 3.3. `ContextBuilder` (`src/core/context.ts`)
Estrutura o arquivo de contexto e prompts a serem passados para o OpenCode.
- **Assinatura**: `function buildInstructions(context: ReviewContext): string`
- **Prompt Base (Instruções)**:
  ```markdown
  Você é o Review Agent, um revisor de código sênior de IA.
  Sua tarefa é analisar o diff de alterações do Pull Request em anexo e apontar problemas seguindo estritamente as Skills configuradas.

  ---
  ## REGRAS DE REVISÃO (SKILLS)
  [LISTAGEM DAS SKILLS CARREGADAS]

  ---
  ## ALTERAÇÕES DO PULL REQUEST (DIFF)
  [DIFF FORMATADO DO PR]

  ---
  ## DIRETRIZES DE SAÍDA
  Você deve responder EXCLUSIVAMENTE com um bloco de código JSON contendo as descobertas estruturadas, obedecendo ao seguinte formato:
  {
    "findings": [
      {
        "severity": "critical" | "high" | "medium" | "low" | "info",
        "file": "caminho/do/arquivo.ts",
        "line": número_da_linha,
        "title": "Título Curto do Problema",
        "description": "Explicação detalhada do porquê viola as diretrizes do projeto.",
        "suggestion": "Sugestão técnica de como refatorar ou corrigir."
      }
    ]
  }
  Importante: Não adicione explicações em texto comum fora do JSON.
  ```

### 3.4. `OpenCodeAdapter` (`src/opencode/adapter.ts`)
- **Assinatura**: `async function runOpenCode(instructions: string): Promise<string>`
- **Comportamento**:
  - Salva as instruções geradas em um arquivo temporário no workspace (ex: `.review-instructions.md`).
  - Executa o binário do OpenCode via subprocesso (`execa`):
    `opencode run --instructions .review-instructions.md`
  - Captura e retorna o output contido no `stdout` ou em arquivo de saída específico.
  - Remove o arquivo temporário `.review-instructions.md` no encerramento.

### 3.5. `GitHubPublisher` (`src/github/publisher.ts`)
- **Assinatura**: `async function publishReview(findings: Finding[], gitMetadata: GitMetadata): Promise<void>`
- **Comportamento**:
  - Inicializa o Octokit usando `@actions/github`.
  - Constrói uma mensagem em Markdown contendo a tabela de findings consolidada.
  - Posta um comentário no PR associado (caso seja uma execução de Pull Request).

---

## 4. CLI do Review Agent (`src/cli/index.ts`)

Definição de comandos expostos pelo executável `review-agent`:

### 4.1. `review-agent run`
Executa o fluxo completo do revisor.
- **Flags**:
  - `--config <path>`: Sobrescreve o caminho padrão do arquivo `.review-agent.yml`.
  - `--skills-dir <path>`: Sobrescreve o diretório de skills configurado.
  - `--dry-run`: Executa o fluxo e exibe os findings no console ao invés de postar no GitHub.

### 4.2. `review-agent init`
Inicializa a estrutura padrão no repositório.
- Cria a pasta `.skills/` contendo arquivos markdown de exemplo (`architecture.md`, `security.md`).
- Cria um arquivo `.review-agent.yml` com os valores padrão comentados.

---

## 5. Variáveis de Ambiente e Configurações de CI (GitHub Actions)

Para a execução no GitHub Actions, o contêiner Docker espera as seguintes variáveis:

| Variável | Descrição | Origem |
| :--- | :--- | :--- |
| `GITHUB_TOKEN` | Token de autenticação da API do GitHub. | `secrets.GITHUB_TOKEN` |
| `GITHUB_EVENT_PATH` | Caminho para o payload JSON do evento disparador. | Injetado automaticamente pelo GitHub Runner |
| `GITHUB_REPOSITORY` | Repositório no formato `owner/repo`. | Injetado automaticamente pelo GitHub Runner |
