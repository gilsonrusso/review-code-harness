import { ReviewContext } from '../models/types.js';
/**
 * Constrói a instrução estruturada contendo as regras (Skills) e o Diff
 * que será fornecido como contexto para o OpenCode.
 */
export declare function buildInstructions(context: ReviewContext): string;
export default buildInstructions;
