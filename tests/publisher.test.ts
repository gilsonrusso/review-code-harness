import { describe, it, expect } from 'vitest';
import { formatFindingsMarkdown } from '../src/github/publisher.js';
import { Finding } from '../src/models/types.js';

describe('GitHubPublisher Markdown Formatter', () => {
  it('deve gerar texto informativo se não houver findings', () => {
    const markdown = formatFindingsMarkdown([]);
    expect(markdown).toContain('Nenhum problema encontrado!');
    expect(markdown).toContain('🤖 AI Review Summary');
  });

  it('deve gerar uma tabela estruturada de findings com severidades e detalhes', () => {
    const mockFindings: Finding[] = [
      {
        severity: 'critical',
        file: 'src/auth.ts',
        line: 12,
        title: 'Hardcoded Secret',
        description: 'Encontrado token exposto.',
        suggestion: 'Mova para variáveis de ambiente.'
      },
      {
        severity: 'medium',
        file: 'src/utils.ts',
        line: 85,
        title: 'Complexity',
        description: 'Função muito grande.',
        suggestion: 'Quebre em subfunções.'
      }
    ];

    const markdown = formatFindingsMarkdown(mockFindings);

    // Deve possuir o cabeçalho e contagem de ocorrências
    expect(markdown).toContain('🔴 **Critical** | 1');
    expect(markdown).toContain('🟡 **Medium** | 1');

    // Deve possuir os detalhes na tabela secundária
    expect(markdown).toContain('`src/auth.ts`');
    expect(markdown).toContain('Hardcoded Secret');
    expect(markdown).toContain('Mova para variáveis de ambiente.');

    expect(markdown).toContain('`src/utils.ts`');
    expect(markdown).toContain('Complexity');
    expect(markdown).toContain('Quebre em subfunções.');
  });
});
