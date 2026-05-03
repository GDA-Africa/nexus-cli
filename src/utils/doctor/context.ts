import fs from 'node:fs/promises';
import path from 'node:path';

import { readActivePlans } from '../plans/active.js';
import { parsePlanContent } from '../plans/parser.js';
import type { PlanSummary } from '../plans/types.js';
import type { VitalSigns } from '../sensors/index.js';

import type { DoctorContext } from './types.js';

export async function buildDoctorContext(cwd: string, nexusDir: string): Promise<DoctorContext> {
  const plansDir = path.join(nexusDir, 'plans');
  const stateDir = path.join(nexusDir, 'state');

  let vitalSigns: VitalSigns | null = null;
  try {
    const syncContent = await fs.readFile(path.join(stateDir, 'last-sync.json'), 'utf8');
    vitalSigns = JSON.parse(syncContent) as VitalSigns;
  } catch {
    // Missing or invalid snapshot
  }

  const plans: PlanSummary[] = [];
  try {
    const files = await fs.readdir(plansDir);
    for (const fileName of files) {
      if (!fileName.endsWith('.md') || fileName === 'index.md') continue;

      try {
        const content = await fs.readFile(path.join(plansDir, fileName), 'utf8');
        const doc = parsePlanContent(content);
        plans.push({
          id: doc.frontmatter.id,
          title: doc.frontmatter.title,
          status: doc.frontmatter.status,
          owner: doc.frontmatter.owner ?? 'unassigned',
          updated: String(doc.frontmatter.updated ?? ''),
          phase: String(doc.frontmatter.phase ?? ''),
          fileName,
        });
      } catch {
        // Skip malformed plan files
      }
    }
  } catch {
    // Plans dir missing is tolerated
  }

  const activePlans = await readActivePlans(plansDir).catch(() => null);

  return {
    cwd,
    vitalSigns,
    plans,
    activePlans,
  };
}
