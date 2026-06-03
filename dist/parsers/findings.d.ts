import { z } from 'zod';
import { ReviewResult } from '../models/types.js';
export declare const FindingSchema: z.ZodObject<{
    severity: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
    file: z.ZodString;
    line: z.ZodNumber;
    title: z.ZodString;
    description: z.ZodString;
    suggestion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    severity: "critical" | "high" | "medium" | "low" | "info";
    file: string;
    line: number;
    title: string;
    description: string;
    suggestion: string;
}, {
    severity: "critical" | "high" | "medium" | "low" | "info";
    file: string;
    line: number;
    title: string;
    description: string;
    suggestion: string;
}>;
export declare const ReviewResultSchema: z.ZodObject<{
    findings: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
        file: z.ZodString;
        line: z.ZodNumber;
        title: z.ZodString;
        description: z.ZodString;
        suggestion: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        severity: "critical" | "high" | "medium" | "low" | "info";
        file: string;
        line: number;
        title: string;
        description: string;
        suggestion: string;
    }, {
        severity: "critical" | "high" | "medium" | "low" | "info";
        file: string;
        line: number;
        title: string;
        description: string;
        suggestion: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    findings: {
        severity: "critical" | "high" | "medium" | "low" | "info";
        file: string;
        line: number;
        title: string;
        description: string;
        suggestion: string;
    }[];
}, {
    findings: {
        severity: "critical" | "high" | "medium" | "low" | "info";
        file: string;
        line: number;
        title: string;
        description: string;
        suggestion: string;
    }[];
}>;
/**
 * Extrai o bloco JSON contendo as descobertas da resposta do OpenCode,
 * realiza o parse e valida a conformidade com o schema Zod.
 */
export declare function parseFindings(rawText: string): ReviewResult;
