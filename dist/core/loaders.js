import fs from 'fs/promises';
import path from 'path';
import { simpleGit } from 'simple-git';
/**
 * Varre o diretório configurado em busca de arquivos markdown de skills.
 */
export async function loadSkills(skillsPath) {
    const resolvedPath = path.resolve(process.cwd(), skillsPath);
    const skills = [];
    try {
        const stat = await fs.stat(resolvedPath);
        if (!stat.isDirectory()) {
            console.warn(`O caminho das skills '${skillsPath}' não é um diretório.`);
            return [];
        }
        const files = await fs.readdir(resolvedPath);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        for (const file of mdFiles) {
            const filePath = path.join(resolvedPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const name = path.basename(file, '.md');
            skills.push({
                path: filePath,
                name,
                content
            });
        }
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`Diretório de skills '${skillsPath}' não foi encontrado. Retornando lista vazia.`);
            return [];
        }
        throw error;
    }
    return skills;
}
/**
 * Parseia o diff bruto retornado pelo git em uma estrutura orientada a arquivos.
 */
export function parseRawDiff(rawDiff) {
    const files = [];
    if (!rawDiff || rawDiff.trim() === '') {
        return { files, rawPatch: rawDiff };
    }
    // Divide o diff bruto pelo delimitador "diff --git"
    const parts = rawDiff.split(/^diff --git\s+/m);
    for (const part of parts) {
        if (!part.trim())
            continue;
        const lines = part.split('\n');
        const header = lines[0]; // ex: "a/src/service.ts b/src/service.ts"
        let status = 'modified';
        let filePath = '';
        let newFile = false;
        let deletedFile = false;
        let renameFrom = '';
        let renameTo = '';
        for (const line of lines) {
            if (line.startsWith('new file mode')) {
                newFile = true;
            }
            else if (line.startsWith('deleted file mode')) {
                deletedFile = true;
            }
            else if (line.startsWith('rename from ')) {
                renameFrom = line.substring(12).trim();
            }
            else if (line.startsWith('rename to ')) {
                renameTo = line.substring(10).trim();
            }
            else if (line.startsWith('+++ b/')) {
                filePath = line.substring(6).trim();
            }
            else if (line.startsWith('--- a/') && !filePath) {
                const deletedPath = line.substring(6).trim();
                if (deletedPath !== '/dev/null') {
                    filePath = deletedPath;
                }
            }
        }
        if (newFile)
            status = 'added';
        else if (deletedFile)
            status = 'deleted';
        else if (renameFrom && renameTo) {
            status = 'renamed';
            filePath = renameTo;
        }
        // Fallback caso +++ b/ e --- a/ não tenham retornado um caminho (ex: arquivos binários)
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
            files.push({
                path: filePath,
                status,
                patch: `diff --git ${part}`
            });
        }
    }
    return { files, rawPatch: rawDiff };
}
/**
 * Obtém as modificações do git comparando com uma referência base.
 * Possui fallbacks resilientes para garantir execução local ou em CI.
 */
export async function loadDiff(workspaceRoot, baseRef) {
    const git = simpleGit(workspaceRoot);
    const isRepo = await git.checkIsRepo().catch(() => false);
    if (!isRepo) {
        throw new Error(`O diretório '${workspaceRoot}' não é um repositório git válido.`);
    }
    const ref = baseRef || 'origin/main...HEAD';
    let rawDiff = '';
    try {
        rawDiff = await git.diff([ref]);
    }
    catch (error) {
        console.warn(`Git diff com ref '${ref}' falhou (${error.message}). Tentando fallbacks...`);
        try {
            const branches = await git.branchLocal();
            const defaultBranch = branches.all.includes('main')
                ? 'main'
                : branches.all.includes('master')
                    ? 'master'
                    : null;
            if (defaultBranch) {
                console.info(`Tentando diff contra a branch local '${defaultBranch}...HEAD'`);
                rawDiff = await git.diff([`${defaultBranch}...HEAD`]);
            }
            else {
                console.info("Tentando diff contra HEAD~1");
                rawDiff = await git.diff(['HEAD~1']);
            }
        }
        catch (fallbackError) {
            try {
                console.info("Tentando diff de alterações locais não commitadas");
                rawDiff = await git.diff();
            }
            catch (err) {
                throw new Error(`Falha ao obter o diff do git. Erro original: ${error.message}. Fallbacks falharam: ${err.message}`);
            }
        }
    }
    return parseRawDiff(rawDiff);
}
