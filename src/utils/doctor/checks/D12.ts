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
 * (they're in `ALWAYS_REPLACE`). So the block can disappear in one direction
 * only — a `nexus upgrade` / `repair` that ran after `chameleon agents init`.
 *
 * The symptom this looks for: the project uses Chameleon, and at least one
 * agent file carries the block while another has lost it. A project that never
 * ran `chameleon agents init` has no block anywhere and is not a finding.
 */
export const D12_chameleon_block_lost: DoctorCheck = {
  id: 'D12',
  name: 'Chameleon Agent Block',
  description: 'Checks whether NEXUS regeneration dropped Chameleon\'s block from AI instruction files',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const preference = await resolveUiPreference({ projectRoot: ctx.cwd });
    if (preference.provider !== 'chameleon') return [];

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

    // No block anywhere → Chameleon guidance was simply never added. Nothing
    // was lost, so there is nothing to report.
    if (withBlock.length === 0 || withoutBlock.length === 0) return [];

    return [{
      id: 'D12',
      severity: 'warn',
      description:
        `Chameleon's agent block is present in ${withBlock.join(', ')} but missing from ` +
        `${withoutBlock.join(', ')} — a NEXUS regeneration likely overwrote it.`,
      fixHint: 'Run `chameleon agents init` to restore the block, or `nexus use chameleon` to re-sync it.',
    }];
  },
};
