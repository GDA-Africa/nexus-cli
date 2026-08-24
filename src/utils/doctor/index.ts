import { D01_frontmatter_status_drift } from './checks/D01.js';
import { D02_stale_phase } from './checks/D02.js';
import { D03_progress_log_gap } from './checks/D03.js';
import { D04_knowledge_bloat } from './checks/D04.js';
import { D05_stale_knowledge_references } from './checks/D05.js';
import { D06_plan_stale } from './checks/D06.js';
import { D07_plan_orphan } from './checks/D07.js';
import { D08_vital_signs_missing } from './checks/D08.js';
import { D09_handshake_missed } from './checks/D09.js';
import { D10_skills_drift } from './checks/D10.js';
import { D11_unverified_done } from './checks/D11.js';
import { D12_chameleon_block_lost } from './checks/D12.js';
import { D13_gated_plan_unaligned } from './checks/D13.js';
import { D14_context_load } from './checks/D14.js';
import type { DoctorCheck, DoctorContext, DoctorFinding, DoctorReport, DoctorSeverity } from './types.js';

const SEVERITY_WEIGHT: Record<DoctorSeverity, number> = {
  info: 1,
  warn: 2,
  error: 3,
};

export const DEFAULT_CHECKS: DoctorCheck[] = [
  D01_frontmatter_status_drift,
  D02_stale_phase,
  D03_progress_log_gap,
  D04_knowledge_bloat,
  D05_stale_knowledge_references,
  D06_plan_stale,
  D07_plan_orphan,
  D08_vital_signs_missing,
  D09_handshake_missed,
  D10_skills_drift,
  D11_unverified_done,
  D12_chameleon_block_lost,
  D13_gated_plan_unaligned,
  D14_context_load,
];

export interface RunDoctorOptions {
  checks?: DoctorCheck[];
  minSeverity?: DoctorSeverity;
}

/**
 * B6: D07 and D11 both scan Evidence on `done` plans; a plan whose Evidence
 * section is missing, empty, or a placeholder fires both, double-reporting
 * one fault. Drop the D11 finding for any plan D07 already flagged in this
 * same run. Correlates on `planId` — a structural fact each check already
 * attaches — never on parsing either finding's description text (§18 #5).
 *
 * Each check's own `.run()` is untouched by this: it fires exactly as before
 * in isolation. This only trims the combined report a caller actually sees.
 */
function dedupeD11AgainstD07(findings: DoctorFinding[]): DoctorFinding[] {
  const flaggedByD07 = new Set(
    findings.filter((f) => f.id === 'D07' && f.planId).map((f) => f.planId as string),
  );
  if (flaggedByD07.size === 0) return findings;

  return findings.filter((f) => !(f.id === 'D11' && f.planId && flaggedByD07.has(f.planId)));
}

export async function runDoctor(
  ctx: DoctorContext,
  options: RunDoctorOptions = {}
): Promise<DoctorReport> {
  const checksToRun = options.checks ?? DEFAULT_CHECKS;
  const minWeight = SEVERITY_WEIGHT[options.minSeverity ?? 'info'];

  // B2: collect every finding, unfiltered by severity — filtering here (as
  // the old code did) meant the summary only ever reflected what survived
  // the filter, so `--severity error` silently zeroed out warnings and the
  // exit code with them.
  let allFindings: DoctorFinding[] = [];

  for (const check of checksToRun) {
    try {
      allFindings.push(...(await check.run(ctx)));
    } catch (err) {
      allFindings.push({
        id: 'D-INTERNAL',
        severity: 'warn',
        description: `Check ${check.id} failed to run: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  allFindings = dedupeD11AgainstD07(allFindings);

  allFindings.sort((a, b) => {
    if (SEVERITY_WEIGHT[a.severity] !== SEVERITY_WEIGHT[b.severity]) {
      return SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
    }
    return a.id.localeCompare(b.id);
  });

  // B2: the summary is the true, unfiltered count — `--severity` is a
  // display filter on `findings` below, never an exit-code override.
  const summary = {
    info: allFindings.filter((f) => f.severity === 'info').length,
    warn: allFindings.filter((f) => f.severity === 'warn').length,
    error: allFindings.filter((f) => f.severity === 'error').length,
  };

  const findings = allFindings.filter((f) => SEVERITY_WEIGHT[f.severity] >= minWeight);

  return { findings, summary };
}

export * from './types.js';
