/**
 * NEXUS CLI — Chameleon delegation
 *
 * The generation sequence, in order:
 *
 *   1. `nexus init` resolves config + UI preference
 *   2. NEXUS builds an AppSpec v2 and validates it locally
 *   3. `chameleon new <dir> --app-spec <tmp> --validate-only --json`  ← fail fast
 *   4. `chameleon new <dir> --app-spec <tmp> --json`                  ← empty dir
 *   5. NEXUS overlays `.nexus/`, tooling, CI, tests, .gitignore
 *   6. NEXUS runs the validation gate
 *   7. NEXUS records the envelopes as generation evidence
 *
 * Steps 3 and 6 are where generation fails loudly instead of producing a
 * broken project quietly. Everything in between is written so that a missing,
 * older, or broken Chameleon degrades to "NEXUS generates the UI" rather than
 * to a failed `nexus init`.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { AppSpecV2, ChameleonEnvelope, ChameleonInstall } from '../../types/chameleon.js';
import type { NexusConfig } from '../../types/config.js';
import { ensureDirectory, writeFile } from '../file-system.js';

import type { BuildAppSpecOptions } from './appspec.js';
import { buildAppSpec, validateAppSpec } from './appspec.js';
import type { ChameleonExec } from './runner.js';
import { detectChameleon, hasCapability, runChameleon } from './runner.js';
import type { ChameleonPath } from './support.js';
import { chameleonSupport } from './support.js';

/**
 * Files `scaffoldApp()` writes. When Chameleon owns the app shell, NEXUS must
 * not clobber these — it overlays around them and merges its tooling into the
 * `package.json` Chameleon produced.
 */
export const CHAMELEON_OWNED_PATHS = [
  'package.json',
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'src/main.tsx',
  'src/App.tsx',
  'src/styles/index.css',
  'brand.config.json',
] as const;

/** True when Chameleon owns this generated path and NEXUS should stand back. */
export function isChameleonOwned(filePath: string): boolean {
  const normalized = filePath.split(path.sep).join('/');
  return (CHAMELEON_OWNED_PATHS as readonly string[]).includes(normalized);
}

/* ──────────────────────────────────────────────────────────────
 * Planning — decided before anything is written
 * ────────────────────────────────────────────────────────────── */

export type DelegationDecision =
  | { run: true; path: ChameleonPath; reason: string }
  | { run: false; reason: string };

/**
 * Decide whether to delegate, given the project shape and what Chameleon in
 * this environment can actually do.
 *
 * Every `run: false` carries a reason worth printing — a silently skipped
 * preference is the failure mode this whole design exists to avoid.
 */
export function planChameleonDelegation(
  config: Pick<NexusConfig, 'frontendFramework' | 'projectType'>,
  install: ChameleonInstall,
): DelegationDecision {
  const support = chameleonSupport(config);
  if (!support.supported || !support.path) {
    return { run: false, reason: support.reason };
  }

  if (!install.available) {
    return {
      run: false,
      reason:
        install.reason ??
        'Chameleon is not installed in this environment. Install @chameleon-ui-lib/react to enable it.',
    };
  }

  if (support.path === 'new') {
    if (!hasCapability(install, 'appspec-v2')) {
      return {
        run: false,
        reason: `Chameleon ${install.cliVersion ?? 'here'} does not support AppSpec v2 generation.`,
      };
    }
    return { run: true, path: 'new', reason: support.reason };
  }

  // Path B fills a NEXUS-generated skeleton. `chameleon init` configures
  // Tailwind by looking for a Vite config, so outside Vite it silently
  // configures nothing — NEXUS refuses to run it until Chameleon detects the
  // host framework (CH-05) rather than leaving a half-wired project behind.
  if (!hasCapability(install, 'init-framework-aware')) {
    return {
      run: false,
      reason:
        `Chameleon ${install.cliVersion ?? 'here'} configures Tailwind for Vite only, so \`chameleon init\` ` +
        'cannot wire up this project yet (CH-05). NEXUS generated the UI itself; re-run `nexus use chameleon` ' +
        'once Chameleon ships framework-aware init.',
    };
  }

  return { run: true, path: 'init', reason: support.reason };
}

/* ──────────────────────────────────────────────────────────────
 * Execution
 * ────────────────────────────────────────────────────────────── */

export type DelegationStatus = 'generated' | 'skipped' | 'failed';

export interface ChameleonDelegationResult {
  status: DelegationStatus;
  /** Which path ran, when one did. */
  path?: ChameleonPath;
  reason: string;
  filesWritten: string[];
  warnings: string[];
  /** The spec NEXUS handed over — recorded as evidence even on failure. */
  appSpec?: AppSpecV2;
  /** Raw envelopes, in the order the commands ran. */
  envelopes: ChameleonEnvelope[];
}

export interface DelegateOptions {
  config: NexusConfig;
  /** Absolute path of the project being generated. */
  projectRoot: string;
  install: ChameleonInstall;
  appSpec?: BuildAppSpecOptions;
  exec?: ChameleonExec;
}

/**
 * Hand generation to Chameleon.
 *
 * Path A (`new`) must run *before* NEXUS writes anything, because
 * `scaffoldApp` refuses a non-empty directory. Path B (`init`) runs after the
 * NEXUS skeleton exists. Callers are responsible for the ordering; this
 * function does the work and reports what happened.
 */
export async function delegateToChameleon(
  options: DelegateOptions,
): Promise<ChameleonDelegationResult> {
  const decision = planChameleonDelegation(options.config, options.install);
  if (!decision.run) {
    return { status: 'skipped', reason: decision.reason, filesWritten: [], warnings: [], envelopes: [] };
  }

  return decision.path === 'new'
    ? generateApp(options, decision.reason)
    : initIntoSkeleton(options, decision.reason);
}

/** Path A — Chameleon generates the Vite app, NEXUS overlays afterwards. */
async function generateApp(
  options: DelegateOptions,
  reason: string,
): Promise<ChameleonDelegationResult> {
  const appSpec = buildAppSpec(options.config, options.appSpec);

  // NEXUS commits to never handing Chameleon a spec it hasn't checked.
  const local = validateAppSpec(appSpec);
  if (!local.valid) {
    return {
      status: 'failed',
      path: 'new',
      reason:
        `The AppSpec NEXUS built is invalid — this is a NEXUS bug, not a Chameleon one:\n` +
        local.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n'),
      filesWritten: [],
      warnings: [],
      appSpec,
      envelopes: [],
    };
  }

  const specFile = await writeTempSpec(appSpec);
  const envelopes: ChameleonEnvelope[] = [];

  try {
    // The parent directory has to exist for a relative target to resolve;
    // the target itself must stay empty for scaffoldApp to accept it.
    await ensureDirectory(path.dirname(options.projectRoot));
    const cwd = path.dirname(options.projectRoot);
    const targetArg = path.basename(options.projectRoot);

    const validate = await runChameleon(
      ['new', targetArg, '--app-spec', specFile, '--validate-only'],
      { cwd, exec: options.exec },
    );
    if (validate.envelope) envelopes.push(validate.envelope);

    if (!validate.ok) {
      return {
        status: 'failed',
        path: 'new',
        reason: describeFailure('Chameleon rejected the AppSpec', validate.envelope, validate.message),
        filesWritten: [],
        warnings: validate.envelope?.warnings ?? [],
        appSpec,
        envelopes,
      };
    }

    const generate = await runChameleon(
      ['new', targetArg, '--app-spec', specFile],
      { cwd, exec: options.exec },
    );
    if (generate.envelope) envelopes.push(generate.envelope);

    if (!generate.ok) {
      return {
        status: 'failed',
        path: 'new',
        reason: describeFailure('Chameleon failed to generate the app', generate.envelope, generate.message),
        filesWritten: generate.envelope?.filesWritten ?? [],
        warnings: generate.envelope?.warnings ?? [],
        appSpec,
        envelopes,
      };
    }

    return {
      status: 'generated',
      path: 'new',
      reason,
      filesWritten: generate.envelope?.filesWritten ?? [],
      warnings: generate.envelope?.warnings ?? [],
      appSpec,
      envelopes,
    };
  } finally {
    await fs.rm(specFile, { force: true }).catch(() => undefined);
  }
}

/** Path B — NEXUS built the skeleton; Chameleon configures itself into it. */
async function initIntoSkeleton(
  options: DelegateOptions,
  reason: string,
): Promise<ChameleonDelegationResult> {
  const init = await runChameleon(['init'], { cwd: options.projectRoot, exec: options.exec });
  const envelopes: ChameleonEnvelope[] = init.envelope ? [init.envelope] : [];

  if (!init.ok) {
    return {
      status: 'failed',
      path: 'init',
      reason: describeFailure('`chameleon init` failed', init.envelope, init.message),
      filesWritten: [],
      warnings: init.envelope?.warnings ?? [],
      envelopes,
    };
  }

  return {
    status: 'generated',
    path: 'init',
    reason,
    filesWritten: init.envelope?.filesWritten ?? [],
    warnings: init.envelope?.warnings ?? [],
    envelopes,
  };
}

/** Turn an envelope's errors into one message worth showing a user. */
function describeFailure(
  headline: string,
  envelope: ChameleonEnvelope | undefined,
  fallback: string | undefined,
): string {
  const errors = envelope?.errors ?? [];
  if (!errors.length) return `${headline}: ${fallback ?? 'no details reported.'}`;

  const lines = errors.map((error) => {
    const details = (error.validationErrors ?? [])
      .map((v) => `\n    ${v.path}: ${v.message}${v.suggestion ? ` (did you mean '${v.suggestion}'?)` : ''}`)
      .join('');
    return `  [${error.code}] ${error.message}${details}`;
  });

  return `${headline}:\n${lines.join('\n')}`;
}

async function writeTempSpec(appSpec: AppSpecV2): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-appspec-'));
  const file = path.join(dir, 'appspec.json');
  await fs.writeFile(file, `${JSON.stringify(appSpec, null, 2)}\n`, 'utf8');
  return file;
}

/* ──────────────────────────────────────────────────────────────
 * Overlay helpers
 * ────────────────────────────────────────────────────────────── */

interface PackageJsonish {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Merge NEXUS's tooling into the `package.json` Chameleon wrote.
 *
 * Chameleon wins every conflict — it owns the app shell and its own runtime
 * pins. NEXUS only fills gaps, which is precisely how the generated project
 * acquires the linter, formatter, and test runner that `scaffoldApp` does not
 * write. (A freshly generated Chameleon app declares `lint: "eslint ."` with
 * no eslint in `devDependencies`; this merge is what makes that script
 * runnable rather than a trap.)
 */
export function mergePackageJson(chameleonPkg: string, nexusPkg: string): string {
  const base = JSON.parse(chameleonPkg) as PackageJsonish;
  const overlay = JSON.parse(nexusPkg) as PackageJsonish;

  const merged: PackageJsonish = {
    ...base,
    scripts: { ...overlay.scripts, ...base.scripts },
    dependencies: { ...overlay.dependencies, ...base.dependencies },
    devDependencies: { ...overlay.devDependencies, ...base.devDependencies },
  };

  // Don't leave empty objects behind when neither side had entries.
  for (const key of ['scripts', 'dependencies', 'devDependencies'] as const) {
    if (merged[key] && Object.keys(merged[key] as Record<string, string>).length === 0) {
      delete merged[key];
    }
  }

  return `${JSON.stringify(merged, null, 2)}\n`;
}

/* ──────────────────────────────────────────────────────────────
 * Evidence
 * ────────────────────────────────────────────────────────────── */

/**
 * Record what Chameleon did into `.nexus/state/chameleon.json`.
 *
 * Generation stops being a claim and becomes a record: the envelopes carry
 * `filesWritten`, `warnings`, and `errors` straight from the generator, which
 * is exactly the shape the v1.2 verify manifest wants.
 */
export async function writeChameleonEvidence(
  projectRoot: string,
  result: ChameleonDelegationResult,
  install: ChameleonInstall,
): Promise<void> {
  const statePath = path.join(projectRoot, '.nexus', 'state', 'chameleon.json');
  await ensureDirectory(path.dirname(statePath));

  const record = {
    recordedAt: new Date().toISOString(),
    provider: 'chameleon',
    status: result.status,
    path: result.path ?? null,
    reason: result.reason,
    install: {
      available: install.available,
      cliVersion: install.cliVersion ?? null,
      libraryVersion: install.libraryVersion ?? null,
      capabilities: install.capabilities,
      resolvedFrom: install.resolvedFrom ?? null,
    },
    appSpec: result.appSpec ?? null,
    filesWritten: result.filesWritten,
    warnings: result.warnings,
    envelopes: result.envelopes,
  };

  await writeFile(statePath, `${JSON.stringify(record, null, 2)}\n`);
}

/** Convenience for callers that have a cwd and want the whole handshake. */
export async function detectForProject(
  projectRoot: string,
  exec?: ChameleonExec,
): Promise<ChameleonInstall> {
  return detectChameleon({ cwd: projectRoot, exec });
}
