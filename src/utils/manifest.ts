/**
 * NEXUS CLI — Manifest normalization
 *
 * `.nexus/manifest.json` is written by whatever CLI version generated the
 * project, so `manifest.config` can be partial: older versions, `adopt` on
 * backend-only projects (framework detected as null), or hand-edited files.
 * Commands that trust the manifest (`upgrade`, `repair`) must normalize it
 * before handing it to generators — otherwise template literals render
 * literal "undefined" (bug found dogfooding v1.0, 2026-06-11 incident).
 *
 * Every field falls back to an explicit, valid default. Unknown enum values
 * are preserved (forward compatibility) — only missing/null values are filled.
 */

import { DEFAULT_PERSONA, type NexusConfig, type NexusPersona } from '../types/config.js';

import { toDisplayName, toSlug } from './validator.js';

/** A manifest config as it may actually appear on disk: anything optional. */
export type RawManifestConfig = Partial<NexusConfig> & {
  persona?: Partial<NexusPersona>;
};

/**
 * Fill missing/null manifest config fields with explicit defaults.
 * `fallbackName` seeds projectName/displayName when absent (usually the
 * target directory basename).
 */
export function normalizeManifestConfig(
  raw: RawManifestConfig | undefined | null,
  fallbackName = 'project',
): NexusConfig {
  const source = raw ?? {};

  const projectName = source.projectName ?? toSlug(fallbackName) ?? 'project';
  const displayName = source.displayName ?? toDisplayName(projectName);

  return {
    projectName,
    displayName,
    projectType: source.projectType ?? 'web',
    dataStrategy: source.dataStrategy ?? 'local-only',
    appPatterns: source.appPatterns ?? [],
    frontendFramework: source.frontendFramework ?? 'none',
    backendStrategy: source.backendStrategy ?? 'integrated',
    backendFramework: source.backendFramework ?? 'none',
    testFramework: source.testFramework ?? 'none',
    packageManager: source.packageManager ?? 'npm',
    git: source.git ?? true,
    installDeps: source.installDeps ?? false,
    persona: {
      ...DEFAULT_PERSONA,
      ...(source.persona ?? {}),
    },
    ...(source.localOnly !== undefined ? { localOnly: source.localOnly } : {}),
    ...(source.enableSkills !== undefined ? { enableSkills: source.enableSkills } : {}),
    ...(source.enableAgents !== undefined ? { enableAgents: source.enableAgents } : {}),
    ...(source.uiProvider !== undefined ? { uiProvider: source.uiProvider } : {}),
  };
}
