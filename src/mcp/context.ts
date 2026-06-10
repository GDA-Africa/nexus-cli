/**
 * NEXUS MCP — Brain context resolution
 *
 * Shared helpers for MCP tool handlers. Handlers must never call
 * process.exit() or write to stdout — they throw McpToolError instead,
 * which the server layer converts into an MCP error result.
 */

import path from 'node:path';

import { getNexusDir } from '../utils/brain.js';

/** Error type surfaced to MCP clients as a tool error (isError: true). */
export class McpToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpToolError';
  }
}

export interface BrainContext {
  /** Project root (parent of .nexus/) */
  projectRoot: string;
  /** Absolute path to .nexus/ */
  nexusDir: string;
  /** Absolute path to .nexus/plans/ */
  plansDir: string;
  /** Absolute path to .nexus/docs/ */
  docsDir: string;
  /** Absolute path to .nexus/skills/ */
  skillsDir: string;
}

/**
 * Locate the brain starting from a given directory (defaults to cwd).
 * Throws McpToolError when no .nexus/ directory exists.
 */
export function resolveBrainContext(startDir: string = process.cwd()): BrainContext {
  const nexusDir = getNexusDir(startDir);

  if (!nexusDir) {
    throw new McpToolError(
      `No .nexus/ directory found at or above ${startDir}. Run \`nexus init\` or \`nexus adopt\` first.`,
    );
  }

  return {
    projectRoot: path.dirname(nexusDir),
    nexusDir,
    plansDir: path.join(nexusDir, 'plans'),
    docsDir: path.join(nexusDir, 'docs'),
    skillsDir: path.join(nexusDir, 'skills'),
  };
}
