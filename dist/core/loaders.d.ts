import { Skill, Diff } from '../models/types.js';
/**
 * Varre o diretório configurado em busca de arquivos markdown de skills.
 */
export declare function loadSkills(skillsPath: string): Promise<Skill[]>;
/**
 * Parseia o diff bruto retornado pelo git em uma estrutura orientada a arquivos.
 */
export declare function parseRawDiff(rawDiff: string): Diff;
/**
 * Obtém as modificações do git comparando com uma referência base.
 * Possui fallbacks resilientes para garantir execução local ou em CI.
 */
export declare function loadDiff(workspaceRoot: string, baseRef?: string): Promise<Diff>;
