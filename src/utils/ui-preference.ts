/**
 * NEXUS CLI — UI provider preference
 *
 * Chameleon is opt-in and never required. A user who never wants it should
 * never be asked twice; a user who always wants it should never have to ask
 * twice either. Both are the same feature: a persisted preference.
 *
 *   nexus use chameleon            → this project  (.nexus/config.json)
 *   nexus use chameleon --global   → every project (~/.config/nexus/config.json)
 *   nexus use none                 → opt back out at either scope
 *   nexus use                      → show what's active and where it came from
 *
 * Resolution order, highest wins:
 *   1. `--ui chameleon` / `--ui none` on the command line
 *   2. project `.nexus/config.json`
 *   3. global `~/.config/nexus/config.json`
 *   4. built-in default → `none`
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { ResolvedUiPreference, UiProvider } from '../types/chameleon.js';

import { fileExists } from './file-system.js';

/** The built-in default. Chameleon is never on unless someone said so. */
export const DEFAULT_UI_PROVIDER: UiProvider = 'none';

/** Shape of `.nexus/config.json` / `~/.config/nexus/config.json`. */
export interface NexusUserConfig {
  ui?: UiProvider;
  [key: string]: unknown;
}

/** Project-scoped config path for a project root. */
export function projectConfigPath(projectRoot: string): string {
  return path.join(projectRoot, '.nexus', 'config.json');
}

/**
 * Global config path.
 *
 * `NEXUS_CONFIG_HOME` wins (tests and users who relocate it), then
 * `XDG_CONFIG_HOME`, then `~/.config`.
 */
export function globalConfigPath(): string {
  const explicit = process.env.NEXUS_CONFIG_HOME;
  if (explicit) return path.join(explicit, 'config.json');

  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.trim() ? xdg : path.join(os.homedir(), '.config');
  return path.join(base, 'nexus', 'config.json');
}

/** Read a config file, tolerating absence and corruption alike. */
async function readConfigFile(configPath: string): Promise<NexusUserConfig | null> {
  if (!(await fileExists(configPath))) return null;

  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as NexusUserConfig;
  } catch {
    // A corrupted preference file must never break a command — fall through
    // to the next precedence level instead.
    return null;
  }
}

/** True for values we recognise as a provider. Unknown strings are ignored. */
export function isUiProvider(value: unknown): value is UiProvider {
  return value === 'chameleon' || value === 'none';
}

/**
 * Resolve the UI provider for a run.
 *
 * `flag` is the raw `--ui` value; anything unrecognised is ignored rather than
 * fatal, so a typo falls back to config instead of aborting generation.
 */
export async function resolveUiPreference(options: {
  flag?: string;
  projectRoot?: string;
} = {}): Promise<ResolvedUiPreference> {
  if (isUiProvider(options.flag)) {
    return { provider: options.flag, source: 'flag' };
  }

  if (options.projectRoot) {
    const projectPath = projectConfigPath(options.projectRoot);
    const projectConfig = await readConfigFile(projectPath);
    if (projectConfig && isUiProvider(projectConfig.ui)) {
      return { provider: projectConfig.ui, source: 'project', path: projectPath };
    }
  }

  const globalPath = globalConfigPath();
  const globalConfig = await readConfigFile(globalPath);
  if (globalConfig && isUiProvider(globalConfig.ui)) {
    return { provider: globalConfig.ui, source: 'global', path: globalPath };
  }

  return { provider: DEFAULT_UI_PROVIDER, source: 'default' };
}

/**
 * Persist a UI provider preference.
 *
 * Merges into whatever else lives in the config file — NEXUS owns the `ui`
 * key, not the file. Returns the path written so callers can show it.
 */
export async function setUiPreference(
  provider: UiProvider,
  options: { global?: boolean; projectRoot?: string } = {},
): Promise<string> {
  const configPath = options.global
    ? globalConfigPath()
    : projectConfigPath(options.projectRoot ?? process.cwd());

  const existing = (await readConfigFile(configPath)) ?? {};
  const next: NexusUserConfig = { ...existing, ui: provider };

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');

  return configPath;
}

/** One-line provenance string for `nexus use` and `--explain`. */
export function describeUiPreference(pref: ResolvedUiPreference): string {
  const label = pref.provider === 'chameleon' ? 'Chameleon' : 'none (NEXUS generates the UI)';

  switch (pref.source) {
    case 'flag':
      return `${label} (from --ui)`;
    case 'project':
      return `${label} (from project config)`;
    case 'global':
      return `${label} (from global config)`;
    case 'default':
      return `${label} (built-in default)`;
  }
}
