interface EngineOptions {
    configPath?: string;
    skillsDir?: string;
    dryRun?: boolean;
}
/**
 * Orquestrador principal do Review Agent. Coleta configurações, skills,
 * diff, executa o OpenCode, parseia os resultados e os publica no GitHub.
 */
export declare function runReviewEngine(options?: EngineOptions): Promise<void>;
export {};
