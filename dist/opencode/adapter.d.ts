import { ReviewResult } from '../models/types.js';
/**
 * Adaptador de Integração com o OpenCode (OpenCodeAdapter).
 *
 * Classe responsável pelo ciclo de vida de invocação da CLI do OpenCode,
 * incluindo o controle de tempo limite (timeout) e tentativas automáticas (retries) em caso
 * de falhas operacionais ou lentidão de rede dos modelos de IA.
 *
 * Também encapsula as lógicas de extração e validação do payload JSON de findings.
 */
export declare class OpenCodeAdapter {
    private workspaceRoot;
    /**
     * Construtor do adaptador do OpenCode.
     *
     * @param workspaceRoot - Caminho do diretório raiz onde os comandos devem ser executados.
     */
    constructor(workspaceRoot?: string);
    /**
     * Invoca a CLI do OpenCode localmente passando as instruções diretamente como argumento.
     * Executa a CLI com timeout definido e realiza novas tentativas automáticas se falhar.
     *
     * @param instructions - O texto bruto de instruções que guiará a IA nas revisões.
     * @param timeoutSeconds - Limite máximo de segundos para cada tentativa de execução.
     * @param maxRetries - Número total de tentativas adicionais a realizar em caso de erro ou estouro de timeout.
     * @returns O conteúdo bruto da saída padrão (stdout) retornado pelo OpenCode.
     * @throws Lança erro caso todas as tentativas falhem.
     */
    run(instructions: string, timeoutSeconds: number, maxRetries: number): Promise<string>;
    /**
     * Extrai o bloco de texto JSON da saída bruta retornada pelo OpenCode.
     * Utiliza algoritmo de balanceamento de chaves ({}) baseado na localização da chave "findings".
     *
     * @param rawOutput - Texto de saída stdout gerado pela CLI do OpenCode.
     * @returns Apenas a string correspondente ao objeto JSON recortado da saída.
     * @throws Lança erro caso não consiga encontrar a chave "findings" ou as chaves equivalentes.
     */
    extractJson(rawOutput: string): string;
    /**
     * Valida a conformidade estrutural do JSON recebido contra as regras Zod.
     *
     * @param jsonStr - String contendo o objeto JSON estruturado extraído.
     * @returns O objeto tipado de ReviewResult contendo a lista de findings validada.
     * @throws Lança erro se o JSON for inválido ou se houver campos obrigatórios violados.
     */
    validate(jsonStr: string): ReviewResult;
}
export default OpenCodeAdapter;
