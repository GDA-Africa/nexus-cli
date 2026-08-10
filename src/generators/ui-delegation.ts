/**
 * NEXUS CLI — UI delegation during generation
 *
 * Wraps the Chameleon adapter in the three phases `generateProject` needs,
 * because the two delegation paths hook into generation at opposite ends:
 *
 *   Path A (`chameleon new`) — must run BEFORE NEXUS writes anything, since
 *     `scaffoldApp()` refuses a non-empty directory. NEXUS then overlays around
 *     the files Chameleon owns.
 *   Path B (`chameleon init`) — must run AFTER, into the skeleton NEXUS wrote.
 *
 * Every phase is failure-tolerant by design. A missing Chameleon, a rejected
 * spec, or a Chameleon bug degrades to "NEXUS generated the UI itself" with a
 * printed reason — never to a failed `nexus init`. That is what "opt-in and
 * never required" has to mean in code.
 */

import path from 'node:path';

import type { ChameleonInstall } from '../types/chameleon.js';
import type { NexusConfig } from '../types/config.js';
import type { GeneratedFile } from '../types/templates.js';
import {
  captureChameleonBlocks,
  delegateToChameleon,
  detectForProject,
  includeChameleonFragment,
  isChameleonOwned,
  mergePackageJson,
  planChameleonDelegation,
  restoreChameleonBlocks,
  writeChameleonEvidence,
} from '../utils/chameleon/index.js';
import type {
  CapturedBlocks,
  ChameleonExec,
  ChameleonDelegationResult,
  DelegationDecision,
} from '../utils/chameleon/index.js';
import { logger, readFile, writeFile } from '../utils/index.js';

/** Carried across the phases of one generation run. */
export interface UiDelegationState {
  enabled: boolean;
  install: ChameleonInstall;
  decision: DelegationDecision;
  /** Set once Chameleon has actually run. */
  result?: ChameleonDelegationResult;
  /** NEXUS's own package.json, held back so it can be merged instead of written. */
  heldPackageJson?: GeneratedFile;
  /**
   * Chameleon's agent block, lifted off disk before NEXUS's own `CLAUDE.md` /
   * `AGENTS.md` / `.cursorrules` land on top of it.
   */
  capturedBlocks?: CapturedBlocks;
  /** Injected process runner — production leaves this unset. */
  exec?: ChameleonExec;
}

/** Nothing to do — the shape returned when the provider isn't Chameleon. */
function inactive(reason: string): UiDelegationState {
  return {
    enabled: false,
    install: { available: false, capabilities: [] },
    decision: { run: false, reason },
  };
}

/**
 * Phase 1 — decide, before a single file is written.
 *
 * Runs the capabilities handshake and prints what will happen, so a preference
 * that cannot be honoured is visible at the top of the run rather than
 * inferred from a missing folder later.
 */
export async function prepareUiDelegation(
  config: NexusConfig,
  projectRoot: string,
  exec?: ChameleonExec,
): Promise<UiDelegationState> {
  if (config.uiProvider !== 'chameleon') {
    return inactive('UI provider is `none` — NEXUS generates the UI.');
  }

  // Detect from the parent directory: the project folder doesn't exist yet on
  // a fresh init, and a local Chameleon install would live alongside it.
  const install = await detectForProject(path.dirname(projectRoot), exec);
  const decision = planChameleonDelegation(config, install);

  if (!decision.run) {
    logger.warn('Chameleon requested but not used for this project.');
    logger.info(`  ${decision.reason}`);
    return { enabled: false, install, decision, exec };
  }

  logger.nexus(`UI: Chameleon ${install.cliVersion ?? ''} — ${decision.reason}`.trim());
  return { enabled: true, install, decision, exec };
}

/**
 * Phase 2 — Path A: let Chameleon generate the app first.
 *
 * On failure NEXUS carries on and generates the UI itself; the reason is
 * printed with a clear owner so a Chameleon bug reads as a Chameleon bug.
 */
export async function runPreWriteDelegation(
  state: UiDelegationState,
  config: NexusConfig,
  projectRoot: string,
): Promise<UiDelegationState> {
  if (!state.enabled || !state.decision.run || state.decision.path !== 'new') return state;

  const result = await delegateToChameleon({
    config,
    projectRoot,
    install: state.install,
    exec: state.exec,
  });

  if (result.status !== 'generated') {
    logger.warn('Chameleon did not generate the app — NEXUS will generate the UI instead.');
    logger.info(`  ${result.reason}`);
    return { ...state, enabled: false, result };
  }

  logger.success(`Chameleon generated ${result.filesWritten.length} file(s).`);
  for (const warning of result.warnings) logger.warn(`  ${warning}`);

  // `scaffoldApp()` runs `agentsInit` internally, so a freshly generated app
  // already carries Chameleon's block in CLAUDE.md / AGENTS.md / .cursorrules.
  // NEXUS is about to write its own versions of those files over the top, so
  // lift the block off now and splice it back in afterwards.
  const capturedBlocks = await captureChameleonBlocks(projectRoot);

  return { ...state, result, capturedBlocks };
}

/**
 * Remove the files Chameleon owns from NEXUS's write set.
 *
 * NEXUS holds on to its own `package.json` rather than dropping it — it gets
 * merged into Chameleon's afterwards, which is how the generated project ends
 * up with the linter, formatter, and test runner `scaffoldApp()` never writes.
 */
export function filterChameleonOwned(
  files: GeneratedFile[],
  state: UiDelegationState,
): { files: GeneratedFile[]; state: UiDelegationState } {
  if (!state.enabled || state.result?.status !== 'generated' || state.result.path !== 'new') {
    return { files, state };
  }

  const heldPackageJson = files.find((file) => file.path === 'package.json');
  return {
    files: files.filter((file) => !isChameleonOwned(file.path)),
    state: { ...state, heldPackageJson },
  };
}

/**
 * Phase 3 — everything that happens after NEXUS has written its files:
 * Path B's `chameleon init`, the package.json merge, Chameleon's agent block,
 * and the evidence record.
 */
export async function finishUiDelegation(
  state: UiDelegationState,
  config: NexusConfig,
  projectRoot: string,
): Promise<UiDelegationState> {
  if (!state.enabled) return state;

  let result = state.result;

  // Path B — the skeleton exists now, so Chameleon can configure itself into it.
  if (state.decision.run && state.decision.path === 'init') {
    result = await delegateToChameleon({
      config,
      projectRoot,
      install: state.install,
      exec: state.exec,
    });

    if (result.status === 'generated') {
      logger.success('Chameleon initialised into the project.');
      for (const warning of result.warnings) logger.warn(`  ${warning}`);
    } else {
      logger.warn('Chameleon initialisation did not complete — the project is still valid without it.');
      logger.info(`  ${result.reason}`);
    }
  }

  if (result?.status === 'generated' && result.path === 'new') {
    await mergeHeldPackageJson(state, projectRoot);
  }

  // Chameleon's agent guidance lives inside NEXUS-owned files. Two sources,
  // in order of preference: a `chameleon.agent.md` fragment if Chameleon
  // shipped one, otherwise the block captured before NEXUS overwrote its files.
  let updated = await includeChameleonFragment(projectRoot);
  if (!updated.length && state.capturedBlocks?.size) {
    updated = await restoreChameleonBlocks(projectRoot, state.capturedBlocks);
  }
  if (updated.length) {
    logger.info(`Chameleon agent guidance included in ${updated.join(', ')}.`);
  }

  if (result) {
    await writeChameleonEvidence(projectRoot, result, state.install);
  }

  return { ...state, result };
}

/** Merge NEXUS's scripts and devDependencies into the package.json Chameleon wrote. */
async function mergeHeldPackageJson(state: UiDelegationState, projectRoot: string): Promise<void> {
  if (!state.heldPackageJson) return;

  const pkgPath = path.join(projectRoot, 'package.json');
  const chameleonPkg = await readFile(pkgPath);
  if (chameleonPkg === null) return;

  try {
    await writeFile(pkgPath, mergePackageJson(chameleonPkg, state.heldPackageJson.content));
  } catch {
    // A package.json we cannot parse is Chameleon's to explain; leaving it
    // untouched is strictly better than replacing it with ours.
    logger.warn('Could not merge NEXUS tooling into package.json — left Chameleon\'s version in place.');
  }
}

/* ──────────────────────────────────────────────────────────────
 * Regeneration safety (upgrade / repair)
 * ────────────────────────────────────────────────────────────── */

/**
 * Preserve Chameleon's agent block across a NEXUS regeneration.
 *
 * `CLAUDE.md` and `AGENTS.md` are in `ALWAYS_REPLACE`, so `nexus upgrade`
 * rewrites them wholesale and would otherwise delete the block
 * `chameleon agents init` spliced in. Capture before, restore after.
 *
 * Applies whatever the UI preference says: a project that has a Chameleon
 * block has one regardless of what its config claims, and losing it is a
 * regression either way.
 */
export async function preserveChameleonBlocks<T>(
  projectRoot: string,
  regenerate: () => Promise<T>,
): Promise<T> {
  const captured = await captureChameleonBlocks(projectRoot);
  const result = await regenerate();

  if (captured.size > 0) {
    const restored = await restoreChameleonBlocks(projectRoot, captured);
    if (restored.length) {
      logger.info(`Preserved Chameleon's agent block in ${restored.join(', ')}.`);
    }
  }

  return result;
}
