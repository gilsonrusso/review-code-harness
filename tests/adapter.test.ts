import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { runOpenCode } from '../src/opencode/adapter.js';
import { execa } from 'execa';

// Mocka o módulo execa
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '{"findings": []}' })
}));

describe('OpenCodeAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar arquivo temporário, executar execa e apagar o arquivo', async () => {
    const mockInstructions = 'Instruções de teste';
    const tempFile = path.join(process.cwd(), '.review-instructions.md');

    // Executa
    const result = await runOpenCode(mockInstructions);

    // Verifica que o execa foi chamado com os argumentos corretos
    expect(execa).toHaveBeenCalledWith('opencode', ['run', '--instructions', tempFile]);

    // O resultado deve ser o mockado
    expect(result).toBe('{"findings": []}');

    // Verifica que o arquivo temporário foi removido no final
    const fileExists = await fs.access(tempFile).then(() => true).catch(() => false);
    expect(fileExists).toBe(false);
  });

  it('deve limpar arquivo temporário mesmo em caso de erro na execução do execa', async () => {
    // Força o execa a falhar
    vi.mocked(execa).mockRejectedValueOnce(new Error('Falha catastrófica da CLI'));

    const mockInstructions = 'Instruções que causam erro';
    const tempFile = path.join(process.cwd(), '.review-instructions.md');

    await expect(runOpenCode(mockInstructions)).rejects.toThrow('Falha na execução do OpenCode');

    // Verifica que o arquivo temporário foi apagado
    const fileExists = await fs.access(tempFile).then(() => true).catch(() => false);
    expect(fileExists).toBe(false);
  });
});
