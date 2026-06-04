import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';
import { ReviewResultSchema } from '../parsers/findings.js';
/**
 * Adaptador de Integração com o OpenCode (OpenCodeAdapter).
 *
 * Classe responsável pelo ciclo de vida de invocação da CLI do OpenCode,
 * incluindo o controle de tempo limite (timeout) e tentativas automáticas (retries) em caso
 * de falhas operacionais ou lentidão de rede dos modelos de IA.
 *
 * Também encapsula as lógicas de extração e validação do payload JSON de findings.
 */
export class OpenCodeAdapter {
    workspaceRoot;
    /**
     * Construtor do adaptador do OpenCode.
     *
     * @param workspaceRoot - Caminho do diretório raiz onde os comandos devem ser executados.
     */
    constructor(workspaceRoot = process.cwd()) {
        this.workspaceRoot = workspaceRoot;
    }
    /**
     * Invoca a CLI do OpenCode localmente gravando um arquivo de instruções markdown temporário.
     * Executa a CLI com timeout definido e realiza novas tentativas automáticas se falhar.
     *
     * @param instructions - O texto bruto de instruções que guiará a IA nas revisões.
     * @param timeoutSeconds - Limite máximo de segundos para cada tentativa de execução.
     * @param maxRetries - Número total de tentativas adicionais a realizar em caso de erro ou estouro de timeout.
     * @returns O conteúdo bruto da saída padrão (stdout) retornado pelo OpenCode.
     * @throws Lança erro caso todas as tentativas falhem.
     */
    async run(instructions, timeoutSeconds, maxRetries) {
        const tempFile = path.join(this.workspaceRoot, '.review-instructions.md');
        let attempt = 0;
        let lastError = null;
        while (attempt <= maxRetries) {
            attempt++;
            try {
                // Grava as instruções temporariamente no workspace para o OpenCode ler
                await fs.writeFile(tempFile, instructions, 'utf-8');
                const opencodeBin = process.env.OPENCODE_BIN || 'opencode';
                const args = ['run', '--instructions', tempFile];
                console.info(`Invocando a CLI (Tentativa ${attempt}/${maxRetries + 1}): ${opencodeBin} ${args.join(' ')}`);
                // Executa o subprocesso usando a biblioteca execa com timeout configurado
                const { stdout } = await execa(opencodeBin, args, {
                    timeout: timeoutSeconds * 1000,
                    cwd: this.workspaceRoot
                });
                return stdout;
            }
            catch (error) {
                lastError = error;
                console.warn(`Aviso: Tentativa ${attempt} falhou: ${error.message}`);
                if (attempt <= maxRetries) {
                    console.info('Aguardando 1 segundo antes de tentar novamente...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            finally {
                // Garante a remoção do arquivo temporário de instruções em qualquer cenário
                await fs.rm(tempFile, { force: true }).catch(err => {
                    console.warn(`Aviso: Não foi possível deletar o arquivo temporário ${tempFile}: ${err.message}`);
                });
            }
        }
        throw new Error(`Falha na execução do OpenCode após ${attempt} tentativas. Último erro: ${lastError?.message}`);
    }
    /**
     * Extrai o bloco de texto JSON da saída bruta retornada pelo OpenCode.
     * Utiliza algoritmo de balanceamento de chaves ({}) baseado na localização da chave "findings".
     *
     * @param rawOutput - Texto de saída stdout gerado pela CLI do OpenCode.
     * @returns Apenas a string correspondente ao objeto JSON recortado da saída.
     * @throws Lança erro caso não consiga encontrar a chave "findings" ou as chaves equivalentes.
     */
    extractJson(rawOutput) {
        const findingsIndex = rawOutput.indexOf('"findings"');
        if (findingsIndex === -1) {
            throw new Error('Não foi possível localizar a chave "findings" na resposta do OpenCode.');
        }
        let firstBrace = rawOutput.indexOf('{');
        let jsonString = '';
        while (firstBrace !== -1 && firstBrace < findingsIndex) {
            let depth = 0;
            let inString = false;
            let escape = false;
            for (let i = firstBrace; i < rawOutput.length; i++) {
                const char = rawOutput[i];
                if (inString) {
                    if (escape) {
                        escape = false;
                    }
                    else if (char === '\\') {
                        escape = true;
                    }
                    else if (char === '"') {
                        inString = false;
                    }
                }
                else {
                    if (char === '"') {
                        inString = true;
                    }
                    else if (char === '{') {
                        depth++;
                    }
                    else if (char === '}') {
                        depth--;
                        if (depth === 0) {
                            if (i > findingsIndex) {
                                jsonString = rawOutput.slice(firstBrace, i + 1);
                                break;
                            }
                        }
                    }
                }
            }
            if (jsonString) {
                break;
            }
            firstBrace = rawOutput.indexOf('{', firstBrace + 1);
        }
        if (!jsonString) {
            throw new Error('Não foi possível localizar o bloco JSON estruturado de findings na resposta do OpenCode.');
        }
        return jsonString.trim();
    }
    /**
     * Valida a conformidade estrutural do JSON recebido contra as regras Zod.
     *
     * @param jsonStr - String contendo o objeto JSON estruturado extraído.
     * @returns O objeto tipado de ReviewResult contendo a lista de findings validada.
     * @throws Lança erro se o JSON for inválido ou se houver campos obrigatórios violados.
     */
    validate(jsonStr) {
        try {
            const parsedJson = JSON.parse(jsonStr);
            const validated = ReviewResultSchema.safeParse(parsedJson);
            if (!validated.success) {
                const formattedErrors = validated.error.errors
                    .map(err => `[${err.path.join('.')}]: ${err.message}`)
                    .join(', ');
                throw new Error(`Validação de findings falhou: ${formattedErrors}`);
            }
            return validated.data;
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Resposta do OpenCode contém JSON inválido: ${error.message}`);
            }
            throw error;
        }
    }
}
export default OpenCodeAdapter;
