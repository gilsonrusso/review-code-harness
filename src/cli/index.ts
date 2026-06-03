#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { runReviewEngine } from '../core/engine.js';

const program = new Command();

program
  .name('review-agent')
  .description('Plataforma de Code Review Inteligente baseada em Skills e OpenCode')
  .version('1.0.0');

program
  .command('run')
  .description('Executa a revisão automática do código com base no diff e nas skills')
  .option('-c, --config <path>', 'Caminho alternativo para o arquivo .review-agent.yml')
  .option('-s, --skills-dir <path>', 'Diretório de skills a ser utilizado')
  .option('--dry-run', 'Imprime os findings no console sem publicar no GitHub', false)
  .action(async (options) => {
    try {
      await runReviewEngine({
        configPath: options.config,
        skillsDir: options.skillsDir,
        dryRun: options.dryRun
      });
    } catch (error: any) {
      console.error(`❌ Erro durante a execução da revisão: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Inicializa a estrutura padrão de diretórios e arquivos de configuração')
  .action(async () => {
    try {
      console.info('Inicializando estrutura do Review Agent...');

      // 1. Cria diretório .skills
      const skillsDir = path.join(process.cwd(), '.skills');
      await fs.mkdir(skillsDir, { recursive: true });
      console.info(`- Pasta criada: ${skillsDir}`);

      // 2. Cria arquivos markdown de exemplo
      const sampleArch = `# Architecture Rules

- Funções devem seguir o Princípio da Responsabilidade Única (SRP).
- Funções com mais de 50 linhas devem ser refatoradas.
- Camada de controller não deve possuir lógica de negócio técnica direta.
`;
      await fs.writeFile(path.join(skillsDir, 'architecture.md'), sampleArch, 'utf-8');

      const sampleSec = `# Security Rules

- Não armazene senhas, chaves de API ou segredos privados hardcoded no código.
- Utilize queries parametrizadas para evitar ataques de SQL Injection.
- Sanitize todas as entradas de dados externos nas controllers.
`;
      await fs.writeFile(path.join(skillsDir, 'security.md'), sampleSec, 'utf-8');
      console.info('- Arquivos de skills de exemplo (.skills/architecture.md e security.md) criados.');

      // 3. Cria arquivo de configuração .review-agent.yml
      const sampleConfig = `version: 1

skills:
  path: .skills

review:
  max_findings: 20

output:
  format: github-pr
`;
      const configPath = path.join(process.cwd(), '.review-agent.yml');
      await fs.writeFile(configPath, sampleConfig, 'utf-8');
      console.info(`- Arquivo de configuração padrão criado em: ${configPath}`);

      console.info('🎉 Estrutura inicial do Review Agent configurada com sucesso!');
    } catch (error: any) {
      console.error(`❌ Erro ao inicializar a estrutura: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
export default program;
