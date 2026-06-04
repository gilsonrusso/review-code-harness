/**
 * Constrói o texto detalhado e extremamente restritivo de instrução para o OpenCode.
 *
 * Essa função gera o prompt do orquestrador enviado à IA. O prompt é desenhado especificamente para:
 * 1. Definir o papel da IA como revisor sênior.
 * 2. Instruir a IA a consultar as habilidades registradas utilizando 'skill'.
 * 3. Instruir a IA a analisar o diff/workspace disponível.
 * 4. Obrigar a resposta a ser fornecida EXCLUSIVAMENTE em formato JSON estruturado com a chave "findings".
 * 5. Prevenir o uso de blocos Markdown explicativos adicionais fora do JSON para evitar quebras no parsing.
 */
export function buildInstructions() {
    return `Você é um Senior Code Reviewer.

Consulte as Habilidades (Skills) registradas no projeto utilizando a ferramenta nativa 'skill' para obter as diretrizes e regras de negócio que devem ser validadas no Pull Request.

Analise exclusivamente o Pull Request atual.

Você possui acesso ao workspace completo.

Retorne EXCLUSIVAMENTE JSON.

Formato obrigatório:

{
  "findings": [
    {
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "file": "caminho/do/arquivo",
      "line": 123,
      "title": "Título curto e direto",
      "description": "Explicação detalhada do problema",
      "suggestion": "Sugestão de correção (opcional)"
    }
  ]
}

Não produza markdown.
Não produza texto explicativo antes ou depois do JSON.
Não produza comentários fora do JSON.
`;
}
export default buildInstructions;
