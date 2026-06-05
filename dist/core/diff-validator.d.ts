/**
 * Analisa a string de patch do diff unificado de um arquivo e extrai o conjunto
 * correspondente a todas as linhas ativas (adicionadas ou de contexto) no arquivo modificado (lado direito).
 *
 * @param patch - Conteúdo de diff de patch de arquivo individual.
 * @returns Um Set contendo os números inteiros de linha que pertencem às modificações do diff.
 */
export declare function parsePatchToLines(patch: string): Set<number>;
/**
 * Validador de Coordenadas de Modificação (DiffCoordinateValidator).
 *
 * Esse validador é responsável por carregar o conjunto de arquivos e linhas modificadas no PR atual.
 * A sua principal função é filtrar os comentários inline sugeridos pela IA, garantindo que
 * não façamos chamadas à API do GitHub em linhas intocadas/inválidas, o que geraria falhas de requisição.
 *
 * Estratégia de carregamento:
 * 1. Git local (Executa git diff comparando referências conhecidas no repositório local).
 * 2. API do GitHub (Executa pulls.listFiles como fallback de CI em shallow clones).
 */
export declare class DiffCoordinateValidator {
    private workspaceRoot;
    private gitMetadata?;
    private token?;
    private changedLinesMap;
    private failed;
    /**
     * Construtor da classe de validação de coordenadas.
     *
     * @param workspaceRoot - Caminho absoluto da pasta raiz do projeto.
     * @param gitMetadata - Metadados de repositório e pull request se disponíveis no ambiente CI.
     * @param token - Token GITHUB_TOKEN para autenticação na API do GitHub Actions.
     */
    constructor(workspaceRoot: string, gitMetadata?: {
        owner: string;
        repo: string;
        pullNumber?: number;
        commitSha: string;
    }, token?: string);
    /**
     * Inicializa o mapa de coordenadas buscando os diffs das alterações.
     *
     * Tenta primariamente rodar git diff comparando branches locais e remotas.
     * Se falhar ou estiver em clone raso, faz requisição de fallback à API rest do GitHub.
     * Se ambos falharem, desliga silenciosamente a validação retornando sempre true no isLineChanged
     * para evitar bloqueios ao processo.
     */
    initialize(options?: {
        commits?: string | number;
        baseBranch?: string;
    }): Promise<void>;
    /**
     * Verifica se uma determinada linha de um arquivo está inserida nas modificações sofridas no diff do PR.
     *
     * @param file - Nome/caminho relativo do arquivo sob verificação.
     * @param line - Número inteiro da linha a ser checada.
     * @returns Retorna true se a linha foi modificada ou se a validação falhou ao carregar (tolerância de erro).
     */
    isLineChanged(file: string, line: number): boolean;
    /**
     * Divide e mapeia o diff bruto de múltiplos arquivos produzidos localmente pelo comando git diff.
     *
     * @param rawDiff - String contendo a saída bruta gerada pelo comando git diff.
     */
    private parseRawDiff;
}
export default DiffCoordinateValidator;
