/**
 * NEXUS CLI - Update Command
 *
 * `nexus update`
 *
 * Checks npm for the latest @nexus-framework/cli, shows what's new,
 * and runs the correct package-manager install command automatically
 * so the user never has to remember the full install command.
 */

import { execSync } from 'node:child_process';

import boxen from 'boxen';
import chalk from 'chalk';

import { logger } from '../utils/logger.js';
import { checkForUpdate } from '../utils/update-check.js';
import { version as currentVersion } from '../version.js';

export async function updateCommand(): Promise<void> {
  logger.nexus('Checking for updates …');
  logger.newline();

  const info = await checkForUpdate(8000); // give a generous timeout for explicit update command

  // ── Offline / registry unreachable ──────────────────────────
  if (info === null) {
    logger.warn('Could not reach the npm registry.');
    logger.info('Check your internet connection and try again.');
    logger.newline();
    logger.info('Manual update:  npm install -g @nexus-framework/cli');
    logger.newline();
    return;
  }

  // ── Already up to date ───────────────────────────────────────
  if (!info.hasUpdate) {
    logger.success(`You are already on the latest version: v${info.current}`);
    logger.newline();
    return;
  }

  // ── Update available ─────────────────────────────────────────
  const banner = [
    chalk.bold.cyan('📦 Update available!'),
    '',
    `  ${chalk.dim('Current:')}  v${info.current}`,
    `  ${chalk.green.bold('Latest:')}   v${info.latest}`,
    '',
    `  ${chalk.bold("What's new:")}`,
    `  ${info.headline}`,
    '',
    chalk.dim('Installing now …'),
  ].join('\n');

  console.log(
    boxen(banner, {
      padding: 1,
      margin: { top: 0, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'cyan',
    }),
  );

  // Run the install
  try {
    logger.info(`Running: ${info.installCmd}`);
    logger.newline();

    execSync(info.installCmd, { stdio: 'inherit' });

    logger.newline();
    logger.success(`NEXUS CLI updated to v${info.latest} ✨`);
    logger.info("You're now running the latest version — restart your terminal if needed.");
    logger.newline();
  } catch {
    logger.error('Automatic install failed.');
    logger.newline();
    logger.info('Run this manually:');
    logger.info(`  ${info.installCmd}`);
    logger.newline();
    logger.info('Or with a specific package manager:');
    logger.info('  npm install -g @nexus-framework/cli');
    logger.info('  yarn global add @nexus-framework/cli');
    logger.info('  pnpm add -g @nexus-framework/cli');
    logger.newline();
  }
}

/**
 * Print a non-intrusive update notification banner.
 * Called after every command if a newer version is detected.
 * Designed to be fast and silent on failure.
 */
export function printUpdateBanner(info: {
  current: string;
  latest: string;
  headline: string;
  installCmd: string;
}): void {
  const lines = [
    chalk.yellow.bold(`💡 NEXUS v${info.latest} is available`)
    + chalk.dim(` (you have v${info.current})`),
    '',
    `  ${chalk.bold("What's new:")} ${info.headline}`,
    '',
    `  ${chalk.dim('Update:')} ${chalk.cyan(info.installCmd)}`,
    `  ${chalk.dim('or run:')} ${chalk.cyan('nexus update')}`,
  ].join('\n');

  console.log(
    boxen(lines, {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      margin: { top: 1, bottom: 0, left: 0, right: 0 },
      borderStyle: 'single',
      borderColor: 'yellow',
      dimBorder: true,
    }),
  );
}

export { currentVersion };
