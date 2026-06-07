import { z } from 'zod';
import { ReviewResult } from '../models/types.js';
/**
 * Esquema de validação Zod para um Finding (descoberta individual).
 * Valida a tipagem de severidade e obrigatoriedade dos campos de localização e descrição.
 * A sugestão de correção técnica (suggestion) é opcional.
 */
export declare const FindingSchema: z.ZodObject<{
    severity: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
    file: z.ZodString;
    line: z.ZodNumber;
    title: z.ZodString;
    description: z.ZodString;
    suggestion: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | undefined, string | null | undefined>;
}, "strip", z.ZodTypeAny, {
    severity: "critical" | "high" | "medium" | "low" | "info";
    file: string;
    line: number;
    title: string;
    description: string;
    suggestion?: string | undefined;
}, {
    severity: "critical" | "high" | "medium" | "low" | "info";
    file: string;
    line: number;
    title: string;
    description: string;
    suggestion?: string | null | undefined;
}>;
/**
 * Esquema de validação Zod para a resposta estruturada contendo findings.
 * Valida a presença obrigatória do array de findings e valida a estrutura opcional
 * do objeto summary retornado da IA.
 */
export declare const ReviewResultSchema: z.ZodObject<{
    findings: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
        file: z.ZodString;
        line: z.ZodNumber;
        title: z.ZodString;
        description: z.ZodString;
        suggestion: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string | undefined, string | null | undefined>;
    }, "strip", z.ZodTypeAny, {
        severity: "critical" | "high" | "medium" | "low" | "info";
        file: string;
        line: number;
        title: string;
        description: string;
        suggestion?: string | undefined;
    }, {
        severity: "critical" | "high" | "medium" | "low" | "info";
        file: string;
        line: number;
        title: string;
        description: string;
        suggestion?: string | null | undefined;
    }>, "many">;
    summary: z.ZodOptional<z.ZodObject<{
        critical: z.ZodDefault<z.ZodNumber>;
        high: z.ZodDefault<z.ZodNumber>;
        medium: z.ZodDefault<z.ZodNumber>;
        low: z.ZodDefault<z.ZodNumber>;
        info: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
    }, {
        critical?: number | undefined;
        high?: number | undefined;
        medium?: number | undefined;
        low?: number | undefined;
        info?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    findings: {
        severity: "critical" | "high" | "medium" | "low" | "info";
        file: string;
        line: number;
        title: string;
        description: string;
        suggestion?: string | undefined;
    }[];
    summary?: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
    } | undefined;
}, {
    findings: {
        severity: "critical" | "high" | "medium" | "low" | "info";
        file: string;
        line: number;
        title: string;
        description: string;
        suggestion?: string | null | undefined;
    }[];
    summary?: {
        critical?: number | undefined;
        high?: number | undefined;
        medium?: number | undefined;
        low?: number | undefined;
        info?: number | undefined;
    } | undefined;
}>;
/**
 * Varre o texto bruto buscando por blocos JSON delimitados por chaves {} que
 * contenham a propriedade "findings". Retorna a string do bloco recortado.
 *
 * @param rawText - Texto de entrada contendo o JSON.
 * @returns A string correspondente ao objeto JSON de findings.
 * @throws Lança erro caso o bloco JSON não seja localizado.
 */
export declare function extractJsonBlock(rawText: string): string;
/**
 * Extrai, analisa e valida a resposta da CLI do OpenCode.
 *
 * @param rawText - Texto de saída bruto retornado pela CLI do OpenCode.
 * @returns O objeto ReviewResult contendo a lista estruturada de findings após validação Zod.
 * @throws Lança erro caso o JSON não seja encontrado, esteja malformado ou não passe nas regras Zod.
 */
export declare function parseFindings(rawText: string): ReviewResult;
export default parseFindings;
