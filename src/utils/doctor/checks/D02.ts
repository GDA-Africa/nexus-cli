import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

export const D02_stale_phase: DoctorCheck = {
  id: 'D02',
  name: 'Stale Phase',
  description: 'Checks if active plans appear stale against the current repository freshness signals',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const findings: DoctorFinding[] = [];

    const activePlans = ctx.plans.filter((plan) => plan.status === 'in_progress');
    if (activePlans.length === 0) {
      return findings;
    }

    const staleFolders = ctx.vitalSigns?.files.staleFolders ?? [];
    const stale = staleFolders.filter((folder) => folder.staleDays >= 14);

    if (stale.length > 0) {
      const top = stale
        .sort((a, b) => b.staleDays - a.staleDays)
        .slice(0, 3)
        .map((item) => `${item.folder} (${item.staleDays}d)`)
        .join(', ');

      findings.push({
        id: 'D02',
        severity: 'warn',
        description: `Active phase appears stale: ${activePlans.length} in-progress plan(s), but key folders are stale (${top}).`,
        fixHint: 'Resume implementation work, add a plan note, or mark the plan blocked if intentionally paused.',
      });
    }

    return findings;
  },
};
