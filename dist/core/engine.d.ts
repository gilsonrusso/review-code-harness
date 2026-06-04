interface EngineOptions {
    configPath?: string;
    dryRun?: boolean;
}
/**
 * Coordenador/Orquestrador Principal do Fluxo (runReviewEngine).
 *
 * Essa função executa o pipeline fim a fim da revisão de código automatizada:
 * 1. Lê as configurações do projeto `.review-agent.yml`.
 * 2. Extrai metadados do repositório Git local e variáveis de ambiente (SHA do commit, repositório, pull request número).
 * 3. Inicializa e roda o `DiffCoordinateValidator` para mapear os trechos modificados do PR.
 * 4. Compila as instruções restritivas para guiar o revisor IA.
 * 5. Instancia o `OpenCodeAdapter` e invoca a CLI com suporte a timeout e retries em caso de falha.
 * 6. Captura o stdout da CLI, extrai e valida o JSON estruturado dos findings.
 * 7. Limita a quantidade de ocorrências com base no `max_findings` configurado.
 * 8. Direciona os resultados para publicação no GitHub Actions (ou terminal) respeitando o `output.mode`.
 *
 * @param options - Parâmetros opcionais passados pela CLI (caminhos alternativos ou flag de dry-run).
 */
export declare function runReviewEngine(options?: EngineOptions): Promise<void>;
export {};
