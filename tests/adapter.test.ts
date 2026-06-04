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
    vi.mocked(execa).mockResolvedValue({ stdout: '{"findings": []}' } as any);
    adapter = new OpenCodeAdapter();
  });

  it('deve invocar execa passando as instruções diretamente como argumento e com timeout correto', async () => {
    const mockInstructions = 'Instruções de teste';

    const result = await adapter.run(mockInstructions, 300, 3);

    // Verifica que o execa foi chamado com os argumentos corretos e timeout configurado
    expect(execa).toHaveBeenCalledWith('opencode', ['run', mockInstructions], expect.objectContaining({
      timeout: 300000,
      cwd: process.cwd()
    }));

    expect(result).toBe('{"findings": []}');
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

  it('deve repassar a flag -m com o modelo de forma literal quando OPENCODE_MODEL estiver configurado', async () => {
    const originalModel = process.env.OPENCODE_MODEL;
    process.env.OPENCODE_MODEL = 'provider-custom/modelo-teste';

    try {
      await adapter.run('instruções', 300, 0);

      expect(execa).toHaveBeenCalledWith('opencode', ['run', 'instruções', '-m', 'provider-custom/modelo-teste'], expect.any(Object));
    } finally {
      process.env.OPENCODE_MODEL = originalModel;
    }
  });

  it('deve criar opencode.json temporário se ele não existir e deletá-lo no final', async () => {
    const configPath = path.join(process.cwd(), 'opencode.json');
    
    // Garante que o arquivo não existe antes de começar
    await fs.rm(configPath, { force: true });

    await adapter.run('instruções', 300, 0);

    // O arquivo deve ter sido deletado após a execução
    const exists = await fs.access(configPath).then(() => true).catch(() => false);
    expect(exists).toBe(false);
  });

  it('não deve deletar opencode.json se ele já existia antes da execução', async () => {
    const configPath = path.join(process.cwd(), 'opencode.json');
    
    // Cria um arquivo pré-existente
    await fs.writeFile(configPath, '{"permission": {}}', 'utf-8');

    try {
      await adapter.run('instruções', 300, 0);

      // O arquivo deve continuar existindo no final
      const exists = await fs.access(configPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    } finally {
      // Limpa o arquivo criado
      await fs.rm(configPath, { force: true });
    }
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
