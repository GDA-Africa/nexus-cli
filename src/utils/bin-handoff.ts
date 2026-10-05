/**
 * NEXUS CLI - `nexus` bin handoff
 *
 * `@nexus-framework/cli` is the only npm package that declares the `nexus` bin.
 * `@nexus-framework/harness` bundles its own copy of the CLI (and provides `nexus`
 * itself when the CLI is not installed). When both are installed globally, `nexus`
 * runs whichever CLI is newer, so installing either package behaves like an upgrade
 * or downgrade of one shared command.
 *
 * `bin/nexus.js` calls {@link resolveNexusHandoff} before loading anything else, so
 * this module must stay cheap: Node builtins only, a couple of small file reads.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** The package that owns the `nexus` bin. */
export const CLI_PACKAGE = '@nexus-framework/cli';
/** The harness package that bundles its own copy of the CLI. */
export const HARNESS_PACKAGE = '@nexus-framework/harness';
/**
 * Set (to the chosen entry) when one `nexus` install hands the run to another; a run
 * that sees it never hands off again. Setting it by hand disables the handoff.
 */
export const DELEGATION_ENV = 'NEXUS_BIN_DELEGATED';
/** package.json field marking the harness's placeholder CLI package. */
const STUB_OWNER_FIELD = 'nexusOwner';

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

function comparePrerelease(left: string | undefined, right: string | undefined): number {
  if (left === right) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  const a = left.split('.');
  const b = right.split('.');
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const x = a[index];
    const y = b[index];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xNumeric = /^\d+$/.test(x);
    const yNumeric = /^\d+$/.test(y);
    if (xNumeric && yNumeric) return Number(x) > Number(y) ? 1 : -1;
    if (xNumeric) return -1;
    if (yNumeric) return 1;
    return x > y ? 1 : -1;
  }
  return 0;
}

/**
 * Compare two semver versions, prerelease-aware. Unparseable versions sort below valid ones.
 * @returns A positive number when `left` is newer, negative when `right` is newer, 0 when equal.
 */
export function compareVersions(left: string, right: string): number {
  const a = SEMVER.exec(left.trim());
  const b = SEMVER.exec(right.trim());
  if (a === null || b === null) return a === null ? (b === null ? 0 : -1) : 1;
  for (let index = 1; index <= 3; index++) {
    const difference = Number(a[index]) - Number(b[index]);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }
  return comparePrerelease(a[4], b[4]);
}

/** One installed copy of the CLI. */
export interface InstalledCli {
  /** Package directory. */
  readonly root: string;
  readonly version: string;
  /** Absolute path of its `nexus` bin script. */
  readonly entry: string;
}

/**
 * Read a real `@nexus-framework/cli` install; the harness placeholder package does not count.
 */
export function readInstalledCli(root: string): InstalledCli | undefined {
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  } catch {
    return undefined;
  }
  if (manifest === null || typeof manifest !== 'object') return undefined;
  const fields = manifest as Record<string, unknown>;
  if (fields.name !== CLI_PACKAGE || fields[STUB_OWNER_FIELD] !== undefined) return undefined;
  const bin = fields.bin;
  const script =
    typeof bin === 'string'
      ? bin
      : bin !== null && typeof bin === 'object'
        ? (bin as Record<string, unknown>).nexus
        : undefined;
  if (typeof fields.version !== 'string' || typeof script !== 'string') return undefined;
  const entry = path.resolve(root, script);
  return existsSync(entry) ? { root, version: fields.version, entry } : undefined;
}

/**
 * The CLI bundled inside a global `@nexus-framework/harness` that sits next to this CLI.
 * Only global layouts count (`<prefix>/lib/node_modules` on POSIX, `<prefix>/node_modules`
 * on Windows), so a project that depends on both packages keeps its own CLI.
 * @param cliRoot - This CLI's package directory.
 * @param platform - Target platform.
 */
export function findHarnessBundledCli(
  cliRoot: string,
  platform: NodeJS.Platform = process.platform,
): InstalledCli | undefined {
  const root = path.resolve(cliRoot);
  const scope = path.dirname(root);
  const nodeModules = path.dirname(scope);
  if (
    path.basename(root) !== 'cli' ||
    path.basename(scope) !== '@nexus-framework' ||
    path.basename(nodeModules) !== 'node_modules'
  ) {
    return undefined;
  }
  if (platform !== 'win32' && path.basename(path.dirname(nodeModules)) !== 'lib') return undefined;
  return readInstalledCli(
    path.join(
      nodeModules,
      '@nexus-framework',
      'harness',
      'node_modules',
      '@nexus-framework',
      'cli',
    ),
  );
}

/** What `bin/nexus.js` should do. */
export type NexusHandoff =
  | { readonly kind: 'self' }
  | { readonly kind: 'delegate'; readonly entry: string; readonly version: string }
  | { readonly kind: 'version'; readonly text: string };

/** Inputs for {@link resolveNexusHandoff}. */
export interface NexusHandoffOptions {
  /** This CLI's package directory. */
  readonly cliRoot: string;
  /** Arguments after the command name. */
  readonly argv: readonly string[];
  readonly env: NodeJS.ProcessEnv;
  readonly platform?: NodeJS.Platform;
}

/**
 * Decide whether this install answers `nexus` or hands off to a newer CLI bundled with a
 * global harness. Equal versions stay here. `--version` for a handed-off run is answered
 * directly, naming the install that would have answered.
 */
export function resolveNexusHandoff(options: NexusHandoffOptions): NexusHandoff {
  if (options.env[DELEGATION_ENV] !== undefined) return { kind: 'self' };
  const self = readInstalledCli(path.resolve(options.cliRoot));
  const bundled = findHarnessBundledCli(options.cliRoot, options.platform);
  if (self === undefined || bundled === undefined) return { kind: 'self' };
  if (compareVersions(bundled.version, self.version) <= 0) return { kind: 'self' };
  const [first, ...rest] = options.argv;
  if (rest.length === 0 && (first === '--version' || first === '-v')) {
    return { kind: 'version', text: `${bundled.version} (via ${HARNESS_PACKAGE})` };
  }
  return { kind: 'delegate', entry: bundled.entry, version: bundled.version };
}
