/**
 * NEXUS CLI — Chameleon subprocess runner
 *
 * NEXUS never takes a hard dependency on Chameleon. It is resolved from the
 * user's environment at generation time, invoked as a subprocess, and its
 * absence is a normal, handled outcome — not an error. Nothing in this file
 * imports `@chameleon-ui-lib/react`; if it isn't installed, `detectChameleon`
 * simply reports `available: false` and generation continues with `--ui none`.
 *
 * Two commitments are enforced here rather than merely documented:
 *
 *   - **Always `--json`.** The envelope is the source of truth for what
 *     happened, and becomes generation evidence.
 *   - **Never `chameleon agents init` in write mode.** That command writes
 *     into `CLAUDE.md` and `AGENTS.md` — files NEXUS owns and regenerates.
 *     `runChameleon` refuses the call rather than trusting every future caller
 *     to remember. (Chameleon splices its block politely between markers; the
 *     destructive half of that collision is NEXUS's own regeneration, which
 *     `utils/chameleon/agent-block.ts` handles.)
 */

import path from 'node:path';

import { execa } from 'execa';

import type {
  ChameleonCapability,
  ChameleonEnvelope,
  ChameleonInstall,
} from '../../types/chameleon.js';
import { fileExists } from '../file-system.js';

/** Injectable process runner — tests supply a fake instead of shelling out. */
export type ChameleonExec = (
  bin: string,
  args: string[],
  options: { cwd: string },
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

const defaultExec: ChameleonExec = async (bin, args, options) => {
  const result = await execa(bin, args, {
    cwd: options.cwd,
    reject: false,
    // Chameleon prints a single JSON envelope on stdout under --json.
    stdout: 'pipe',
    stderr: 'pipe',
  });

  return {
    exitCode: result.exitCode ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
};

export interface ChameleonRunOptions {
  cwd: string;
  exec?: ChameleonExec;
  /** Skip resolution and use this command directly (already-resolved installs). */
  bin?: string;
  binArgs?: string[];
}

/** The outcome of one Chameleon invocation, absence included. */
export interface ChameleonRunResult<TData = unknown> {
  ok: boolean;
  /** Parsed envelope — absent when Chameleon could not run or spoke nonsense. */
  envelope?: ChameleonEnvelope<TData>;
  exitCode: number;
  /** Populated when the failure is ours to explain rather than Chameleon's. */
  failure?: 'not-found' | 'unparseable-output' | 'refused';
  message?: string;
  /** Raw stdout/stderr, kept for evidence when the envelope is missing. */
  stdout?: string;
  stderr?: string;
}

/* ──────────────────────────────────────────────────────────────
 * Resolution
 * ────────────────────────────────────────────────────────────── */

export interface ResolvedChameleonBin {
  bin: string;
  /** Leading args that address the CLI itself (e.g. the npx package spec). */
  binArgs: string[];
  resolvedFrom: 'env' | 'local' | 'npx';
}

/**
 * Find a Chameleon CLI to call.
 *
 * Order: explicit override → the project's own `node_modules/.bin` → `npx`.
 * `npx --no-install` is deliberate: resolving Chameleon must never silently
 * download 6 MB of dependencies on a user who did not opt in.
 */
export async function resolveChameleonBin(cwd: string): Promise<ResolvedChameleonBin> {
  const override = process.env.NEXUS_CHAMELEON_BIN;
  if (override) {
    return { bin: override, binArgs: [], resolvedFrom: 'env' };
  }

  const localBin = path.join(cwd, 'node_modules', '.bin', 'chameleon');
  if (await fileExists(localBin)) {
    return { bin: localBin, binArgs: [], resolvedFrom: 'local' };
  }

  return { bin: 'npx', binArgs: ['--no-install', 'chameleon'], resolvedFrom: 'npx' };
}

/* ──────────────────────────────────────────────────────────────
 * Invocation
 * ────────────────────────────────────────────────────────────── */

/** Commands NEXUS will not issue, with the reason reported back to the caller. */
function refuseReason(args: string[]): string | null {
  const [first, second] = args;
  if (first === 'agents' && second === 'init') {
    const opted = args.includes('--fragment') || args.includes('--skip');
    if (!opted) {
      return (
        '`chameleon agents init` writes CLAUDE.md and AGENTS.md, which NEXUS owns. ' +
        'NEXUS includes Chameleon\'s guidance as a fragment instead.'
      );
    }
  }
  return null;
}

/**
 * Run a Chameleon command with `--json` and parse its envelope.
 *
 * Never throws for the ordinary failure modes: a missing CLI, a non-zero exit,
 * or unparseable output all come back as a structured result the caller can
 * report and move past.
 */
export async function runChameleon<TData = unknown>(
  args: string[],
  options: ChameleonRunOptions,
): Promise<ChameleonRunResult<TData>> {
  const refused = refuseReason(args);
  if (refused) {
    return { ok: false, exitCode: 1, failure: 'refused', message: refused };
  }

  const exec = options.exec ?? defaultExec;
  const resolved = options.bin
    ? { bin: options.bin, binArgs: options.binArgs ?? [] }
    : await resolveChameleonBin(options.cwd);

  const fullArgs = [...resolved.binArgs, ...args];
  if (!fullArgs.includes('--json')) fullArgs.push('--json');

  let result: { exitCode: number; stdout: string; stderr: string };
  try {
    result = await exec(resolved.bin, fullArgs, { cwd: options.cwd });
  } catch (err) {
    return {
      ok: false,
      exitCode: 1,
      failure: 'not-found',
      message: err instanceof Error ? err.message : String(err),
    };
  }

  const envelope = parseEnvelope<TData>(result.stdout);

  if (!envelope) {
    // No envelope and a non-zero exit almost always means the CLI itself was
    // never found (npx --no-install exits 1 with an npm error on stderr).
    const notFound = result.exitCode !== 0 && !result.stdout.trim();
    return {
      ok: false,
      exitCode: result.exitCode,
      failure: notFound ? 'not-found' : 'unparseable-output',
      message: notFound
        ? 'Chameleon CLI not found in this environment.'
        : 'Chameleon returned output that was not a JSON envelope.',
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  return {
    ok: envelope.ok && result.exitCode === 0,
    envelope,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/**
 * Pull the JSON envelope out of stdout.
 *
 * Tolerates leading noise (npx notices, deprecation warnings) by falling back
 * to the first `{`, so a chatty environment doesn't look like a Chameleon bug.
 */
export function parseEnvelope<TData = unknown>(stdout: string): ChameleonEnvelope<TData> | undefined {
  const trimmed = stdout.trim();
  if (!trimmed) return undefined;

  const candidates = [trimmed];
  const brace = trimmed.indexOf('{');
  if (brace > 0) candidates.push(trimmed.slice(brace));

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (typeof parsed === 'object' && parsed !== null && 'ok' in parsed && 'command' in parsed) {
        return parsed as ChameleonEnvelope<TData>;
      }
    } catch {
      // try the next candidate
    }
  }

  return undefined;
}

/* ──────────────────────────────────────────────────────────────
 * Capabilities handshake
 * ────────────────────────────────────────────────────────────── */

/**
 * What every Chameleon that ships AppSpec v2 can do.
 *
 * `chameleon --version --json` returns only `{ cli, library }` today, so this
 * is the floor NEXUS assumes when nothing is advertised. When Chameleon starts
 * returning `data.capabilities`, that list is used verbatim — NEXUS checks
 * capabilities, not semver ranges, so new versions light up new paths without
 * a NEXUS release.
 */
export const BASELINE_CAPABILITIES: ChameleonCapability[] = [
  'appspec-v2',
  'validate-only',
  'json-envelope',
];

interface VersionData {
  cli?: string;
  library?: string;
  capabilities?: unknown;
}

/** Read the advertised capability list, ignoring anything malformed. */
function readCapabilities(data: VersionData | undefined): ChameleonCapability[] | null {
  if (!data || !Array.isArray(data.capabilities)) return null;

  const list = data.capabilities.filter((entry): entry is string => typeof entry === 'string');
  return list.length ? (list as ChameleonCapability[]) : null;
}

/**
 * Ask the environment what Chameleon it has, if any.
 *
 * Absence is reported, never thrown — every caller must be able to carry on
 * and generate a working project without it.
 */
export async function detectChameleon(options: {
  cwd: string;
  exec?: ChameleonExec;
}): Promise<ChameleonInstall> {
  const resolved = await resolveChameleonBin(options.cwd);

  const result = await runChameleon<VersionData>(['--version'], {
    cwd: options.cwd,
    exec: options.exec,
    bin: resolved.bin,
    binArgs: resolved.binArgs,
  });

  if (!result.ok || !result.envelope) {
    return {
      available: false,
      capabilities: [],
      reason:
        result.message ??
        'Chameleon did not respond to `--version --json`; treating it as unavailable.',
    };
  }

  const data = result.envelope.data;

  return {
    available: true,
    cliVersion: data?.cli ?? result.envelope.version,
    libraryVersion: data?.library ?? result.envelope.version,
    capabilities: readCapabilities(data) ?? [...BASELINE_CAPABILITIES],
    resolvedFrom: resolved.resolvedFrom,
  };
}

/** Capability check — the only thing gating an integration path. */
export function hasCapability(install: ChameleonInstall, capability: ChameleonCapability): boolean {
  return install.available && install.capabilities.includes(capability);
}
