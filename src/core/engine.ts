import { loadConfig } from "./config.js";
import { buildInstructions } from "./prompt.js";
import { OpenCodeAdapter } from "../opencode/adapter.js";
import { DiffCoordinateValidator } from "./diff-validator.js";
import { publishReview } from "../github/publisher.js";
import { simpleGit } from "simple-git";
import fs from "fs/promises";

interface EngineOptions {
  configPath?: string;
  dryRun?: boolean;
}

/**
 * Coordenador/Orquestrador Principal do Fluxo (runReviewEngine).
 *
 * Essa função executa o pipeline fim a fim da revisão de código automatizada:
 * 1. Lê as configurações do projeto `.review-agent.yml`.
 * 2. Extrai metadados do repositório Git local e variáveis de ambiente (SHA do commit, repositório, pull request número).
 * 3. Inicializa e roda o `DiffCoordinateValidator` para mapear os trechos modificados do PR.
 * 4. Compila as instruções restritivas para guiar o revisor IA.
 * 5. Instancia o `OpenCodeAdapter` e invoca a CLI com suporte a timeout e retries em caso de falha.
 * 6. Captura o stdout da CLI, extrai e valida o JSON estruturado dos findings.
 * 7. Limita a quantidade de ocorrências com base no `max_findings` configurado.
 * 8. Direciona os resultados para publicação no GitHub Actions (ou terminal) respeitando o `output.mode`.
 *
 * @param options - Parâmetros opcionais passados pela CLI (caminhos alternativos ou flag de dry-run).
 */
export async function runReviewEngine(
  options: EngineOptions = {},
): Promise<void> {
  console.info("🚀 Iniciando Review Agent (Orquestrador)...");

  // 1. Carrega as configurações (.review-agent.yml)
  const config = await loadConfig(options.configPath);

  console.info(`- Limite de findings: ${config.review.max_findings}`);
  console.info(`- Timeout de execução: ${config.review.timeoutSeconds}s`);
  console.info(`- Máximo de retentativas: ${config.review.maxRetries}`);
  console.info(`- Modo de saída: ${config.output.mode}`);

  const workspaceRoot = process.cwd();

  // 2. Obtém os metadados do Git local (SHA, Repositório)
  const git = simpleGit(workspaceRoot);
  let commitSha = "";
  try {
    const isRepo = await git.checkIsRepo().catch(() => false);
    if (isRepo) {
      commitSha = await git.revparse(["HEAD"]);
    }
  } catch (e: any) {
    console.warn(
      `Aviso: Não foi possível obter o commit SHA via Git CLI: ${e.message}`,
    );
  }

  const repoEnv = process.env.GITHUB_REPOSITORY || "local/repository";
  const [owner, repo] = repoEnv.split("/");

  // Tenta extrair dados adicionais do Pull Request a partir do arquivo JSON do evento de Action
  let pullNumber: number | undefined;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      const eventContent = await fs.readFile(eventPath, "utf-8");
      const event = JSON.parse(eventContent);
      pullNumber = event.pull_request?.number || event.number;
      if (event.pull_request?.head?.sha && !commitSha) {
        commitSha = event.pull_request.head.sha;
      }
    } catch (e: any) {
      console.warn(`Aviso: Falha ao ler GITHUB_EVENT_PATH: ${e.message}`);
    }
  }

  const token = process.env.GITHUB_TOKEN;

  // 3. Inicializa o validador de coordenadas do diff (Ajuste 1)
  console.info("🔍 Inicializando validador de coordenadas do diff...");
  const validator = new DiffCoordinateValidator(
    workspaceRoot,
    { owner, repo, pullNumber, commitSha },
    token,
  );
  await validator.initialize();

  // 4. Monta as instruções estruturadas (Ajuste 5)
  console.info("📝 Construindo instruções de revisão...");
  const instructions = buildInstructions();

  // 5. Invoca o OpenCode CLI via Adapter (Ajuste 2 e 6)
  console.info("🤖 Invocando engine do OpenCode para análise...");
  const adapter = new OpenCodeAdapter(workspaceRoot);
  const rawOutput = await adapter.run(
    instructions,
    config.review.timeoutSeconds,
    config.review.maxRetries,
  );

  // 6. Extrai e valida as descobertas
  console.info("🔍 Analisando e validando descobertas retornadas pela IA...");
  const jsonStr = adapter.extractJson(rawOutput);
  const reviewResult = adapter.validate(jsonStr);

  // 7. Aplica o limite de findings (max_findings)
  let finalFindings = reviewResult.findings;
  if (finalFindings.length > config.review.max_findings) {
    console.info(
      `- Limitando findings de ${finalFindings.length} para o máximo configurado de ${config.review.max_findings}.`,
    );
    finalFindings = finalFindings.slice(0, config.review.max_findings);
  }

  const finalReviewResult = {
    ...reviewResult,
    findings: finalFindings,
  };

  // 8. Publica no GitHub utilizando o modo configurado (Ajuste 5)
  await publishReview(
    finalReviewResult,
    config.output.mode,
    validator,
    options.dryRun || process.env.NODE_ENV === "test",
    commitSha,
  );

  console.info("🎉 Processo de revisão concluído com sucesso!");
}
