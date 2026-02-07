/**
 * NEXUS CLI - Package Manager Utility
 *
 * Detect and interact with npm, yarn, or pnpm.
 */

import fs from 'node:fs';
import path from 'node:path';

import type { PackageManager } from '../types/config.js';

/**
 * Detect the package manager being used in the current environment.
 * Checks for lockfiles and the npm_config_user_agent env variable.
 */
export function detectPackageManager(cwd: string = process.cwd()): PackageManager {
  // Check env variable (set by npm/yarn/pnpm when running scripts)
  const userAgent = process.env.npm_config_user_agent;
  if (userAgent) {
    if (userAgent.startsWith('yarn')) return 'yarn';
    if (userAgent.startsWith('pnpm')) return 'pnpm';
    return 'npm';
  }

  // Check lockfiles
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';

  return 'npm';
}

/** Get the install command for a given package manager */
export function getInstallCommand(pm: PackageManager): string {
  switch (pm) {
    case 'yarn':
      return 'yarn';
    case 'pnpm':
      return 'pnpm install';
    default:
      return 'npm install';
  }
}

/** Get the run command for a given package manager */
export function getRunCommand(pm: PackageManager, script: string): string {
  switch (pm) {
    case 'yarn':
      return `yarn ${script}`;
    case 'pnpm':
      return `pnpm ${script}`;
    default:
      return `npm run ${script}`;
  }
}
