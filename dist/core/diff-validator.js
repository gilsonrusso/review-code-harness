import { simpleGit } from 'simple-git';
import { getOctokit } from '@actions/github';
/**
 * Analisa a string de patch do diff unificado de um arquivo e extrai o conjunto
 * correspondente a todas as linhas ativas (adicionadas ou de contexto) no arquivo modificado (lado direito).
 *
 * @param patch - Conteúdo de diff de patch de arquivo individual.
 * @returns Um Set contendo os números inteiros de linha que pertencem às modificações do diff.
 */
export function parsePatchToLines(patch) {
    const lines = new Set();
    if (!patch)
        return lines;
    const patchLines = patch.split('\n');
    let currentLine = 0;
    for (const line of patchLines) {
        // Procura por blocos de início de Hunk. Exemplo: @@ -10,3 +10,4 @@
        // Captura o número que indica o início da linha no lado direito (+)
        const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
            currentLine = parseInt(match[1], 10);
            continue;
        }
        if (line.startsWith('-')) {
            // Linha removida, não está presente na versão nova (lado direito) do arquivo
            continue;
        }
        // Linhas adicionadas (+), de contexto ( ) ou em branco, apenas se já estivermos dentro de um Hunk
        if (currentLine > 0 && (line.startsWith('+') || line.startsWith(' ') || line.trim() === '')) {
            lines.add(currentLine);
            currentLine++;
        }
    }
    return lines;
}
/**
 * Validador de Coordenadas de Modificação (DiffCoordinateValidator).
 *
 * Esse validador é responsável por carregar o conjunto de arquivos e linhas modificadas no PR atual.
 * A sua principal função é filtrar os comentários inline sugeridos pela IA, garantindo que
 * não façamos chamadas à API do GitHub em linhas intocadas/inválidas, o que geraria falhas de requisição.
 *
 * Estratégia de carregamento:
 * 1. Git local (Executa git diff comparando referências conhecidas no repositório local).
 * 2. API do GitHub (Executa pulls.listFiles como fallback de CI em shallow clones).
 */
export class DiffCoordinateValidator {
    workspaceRoot;
    gitMetadata;
    token;
    changedLinesMap = new Map();
    failed = false;
    /**
     * Construtor da classe de validação de coordenadas.
     *
     * @param workspaceRoot - Caminho absoluto da pasta raiz do projeto.
     * @param gitMetadata - Metadados de repositório e pull request se disponíveis no ambiente CI.
     * @param token - Token GITHUB_TOKEN para autenticação na API do GitHub Actions.
     */
    constructor(workspaceRoot, gitMetadata, token) {
        this.workspaceRoot = workspaceRoot;
        this.gitMetadata = gitMetadata;
        this.token = token;
    }
    /**
     * Inicializa o mapa de coordenadas buscando os diffs das alterações.
     *
     * Tenta primariamente rodar git diff comparando branches locais e remotas.
     * Se falhar ou estiver em clone raso, faz requisição de fallback à API rest do GitHub.
     * Se ambos falharem, desliga silenciosamente a validação retornando sempre true no isLineChanged
     * para evitar bloqueios ao processo.
     */
    async initialize(options) {
        // 1. Tentar obter diff usando Git local
        try {
            const git = simpleGit(this.workspaceRoot);
            const isRepo = await git.checkIsRepo().catch(() => false);
            if (isRepo) {
                let rawDiff = '';
                let refs = [];
                const commits = options?.commits;
                const baseBranch = options?.baseBranch;
                if (commits && commits !== 'all') {
                    // Usar número específico de commits
                    const numCommits = parseInt(commits.toString(), 10);
                    if (!isNaN(numCommits) && numCommits > 0) {
                        refs.push(`HEAD~${numCommits}`);
                    }
                }
                else {
                    // 'all' commits: usar baseBranch se fornecido, senão heurística padrão
                    if (baseBranch) {
                        refs.push(`origin/${baseBranch}...HEAD`);
                        refs.push(`${baseBranch}...HEAD`);
                    }
                    else {
                        refs = ['origin/main...HEAD', 'main...HEAD', 'master...HEAD', 'HEAD~1'];
                    }
                }
                for (const ref of refs) {
                    try {
                        rawDiff = await git.diff([ref]);
                        if (rawDiff.trim()) {
                            console.info(`- Coordenadas do diff obtidas localmente via ref '${ref}'`);
                            break;
                        }
                    }
                    catch {
                        // Silencia erro e tenta o próximo ref de fallback
                    }
                }
                if (!rawDiff.trim()) {
                    // Último fallback local: alterações correntes em arquivos modificados sem commit
                    rawDiff = await git.diff();
                    if (rawDiff.trim()) {
                        console.info('- Coordenadas do diff obtidas localmente das alterações não commitadas');
                    }
                }
                if (rawDiff.trim()) {
                    this.parseRawDiff(rawDiff);
                    return;
                }
            }
        }
        catch (e) {
            console.warn(`Aviso: Falha ao obter diff via Git local (${e.message}). Tentando fallback via API.`);
        }
        // 2. Fallback: API do GitHub (caso tenhamos pullNumber configurado)
        if (this.token && this.gitMetadata?.pullNumber) {
            try {
                console.info(`- Buscando arquivos modificados via API do GitHub para o PR #${this.gitMetadata.pullNumber}`);
                const octokit = getOctokit(this.token);
                const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
                    owner: this.gitMetadata.owner,
                    repo: this.gitMetadata.repo,
                    pull_number: this.gitMetadata.pullNumber,
                    per_page: 100
                });
                for (const file of files) {
                    if (file.patch) {
                        const lines = parsePatchToLines(file.patch);
                        this.changedLinesMap.set(file.filename, lines);
                    }
                }
                return;
            }
            catch (e) {
                console.warn(`Aviso: Falha ao obter diff via API do GitHub: ${e.message}`);
            }
        }
        console.warn('⚠️ Não foi possível obter as coordenadas de diff. Validação local será desativada.');
        this.failed = true;
    }
    /**
     * Verifica se uma determinada linha de um arquivo está inserida nas modificações sofridas no diff do PR.
     *
     * @param file - Nome/caminho relativo do arquivo sob verificação.
     * @param line - Número inteiro da linha a ser checada.
     * @returns Retorna true se a linha foi modificada ou se a validação falhou ao carregar (tolerância de erro).
     */
    isLineChanged(file, line) {
        if (this.failed) {
            // Se não conseguimos rastrear o diff, permitimos passar por segurança
            return true;
        }
        const normalizedFile = file.replace(/^\.\//, '');
        const validLines = this.changedLinesMap.get(normalizedFile);
        if (!validLines) {
            return false;
        }
        return validLines.has(line);
    }
    /**
     * Divide e mapeia o diff bruto de múltiplos arquivos produzidos localmente pelo comando git diff.
     *
     * @param rawDiff - String contendo a saída bruta gerada pelo comando git diff.
     */
    parseRawDiff(rawDiff) {
        const parts = rawDiff.split(/^diff --git\s+/m);
        for (const part of parts) {
            if (!part.trim())
                continue;
            const lines = part.split('\n');
            const header = lines[0];
            let filePath = '';
            for (const line of lines) {
                if (line.startsWith('+++ b/')) {
                    filePath = line.substring(6).trim();
                    break;
                }
            }
            if (!filePath && header) {
                const match = header.match(/a\/(.+?)\s+b\/\1/);
                if (match) {
                    filePath = match[1];
                }
                else {
                    const paths = header.split(' ');
                    if (paths.length >= 2) {
                        filePath = paths[1].replace(/^b\//, '');
                    }
                }
            }
            if (filePath) {
                const fileLines = parsePatchToLines(part);
                this.changedLinesMap.set(filePath, fileLines);
            }
        }
    }
}
export default DiffCoordinateValidator;
