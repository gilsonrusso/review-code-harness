import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parsePatchToLines, DiffCoordinateValidator } from '../src/core/diff-validator.js';
import { simpleGit } from 'simple-git';
import { getOctokit } from '@actions/github';

// Mocka simple-git e @actions/github
vi.mock('simple-git', () => {
  const diffMock = vi.fn().mockResolvedValue('');
  const checkIsRepoMock = vi.fn().mockResolvedValue(true);
  return {
    simpleGit: vi.fn().mockReturnValue({
      checkIsRepo: checkIsRepoMock,
      diff: diffMock
    })
  };
});

vi.mock('@actions/github', () => {
  const listFilesMock = vi.fn().mockResolvedValue({ data: [] });
  const paginateMock = vi.fn().mockImplementation(async (method, params) => {
    const res = await method(params);
    return res.data;
  });
  return {
    getOctokit: vi.fn().mockReturnValue({
      paginate: paginateMock,
      rest: {
        pulls: {
          listFiles: listFilesMock
        }
      }
    })
  };
});

describe('Diff Unified Patch Parser', () => {
  it('deve extrair as linhas corretas (lado direito) de um patch simples', () => {
    const patch = `@@ -1,3 +1,4 @@
 export function process() {
+  console.log("changed");
 }`;
    const lines = parsePatchToLines(patch);
    expect(lines.has(1)).toBe(true); // context
    expect(lines.has(2)).toBe(true); // added
    expect(lines.has(3)).toBe(true); // context
    expect(lines.has(4)).toBe(false);
  });

  it('deve desconsiderar linhas removidas (-) na contagem do lado direito', () => {
    const patch = `@@ -1,3 +1,2 @@
-export const a = 1;
+export const a = 2;
 export const b = 3;`;
    const lines = parsePatchToLines(patch);
    // Linha 1 no novo arquivo deve ser a linha adicionada (+) e não a removida
    expect(lines.has(1)).toBe(true);
    expect(lines.has(2)).toBe(true);
    expect(lines.has(3)).toBe(false);
  });
});

describe('DiffCoordinateValidator', () => {
  const gitMock = simpleGit();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve usar diff local do Git com sucesso e validar coordenadas', async () => {
    const rawDiff = `diff --git a/src/auth.ts b/src/auth.ts
index 72ef9e3..44f9c5d 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,3 +10,4 @@
 export function auth() {
+  console.log("auth");
 }
`;
    vi.mocked(gitMock.diff).mockResolvedValueOnce(rawDiff);

    const validator = new DiffCoordinateValidator('/fake/path');
    await validator.initialize();

    expect(validator.isLineChanged('src/auth.ts', 10)).toBe(true);
    expect(validator.isLineChanged('src/auth.ts', 11)).toBe(true);
    expect(validator.isLineChanged('src/auth.ts', 12)).toBe(true);
    expect(validator.isLineChanged('src/auth.ts', 9)).toBe(false);
    expect(validator.isLineChanged('src/other.ts', 1)).toBe(false);
  });

  it('deve tentar fallback para API do GitHub caso git local falhe/não encontre diff', async () => {
    // Git local falha
    vi.mocked(gitMock.diff).mockRejectedValueOnce(new Error('no git'));

    const octokitMock = getOctokit('token');
    vi.mocked(octokitMock.rest.pulls.listFiles).mockResolvedValueOnce({
      data: [
        {
          filename: 'src/auth.ts',
          patch: `@@ -50,2 +50,3 @@\n+const token = 1;\n const user = 2;`
        }
      ]
    } as any);

    const validator = new DiffCoordinateValidator(
      '/fake/path',
      { owner: 'o', repo: 'r', pullNumber: 42, commitSha: 'sha' },
      'fake-token'
    );
    await validator.initialize();

    expect(validator.isLineChanged('src/auth.ts', 50)).toBe(true);
    expect(validator.isLineChanged('src/auth.ts', 51)).toBe(true);
    expect(validator.isLineChanged('src/auth.ts', 52)).toBe(false);
  });

  it('deve permitir todas as coordenadas (retornar true) se ambos falharem', async () => {
    // Ambos falham
    vi.mocked(gitMock.diff).mockRejectedValueOnce(new Error('no git'));
    const octokitMock = getOctokit('token');
    vi.mocked(octokitMock.rest.pulls.listFiles).mockRejectedValueOnce(new Error('no API'));

    const validator = new DiffCoordinateValidator(
      '/fake/path',
      { owner: 'o', repo: 'r', pullNumber: 42, commitSha: 'sha' },
      'fake-token'
    );
    await validator.initialize();

    // Como falhou a inicialização, o validator deve ser tolerante e aceitar as coordenadas (retornando true)
    expect(validator.isLineChanged('any/file.ts', 999)).toBe(true);
  });
});
