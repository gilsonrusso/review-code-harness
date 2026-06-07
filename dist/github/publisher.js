import fs from 'fs/promises';
import path from 'path';
import { getOctokit } from '@actions/github';
/**
 * Calcula dinamicamente a contagem de ocorrências agrupadas por severidade.
 *
 * Atua como a única fonte de verdade para a formatação do resumo de revisão,
 * garantindo consistência estatística mesmo se a IA retornar contagens incorretas
 * ou omitir a propriedade `summary`.
 *
 * @param findings - Lista de ocorrências de revisão encontradas.
 * @returns O objeto SeveritySummary contendo a contagem por tipo de severidade.
 */
export function calculateSummary(findings) {
    const summary = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
    };
    for (const f of findings) {
        const sev = f.severity?.toLowerCase();
        if (sev === 'critical')
            summary.critical++;
        else if (sev === 'high')
            summary.high++;
        else if (sev === 'medium')
            summary.medium++;
        else if (sev === 'low')
            summary.low++;
        else
            summary.info++;
    }
    return summary;
}
/**
 * Formata a lista de findings e a contagem consolidada em uma tabela Markdown amigável e legível.
 *
 * Gera uma seção Markdown estruturada que serve como o corpo principal (body) da revisão do PR
 * contendo uma tabela resumo e detalhes individuais de cada ocorrência.
 *
 * @param findings - Lista de descobertas individuais.
 * @param summary - Objeto contendo o resumo consolidado de severidades calculado.
 * @returns String formatada em Markdown contendo tabelas e emojis de severidade.
 */
export function formatFindingsMarkdown(findings, summary) {
    if (findings.length === 0) {
        return `### 🤖 AI Review Summary

🎉 **Nenhum problema encontrado!** Todas as regras definidas nas Skills foram respeitadas neste Pull Request.`;
    }
    const summaryTable = `
| Severidade | Ocorrências |
| :--- | :---: |
| 🔴 **Critical** | ${summary.critical} |
| 🟠 **High** | ${summary.high} |
| 🟡 **Medium** | ${summary.medium} |
| 🔵 **Low** | ${summary.low} |
| ⚪ **Info** | ${summary.info} |
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
        const sugg = f.suggestion ? f.suggestion.replace(/\n/g, '<br>') : 'N/A';
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

<!-- review-agent-summary-anchor -->
`;
}
/**
 * Publica os comentários gerais e inline estruturados no Pull Request do GitHub.
 *
 * Utiliza a API de Pull Request Reviews (`pulls.createReview`) do GitHub para publicar
 * o sumário Markdown e todos os comentários inline de linhas em um único lote/transação.
 *
 * Antes de submeter os comentários inline, realiza uma filtragem contra o `DiffCoordinateValidator`:
 * - Qualquer finding que aponte para um arquivo ou linha que não tenha sido modificado/adicionado no diff
 *   será descartado do array de comentários inline (evitando rejeição pela API do GitHub),
 *   porém continuará listado no sumário/tabela geral Markdown do PR.
 *
 * Se não estiver em ambiente CI ou se GITHUB_TOKEN estiver ausente, realiza o fallback imprimindo no console.
 *
 * @param reviewResult - O resultado estruturado contendo a lista de findings da IA.
 * @param mode - Modo de saída: 'summary' (apenas resumo), 'inline' (apenas inline) ou 'both' (ambos).
 * @param validator - O validador de coordenadas de diff inicializado.
 * @param dryRun - Se true, simula a execução exibindo apenas no console e pulando chamadas de rede.
 * @param commitSha - O hash SHA do commit cabeça (head) da branch do PR onde os comentários inline serão ancorados.
 */
export async function publishReview(reviewResult, mode, validator, dryRun = false, commitSha) {
    const findings = reviewResult.findings;
    const summary = calculateSummary(findings);
    const markdown = formatFindingsMarkdown(findings, summary);
    const emojiMap = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🔵',
        info: '⚪'
    };
    // Prepara os comentários inline filtrados por coordenadas válidas do diff
    const inlineComments = [];
    if (mode === 'inline' || mode === 'both') {
        for (const f of findings) {
            if (!f.file || !f.line) {
                console.warn(`Aviso: Finding ignorado devido a coordenadas ausentes (file/line): ${JSON.stringify(f)}`);
                continue;
            }
            // Validação de coordenadas (Ajuste 6)
            const isValid = validator ? validator.isLineChanged(f.file, f.line) : true;
            if (!isValid) {
                console.warn(`Aviso: Finding em ${f.file}:${f.line} está fora das coordenadas do diff. Pulando publicação inline.`);
                continue;
            }
            inlineComments.push({
                path: f.file,
                line: f.line,
                body: `### ${emojiMap[f.severity] || '⚪'} ${f.severity.toUpperCase()}: ${f.title}\n\n${f.description}${f.suggestion ? `\n\n**Sugestão:** ${f.suggestion}` : ''}`,
                side: 'RIGHT'
            });
        }
    }
    if (dryRun) {
        console.info('\n=== [DRY RUN] AI Review Summary ===');
        console.info(markdown);
        // Monta o conteúdo completo do arquivo Markdown incluindo inline comments
        let fileContent = markdown;
        if (inlineComments.length > 0) {
            console.info('\n--- Comentários Inline (Dry Run) ---');
            fileContent += '\n\n---\n\n#### 💬 Comentários Inline\n\n';
            for (const comment of inlineComments) {
                console.info(`[Inline Comment] File: ${comment.path}, Line: ${comment.line}\nBody: ${comment.body.replace(/\n/g, ' ')}\n`);
                fileContent += `- **\`${comment.path}\`** (linha ${comment.line}):\n${comment.body}\n\n`;
            }
        }
        fileContent += '\n---\n\n> 📄 Gerado automaticamente pelo **Review Agent** em modo `dry-run`.\n';
        // Salva o arquivo review-summary.md no diretório de trabalho
        const outputPath = path.join(process.cwd(), 'review-summary.md');
        await fs.writeFile(outputPath, fileContent, 'utf-8');
        console.info('===================================\n');
        console.info(`📄 Arquivo de revisão salvo em: ${outputPath}`);
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
    let pullNumber;
    let eventCommitSha = '';
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (eventPath) {
        try {
            const eventContent = await fs.readFile(eventPath, 'utf-8');
            const event = JSON.parse(eventContent);
            pullNumber = event.pull_request?.number || event.number;
            eventCommitSha = event.pull_request?.head?.sha || '';
        }
        catch (e) {
            console.warn(`Aviso: Falha ao carregar arquivo de evento em GITHUB_EVENT_PATH (${eventPath}): ${e.message}`);
        }
    }
    if (!pullNumber) {
        console.warn('Número do Pull Request não identificado. Imprimindo resultado no console:');
        console.info(markdown);
        return;
    }
    const finalCommitSha = commitSha || eventCommitSha || process.env.GITHUB_SHA;
    const octokit = getOctokit(token);
    // 1. Buscar se existe um review anterior com a âncora do resumo
    let existingSummaryReviewId;
    try {
        const { data: reviews } = await octokit.rest.pulls.listReviews({
            owner,
            repo,
            pull_number: pullNumber,
            per_page: 100
        });
        const summaryReview = reviews.find(r => r.body?.includes('<!-- review-agent-summary-anchor -->'));
        if (summaryReview) {
            existingSummaryReviewId = summaryReview.id;
        }
    }
    catch (err) {
        console.warn(`Aviso: Não foi possível listar reviews existentes: ${err.message}`);
    }
    // 2. Buscar comentários inline existentes para deduplicação
    const filteredInlineComments = [];
    if (inlineComments.length > 0) {
        try {
            const { data: existingInlines } = await octokit.rest.pulls.listReviewComments({
                owner,
                repo,
                pull_number: pullNumber,
                per_page: 100
            });
            for (const comment of inlineComments) {
                const isDuplicate = existingInlines.some(exist => exist.path === comment.path &&
                    exist.line === comment.line &&
                    exist.body?.includes(comment.body.split('\n')[0]));
                if (!isDuplicate) {
                    filteredInlineComments.push(comment);
                }
                else {
                    console.info(`Deduplicação: Comentário inline em ${comment.path}:${comment.line} já existe. Pulando.`);
                }
            }
        }
        catch (err) {
            console.warn(`Aviso: Não foi possível listar comentários inline existentes: ${err.message}. Enviando todos.`);
            filteredInlineComments.push(...inlineComments);
        }
    }
    // 3. Publicar ou atualizar a revisão
    if (existingSummaryReviewId !== undefined) {
        console.info(`Atualizando comentário de resumo existente (Review ID: ${existingSummaryReviewId})...`);
        try {
            await octokit.rest.pulls.updateReview({
                owner,
                repo,
                pull_number: pullNumber,
                review_id: existingSummaryReviewId,
                body: (mode === 'both' || mode === 'summary') ? markdown : 'Resumo das revisões inline concluído.'
            });
        }
        catch (err) {
            console.warn(`Aviso: Falha ao atualizar review existente (${err.message}). Criando novo.`);
            existingSummaryReviewId = undefined; // Força fallback para criação
        }
    }
    if (existingSummaryReviewId === undefined) {
        console.info(`Publicando nova revisão geral no PR #${pullNumber} de ${owner}/${repo}...`);
        await octokit.rest.pulls.createReview({
            owner,
            repo,
            pull_number: pullNumber,
            commit_id: finalCommitSha,
            event: 'COMMENT',
            body: (mode === 'both' || mode === 'summary') ? markdown : 'Resumo das revisões inline concluído.',
            comments: (mode === 'inline' || mode === 'both') ? filteredInlineComments : []
        });
    }
    else {
        // Se o resumo foi atualizado in-place, mas temos novos comentários inline (não duplicados),
        // nós os enviamos em uma nova revisão separada.
        if ((mode === 'inline' || mode === 'both') && finalCommitSha && filteredInlineComments.length > 0) {
            console.info(`Publicando ${filteredInlineComments.length} novos comentários inline em nova revisão complementar...`);
            await octokit.rest.pulls.createReview({
                owner,
                repo,
                pull_number: pullNumber,
                commit_id: finalCommitSha,
                event: 'COMMENT',
                body: 'Revisão complementar com novas ocorrências encontradas.',
                comments: filteredInlineComments
            });
        }
    }
    console.info('Review publicado com sucesso no Pull Request!');
}
