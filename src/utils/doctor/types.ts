import type { PlanSummary, ActivePlansState } from '../plans/types.js';
import type { VitalSigns } from '../sensors/index.js';

export type DoctorSeverity = 'info' | 'warn' | 'error';

export interface DoctorFinding {
  id: string;          // e.g., 'D01'
  severity: DoctorSeverity;
  description: string;
  fixHint?: string;
  autoFixable?: boolean;
  /**
   * Plan id this finding is about, when it is about one plan. Structural
   * correlation key (never prose-parsed) — e.g. B6 uses it to dedupe D11
   * against D07 when both fire for the same plan.
   */
  planId?: string;
}

export interface DoctorContext {
  cwd: string;
  vitalSigns: VitalSigns | null;      // It can be null if not computed or missing
  plans: PlanSummary[];               // All plans loaded 
  activePlans: ActivePlansState | null; // active plans metadata
  /**
   * Escalate advisory findings to errors. Set by `nexus doctor --strict` so CI
   * can gate on checks that are visible-but-not-blocking by default.
   */
  strict?: boolean;
}

export interface DoctorCheck {
  id: string;           
  name: string;         
  description: string;
  run: (ctx: DoctorContext) => Promise<DoctorFinding[]>;
}

export interface DoctorReport {
  findings: DoctorFinding[];
  summary: {
    info: number;
    warn: number;
    error: number;
  };
}