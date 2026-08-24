import fs from 'node:fs/promises';
import { builtinModules } from 'node:module';
import path from 'node:path';

import { dirExists, fileExists } from '../../file-system.js';
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
      const exists = (await fileExists(resolved)) || (await dirExists(resolved));
      if (!exists) {
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

/** Known top-level project directories worth existence-checking even without a file extension. */
const KNOWN_PATH_PREFIXES = ['src/', './src/', 'tests/', './tests/', 'dist/', './dist/', 'bin/', './bin/', 'scripts/', './scripts/', '.nexus/', './.nexus/', '.github/', './.github/'];

function looksLikeProjectPath(value: string): boolean {
  if (!value.includes('/')) return false;
  if (value.includes(' ')) return false; // prose / commit messages, not a single path token
  if (value.startsWith('http://') || value.startsWith('https://')) return false;
  if (value.startsWith('@')) return false;

  // Regex literals, glob patterns, and `<placeholder>` tokens aren't real paths.
  if (/[\\[\]()<>|*{}]/.test(value)) return false;

  // Bare module specifiers like `fs/promises` or `node:fs/promises` are not
  // project paths — exclude anything whose first segment is a Node builtin.
  const firstSegment = value.replace(/^node:/, '').split('/')[0] ?? '';
  if (builtinModules.includes(firstSegment)) return false;

  // Otherwise only treat it as a checkable path if it looks like one: a file
  // with an extension, an explicit directory (trailing slash), or rooted at
  // a known top-level project directory. This keeps prose shorthand like
  // `new/start/tick/note/done` from being treated as a path.
  const looksLikeFile = /\.[a-zA-Z0-9]+$/.test(value);
  const looksLikeDir = value.endsWith('/');
  const hasKnownPrefix = KNOWN_PATH_PREFIXES.some((prefix) => value.startsWith(prefix));

  return looksLikeFile || looksLikeDir || hasKnownPrefix;
}

function stripPrefix(value: string): string {
  if (value.startsWith('./')) return value.slice(2);
  if (value.startsWith('/')) return value.slice(1);
  return value;
}
