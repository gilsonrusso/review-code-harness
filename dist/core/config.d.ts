import { z } from 'zod';
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
    }, "strip", z.ZodTypeAny, {
        max_findings: number;
    }, {
        max_findings?: number | undefined;
    }>>;
    output: z.ZodDefault<z.ZodObject<{
        format: z.ZodDefault<z.ZodEnum<["github-pr", "console"]>>;
    }, "strip", z.ZodTypeAny, {
        format: "github-pr" | "console";
    }, {
        format?: "github-pr" | "console" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: number;
    skills: {
        path: string;
    };
    review: {
        max_findings: number;
    };
    output: {
        format: "github-pr" | "console";
    };
}, {
    version?: number | undefined;
    skills?: {
        path?: string | undefined;
    } | undefined;
    review?: {
        max_findings?: number | undefined;
    } | undefined;
    output?: {
        format?: "github-pr" | "console" | undefined;
    } | undefined;
}>;
export type ParsedConfig = z.infer<typeof ConfigSchema>;
/**
 * Lê e valida o arquivo de configuração (.review-agent.yml) na raiz do projeto.
 * Se o arquivo não for encontrado ou estiver incompleto, aplica os valores padrão.
 */
export declare function loadConfig(configPath?: string): Promise<ParsedConfig>;
