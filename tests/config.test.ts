import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { loadConfig } from '../src/core/config.js';

describe('loadConfig', () => {
  const tempConfigDir = path.join(process.cwd(), 'tests-temp-config');

  beforeAll(async () => {
    await fs.mkdir(tempConfigDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(tempConfigDir, { recursive: true, force: true });
  });

  it('deve retornar valores padrão se o arquivo não existe', async () => {
    const config = await loadConfig(path.join(tempConfigDir, 'nonexistent.yml'));
    expect(config.version).toBe(1);
    expect(config.skills.path).toBe('.skills');
    expect(config.review.max_findings).toBe(20);
    expect(config.output.format).toBe('github-pr');
  });

  it('deve ler e validar arquivo YAML correto', async () => {
    const configPath = path.join(tempConfigDir, 'valid.yml');
    const content = `
version: 1
skills:
  path: custom-skills
review:
  max_findings: 5
output:
  format: console
`;
    await fs.writeFile(configPath, content, 'utf-8');
    const config = await loadConfig(configPath);
    expect(config.skills.path).toBe('custom-skills');
    expect(config.review.max_findings).toBe(5);
    expect(config.output.format).toBe('console');
  });

  it('deve lançar erro se o arquivo contiver schema inválido', async () => {
    const configPath = path.join(tempConfigDir, 'invalid.yml');
    const content = `
version: 1
review:
  max_findings: -10
`;
    await fs.writeFile(configPath, content, 'utf-8');
    await expect(loadConfig(configPath)).rejects.toThrow();
  });
});
