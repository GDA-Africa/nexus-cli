/**
 * NEXUS CLI — Chameleon integration surface
 *
 * NEXUS interviews, Chameleon generates. Everything the rest of the CLI needs
 * to delegate UI generation is re-exported here; nothing outside this folder
 * should reach for the subprocess details.
 */

export { buildAppSpec, validateAppSpec } from './appspec.js';
export type {
  AppSpecValidation,
  AppSpecValidationError,
  BuildAppSpecOptions,
  PageRequest,
} from './appspec.js';

export {
  AGENT_FILES,
  CHAMELEON_BLOCK_END,
  CHAMELEON_BLOCK_START,
  applyChameleonBlock,
  captureChameleonBlocks,
  extractChameleonBlock,
  includeChameleonFragment,
  restoreChameleonBlocks,
} from './agent-block.js';
export type { CapturedBlocks } from './agent-block.js';

export {
  CHAMELEON_OWNED_PATHS,
  delegateToChameleon,
  detectForProject,
  isChameleonOwned,
  mergePackageJson,
  planChameleonDelegation,
  writeChameleonEvidence,
} from './delegate.js';
export type {
  ChameleonDelegationResult,
  DelegateOptions,
  DelegationDecision,
  DelegationStatus,
} from './delegate.js';

export {
  BASELINE_CAPABILITIES,
  detectChameleon,
  hasCapability,
  parseEnvelope,
  resolveChameleonBin,
  runChameleon,
} from './runner.js';
export type {
  ChameleonExec,
  ChameleonRunOptions,
  ChameleonRunResult,
  ResolvedChameleonBin,
} from './runner.js';

export { chameleonSupport } from './support.js';
export type { ChameleonPath, ChameleonSupport } from './support.js';
