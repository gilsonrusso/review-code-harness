import { z } from 'zod';
import { ReviewResult } from '../models/types.js';

/**
 * Esquema de validação Zod para um Finding (descoberta individual).
 * Valida a tipagem de severidade e obrigatoriedade dos campos de localização e descrição.
 * A sugestão de correção técnica (suggestion) é opcional.
 */
export const FindingSchema = z.object({
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  file: z.string().min(1),
  line: z.number().int().nonnegative(),
  title: z.string().min(1),
  description: z.string().min(1),
  suggestion: z.string().nullish().transform(val => val ?? undefined)
});

/**
 * Esquema de validação Zod para a resposta estruturada contendo findings.
 * Valida a presença obrigatória do array de findings e valida a estrutura opcional
 * do objeto summary retornado da IA.
 */
export const ReviewResultSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.object({
    critical: z.number().int().nonnegative().default(0),
    high: z.number().int().nonnegative().default(0),
    medium: z.number().int().nonnegative().default(0),
    low: z.number().int().nonnegative().default(0),
    info: z.number().int().nonnegative().default(0)
  }).optional()
});

/**
 * Varre o texto bruto buscando por blocos JSON delimitados por chaves {} que
 * contenham a propriedade "findings". Retorna a string do bloco recortado.
 * 
 * @param rawText - Texto de entrada contendo o JSON.
 * @returns A string correspondente ao objeto JSON de findings.
 * @throws Lança erro caso o bloco JSON não seja localizado.
 */
export function extractJsonBlock(rawText: string): string {
  let firstBrace = rawText.indexOf('{');

  while (firstBrace !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    let foundEnd = -1;

    for (let i = firstBrace; i < rawText.length; i++) {
      const char = rawText[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (char === '\\') {
          escape = true;
        } else if (char === '"') {
          inString = false;
        }
      } else {
        if (char === '"') {
          inString = true;
        } else if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            foundEnd = i;
            break;
          }
        }
      }
    }

    if (foundEnd !== -1) {
      const candidate = rawText.slice(firstBrace, foundEnd + 1);
      if (candidate.includes('"findings"')) {
        return candidate.trim();
      }
    }

    firstBrace = rawText.indexOf('{', firstBrace + 1);
  }

  throw new Error('Não foi possível localizar o bloco JSON estruturado de findings na resposta do OpenCode.');
}

/**
 * Extrai, analisa e valida a resposta da CLI do OpenCode.
 * 
 * @param rawText - Texto de saída bruto retornado pela CLI do OpenCode.
 * @returns O objeto ReviewResult contendo a lista estruturada de findings após validação Zod.
 * @throws Lança erro caso o JSON não seja encontrado, esteja malformado ou não passe nas regras Zod.
 */
export function parseFindings(rawText: string): ReviewResult {
  try {
    const jsonString = extractJsonBlock(rawText);
    const parsedJson = JSON.parse(jsonString);
    const validated = ReviewResultSchema.safeParse(parsedJson);

    if (!validated.success) {
      const formattedErrors = validated.error.errors
        .map(err => `[${err.path.join('.')}]: ${err.message}`)
        .join(', ');
      throw new Error(`Validação de findings falhou: ${formattedErrors}`);
    }

    return validated.data;
  } catch (error: any) {
    if (error.message && error.message.includes('Não foi possível localizar o bloco JSON') && !rawText.includes('"findings"')) {
      console.warn('⚠️ Aviso: A IA não retornou um JSON de findings. Assumindo que nenhum erro foi encontrado.');
      return { findings: [] };
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Resposta do OpenCode contém JSON inválido: ${error.message}`);
    }
    throw error;
  }
}
export default parseFindings;