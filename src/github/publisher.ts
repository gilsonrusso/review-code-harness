import fs from 'fs/promises';
import { getOctokit } from '@actions/github';
import { Finding } from '../models/types.js';

/**
 * Formata a lista de findings em uma tabela Markdown amigável e legível.
 */
export function formatFindingsMarkdown(findings: Finding[]): string {
  if (findings.length === 0) {
    return `### 🤖 AI Review Summary

🎉 **Nenhum problema encontrado!** Todas as regras definidas nas Skills foram respeitadas neste Pull Request.`;
  }

  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  };

  for (const f of findings) {
    if (f.severity in severityCounts) {
      severityCounts[f.severity]++;
    } else {
      severityCounts.info++;
    }
  }

  const summaryTable = `
| Severidade | Ocorrências |
| :--- | :---: |
| 🔴 **Critical** | ${severityCounts.critical} |
| 🟠 **High** | ${severityCounts.high} |
| 🟡 **Medium** | ${severityCounts.medium} |
| 🔵 **Low** | ${severityCounts.low} |
| ⚪ **Info** | ${severityCounts.info} |
`;

  const detailsRows = findings
    .map(f => {
      const emojiMap = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🔵',
        info: '⚪'
      };
      const severityStr = `${emojiMap[f.severity] || '⚪'} ${f.severity.toUpperCase()}`;
      const desc = f.description.replace(/\n/g, '<br>');
      const sugg = f.suggestion.replace(/\n/g, '<br>');
      return `| \`${f.file}\` | ${f.line} | ${severityStr} | **${f.title}** | ${desc}<br><br>**Sugestão:** ${sugg} |`;
    })
    .join('\n');

  const detailsTable = `
| Arquivo | Linha | Severidade | Título | Descrição e Sugestão |
| :--- | :---: | :--- | :--- | :--- |
${detailsRows}
`;

  return `### 🤖 AI Review Summary

Aqui está o sumário das análises de código realizadas com base nas Skills do projeto:

${summaryTable}

---

#### 🔍 Detalhes das Ocorrências

${detailsTable}
`;
}

/**
 * Publica o sumário das descobertas como comentário no PR do GitHub.
 * Fallbacks locais imprimem a saída no terminal caso não esteja em CI.
 */
export async function publishReview(findings: Finding[], dryRun = false): Promise<void> {
  const markdown = formatFindingsMarkdown(findings);

  if (dryRun) {
    console.info('\n=== [DRY RUN] AI Review Summary ===');
    console.info(markdown);
    console.info('===================================\n');
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('GITHUB_TOKEN não foi fornecido. Imprimindo resultado no console:');
    console.info(markdown);
    return;
  }

  const repoEnv = process.env.GITHUB_REPOSITORY;
  if (!repoEnv) {
    console.warn('GITHUB_REPOSITORY não encontrado. Imprimindo resultado no console:');
    console.info(markdown);
    return;
  }

  const [owner, repo] = repoEnv.split('/');
  let pullNumber: number | undefined;

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      const eventContent = await fs.readFile(eventPath, 'utf-8');
      const event = JSON.parse(eventContent);
      pullNumber = event.pull_request?.number || event.number;
    } catch (e: any) {
      console.warn(`Aviso: Falha ao carregar arquivo de evento em GITHUB_EVENT_PATH (${eventPath}): ${e.message}`);
    }
  }

  if (!pullNumber) {
    console.warn('Número do Pull Request não identificado. Imprimindo resultado no console:');
    console.info(markdown);
    return;
  }

  console.info(`Publicando comentário no PR #${pullNumber} de ${owner}/${repo}...`);
  const octokit = getOctokit(token);

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body: markdown
  });

  console.info('Comentário publicado com sucesso no Pull Request!');
}
