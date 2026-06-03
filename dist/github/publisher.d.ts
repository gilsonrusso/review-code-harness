import { Finding } from '../models/types.js';
/**
 * Formata a lista de findings em uma tabela Markdown amigável e legível.
 */
export declare function formatFindingsMarkdown(findings: Finding[]): string;
/**
 * Publica o sumário das descobertas como comentário no PR do GitHub.
 * Fallbacks locais imprimem a saída no terminal caso não esteja em CI.
 */
export declare function publishReview(findings: Finding[], dryRun?: boolean): Promise<void>;
