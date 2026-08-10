/**
 * NEXUS CLI — Chameleon's agent block inside NEXUS-owned AI files
 *
 * Both tools write `CLAUDE.md` / `AGENTS.md` / `.cursorrules`, so one of them
 * has to give way. Verified against `@chameleon-ui-lib/react@2.0.0-alpha.1`
 * (`bin/engine/agents.mjs`), the division is not the one you'd assume:
 *
 *   - **Chameleon is the careful one.** `agents init` splices its guide between
 *     `<!-- chameleon:start -->` and `<!-- chameleon:end -->`, refreshing the
 *     block in place and never touching content outside the markers.
 *   - **NEXUS is the destructive one.** `CLAUDE.md` and `AGENTS.md` are in
 *     `ALWAYS_REPLACE`, so every `nexus init` / `upgrade` / `repair` rewrites
 *     them wholesale — silently deleting any Chameleon block that was there.
 *
 * So the fix belongs here, not in Chameleon: capture the block before NEXUS
 * regenerates, restore it afterwards. NEXUS owns the file; Chameleon owns its
 * section; neither loses work.
 *
 * The markers are Chameleon's own, deliberately: a later
 * `chameleon agents init` then refreshes the same block in place instead of
 * appending a second copy.
 */

import path from 'node:path';

import { fileExists, readFile, writeFile } from '../file-system.js';

/** Chameleon's block markers, copied verbatim from `bin/engine/agents.mjs`. */
export const CHAMELEON_BLOCK_START = '<!-- chameleon:start -->';
export const CHAMELEON_BLOCK_END = '<!-- chameleon:end -->';

/** The AI instruction files both tools write into. */
export const AGENT_FILES = ['CLAUDE.md', 'AGENTS.md', '.cursorrules'] as const;

/** Captured blocks, keyed by file name relative to the project root. */
export type CapturedBlocks = Map<string, string>;

/** Pull the Chameleon block out of a file's content, markers included. */
export function extractChameleonBlock(content: string): string | null {
  const start = content.indexOf(CHAMELEON_BLOCK_START);
  if (start === -1) return null;

  const end = content.indexOf(CHAMELEON_BLOCK_END, start);
  if (end === -1) return null;

  return content.slice(start, end + CHAMELEON_BLOCK_END.length);
}

/**
 * Splice a block into content: replace an existing one, or append it.
 *
 * Mirrors what `chameleon agents init` does, so a file that has been through
 * either tool looks the same.
 */
export function applyChameleonBlock(content: string, block: string): string {
  const existing = extractChameleonBlock(content);
  if (existing) return content.replace(existing, block);

  return `${content.trimEnd()}\n\n${block}\n`;
}

/**
 * Read the Chameleon blocks currently on disk, before NEXUS overwrites
 * anything. Returns an empty map when there is nothing to preserve, which is
 * the common case.
 */
export async function captureChameleonBlocks(projectRoot: string): Promise<CapturedBlocks> {
  const captured: CapturedBlocks = new Map();

  for (const file of AGENT_FILES) {
    const filePath = path.join(projectRoot, file);
    if (!(await fileExists(filePath))) continue;

    const content = await readFile(filePath);
    if (content === null) continue;

    const block = extractChameleonBlock(content);
    if (block) captured.set(file, block);
  }

  return captured;
}

/**
 * Put captured blocks back after NEXUS has regenerated the files.
 *
 * Returns the files it touched, so callers can report the preservation rather
 * than performing it invisibly.
 */
export async function restoreChameleonBlocks(
  projectRoot: string,
  blocks: CapturedBlocks,
): Promise<string[]> {
  const restored: string[] = [];

  for (const [file, block] of blocks) {
    const filePath = path.join(projectRoot, file);
    const content = await readFile(filePath);
    if (content === null) continue;

    // Already there (NEXUS didn't actually replace this file) — leave it alone.
    if (content.includes(CHAMELEON_BLOCK_START)) continue;

    await writeFile(filePath, applyChameleonBlock(content, block));
    restored.push(file);
  }

  return restored;
}

/**
 * Include a `chameleon.agent.md` fragment in the files NEXUS owns.
 *
 * This is the forward-looking path: once Chameleon ships fragment mode
 * (`chameleon agents init --fragment` writing `chameleon.agent.md` and nothing
 * else), NEXUS reads that file and splices it in itself — same markers, same
 * result, no command that writes to NEXUS-owned files at all.
 *
 * Returns the files it updated; an absent fragment is a no-op.
 */
export async function includeChameleonFragment(projectRoot: string): Promise<string[]> {
  const fragmentPath = path.join(projectRoot, 'chameleon.agent.md');
  if (!(await fileExists(fragmentPath))) return [];

  const fragment = (await readFile(fragmentPath))?.trim();
  if (!fragment) return [];

  const block = fragment.includes(CHAMELEON_BLOCK_START)
    ? fragment
    : `${CHAMELEON_BLOCK_START}\n${fragment}\n${CHAMELEON_BLOCK_END}`;

  const updated: string[] = [];

  for (const file of AGENT_FILES) {
    const filePath = path.join(projectRoot, file);
    const content = await readFile(filePath);
    if (content === null) continue;

    await writeFile(filePath, applyChameleonBlock(content, block));
    updated.push(file);
  }

  return updated;
}
