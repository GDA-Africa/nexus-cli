import fs from 'node:fs/promises';
import path from 'node:path';

import { fileExists } from '../../file-system.js';
import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

const CODE_TOKEN_PATTERN = /`([^`]+)`/g;

export const D05_stale_knowledge_references: DoctorCheck = {
  id: 'D05',
  name: 'Stale Knowledge References',
  description: 'Checks whether knowledge.md references files that no longer exist',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const knowledgePath = path.join(ctx.cwd, '.nexus', 'docs', 'knowledge.md');
    if (!(await fileExists(knowledgePath))) {
      return [];
    }

    const content = await fs.readFile(knowledgePath, 'utf8');
    const candidates = extractPathCandidates(content);

    const missing: string[] = [];
    for (const ref of candidates) {
      const resolved = path.resolve(ctx.cwd, ref);
      if (!(await fileExists(resolved))) {
        missing.push(ref);
      }
    }

    if (missing.length === 0) {
      return [];
    }

    const sample = [...new Set(missing)].slice(0, 3).join(', ');

    return [{
      id: 'D05',
      severity: 'warn',
      description: `knowledge.md references missing file paths (${Math.min(missing.length, 3)} shown): ${sample}.`,
      fixHint: 'Update stale references in knowledge.md so linked paths match current repository layout.',
    }];
  },
};

function extractPathCandidates(content: string): string[] {
  const refs: string[] = [];
  const matches = content.matchAll(CODE_TOKEN_PATTERN);

  for (const match of matches) {
    const raw = match[1]?.trim() ?? '';
    if (!raw) continue;

    if (!looksLikeProjectPath(raw)) continue;

    refs.push(stripPrefix(raw));
  }

  return refs;
}

function looksLikeProjectPath(value: string): boolean {
  return (
    value.includes('/')
    && !value.startsWith('http://')
    && !value.startsWith('https://')
    && !value.startsWith('@')
  );
}

function stripPrefix(value: string): string {
  if (value.startsWith('./')) return value.slice(2);
  if (value.startsWith('/')) return value.slice(1);
  return value;
}
