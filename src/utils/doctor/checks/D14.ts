import fs from 'node:fs/promises';
import path from 'node:path';

import {
  assumedOrientationReads,
  DEFAULT_ORIENTATION_BUDGET,
  loadHarnessesConfig,
  resolveFileForHarness,
  type HarnessesConfig,
} from '../../harnesses/index.js';
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
 * **The per-file check below reports per file, not per project.** The six
 * tool files are loaded by six different harnesses — Cursor reads
 * `.cursorrules`, Claude reads `CLAUDE.md` — so a session pays for one of
 * them, not their sum. Summing all six would produce a scary number no agent
 * ever actually pays.
 *
 * **But the file a harness loads is not everything it pays for.** Measured
 * on this repo: `CLAUDE.md` alone is comfortably under the per-file budget,
 * while `CLAUDE.md` + the two files its own protocol tells the agent to read
 * (`.nexus/docs/index.md`, `.nexus/docs/knowledge.md`) is ~64 KB — a 4x
 * overflow of Ollama's 4,096-token default, which truncates silently and
 * keeps the *tail*, so a small local model never sees `CLAUDE.md` at all
 * (`nexus-harness-work.md` §1). `checkProjectTotals` below is that second
 * measurement: per configured harness (or a sensible default absent
 * `.nexus/harnesses.yml`), the file it loads plus whatever that file's own
 * content structurally claims to instruct reading, against that harness's
 * declared `orientation_budget`.
 *
 * **Severity of the project-total finding tracks whether the budget was
 * ever declared.** Absent `.nexus/harnesses.yml`, `DEFAULT_ORIENTATION_BUDGET`
 * is a fallback for measurement only — nobody opted into it — so an overage
 * against it is `info` and never affects doctor's exit code, `--strict`
 * included. Once a project declares `harnesses.yml`, an overage against a
 * stated budget is `warn` (or `error` under `--strict`), same as any other
 * check. "Visible, not impossible": a fresh, unconfigured `nexus init`
 * project must produce zero warns for this.
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

    findings.push(...(await checkProjectTotals(ctx)));

    return findings;
  },
};

/**
 * Project-total orientation check — see the module doc for why the per-file
 * check above is not enough on its own.
 *
 * For each harness declared in `.nexus/harnesses.yml` (or, absent the file,
 * for each of `ALWAYS_LOADED` under `DEFAULT_ORIENTATION_BUDGET`), sums that
 * harness's generated file with whatever it structurally claims to instruct
 * reading (`assumedOrientationReads`, decoded from the `<!--nexus-reads:…-->`
 * marker `ai-config.ts` writes) and compares against the declared budget.
 *
 * A harness with no file of its own — a bare model target reached only
 * through `nexus context`, never through an auto-loaded file — is skipped:
 * there is nothing on disk to measure.
 */
async function checkProjectTotals(ctx: DoctorContext): Promise<DoctorFinding[]> {
  const findings: DoctorFinding[] = [];

  let harnesses: HarnessesConfig | null;
  try {
    harnesses = await loadHarnessesConfig(path.join(ctx.cwd, '.nexus'));
  } catch (err) {
    // A malformed config is worth surfacing, but should not abort the rest
    // of doctor — report it as its own finding and stop this sub-check here.
    findings.push({
      id: 'D14',
      severity: 'error',
      description: `.nexus/harnesses.yml is invalid: ${err instanceof Error ? err.message : String(err)}`,
      fixHint:
        'Fix the YAML, or remove .nexus/harnesses.yml — absent, NEXUS falls back to unbounded, ' +
        'today-identical generation.',
    });
    return findings;
  }

  const targets: Array<{ harnessId: string | null; file: string; budgetBytes: number }> = harnesses
    ? Object.keys(harnesses.harnesses).flatMap((harnessId) => {
        const file = resolveFileForHarness(harnesses, harnessId);
        return file
          ? [{ harnessId, file, budgetBytes: harnesses.harnesses[harnessId].orientation_budget }]
          : [];
      })
    : ALWAYS_LOADED.map((file) => ({ harnessId: null, file, budgetBytes: DEFAULT_ORIENTATION_BUDGET }));

  for (const target of targets) {
    let content: string;
    try {
      content = await fs.readFile(path.join(ctx.cwd, target.file), 'utf-8');
    } catch {
      continue; // This harness's file does not exist in this project.
    }

    let totalBytes = Buffer.byteLength(content, 'utf-8');
    const alsoReads: string[] = [];

    for (const docRelPath of assumedOrientationReads(content)) {
      try {
        const docStat = await fs.stat(path.join(ctx.cwd, docRelPath));
        totalBytes += docStat.size;
        alsoReads.push(docRelPath);
      } catch {
        // The file claims to point at this doc, but it does not exist —
        // nothing to add.
      }
    }

    if (totalBytes <= target.budgetBytes) continue;

    const label = target.harnessId ? `harness "${target.harnessId}"` : target.file;
    const breakdown = alsoReads.length > 0 ? `${target.file} + ${alsoReads.join(' + ')}` : target.file;

    // Severity depends on whether the budget was ever declared. Absent
    // .nexus/harnesses.yml, DEFAULT_ORIENTATION_BUDGET is a sensible
    // fallback for measurement, not something the user opted into — warning
    // against a budget nobody declared would fail a fresh, healthy project
    // (a fresh `nexus init` currently lands ~16.1-16.2 KB, just over the
    // 16 KB default) for a number that carries no consequence. Once
    // harnesses.yml exists, the budget is a stated intent and this becomes
    // a real, actionable finding — visible, not impossible.
    findings.push({
      id: 'D14',
      severity: !harnesses ? 'info' : ctx.strict ? 'error' : 'warn',
      description:
        `Project-total orientation for ${label} is ${kb(totalBytes)} (${breakdown}), over its ` +
        `${kb(target.budgetBytes)} orientation budget. Everything the agent's own protocol reads before ` +
        'doing anything must fit, not just the instruction file by itself.',
      fixHint: target.harnessId
        ? `${target.file} still points at ${alsoReads.join(' and ') || 'large brain files'} for this budget. ` +
          'Either raise .nexus/harnesses.yml\'s orientation_budget for this harness if the window actually ' +
          'supports it, or set its tool_calling to unreliable/none so `nexus upgrade` generates a ' +
          'self-contained file instead of one that points at them.'
        : 'Declare .nexus/harnesses.yml with an orientation_budget for the harnesses this project targets, ' +
          'then run `nexus upgrade` to regenerate within it.',
    });
  }

  return findings;
}

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
