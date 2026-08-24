import fs from 'node:fs/promises';
import path from 'node:path';

import { fileExists } from '../../file-system.js';
import { CHARS_PER_TOKEN } from '../../tokens.js';
import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

/**
 * Entries are not what costs — bytes are (P2). At 200 entries `knowledge.md`
 * is already ~90KB, and has been unusable in a local context for months by
 * then: a 61-entry, 27,913-byte file (this repo's own, today) does not fire
 * on the entry count alone until the file has more than tripled.
 *
 * Set from the local-harness orientation target (P0.5: 2,000 tokens, at the
 * same chars-per-token ratio `nexus_get_context` maps its deprecated
 * `maxChars` input through) rather than a round number: past 3x that
 * budget, `knowledge.md` alone already outweighs the entire orientation
 * pack a local model gets. Note this is a byte proxy, not a real token
 * count — D04 stays off the tokenizer so `nexus doctor` never pays its load
 * cost on a path most projects run on every commit.
 */
const ORIENTATION_BUDGET_TOKENS = 2000;
const BLOAT_BYTES = ORIENTATION_BUDGET_TOKENS * CHARS_PER_TOKEN * 3; // 24,000 bytes

export const D04_knowledge_bloat: DoctorCheck = {
  id: 'D04',
  name: 'Knowledge Bloat',
  description: `Checks if knowledge.md is getting too large (>200 entries, >800 lines, or >${BLOAT_BYTES} bytes)`,
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const knowledgePath = path.join(ctx.cwd, '.nexus', 'docs', 'knowledge.md');
    if (!(await fileExists(knowledgePath))) {
      return [];
    }

    const content = await fs.readFile(knowledgePath, 'utf8');
    const byteSize = Buffer.byteLength(content, 'utf8');
    const lines = content.split('\n');
    const lineCount = lines.length;
    const entryCount = lines.filter(line => line.trim().startsWith('### [')).length;

    const findings: DoctorFinding[] = [];

    if (entryCount > 200 || lineCount > 800 || byteSize > BLOAT_BYTES) {
      findings.push({
        id: 'D04',
        severity: 'warn',
        description: `Knowledge base is bloated: ${entryCount} entries, ${lineCount} lines, ${byteSize} bytes.`,
        fixHint: 'Run `nexus consolidate` to roll older entries into a generated summary, or summarize manually.',
      });
    }

    return findings;
  }
};
