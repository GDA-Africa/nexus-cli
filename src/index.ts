/**
 * NEXUS CLI - Main Export
 *
 * Public API for programmatic usage of NEXUS CLI.
 */

export { adoptCommand } from './commands/adopt.js';
export { initCommand } from './commands/init.js';
export { runPrompts } from './prompts/index.js';
export { generateProject, adoptProject } from './generators/index.js';
export { version } from './version.js';

export type {
  NexusConfig,
  NexusManifest,
  PartialNexusConfig,
} from './types/config.js';
