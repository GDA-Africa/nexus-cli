/**
 * NEXUS CLI - Features / Extras Prompt
 *
 * Asks about testing, package manager, git, and dependency installation.
 */

import { select, confirm } from '@inquirer/prompts';

import type { TestFramework, PackageManager } from '../types/config.js';

export interface FeaturesResult {
  testFramework: TestFramework;
  packageManager: PackageManager;
  git: boolean;
  installDeps: boolean;
}

export async function promptFeatures(): Promise<FeaturesResult> {
  const testFramework = await select<TestFramework>({
    message: 'Testing framework?',
    choices: [
      {
        value: 'vitest',
        name: '⚡ Vitest',
        description: 'Fast, Vite-native. Recommended for modern projects.',
      },
      {
        value: 'jest',
        name: '🃏 Jest',
        description: 'Battle-tested. Largest ecosystem.',
      },
      {
        value: 'none',
        name: '⏭️  Skip for now',
        description: 'No test framework (you can add one later).',
      },
    ],
  });

  const packageManager = await select<PackageManager>({
    message: 'Package manager?',
    choices: [
      { value: 'npm', name: '📦 npm' },
      { value: 'yarn', name: '🧶 yarn' },
      { value: 'pnpm', name: '⚡ pnpm' },
    ],
  });

  const git = await confirm({
    message: 'Initialize a git repository?',
    default: true,
  });

  const installDeps = await confirm({
    message: 'Install dependencies now?',
    default: true,
  });

  return { testFramework, packageManager, git, installDeps };
}
