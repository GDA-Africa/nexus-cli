import fs from 'node:fs/promises';
import path from 'node:path';

import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

/**
 * D14 — always-loaded instruction budget.
 *
 * Every generated instruction file is **context load**: bytes that sit in the
 * agent's window on every single turn, spending tokens and attention whether or
 * not they turn out to be relevant. Unlike a doc reached through a pointer,
 * nothing about the task makes this cost go away.
 *
 * NEXUS had no way to see this number, which is how `CLAUDE.md` reached 13.4 KB
 * — with the docs table restated twice, "orient first" stated in three places,
 * and a Workflow section that told the agent to read four files by hand
 * immediately after telling it to prefer one context-pack call. Nobody
 * measured, so nobody noticed.
 *
 * This check measures rather than asserts, in the v1.2 idiom.
 *
 * **It reports per file, not per project.** The six tool files are loaded by
 * six different harnesses — Cursor reads `.cursorrules`, Claude reads
 * `CLAUDE.md` — so a session pays for one of them, not their sum. Summing them
 * would produce a scary number that no agent ever actually pays.
 */

/** Files a harness loads automatically, with no pointer and no choice. */
const ALWAYS_LOADED = [
  'CLAUDE.md',
  'AGENTS.md',
  '.cursorrules',
  '.windsurfrules',
  '.clinerules',
  path.join('.github', 'copilot-instructions.md'),
];

/**
 * Budget in bytes for a single always-loaded instruction file.
 *
 * ~10 KB is roughly 2.5k tokens — enough for orientation rules, the onboarding
 * gate, project identity, and code rules, and not enough to also hold reference
 * material that belongs behind a pointer.
 *
 * NEXUS's own generated output lands near 8 KB, which leaves a project real room
 * to add house rules before this fires. The generator is held to a tighter 8 KB
 * by `tests/unit/ai-config-budget.test.ts` — a failing test is a better place to
 * catch NEXUS's own growth than a warning in someone else's project.
 */
const BUDGET_BYTES = 10 * 1024;

/** Past this, the file is not merely over budget — it is unmaintainable. */
const HARD_BYTES = 16 * 1024;

/**
 * For reference: NEXUS's own `CLAUDE.md` was 13.4 KB before v1.3, with the docs
 * table stated twice, "orient first" stated in three places, and a Workflow
 * section telling the agent to read four files by hand immediately after telling
 * it to prefer one context-pack call. It would land squarely in `warn` here.
 */

export const D14_context_load: DoctorCheck = {
  id: 'D14',
  name: 'Context Load',
  description: 'Measures the always-loaded instruction budget each agent pays on every turn',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const findings: DoctorFinding[] = [];
    const sizes: Array<{ file: string; bytes: number }> = [];

    for (const file of ALWAYS_LOADED) {
      try {
        const stat = await fs.stat(path.join(ctx.cwd, file));
        if (stat.isFile()) sizes.push({ file, bytes: stat.size });
      } catch {
        // Not every project carries every harness's file.
      }
    }

    if (sizes.length === 0) return [];

    const over = sizes.filter((entry) => entry.bytes > BUDGET_BYTES);

    if (over.length > 0) {
      const worst = over.reduce((a, b) => (b.bytes > a.bytes ? b : a));
      const hard = worst.bytes > HARD_BYTES;

      findings.push({
        id: 'D14',
        severity: hard || ctx.strict ? 'error' : 'warn',
        description:
          `${over.length} instruction file(s) exceed the ${kb(BUDGET_BYTES)} always-loaded budget ` +
          `(largest: ${worst.file} at ${kb(worst.bytes)}). Every agent pays this on every turn.`,
        fixHint:
          'Push reference material behind a pointer into `.nexus/ai/instructions.md` and keep only ' +
          'what every task needs. Run `nexus upgrade` to regenerate NEXUS-owned files at the current size.',
      });
    }

    // Duplication is a separate defect: the same meaning in N places means
    // changing the behaviour is an N-place edit, and the copies drift.
    const duplicate = findDuplicateGroup(sizes);
    if (duplicate.length > 1) {
      findings.push({
        id: 'D14',
        severity: 'info',
        description:
          `${duplicate.length} instruction files are near-identical in size (${duplicate.join(', ')}). ` +
          'That is expected for NEXUS-generated files — they share one generator — but hand-edits ' +
          'to one will not reach the others.',
        fixHint: 'Edit `.nexus/ai/instructions.md` and run `nexus upgrade`, rather than editing a tool file directly.',
      });
    }

    return findings;
  },
};

/**
 * Files within 2% of each other in size are almost certainly the same content.
 * A cheap proxy that costs one stat per file instead of reading them all.
 */
function findDuplicateGroup(sizes: Array<{ file: string; bytes: number }>): string[] {
  if (sizes.length < 2) return [];

  const largest = sizes.reduce((a, b) => (b.bytes > a.bytes ? b : a));
  const tolerance = Math.max(64, Math.round(largest.bytes * 0.02));

  return sizes
    .filter((entry) => Math.abs(entry.bytes - largest.bytes) <= tolerance)
    .map((entry) => entry.file);
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}
