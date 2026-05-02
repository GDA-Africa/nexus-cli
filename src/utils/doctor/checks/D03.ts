import fs from 'node:fs/promises';
import path from 'node:path';

import { fileExists } from '../../file-system.js';
import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

export const D03_progress_log_gap: DoctorCheck = {
  id: 'D03',
  name: 'Progress Log Gap',
  description: 'Checks if done plans are missing from the index progress log',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const indexPath = path.join(ctx.cwd, '.nexus', 'docs', 'index.md');
    if (!(await fileExists(indexPath))) {
      return [];
    }

    const donePlans = ctx.plans.filter((plan) => plan.status === 'done');
    if (donePlans.length === 0) {
      return [];
    }

    const indexContent = await fs.readFile(indexPath, 'utf8');
    const missing = donePlans.filter((plan) => !indexContent.includes(`\`${plan.id}\``));

    if (missing.length === 0) {
      return [];
    }

    return [{
      id: 'D03',
      severity: 'info',
      description: `Progress log gap detected: ${missing.length} done plan(s) are not referenced in .nexus/docs/index.md.`,
      fixHint: 'Add completion entries for done plans in the Progress Log section.',
    }];
  },
};
