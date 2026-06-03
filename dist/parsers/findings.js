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
/**
 * Extrai o bloco JSON contendo as descobertas da resposta do OpenCode,
 * realiza o parse e valida a conformidade com o schema Zod.
 */
export function parseFindings(rawText) {
    const findingsIndex = rawText.indexOf('"findings"');
    if (findingsIndex === -1) {
        throw new Error('Não foi possível localizar a chave "findings" na resposta do OpenCode.');
    }
    const openBraceIndex = rawText.lastIndexOf('{', findingsIndex);
    const closeBraceIndex = rawText.lastIndexOf('}');
    if (openBraceIndex === -1 || closeBraceIndex === -1 || openBraceIndex > closeBraceIndex) {
        throw new Error('Não foi possível localizar o bloco JSON estruturado de findings na resposta do OpenCode.');
    }
    const jsonString = rawText.slice(openBraceIndex, closeBraceIndex + 1).trim();
    try {
        const parsedJson = JSON.parse(jsonString);
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
