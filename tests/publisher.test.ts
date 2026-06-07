import { describe, it, expect } from 'vitest';
import { formatFindingsMarkdown, calculateSummary } from '../src/github/publisher.js';
import { Finding } from '../src/models/types.js';

describe('GitHubPublisher Summary Calculator', () => {
  it('deve contar corretamente as severidades dos findings', () => {
    const mockFindings: Finding[] = [
      { severity: 'critical', file: 'a.ts', line: 1, title: 'T', description: 'D' },
      { severity: 'high', file: 'b.ts', line: 2, title: 'T', description: 'D' },
      { severity: 'high', file: 'c.ts', line: 3, title: 'T', description: 'D' },
      { severity: 'medium', file: 'd.ts', line: 4, title: 'T', description: 'D' },
      { severity: 'low', file: 'e.ts', line: 5, title: 'T', description: 'D' },
      { severity: 'info', file: 'f.ts', line: 6, title: 'T', description: 'D' }
    ];

    const summary = calculateSummary(mockFindings);
    expect(summary.critical).toBe(1);
    expect(summary.high).toBe(2);
    expect(summary.medium).toBe(1);
    expect(summary.low).toBe(1);
    expect(summary.info).toBe(1);
  });
});

describe('GitHubPublisher Markdown Formatter', () => {
  it('deve gerar texto informativo se não houver findings', () => {
    const summary = calculateSummary([]);
    const markdown = formatFindingsMarkdown([], summary);
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

    const summary = calculateSummary(mockFindings);
    const markdown = formatFindingsMarkdown(mockFindings, summary);

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

    // Deve possuir a tag de âncora oculta para deduplicação
    expect(markdown).toContain('<!-- review-agent-summary-anchor -->');
  });
});
