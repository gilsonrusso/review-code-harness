/**
 * Constrói o texto detalhado e extremamente restritivo de instrução para o OpenCode.
 *
 * Essa função gera o prompt do orquestrador enviado à IA. O prompt é desenhado especificamente para:
 * 1. Definir o papel da IA como revisor sênior.
 * 2. Apontar o caminho do diretório de regras (skills) do projeto que ela deve ler.
 * 3. Instruir a IA a analisar o diff/workspace disponível.
 * 4. Obrigar a resposta a ser fornecida EXCLUSIVAMENTE em formato JSON estruturado com a chave "findings".
 * 5. Prevenir o uso de blocos Markdown explicativos adicionais fora do JSON para evitar quebras no parsing.
 *
 * @param skillsPath - Caminho relativo do diretório onde as regras de skills estão armazenadas (ex: '.skills').
 * @returns O prompt estruturado final que deve ser fornecido como input para a CLI do OpenCode.
 */
export declare function buildInstructions(skillsPath: string): string;
export default buildInstructions;
