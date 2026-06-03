import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';

/**
 * Invoca a CLI do OpenCode localmente com o arquivo de instruções de review gerado.
 */
export async function runOpenCode(instructions: string): Promise<string> {
  const tempFile = path.join(process.cwd(), '.review-instructions.md');

  try {
    // Grava as instruções temporariamente no workspace para o OpenCode ler
    await fs.writeFile(tempFile, instructions, 'utf-8');

    // Executa a CLI conforme a especificação do MVP
    // O comando é: opencode run --instructions .review-instructions.md
    const opencodeBin = process.env.OPENCODE_BIN || 'opencode';
    const args = ['run', '--instructions', tempFile];

    console.info(`Invocando a CLI: ${opencodeBin} ${args.join(' ')}`);

    const { stdout } = await execa(opencodeBin, args);
    return stdout;
  } catch (error: any) {
    throw new Error(`Falha na execução do OpenCode: ${error.message}`);
  } finally {
    // Garante a remoção do arquivo temporário de instruções
    await fs.rm(tempFile, { force: true }).catch(err => {
      console.warn(`Aviso: Não foi possível deletar o arquivo temporário ${tempFile}: ${err.message}`);
    });
  }
}
