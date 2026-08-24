/**
 * Resolve a harness profile for a given harness id or generated file path.
 */

import { HARNESS_FILE_MAP, type HarnessesConfig, type HarnessProfile } from './types.js';

/**
 * Look up the profile for a harness id, falling back to the declared
 * default when the id itself has no entry. Returns `null` only when
 * `config` itself is `null`/`undefined` — the "no harnesses.yml" case,
 * which every caller must treat as unbounded/today-identical.
 */
export function resolveHarnessProfile(
  config: HarnessesConfig | null | undefined,
  harnessId: string,
): HarnessProfile | null {
  if (!config) return null;
  return config.harnesses[harnessId] ?? config.harnesses[config.default] ?? null;
}

/**
 * Look up the profile that governs a generated instruction file (e.g.
 * `"CLAUDE.md"`), by finding the harness id whose canonical file — or
 * explicit `file` override — matches. Explicit overrides are checked first
 * so a custom harness id (e.g. a local-model target reusing the Claude Code
 * file) can claim a file the canonical map would otherwise assign elsewhere.
 *
 * Returns `null` when `config` is absent, or when no declared harness
 * targets this file — both cases mean "generate today's unbounded content."
 */
export function resolveProfileForFile(
  config: HarnessesConfig | null | undefined,
  filePath: string,
): HarnessProfile | null {
  if (!config) return null;

  for (const profile of Object.values(config.harnesses)) {
    if (profile.file === filePath) return profile;
  }

  const canonicalId = Object.entries(HARNESS_FILE_MAP).find(([, path]) => path === filePath)?.[0];
  if (canonicalId && config.harnesses[canonicalId]) return config.harnesses[canonicalId];

  return null;
}

/**
 * Inverse of the lookup inside `resolveProfileForFile`: given a harness id,
 * which generated file (if any) does it own? Checks the harness's own
 * `file` override first, then the canonical `HARNESS_FILE_MAP`. Returns
 * `null` for a harness with neither — e.g. a bare model target reached only
 * through `nexus context`, with no auto-loaded file of its own.
 */
export function resolveFileForHarness(
  config: HarnessesConfig | null | undefined,
  harnessId: string,
): string | null {
  if (!config) return null;
  const profile = config.harnesses[harnessId];
  if (profile?.file) return profile.file;
  return HARNESS_FILE_MAP[harnessId] ?? null;
}
