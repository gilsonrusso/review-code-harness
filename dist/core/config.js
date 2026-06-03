import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { z } from 'zod';
export const ConfigSchema = z.object({
    version: z.number().default(1),
    skills: z.object({
        path: z.string().default('.skills')
    }).default({ path: '.skills' }),
    review: z.object({
        max_findings: z.number().int().positive().default(20)
    }).default({ max_findings: 20 }),
    output: z.object({
        format: z.enum(['github-pr', 'console']).default('github-pr')
    }).default({ format: 'github-pr' })
});
/**
 * Lê e valida o arquivo de configuração (.review-agent.yml) na raiz do projeto.
 * Se o arquivo não for encontrado ou estiver incompleto, aplica os valores padrão.
 */
export async function loadConfig(configPath) {
    const targetPath = configPath || path.join(process.cwd(), '.review-agent.yml');
    try {
        const fileExists = await fs
            .access(targetPath)
            .then(() => true)
            .catch(() => false);
        if (!fileExists) {
            return ConfigSchema.parse({});
        }
        const fileContent = await fs.readFile(targetPath, 'utf-8');
        let parsedYaml;
        try {
            parsedYaml = yaml.parse(fileContent);
        }
        catch (yamlError) {
            throw new Error(`Falha no parse do arquivo YAML ${targetPath}: ${yamlError.message}`);
        }
        const validated = ConfigSchema.safeParse(parsedYaml || {});
        if (!validated.success) {
            const errors = validated.error.errors
                .map(err => `[${err.path.join('.')}]: ${err.message}`)
                .join(', ');
            throw new Error(`Configuração inválida em ${targetPath}: ${errors}`);
        }
        return validated.data;
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return ConfigSchema.parse({});
        }
        throw error;
    }
}
