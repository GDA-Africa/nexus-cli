import fs from 'node:fs/promises';
import path from 'node:path';

import { fileExists } from '../../file-system.js';
import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

export const D04_knowledge_bloat: DoctorCheck = {
  id: 'D04',
  name: 'Knowledge Bloat',
  description: 'Checks if knowledge.md is getting too large (>200 entries or >800 lines)',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const knowledgePath = path.join(ctx.cwd, '.nexus', 'docs', 'knowledge.md');
    if (!(await fileExists(knowledgePath))) {
      return [];
    }

    const content = await fs.readFile(knowledgePath, 'utf8');
    const lines = content.split('\n');
    const lineCount = lines.length;
    const entryCount = lines.filter(line => line.trim().startsWith('### [')).length;

    const findings: DoctorFinding[] = [];

    if (entryCount > 200 || lineCount > 800) {
      findings.push({
        id: 'D04',
        severity: 'warn',
        description: `Knowledge base is bloated: ${entryCount} entries, ${lineCount} lines.`,
        fixHint: 'Consider running `nexus consolidate` or manually summarizing older entries.',
      });
    }

    return findings;
  }
};
