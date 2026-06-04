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
export declare const ConfigSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodNumber>;
    skills: z.ZodDefault<z.ZodObject<{
        path: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
    }, {
        path?: string | undefined;
    }>>;
    review: z.ZodDefault<z.ZodObject<{
        max_findings: z.ZodDefault<z.ZodNumber>;
        timeoutSeconds: z.ZodDefault<z.ZodNumber>;
        maxRetries: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        max_findings: number;
        timeoutSeconds: number;
        maxRetries: number;
    }, {
        max_findings?: number | undefined;
        timeoutSeconds?: number | undefined;
        maxRetries?: number | undefined;
    }>>;
    output: z.ZodDefault<z.ZodObject<{
        mode: z.ZodDefault<z.ZodEnum<["summary", "inline", "both"]>>;
    }, "strip", z.ZodTypeAny, {
        mode: "summary" | "inline" | "both";
    }, {
        mode?: "summary" | "inline" | "both" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: number;
    skills: {
        path: string;
    };
    review: {
        max_findings: number;
        timeoutSeconds: number;
        maxRetries: number;
    };
    output: {
        mode: "summary" | "inline" | "both";
    };
}, {
    version?: number | undefined;
    skills?: {
        path?: string | undefined;
    } | undefined;
    review?: {
        max_findings?: number | undefined;
        timeoutSeconds?: number | undefined;
        maxRetries?: number | undefined;
    } | undefined;
    output?: {
        mode?: "summary" | "inline" | "both" | undefined;
    } | undefined;
}>;
export type ParsedConfig = z.infer<typeof ConfigSchema>;
/**
 * Carrega, analisa e valida o arquivo de configuração (.review-agent.yml) localizado na raiz do projeto.
 *
 * @param configPath - Caminho de arquivo alternativo opcional para o arquivo de configuração.
 * @returns Retorna o objeto de configuração tipado, aplicando valores padrão caso o arquivo não exista ou esteja parcial.
 * @throws Lança um erro contendo a listagem das falhas estruturais caso o arquivo YAML contenha propriedades fora da especificação do Zod.
 */
export declare function loadConfig(configPath?: string): Promise<ParsedConfig>;
