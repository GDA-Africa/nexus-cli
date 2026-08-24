import fs from 'node:fs/promises';
import path from 'node:path';

import { parsePlanContent } from '../../plans/parser.js';
import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

export const D07_plan_orphan: DoctorCheck = {
  id: 'D07',
  name: 'Orphan Plan',
  description: 'Checks if any done plan lacks Evidence',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const findings: DoctorFinding[] = [];

    for (const plan of ctx.plans) {
      if (plan.status !== 'done') continue;

      const filePath = path.join(ctx.cwd, '.nexus', 'plans', plan.fileName);
      let content = '';
      try {
        content = await fs.readFile(filePath, 'utf8');
      } catch {
        continue;
      }

      try {
        const doc = parsePlanContent(content);
        const evSection = doc.sections.find(s => s.heading.toLowerCase().includes('evidence'));

        const evText = evSection?.content.trim() ?? '';
        if (!evSection || evText === '' || evText.includes('_(to be filled)_')) {
          findings.push({
            id: 'D07',
            severity: 'warn',
            description: `Plan "${plan.title}" is done but has no Evidence recorded.`,
            fixHint: 'Edit the plan file and add commit hashes, PR links, or test results to the Evidence section.',
            planId: plan.id,
          });
        }
      } catch {
        // failed to parse, likely corrupt
      }
    }
    return findings;
  }
};
