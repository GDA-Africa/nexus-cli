/**
 * NEXUS CLI - Update Check Utility
 *
 * Fetches the latest published version of @nexus-framework/cli from the npm registry
 * and compares it to the installed version. Used by:
 *   - `nexus update` command  (explicit check + auto-install)
 *   - cli.ts startup hook     (silent background check → notification banner)
 *
 * No external dependencies beyond Node's built-in fetch (Node 20+).
 */

import { version as currentVersion } from '../version.js';

// ─── Types ────────────────────────────────────────────────────

export interface UpdateInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  /** One-line headline describing the most notable thing in the new version. */
  headline: string;
  /** npm install command for the detected package manager. */
  installCmd: string;
}

// ─── Release Headlines ────────────────────────────────────────
// Manually maintained map of version → headline string.
// When a new version is published, add its entry here.
// The check walks from the target version downward to find the best match.

const RELEASE_HEADLINES: Record<string, string> = {
  '0.3.0': '🧠 Skills System — AI task instructions per framework, `nexus skill` command',
  '0.2.1': '🐛 Bug fixes — backend scaffolding improvements & Spring Boot support',
  '0.2.0': '🎭 Agent Persona — configure your AI\'s tone, verbosity, and identity',
  '0.1.4': '📖 Full AI instructions embedded in every tool file (Cursor, Windsurf, Copilot)',
  '0.1.3': '🧠 Knowledge Base & upgrade/repair commands — progressive project memory',
  '0.1.2': '📦 Sample project generation & README improvements',
  '0.1.1': '🐛 Bug fixes and test improvements',
  '0.1.0': '🚀 Initial release — nexus init, adopt, 5 frameworks, AI config',
};

// ─── Package Manager Detection ────────────────────────────────

/**
 * Detect how the CLI was installed to use the same package manager for updates.
 * Falls back to `npm install -g` if detection fails.
 */
function detectInstallCommand(pkg: string): string {
  // Check if running inside a yarn global install
  const execPath = process.env['npm_execpath'] ?? '';
  if (execPath.includes('yarn')) {
    return `yarn global add ${pkg}`;
  }
  // Check if pnpm is the executor
  if (execPath.includes('pnpm') || process.env['npm_config_user_agent']?.includes('pnpm')) {
    return `pnpm add -g ${pkg}`;
  }
  return `npm install -g ${pkg}`;
}

// ─── Semver Comparison ────────────────────────────────────────

/**
 * Simple semver comparison. Returns true if `a` is strictly greater than `b`.
 * Handles major.minor.patch only (no pre-release tags).
 */
function isNewer(a: string, b: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [aMaj, aMin, aPatch] = parse(a);
  const [bMaj, bMin, bPatch] = parse(b);

  if (aMaj !== bMaj) return (aMaj ?? 0) > (bMaj ?? 0);
  if (aMin !== bMin) return (aMin ?? 0) > (bMin ?? 0);
  return (aPatch ?? 0) > (bPatch ?? 0);
}

// ─── Headline Lookup ──────────────────────────────────────────

/**
 * Find the best headline to show for a version.
 * Exact match first, then the nearest older registered version.
 */
function getHeadline(version: string): string {
  if (RELEASE_HEADLINES[version]) return RELEASE_HEADLINES[version];

  // Walk the sorted keys (desc) and return the first one that is <= version
  const sorted = Object.keys(RELEASE_HEADLINES).sort((a, b) =>
    isNewer(b, a) ? 1 : -1,
  );
  for (const v of sorted) {
    if (!isNewer(v, version)) return RELEASE_HEADLINES[v] ?? 'New features and improvements';
  }
  return 'New features and improvements';
}

// ─── Main Export ─────────────────────────────────────────────

/**
 * Check npm registry for the latest @nexus-framework/cli version.
 *
 * @param timeoutMs  Network timeout in ms (default 4000 — fast, non-blocking)
 * @returns UpdateInfo, or null if the check could not complete (offline, error)
 */
export async function checkForUpdate(timeoutMs = 4000): Promise<UpdateInfo | null> {
  const pkg = '@nexus-framework/cli';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`https://registry.npmjs.org/${pkg}/latest`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timer);

    if (!res.ok) return null;

    const data = (await res.json()) as { version?: string };
    const latest = data.version;

    if (!latest || typeof latest !== 'string') return null;

    const hasUpdate = isNewer(latest, currentVersion);

    return {
      current: currentVersion,
      latest,
      hasUpdate,
      headline: hasUpdate ? getHeadline(latest) : '',
      installCmd: detectInstallCommand(pkg),
    };
  } catch {
    // Offline, timeout, or any network error — silently return null
    return null;
  }
}
