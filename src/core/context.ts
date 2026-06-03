import { ReviewContext } from '../models/types.js';

/**
 * Constrói a instrução estruturada contendo as regras (Skills) e o Diff
 * que será fornecido como contexto para o OpenCode.
 */
export function buildInstructions(context: ReviewContext): string {
  const { skills, diff } = context;

  // Formata as skills
  let skillsSection = 'Nenhuma skill configurada para este projeto.\n';
  if (skills.length > 0) {
    skillsSection = skills
      .map(skill => {
        return `### Skill: ${skill.name}\n\n${skill.content}\n`;
      })
      .join('\n---\n\n');
  }

  // Formata a lista de arquivos do diff
  const filesList = diff.files
    .map(f => `- **${f.path}** (${f.status})`)
    .join('\n');

  // Formata o diff bruto
  const rawDiffContent = diff.rawPatch || 'Nenhum diff encontrado.';

  return `Você é o Review Agent, um revisor de código sênior de IA.
Sua tarefa é analisar as alterações do Pull Request atual e apontar problemas seguindo estritamente as diretrizes (Skills) definidas pelo projeto.

Você tem acesso ao workspace do projeto e pode inspecionar arquivos adicionais se precisar entender o contexto das modificações.

---
## DIRETRIZES DE REVISÃO (SKILLS DO PROJETO)
As regras abaixo devem ser validadas. Qualquer desvio deve ser relatado como um finding.

${skillsSection}

---
## ARQUIVOS ALTERADOS NO PR
${filesList}

---
## PATCH DE ALTERAÇÕES (GIT DIFF)
\`\`\`diff
${rawDiffContent}
\`\`\`

---
## DIRETRIZES DE SAÍDA (FORMATO OBRIGATÓRIO)
Você deve retornar as suas descobertas EXCLUSIVAMENTE em formato JSON, seguindo rigorosamente a estrutura abaixo:

\`\`\`json
{
  "findings": [
    {
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "file": "caminho/do/arquivo/com/problema.ts",
      "line": numero_da_linha,
      "title": "Título Curto e Direto do Problema",
      "description": "Explicação detalhada do porquê viola as diretrizes do projeto ou convenções.",
      "suggestion": "Sugestão técnica clara de como refatorar ou corrigir o código."
    }
  ]
}
\`\`\`

Regras adicionais para a sua resposta:
1. Responda APENAS com o JSON contendo as descobertas.
2. Certifique-se de que os caminhos dos arquivos correspondem exatamente aos caminhos informados no diff.
3. Se não encontrar problemas em nenhuma regra, retorne a lista de findings vazia: \`{"findings": []}\`.
`;
}
export default buildInstructions;
