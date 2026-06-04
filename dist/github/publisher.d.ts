import { Finding, ReviewResult } from '../models/types.js';
import { DiffCoordinateValidator } from '../core/diff-validator.js';
export interface SeveritySummary {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
}
/**
 * Calcula dinamicamente a contagem de ocorrências agrupadas por severidade.
 *
 * Atua como a única fonte de verdade para a formatação do resumo de revisão,
 * garantindo consistência estatística mesmo se a IA retornar contagens incorretas
 * ou omitir a propriedade `summary`.
 *
 * @param findings - Lista de ocorrências de revisão encontradas.
 * @returns O objeto SeveritySummary contendo a contagem por tipo de severidade.
 */
export declare function calculateSummary(findings: Finding[]): SeveritySummary;
/**
 * Formata a lista de findings e a contagem consolidada em uma tabela Markdown amigável e legível.
 *
 * Gera uma seção Markdown estruturada que serve como o corpo principal (body) da revisão do PR
 * contendo uma tabela resumo e detalhes individuais de cada ocorrência.
 *
 * @param findings - Lista de descobertas individuais.
 * @param summary - Objeto contendo o resumo consolidado de severidades calculado.
 * @returns String formatada em Markdown contendo tabelas e emojis de severidade.
 */
export declare function formatFindingsMarkdown(findings: Finding[], summary: SeveritySummary): string;
/**
 * Publica os comentários gerais e inline estruturados no Pull Request do GitHub.
 *
 * Utiliza a API de Pull Request Reviews (`pulls.createReview`) do GitHub para publicar
 * o sumário Markdown e todos os comentários inline de linhas em um único lote/transação.
 *
 * Antes de submeter os comentários inline, realiza uma filtragem contra o `DiffCoordinateValidator`:
 * - Qualquer finding que aponte para um arquivo ou linha que não tenha sido modificado/adicionado no diff
 *   será descartado do array de comentários inline (evitando rejeição pela API do GitHub),
 *   porém continuará listado no sumário/tabela geral Markdown do PR.
 *
 * Se não estiver em ambiente CI ou se GITHUB_TOKEN estiver ausente, realiza o fallback imprimindo no console.
 *
 * @param reviewResult - O resultado estruturado contendo a lista de findings da IA.
 * @param mode - Modo de saída: 'summary' (apenas resumo), 'inline' (apenas inline) ou 'both' (ambos).
 * @param validator - O validador de coordenadas de diff inicializado.
 * @param dryRun - Se true, simula a execução exibindo apenas no console e pulando chamadas de rede.
 * @param commitSha - O hash SHA do commit cabeça (head) da branch do PR onde os comentários inline serão ancorados.
 */
export declare function publishReview(reviewResult: ReviewResult, mode: 'summary' | 'inline' | 'both', validator?: DiffCoordinateValidator, dryRun?: boolean, commitSha?: string): Promise<void>;
