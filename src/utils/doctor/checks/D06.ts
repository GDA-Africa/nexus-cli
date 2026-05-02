import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

export const D06_plan_stale: DoctorCheck = {
  id: 'D06',
  name: 'Stale Plan',
  description: 'Checks if any in_progress plan has not been updated in 14 days',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const findings: DoctorFinding[] = [];
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    for (const plan of ctx.plans) {
      if (plan.status !== 'in_progress') continue;

      const updatedDate = new Date(plan.updated);
      if (updatedDate < fourteenDaysAgo) {
        findings.push({
          id: 'D06',
          severity: 'warn',
          description: `Plan "${plan.title}" (${plan.fileName}) is in_progress but hasn't been touched in over 14 days.`,
          fixHint: 'Run `nexus plan tick` or `nexus plan note` to update it, or transition status to blocked or abandoned.',
        });
      }
    }
    return findings;
  }
};
