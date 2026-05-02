import { execa } from 'execa';

import { isGitInstalled } from '../git.js';

export interface GitSensorData {
  branch: string | null;
  aheadOfMain: number | null;
  lastCommit: string | null;
  isDirty: boolean | null;
}

/**
 * Capture Git information for the underlying repository.
 * Returns null values if git is absent or if it's not a git repository.
 * @param cwd The working directory to run git commands in.
 */
export async function captureGitSensor(cwd: string = process.cwd()): Promise<GitSensorData> {
  const defaultData: GitSensorData = {
    branch: null,
    aheadOfMain: null,
    lastCommit: null,
    isDirty: null,
  };

  const hasGit = await isGitInstalled();
  if (!hasGit) {
    return defaultData;
  }

  // Check if it's actually a git repository
  try {
    await execa('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
  } catch {
    return defaultData;
  }

  const [branch, isDirty, lastCommit, aheadOfMain] = await Promise.all([
    getBranch(cwd),
    getIsDirty(cwd),
    getLastCommit(cwd),
    getAheadOfMain(cwd),
  ]);

  return {
    branch,
    isDirty,
    lastCommit,
    aheadOfMain,
  };
}

async function getBranch(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function getIsDirty(cwd: string): Promise<boolean | null> {
  try {
    const { stdout } = await execa('git', ['status', '--porcelain'], { cwd });
    return stdout.trim().length > 0;
  } catch {
    return null;
  }
}

async function getLastCommit(cwd: string): Promise<string | null> {
  try {
    // We want the short hash and the subject. E.g. "092d7e7 — feat: release v0.3.2..."
    // Optionally also author and date like the vital signs spec shows.
    // Format: short_hash — subject · author · relative_date
    const { stdout } = await execa('git', ['log', '-1', '--format=%h — %s · %an · %ar'], { cwd });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function getAheadOfMain(cwd: string): Promise<number | null> {
  try {
    // Determine the main branch name. Usually 'main' or 'master'
    const mainBranches = ['main', 'master'];
    let defaultBranch = 'main';

    for (const b of mainBranches) {
      try {
        await execa('git', ['rev-parse', '--verify', b], { cwd });
        defaultBranch = b;
        break;
      } catch {
        // Continue
      }
    }

    const { stdout } = await execa('git', ['rev-list', '--count', `${defaultBranch}..HEAD`], { cwd });
    return parseInt(stdout.trim(), 10) || 0;
  } catch {
    return null;
  }
}
