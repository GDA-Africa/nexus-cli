import fs from 'node:fs/promises';
import path from 'node:path';

import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;

export const D01_frontmatter_status_drift: DoctorCheck = {
  id: 'D01',
  name: 'Frontmatter Status Drift',
  description: 'Checks for mismatches between doc frontmatter status and body content maturity',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const docsDir = path.join(ctx.cwd, '.nexus', 'docs');
    const findings: DoctorFinding[] = [];

    let entries: string[] = [];
    try {
      entries = await fs.readdir(docsDir);
    } catch {
      return findings;
    }

    const markdownDocs = entries.filter((entry) => entry.endsWith('.md'));

    for (const fileName of markdownDocs) {
      const fullPath = path.join(docsDir, fileName);
      let content = '';
      try {
        content = await fs.readFile(fullPath, 'utf8');
      } catch {
        continue;
      }

      const status = readStatus(content);
      if (!status) continue;

      const body = content.replace(FRONTMATTER_PATTERN, '');
      const placeholderCount = countPlaceholders(body);
      const meaningfulLineCount = body
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('>'))
        .length;

      if (status === 'template' && meaningfulLineCount >= 20 && placeholderCount === 0) {
        findings.push({
          id: 'D01',
          severity: 'warn',
          description: `Doc ${fileName} is marked template but appears substantially populated.`,
          fixHint: `Update frontmatter status in .nexus/docs/${fileName} to "populated" once reviewed.`,
        });
      }

      if (status === 'populated' && placeholderCount >= 2) {
        findings.push({
          id: 'D01',
          severity: 'warn',
          description: `Doc ${fileName} is marked populated but still contains unresolved placeholders.`,
          fixHint: `Fill placeholders in .nexus/docs/${fileName} or set status back to "template".`,
        });
      }
    }

    return findings;
  },
};

function readStatus(content: string): 'template' | 'populated' | 'auto' | null {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match || !match[1]) return null;

  const statusLine = match[1]
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('status:'));

  if (!statusLine) return null;

  const raw = statusLine.replace('status:', '').trim().replace(/['"]/g, '').toLowerCase();
  if (raw === 'template' || raw === 'populated' || raw === 'auto') {
    return raw;
  }

  return null;
}

function countPlaceholders(body: string): number {
  const patterns = [
    /<!--[\s\S]*?-->/g, // unfilled scaffold comment, e.g. <!-- High-level system diagram -->
    /to be filled/gi,
    /\(none yet\)/gi,
    /\(to be filled\)/gi,
    /\bTODO\b/gi,
  ];

  let count = 0;
  for (const pattern of patterns) {
    const matches = body.match(pattern);
    count += matches?.length ?? 0;
  }

  return count;
}
