export interface Skill {
  path: string;
  name: string;
  content: string;
}

export interface DiffFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  patch?: string;
}

export interface Diff {
  files: DiffFile[];
  rawPatch: string;
}

export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file: string;
  line: number;
  title: string;
  description: string;
  suggestion: string;
}

export interface ReviewResult {
  findings: Finding[];
}

export interface ReviewContext {
  config: {
    skillsPath: string;
    maxFindings: number;
    outputFormat: 'github-pr' | 'console';
  };
  skills: Skill[];
  diff: Diff;
  gitMetadata: {
    owner: string;
    repo: string;
    pullNumber?: number;
    commitSha: string;
  };
}
