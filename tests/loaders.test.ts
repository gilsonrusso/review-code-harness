import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { loadSkills, parseRawDiff } from '../src/core/loaders.js';

describe('SkillLoader', () => {
  const tempSkillsDir = path.join(process.cwd(), 'tests-temp-skills');

  beforeAll(async () => {
    await fs.mkdir(tempSkillsDir, { recursive: true });
    await fs.writeFile(path.join(tempSkillsDir, 'rule1.md'), 'Regra de Arquitetura 1', 'utf-8');
    await fs.writeFile(path.join(tempSkillsDir, 'rule2.md'), 'Regra de Segurança 2', 'utf-8');
    await fs.writeFile(path.join(tempSkillsDir, 'ignore.txt'), 'Deve ignorar este arquivo', 'utf-8');
  });

  afterAll(async () => {
    await fs.rm(tempSkillsDir, { recursive: true, force: true });
  });

  it('deve carregar todas as skills md do diretório', async () => {
    const skills = await loadSkills(tempSkillsDir);
    expect(skills.length).toBe(2);
    expect(skills.map(s => s.name)).toContain('rule1');
    expect(skills.map(s => s.name)).toContain('rule2');
    expect(skills.map(s => s.content)).toContain('Regra de Arquitetura 1');
  });

  it('deve retornar lista vazia e aviso se diretório não existir', async () => {
    const skills = await loadSkills(path.join(tempSkillsDir, 'nonexistent'));
    expect(skills).toEqual([]);
  });
});

describe('DiffParser', () => {
  it('deve parsear diff de modificação padrão', () => {
    const rawDiff = `diff --git a/src/service.ts b/src/service.ts
index 72ef9e3..44f9c5d 100644
--- a/src/service.ts
+++ b/src/service.ts
@@ -1,3 +1,4 @@
 export function process() {
+  console.log("changed");
 }
`;
    const parsed = parseRawDiff(rawDiff);
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].path).toBe('src/service.ts');
    expect(parsed.files[0].status).toBe('modified');
    expect(parsed.files[0].patch).toContain('diff --git a/src/service.ts');
  });

  it('deve parsear diff de novos arquivos', () => {
    const rawDiff = `diff --git a/src/new-file.ts b/src/new-file.ts
new file mode 100644
index 0000000..72ef9e3
--- /dev/null
+++ b/src/new-file.ts
@@ -0,0 +1 @@
+export const value = 42;
`;
    const parsed = parseRawDiff(rawDiff);
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].path).toBe('src/new-file.ts');
    expect(parsed.files[0].status).toBe('added');
  });

  it('deve parsear diff de arquivos deletados', () => {
    const rawDiff = `diff --git a/src/old-file.ts b/src/old-file.ts
deleted file mode 100644
index 72ef9e3..0000000
--- a/src/old-file.ts
+++ /dev/null
@@ -1 +0,0 @@
-export const deprecated = true;
`;
    const parsed = parseRawDiff(rawDiff);
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].path).toBe('src/old-file.ts');
    expect(parsed.files[0].status).toBe('deleted');
  });

  it('deve parsear renomeação de arquivos', () => {
    const rawDiff = `diff --git a/src/old-name.ts b/src/new-name.ts
similarity index 100%
rename from src/old-name.ts
rename to src/new-name.ts
`;
    const parsed = parseRawDiff(rawDiff);
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].path).toBe('src/new-name.ts');
    expect(parsed.files[0].status).toBe('renamed');
  });
});
