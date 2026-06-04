import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { OpenCodeAdapter } from '../src/opencode/adapter.js';
import { execa } from 'execa';

// Mocka o módulo execa
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '{"findings": []}' })
}));

describe('OpenCodeAdapter', () => {
  let adapter: OpenCodeAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new OpenCodeAdapter();
  });

  it('deve criar arquivo temporário, executar execa com timeout e apagar o arquivo', async () => {
    const mockInstructions = 'Instruções de teste';
    const tempFile = path.join(process.cwd(), '.review-instructions.md');

    const result = await adapter.run(mockInstructions, 300, 3);

    // Verifica que o execa foi chamado com os argumentos corretos e timeout configurado
    expect(execa).toHaveBeenCalledWith('opencode', ['run', '--instructions', tempFile], {
      timeout: 300000,
      cwd: process.cwd()
    });

    expect(result).toBe('{"findings": []}');

    // Verifica que o arquivo temporário foi removido no final
    const fileExists = await fs.access(tempFile).then(() => true).catch(() => false);
    expect(fileExists).toBe(false);
  });

  it('deve tentar executar novamente em caso de falha (mecanismo de retry)', async () => {
    const mockInstructions = 'Instruções de teste';
    
    // Falha na primeira tentativa e funciona na segunda
    vi.mocked(execa)
      .mockRejectedValueOnce(new Error('Erro temporário'))
      .mockResolvedValueOnce({ stdout: '{"findings": []}' } as any);

    const result = await adapter.run(mockInstructions, 300, 1);
    expect(result).toBe('{"findings": []}');
    expect(execa).toHaveBeenCalledTimes(2);
  });

  it('deve estourar erro se exceder o número máximo de retries', async () => {
    const mockInstructions = 'Instruções de teste';

    // Falha em todas as tentativas
    vi.mocked(execa).mockRejectedValue(new Error('Falha contínua'));

    await expect(adapter.run(mockInstructions, 10, 2)).rejects.toThrow(
      'Falha na execução do OpenCode após 3 tentativas'
    );
    expect(execa).toHaveBeenCalledTimes(3);
  });

  it('deve extrair JSON corretamente da string bruta', () => {
    const rawOutput = `Ruído inicial.
{
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
}
Ruído final.`;
    const jsonStr = adapter.extractJson(rawOutput);
    expect(jsonStr).toContain('"findings"');
    expect(jsonStr.startsWith('{')).toBe(true);
    expect(jsonStr.endsWith('}')).toBe(true);
  });

  it('deve validar JSON correto usando validate', () => {
    const jsonStr = `{
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

    const validated = adapter.validate(jsonStr);
    expect(validated.findings.length).toBe(1);
    expect(validated.findings[0].file).toBe('src/index.ts');
  });

  it('deve lançar erro se validate receber JSON inválido ou malformado', () => {
    const jsonStr = `{ "findings": [ { "severity": "invalid-severity" } ] }`;
    expect(() => adapter.validate(jsonStr)).toThrow('Validação de findings falhou');
  });
});
