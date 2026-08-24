/**
 * D11 — Unverified Done (v1.1 "Contextualized Agents")
 *
 * Flags plans transitioned to `done` whose Evidence section contains
 * neither test evidence nor an explicit waiver. This is the structural
 * verification gate behind the test-writer agent: skipping verification
 * is visible, not impossible.
 *
 * B6: D07 also scans Evidence on `done` plans, and a plan with a missing or
 * placeholder Evidence section fires both checks — one fault, two findings.
 * D11's own verdict here is unchanged (each check is independently correct
 * and independently tested in isolation); the dedupe lives in `runDoctor`
 * (`doctor/index.ts`), which drops a D11 finding when a D07 finding already
 * fired for the same `planId` in the same run. That keeps each check's
 * `.run()` a pure function of its own signal, and the "one fault, one
 * finding" guarantee scoped to where a caller actually sees the combined
 * report.
 *
 * NOTE (B5, tracked separately, not fixed here): `EVIDENCE_SIGNALS` below is
 * still a keyword sniff over agent-written prose — exactly the defect
 * `skills/gate.ts`'s header disavows ("D11 v1 already shipped a keyword
 * sniff... and it was gameable by exactly the agent it targeted"). Track B
 * replaces this with machine evidence; until it lands, do not copy this
 * pattern elsewhere.
 *
 * Spec: v1_1_contextualized_agents.md §3
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

/** Signals that count as verification evidence (case-insensitive). */
const EVIDENCE_SIGNALS = /\b(test|tests|passing|passed|coverage|vitest|jest|playwright|cypress|e2e)\b/i;
/** Explicit human-approved waiver marker. */
const WAIVER_SIGNAL = /\bwaiv(er|ed)\b/i;

export const D11_unverified_done: DoctorCheck = {
  id: 'D11',
  name: 'Unverified Done',
  description: 'Plans marked done must carry test evidence or an explicit waiver in their Evidence section',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const findings: DoctorFinding[] = [];
    const plansDir = path.join(ctx.cwd, '.nexus', 'plans');

    for (const plan of ctx.plans) {
      if (plan.status !== 'done') continue;

      let content = '';
      try {
        content = await fs.readFile(path.join(plansDir, plan.fileName), 'utf8');
      } catch {
        continue;
      }

      const evidence = extractSection(content, 'Evidence');

      // No Evidence section at all, or an empty one → unverified
      const body = (evidence ?? '').trim();
      if (body.length > 0 && (EVIDENCE_SIGNALS.test(body) || WAIVER_SIGNAL.test(body))) {
        continue;
      }

      findings.push({
        id: 'D11',
        severity: 'warn',
        description: `Plan "${plan.id}" is done but its Evidence section has no test results and no waiver.`,
        fixHint:
          'Add test evidence via `nexus plan note` (the test-writer agent records pass counts), ' +
          'or record an explicit waiver: `nexus plan note <id> "WAIVER: tests skipped because …"`.',
        planId: plan.id,
      });
    }

    return findings;
  },
};

/** Extract the content of a `## <heading>` section from plan markdown. */
function extractSection(content: string, heading: string): string | null {
  const pattern = new RegExp(`^##\\s+${heading}\\s*$`, 'm');
  const match = pattern.exec(content);
  if (!match) return null;

  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}
