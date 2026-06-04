/**
 * Representa um problema de revisão de código (finding) detectado pelo OpenCode.
 * Contém detalhes estruturados sobre a violação de regra ou recomendação técnica.
 */
export interface Finding {
    /**
     * O nível de severidade do problema detectado.
     * Valores aceitáveis: 'critical', 'high', 'medium', 'low' ou 'info'.
     */
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    /**
     * O caminho relativo do arquivo no workspace do projeto onde o problema foi identificado.
     * Exemplo: 'src/auth.ts'.
     */
    file: string;
    /**
     * O número exato da linha no novo arquivo (ou alteração do diff) onde o problema ocorre.
     */
    line: number;
    /**
     * Um título curto, claro e direto resumindo o tipo de problema encontrado.
     * Exemplo: 'Falta verificação de autorização'.
     */
    title: string;
    /**
     * Descrição detalhada do porquê o código em questão viola as diretrizes (skills)
     * configuradas para o projeto ou convenções técnicas gerais.
     */
    description: string;
    /**
     * Sugestão opcional com um exemplo ou descrição textual de como refatorar ou corrigir
     * o código para adequá-lo às regras do projeto.
     */
    suggestion?: string;
}
/**
 * Representa o resultado consolidado do processo de revisão de código.
 * Esse objeto encapsula todas as descobertas individuais e, opcionalmente,
 * o resumo estatístico fornecido pela engine de IA.
 */
export interface ReviewResult {
    /**
     * Lista contendo todas as descobertas individuais de revisão.
     */
    findings: Finding[];
    /**
     * Resumo estatístico opcional contendo a contagem de ocorrências agrupadas por severidade.
     * Embora o OpenCode possa fornecer este resumo, a fonte oficial da verdade será calculada
     * localmente pelo wrapper (Review Agent) para garantir consistência.
     */
    summary?: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
    };
}
