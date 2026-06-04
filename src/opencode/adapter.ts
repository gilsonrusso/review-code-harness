import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';
import { ReviewResult } from '../models/types.js';
import { ReviewResultSchema } from '../parsers/findings.js';

/**
 * Adaptador de Integração com o OpenCode (OpenCodeAdapter).
 * 
 * Classe responsável pelo ciclo de vida de invocação da CLI do OpenCode,
 * incluindo o controle de tempo limite (timeout) e tentativas automáticas (retries) em caso
 * de falhas operacionais ou lentidão de rede dos modelos de IA.
 * 
 * Também encapsula as lógicas de extração e validação do payload JSON de findings.
 */
export class OpenCodeAdapter {
  private workspaceRoot: string;

  /**
   * Construtor do adaptador do OpenCode.
   * 
   * @param workspaceRoot - Caminho do diretório raiz onde os comandos devem ser executados.
   */
  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Invoca a CLI do OpenCode localmente passando as instruções diretamente como argumento.
   * Executa a CLI com timeout definido e realiza novas tentativas automáticas se falhar.
   * 
   * @param instructions - O texto bruto de instruções que guiará a IA nas revisões.
   * @param timeoutSeconds - Limite máximo de segundos para cada tentativa de execução.
   * @param maxRetries - Número total de tentativas adicionais a realizar em caso de erro ou estouro de timeout.
   * @returns O conteúdo bruto da saída padrão (stdout) retornado pelo OpenCode.
   * @throws Lança erro caso todas as tentativas falhem.
   */
  async run(instructions: string, timeoutSeconds: number, maxRetries: number): Promise<string> {
    const configPath = path.join(this.workspaceRoot, 'opencode.json');
    let originalConfigContent: string | null = null;
    let configExists = false;

    // 1. Setup / Backup Phase
    try {
      configExists = await fs.access(configPath).then(() => true).catch(() => false);
      if (configExists) {
        originalConfigContent = await fs.readFile(configPath, 'utf-8');
      }

      // Sempre sobrescreve (ou cria) com a nossa configuração padrão segura e restrita.
      // Desativa compartilhamento (share: disabled) e telemetria, e proíbe ferramentas de escrita/edição.
      const safeConfig = {
        autoupdate: false,
        share: 'disabled',
        permission: {
          edit: 'allow',
          bash: 'allow'
        },
        experimental: {
          openTelemetry: false
        },
        telemetry: {
          telemetryLevel: 'off'
        },
        watcher: {
          ignore: [
            'node_modules/**',
            'dist/**',
            '.git/**'
          ]
        },
        tools: {
          write: false,
          edit: false
        }
      };

      await fs.writeFile(configPath, JSON.stringify(safeConfig, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn(`Aviso: Erro ao preparar arquivo opencode.json: ${err.message}`);
    }

    // 2. Execution Phase (with Retries)
    try {
      let attempt = 0;
      let lastError: any = null;

      while (attempt <= maxRetries) {
        attempt++;
        try {
          const opencodeBin = process.env.OPENCODE_BIN || 'opencode';
          const args = ['run', instructions];

          // Repassa o modelo especificado nas variáveis de ambiente de forma literal
          const model = process.env.OPENCODE_MODEL;
          if (model) {
            args.push('-m', model);
          }

          const modelDisplay = model ? ` --model ${model}` : '';
          console.info(`Invocando a CLI (Tentativa ${attempt}/${maxRetries + 1}): ${opencodeBin} run "<instructions>"${modelDisplay}`);

          // Executa o subprocesso usando a biblioteca execa com timeout configurado e stdin ignorado
          const subprocess = execa(opencodeBin, args, {
            timeout: timeoutSeconds * 1000,
            cwd: this.workspaceRoot,
            stdin: 'ignore'
          });

          // Repassa os logs de diagnóstico e progresso da IA em tempo real para o console
          subprocess.stderr?.pipe(process.stderr);

          // Repassa a saída padrão do OpenCode em tempo real para o console e acumula o texto para parsing do JSON
          let stdoutAccumulated = '';
          subprocess.stdout?.on('data', (chunk) => {
            const chunkStr = chunk.toString();
            stdoutAccumulated += chunkStr;
            process.stdout.write(chunkStr);
          });

          const { stdout } = await subprocess;
          return stdoutAccumulated || stdout;
        } catch (error: any) {
          lastError = error;
          console.warn(`Aviso: Tentativa ${attempt} falhou: ${error.message}`);
          if (attempt <= maxRetries) {
            console.info('Aguardando 1 segundo antes de tentar novamente...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      throw new Error(`Falha na execução do OpenCode após ${attempt} tentativas. Último erro: ${lastError?.message}`);
    } finally {
      // 3. Restore / Cleanup Phase
      try {
        if (configExists && originalConfigContent !== null) {
          await fs.writeFile(configPath, originalConfigContent, 'utf-8');
        } else {
          await fs.rm(configPath, { force: true });
        }
      } catch (cleanupError: any) {
        console.warn(`Aviso: Falha ao limpar/restaurar o arquivo opencode.json: ${cleanupError.message}`);
      }
    }
  }

  /**
   * Extrai o bloco de texto JSON da saída bruta retornada pelo OpenCode.
   * Utiliza algoritmo de balanceamento de chaves ({}) baseado na localização da chave "findings".
   * 
   * @param rawOutput - Texto de saída stdout gerado pela CLI do OpenCode.
   * @returns Apenas a string correspondente ao objeto JSON recortado da saída.
   * @throws Lança erro caso não consiga encontrar a chave "findings" ou as chaves equivalentes.
   */
  extractJson(rawOutput: string): string {
    const findingsIndex = rawOutput.indexOf('"findings"');

    if (findingsIndex === -1) {
      throw new Error('Não foi possível localizar a chave "findings" na resposta do OpenCode.');
    }

    let firstBrace = rawOutput.indexOf('{');
    let jsonString = '';

    while (firstBrace !== -1 && firstBrace < findingsIndex) {
      let depth = 0;
      let inString = false;
      let escape = false;

      for (let i = firstBrace; i < rawOutput.length; i++) {
        const char = rawOutput[i];
        if (inString) {
          if (escape) {
            escape = false;
          } else if (char === '\\') {
            escape = true;
          } else if (char === '"') {
            inString = false;
          }
        } else {
          if (char === '"') {
            inString = true;
          } else if (char === '{') {
            depth++;
          } else if (char === '}') {
            depth--;
            if (depth === 0) {
              if (i > findingsIndex) {
                jsonString = rawOutput.slice(firstBrace, i + 1);
                break;
              }
            }
          }
        }
      }

      if (jsonString) {
        break;
      }
      firstBrace = rawOutput.indexOf('{', firstBrace + 1);
    }

    if (!jsonString) {
      throw new Error('Não foi possível localizar o bloco JSON estruturado de findings na resposta do OpenCode.');
    }

    return jsonString.trim();
  }

  /**
   * Valida a conformidade estrutural do JSON recebido contra as regras Zod.
   * 
   * @param jsonStr - String contendo o objeto JSON estruturado extraído.
   * @returns O objeto tipado de ReviewResult contendo a lista de findings validada.
   * @throws Lança erro se o JSON for inválido ou se houver campos obrigatórios violados.
   */
  validate(jsonStr: string): ReviewResult {
    try {
      const parsedJson = JSON.parse(jsonStr);
      const validated = ReviewResultSchema.safeParse(parsedJson);

      if (!validated.success) {
        const formattedErrors = validated.error.errors
          .map(err => `[${err.path.join('.')}]: ${err.message}`)
          .join(', ');
        throw new Error(`Validação de findings falhou: ${formattedErrors}`);
      }

      return validated.data;
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new Error(`Resposta do OpenCode contém JSON inválido: ${error.message}`);
      }
      throw error;
    }
  }
}
export default OpenCodeAdapter;
