/**
 * NEXUS CLI - Git Utility
 *
 * Git initialization and hook helpers.
 */

import { execa } from 'execa';

import { logger } from './logger.js';

/**
 * Check if git is available on the system.
 */
export async function isGitInstalled(): Promise<boolean> {
  try {
    await execa('git', ['--version']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize a git repository in the given directory.
 */
export async function gitInit(cwd: string): Promise<boolean> {
  try {
    const hasGit = await isGitInstalled();
    if (!hasGit) {
      logger.warn('Git is not installed. Skipping git initialization.');
      return false;
    }

    await execa('git', ['init'], { cwd });
    await execa('git', ['add', '.'], { cwd });
    await execa('git', ['commit', '-m', 'Initial commit from NEXUS CLI 🔮'], { cwd });
    return true;
  } catch (err) {
    logger.warn(`Failed to initialize git repository.: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}
