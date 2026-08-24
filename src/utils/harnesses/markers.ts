/**
 * The structural marker a generated tool instruction file carries, recording
 * what its own protocol tells the agent to read at orientation time beyond
 * the file itself.
 *
 * Shared between `generators/ai-config.ts` (which writes it) and D14's
 * project-total check (which reads it back) so the two stay in sync without
 * D14 needing to re-derive generation's variant-selection logic, and without
 * grepping instructional prose that could be reworded independently of this
 * contract. A measurable structural fact, not a keyword sniff over sentences
 * an agent might phrase around.
 */

/**
 * The standard variant points at both brain files as things to read — by
 * hand or via the pack — before starting work.
 */
export const READS_MARKER_FULL = '<!--nexus-reads:.nexus/docs/index.md,.nexus/docs/knowledge.md-->';

/**
 * The native-pointer and static-fallback variants are self-contained (or
 * pull everything through one MCP call); neither instructs reading either
 * brain file directly.
 */
export const READS_MARKER_NONE = '<!--nexus-reads:none-->';

/** Append a reads marker as the file's own last line. */
export function withReadsMarker(content: string, marker: string): string {
  return `${content}${marker}\n`;
}

/**
 * Files a `READS_MARKER_FULL` marker names, relative to the project root.
 * Exported so D14 does not hardcode the pair independently of what the
 * marker actually promises.
 */
export const FULL_READ_FILES = ['.nexus/docs/index.md', '.nexus/docs/knowledge.md'] as const;

/**
 * Decode which brain files a generated instruction file's content claims to
 * instruct reading. Files with neither marker (hand-written, or generated
 * before this marker existed) are assumed to read both — the same
 * always-true-until-told-otherwise assumption D14 made before profiles
 * existed, so an un-regenerated project does not silently stop being
 * checked.
 */
export function assumedOrientationReads(content: string): readonly string[] {
  if (content.includes(READS_MARKER_NONE)) return [];
  return FULL_READ_FILES;
}
