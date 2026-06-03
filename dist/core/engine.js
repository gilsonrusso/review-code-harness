import { loadConfig } from './config.js';
import { loadSkills, loadDiff } from './loaders.js';
import { buildInstructions } from './context.js';
import { runOpenCode } from '../opencode/adapter.js';
import { parseFindings } from '../parsers/findings.js';
import { publishReview } from '../github/publisher.js';
import { simpleGit } from 'simple-git';
import fs from 'fs/promises';
/**
 * Orquestrador principal do Review Agent. Coleta configurações, skills,
 * diff, executa o OpenCode, parseia os resultados e os publica no GitHub.
 */
export async function runReviewEngine(options = {}) {
    console.info('🚀 Iniciando Review Agent...');
    // 1. Carrega as configurações (.review-agent.yml)
    const config = await loadConfig(options.configPath);
    const skillsPath = options.skillsDir || config.skills.path;
    console.info(`- Diretório de skills: ${skillsPath}`);
    console.info(`- Limite de findings: ${config.review.max_findings}`);
    console.info(`- Formato de saída: ${config.output.format}`);
    // 2. Carrega as Skills e o Diff
    const skills = await loadSkills(skillsPath);
    console.info(`- Skills carregadas: ${skills.length} arquivo(s) encontrado(s).`);
    const workspaceRoot = process.cwd();
    const diff = await loadDiff(workspaceRoot);
    console.info(`- Arquivos modificados no diff: ${diff.files.length}`);
    if (diff.files.length === 0) {
        console.info('⚠️ Nenhum arquivo modificado no diff. Encerrando revisão sem findings.');
        await publishReview([], options.dryRun || config.output.format === 'console');
        return;
    }
    // 3. Obtém os metadados do Git
    const git = simpleGit(workspaceRoot);
    let commitSha = '';
    try {
        commitSha = await git.revparse(['HEAD']);
    }
    catch (e) {
        console.warn(`Aviso: Não foi possível obter o commit SHA via Git CLI: ${e.message}`);
    }
    const repoEnv = process.env.GITHUB_REPOSITORY || 'local/repository';
    const [owner, repo] = repoEnv.split('/');
    let pullNumber;
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (eventPath) {
        try {
            const eventContent = await fs.readFile(eventPath, 'utf-8');
            const event = JSON.parse(eventContent);
            pullNumber = event.pull_request?.number || event.number;
        }
        catch (e) {
            console.warn(`Aviso: Falha ao ler GITHUB_EVENT_PATH: ${e.message}`);
        }
    }
    // 4. Monta o Contexto
    const context = {
        config: {
            skillsPath,
            maxFindings: config.review.max_findings,
            outputFormat: config.output.format
        },
        skills,
        diff,
        gitMetadata: {
            owner,
            repo,
            pullNumber,
            commitSha
        }
    };
    // 5. Gera as instruções estruturadas
    console.info('📝 Construindo contexto e instruções de revisão...');
    const instructions = buildInstructions(context);
    // 6. Invoca o OpenCode CLI
    console.info('🤖 Invocando engine do OpenCode para análise...');
    const rawOutput = await runOpenCode(instructions);
    // 7. Parseia as descobertas (findings)
    console.info('🔍 Analisando e validando descobertas retornadas pela IA...');
    const reviewResult = parseFindings(rawOutput);
    // 8. Aplica o limite de findings (max_findings)
    let finalFindings = reviewResult.findings;
    if (finalFindings.length > config.review.max_findings) {
        console.info(`- Limitando findings de ${finalFindings.length} para o máximo configurado de ${config.review.max_findings}.`);
        finalFindings = finalFindings.slice(0, config.review.max_findings);
    }
    // 9. Publica no GitHub (ou console)
    const isConsoleOutput = options.dryRun || config.output.format === 'console';
    await publishReview(finalFindings, isConsoleOutput);
    console.info('🎉 Processo de revisão concluído com sucesso!');
}
