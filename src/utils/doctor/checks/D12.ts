import path from 'node:path';

import { AGENT_FILES, CHAMELEON_BLOCK_START } from '../../chameleon/agent-block.js';
import { fileExists, readFile } from '../../file-system.js';
import { resolveUiPreference } from '../../ui-preference.js';
import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

/**
 * D12 — Chameleon agent block lost from NEXUS-owned AI files.
 *
 * `CLAUDE.md`, `AGENTS.md`, and `.cursorrules` are written by both tools.
 * Chameleon splices its guide between `<!-- chameleon:start -->` markers and
 * leaves everything else alone; NEXUS regenerates those files wholesale
 * (they're in `ALWAYS_REPLACE`). So the block disappears in one direction
 * only — a NEXUS write that ran after `chameleon agents init`.
 *
 * Two symptoms, because the block can be lost partially or completely:
 *
 *   1. **Partial** — some agent files carry the block, others don't. This is
 *      evidence on its own and needs no configuration to interpret, which
 *      matters: the block is written by Chameleon, so a project can be using
 *      Chameleon without NEXUS holding a `ui` preference for it.
 *   2. **Total** — no file has the block, but this project demonstrably uses
 *      Chameleon (a `ui: chameleon` preference, or a generation record in
 *      `.nexus/state/chameleon.json`). Nothing to compare against, so the
 *      corroborating evidence is what makes it a finding rather than a guess.
 */
export const D12_chameleon_block_lost: DoctorCheck = {
  id: 'D12',
  name: 'Chameleon Agent Block',
  description: 'Checks whether a NEXUS regeneration dropped Chameleon\'s block from AI instruction files',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const withBlock: string[] = [];
    const withoutBlock: string[] = [];

    for (const file of AGENT_FILES) {
      const filePath = path.join(ctx.cwd, file);
      if (!(await fileExists(filePath))) continue;

      const content = await readFile(filePath);
      if (content === null) continue;

      if (content.includes(CHAMELEON_BLOCK_START)) {
        withBlock.push(file);
      } else {
        withoutBlock.push(file);
      }
    }

    // Symptom 1 — partial loss. Self-evident: one file has it, another doesn't.
    if (withBlock.length > 0 && withoutBlock.length > 0) {
      return [{
        id: 'D12',
        severity: 'warn',
        description:
          `Chameleon's agent block is present in ${withBlock.join(', ')} but missing from ` +
          `${withoutBlock.join(', ')} — a NEXUS regeneration likely overwrote it.`,
        fixHint: 'Run `chameleon agents init` to restore the block in every agent file.',
      }];
    }

    if (withBlock.length > 0) return [];

    // Symptom 2 — total loss, but only report it when something independently
    // says this project uses Chameleon.
    if (!(await usesChameleon(ctx.cwd))) return [];
    if (withoutBlock.length === 0) return [];

    return [{
      id: 'D12',
      severity: 'warn',
      description:
        `This project uses Chameleon, but none of ${withoutBlock.join(', ')} carries its agent block — ` +
        'agents working here have no Chameleon guidance.',
      fixHint: 'Run `chameleon agents init` to add it. NEXUS preserves it across future regenerations.',
    }];
  },
};

/** Independent evidence that this project actually uses Chameleon. */
async function usesChameleon(cwd: string): Promise<boolean> {
  const preference = await resolveUiPreference({ projectRoot: cwd });
  if (preference.provider === 'chameleon') return true;

  // A generation record proves it regardless of what the config now says.
  const evidencePath = path.join(cwd, '.nexus', 'state', 'chameleon.json');
  if (!(await fileExists(evidencePath))) return false;

  const raw = await readFile(evidencePath);
  if (raw === null) return false;

  try {
    const record = JSON.parse(raw) as { status?: string };
    return record.status === 'generated';
  } catch {
    return false;
  }
}
