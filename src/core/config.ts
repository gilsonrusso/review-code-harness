import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { z } from 'zod';

/**
 * Esquema de validação Zod que define a estrutura de configuração permitida no arquivo `.review-agent.yml`.
 * 
 * Contém as seguintes chaves de configuração:
 * - `version`: Versão da estrutura de configuração (padrão: 1).
 * - `skills.path`: Pasta onde se encontram os arquivos markdown contendo regras de revisão (padrão: '.skills').
 * - `review.max_findings`: Limite máximo de ocorrências que o publicador aceitará reportar no PR (padrão: 20).
 * - `review.timeoutSeconds`: Tempo limite em segundos que o wrapper aguardará a CLI do OpenCode responder antes de abortar (padrão: 300).
 * - `review.maxRetries`: Quantidade de retentativas automáticas em caso de falha ou timeout da CLI (padrão: 3).
 * - `output.mode`: Define o formato/estratégia de publicação. 'summary' (comentário geral), 'inline' (comentários nas linhas do PR) ou 'both' (ambos).
 */
export const ConfigSchema = z.object({
  version: z.number().default(1),
  skills: z.object({
    path: z.string().default('.skills')
  }).default({ path: '.skills' }),
  review: z.object({
    max_findings: z.number().int().positive().default(20),
    timeoutSeconds: z.number().int().positive().default(300),
    maxRetries: z.number().int().nonnegative().default(3)
  }).default({ max_findings: 20, timeoutSeconds: 300, maxRetries: 3 }),
  output: z.object({
    mode: z.enum(['summary', 'inline', 'both']).default('summary')
  }).default({ mode: 'summary' })
});

export type ParsedConfig = z.infer<typeof ConfigSchema>;

/**
 * Carrega, analisa e valida o arquivo de configuração (.review-agent.yml) localizado na raiz do projeto.
 * 
 * @param configPath - Caminho de arquivo alternativo opcional para o arquivo de configuração.
 * @returns Retorna o objeto de configuração tipado, aplicando valores padrão caso o arquivo não exista ou esteja parcial.
 * @throws Lança um erro contendo a listagem das falhas estruturais caso o arquivo YAML contenha propriedades fora da especificação do Zod.
 */
export async function loadConfig(configPath?: string): Promise<ParsedConfig> {
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
    let parsedYaml: any;
    try {
      parsedYaml = yaml.parse(fileContent);
    } catch (yamlError: any) {
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
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return ConfigSchema.parse({});
    }
    throw error;
  }
}
