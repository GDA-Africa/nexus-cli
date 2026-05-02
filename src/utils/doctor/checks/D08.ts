import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

export const D08_vital_signs_missing: DoctorCheck = {
  id: 'D08',
  name: 'Vital Signs Health',
  description: 'Checks if vital signs are missing or older than 24 hours',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const findings: DoctorFinding[] = [];
    
    if (!ctx.vitalSigns) {
      findings.push({
        id: 'D08',
        severity: 'warn',
        description: 'Vital signs are missing.',
        fixHint: 'Run `nexus sync` to capture current repo state.',
        autoFixable: true,
      });
      return findings;
    }

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const capturedDate = new Date(ctx.vitalSigns.capturedAt);
    
    if (capturedDate < twentyFourHoursAgo) {
      findings.push({
        id: 'D08',
        severity: 'warn',
        description: 'Vital signs data is older than 24 hours.',
        fixHint: 'Run `nexus sync` to refresh the repo state.',
        autoFixable: true,
      });
    }

    return findings;
  }
};
