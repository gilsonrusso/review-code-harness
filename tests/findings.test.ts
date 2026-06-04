import { describe, it, expect } from 'vitest';
import { parseFindings } from '../src/parsers/findings.js';

describe('FindingsParser', () => {
  it('deve parsear JSON puro com sucesso (sem summary, com suggestion)', () => {
    const rawInput = `{
      "findings": [
        {
          "severity": "high",
          "file": "src/index.ts",
          "line": 10,
          "title": "Rule Violation",
          "description": "Violation details",
          "suggestion": "How to fix"
        }
      ]
    }`;
    const parsed = parseFindings(rawInput);
    expect(parsed.findings.length).toBe(1);
    expect(parsed.findings[0].file).toBe('src/index.ts');
    expect(parsed.findings[0].severity).toBe('high');
    expect(parsed.findings[0].suggestion).toBe('How to fix');
  });

  it('deve parsear JSON sem suggestion (campo opcional)', () => {
    const rawInput = `{
      "findings": [
        {
          "severity": "medium",
          "file": "src/auth.ts",
          "line": 50,
          "title": "Rule Violation",
          "description": "Violation details"
        }
      ]
    }`;
    const parsed = parseFindings(rawInput);
    expect(parsed.findings.length).toBe(1);
    expect(parsed.findings[0].file).toBe('src/auth.ts');
    expect(parsed.findings[0].suggestion).toBeUndefined();
  });

  it('deve parsear JSON contendo summary opcional', () => {
    const rawInput = `{
      "summary": {
        "critical": 0,
        "high": 1,
        "medium": 2,
        "low": 0,
        "info": 0
      },
      "findings": [
        {
          "severity": "high",
          "file": "src/db.ts",
          "line": 12,
          "title": "SQL Injection",
          "description": "SQL injection risk"
        }
      ]
    }`;
    const parsed = parseFindings(rawInput);
    expect(parsed.findings.length).toBe(1);
    expect(parsed.summary).toBeDefined();
    expect(parsed.summary?.high).toBe(1);
  });

  it('deve extrair e parsear JSON envolto em blocos markdown', () => {
    const rawInput = `Algum comentário inicial explicativo.
\`\`\`json
{
  "findings": [
    {
      "severity": "critical",
      "file": "src/db.ts",
      "line": 45,
      "title": "SQL Injection",
      "description": "Query is not parameterized",
      "suggestion": "Use params"
    }
  ]
}
\`\`\`
Algum texto final.`;
    const parsed = parseFindings(rawInput);
    expect(parsed.findings.length).toBe(1);
    expect(parsed.findings[0].file).toBe('src/db.ts');
    expect(parsed.findings[0].severity).toBe('critical');
  });

  it('deve lançar erro caso falte campos obrigatórios', () => {
    const rawInput = `{
      "findings": [
        {
          "severity": "high",
          "file": "src/index.ts",
          "line": 10
        }
      ]
    }`;
    expect(() => parseFindings(rawInput)).toThrow('Validação de findings falhou');
  });

  it('deve lançar erro se a severidade for inválida', () => {
    const rawInput = `{
      "findings": [
        {
          "severity": "mega-critical",
          "file": "src/index.ts",
          "line": 10,
          "title": "Rule Violation",
          "description": "Violation details",
          "suggestion": "How to fix"
        }
      ]
    }`;
    expect(() => parseFindings(rawInput)).toThrow('Validação de findings falhou');
  });

  it('deve lançar erro se o JSON for sintaticamente inválido', () => {
    const rawInput = `{
      "findings": [
        {
          "severity": "high",
          "file": "src/index.ts",
          "line": 10,
    }`; // Chaves inválidas
    expect(() => parseFindings(rawInput)).toThrow();
  });
});
