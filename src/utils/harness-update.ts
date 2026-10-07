/**
 * NEXUS CLI — Harness Update Utility
 *
 * Checks for updates to `@nexus-framework/harness`, prompts the user
 * interactively before opening, and executes the install/download command.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { confirm } from '@inquirer/prompts';
import boxen from 'boxen';
import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs-extra';

import { isInteractiveEnvironment } from './auto-invoke-config.js';
import { compareVersions } from './bin-handoff.js';
import { logger } from './logger.js';
import { detectInstallCommand } from './update-check.js';

export const HARNESS_NPM_PACKAGE = '@nexus-framework/harness';

export interface HarnessUpdateInfo {
  current: string | null;
  latest: string;
  hasUpdate: boolean;
  installCmd: string;
}

/**
 * Detect the version of the currently installed or resolved harness.
 * Checks the candidate binary location, project-local node_modules,
 * and global installation.
 */
export async function detectInstalledHarnessVersion(
  projectRoot: string,
  resolvedBin?: string | null,
): Promise<string | null> {
  // 1. Traverse upward from resolved binary to find its nearest package.json
  if (resolvedBin) {
    let dir = path.dirname(resolvedBin);
    const root = path.parse(dir).root;
    while (dir && dir !== root) {
      const pkgPath = path.join(dir, 'package.json');
      if (await fs.pathExists(pkgPath)) {
        try {
          const pkg = (await fs.readJson(pkgPath)) as { version?: unknown; name?: unknown };
          if (typeof pkg.version === 'string') {
            return pkg.version;
          }
        } catch {
          // ignore read error
        }
      }
      dir = path.dirname(dir);
    }
  }

  // 2. Project local node_modules
  const localPkgPath = path.join(projectRoot, 'node_modules', HARNESS_NPM_PACKAGE, 'package.json');
  if (await fs.pathExists(localPkgPath)) {
    try {
      const pkg = (await fs.readJson(localPkgPath)) as { version?: unknown };
      if (typeof pkg.version === 'string') {
        return pkg.version;
      }
    } catch {
      // ignore
    }
  }

  // 3. Global node_modules layout (sibling of @nexus-framework/cli)
  try {
    const cliRoot = path.resolve(fileURLToPath(import.meta.url), '../../..');
    const scope = path.dirname(cliRoot);
    const nodeModules = path.dirname(scope);
    if (path.basename(scope) === '@nexus-framework' && path.basename(nodeModules) === 'node_modules') {
      const globalPkgPath = path.join(nodeModules, '@nexus-framework', 'harness', 'package.json');
      if (await fs.pathExists(globalPkgPath)) {
        const pkg = (await fs.readJson(globalPkgPath)) as { version?: unknown };
        if (typeof pkg.version === 'string') {
          return pkg.version;
        }
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Check npm registry for the latest @nexus-framework/harness version.
 */
export async function checkForHarnessUpdate(
  currentVersion: string | null,
  timeoutMs = 4000,
): Promise<HarnessUpdateInfo | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`https://registry.npmjs.org/${HARNESS_NPM_PACKAGE}/latest`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timer);

    if (!res.ok) return null;

    const data = (await res.json()) as { version?: unknown };
    const latest = typeof data.version === 'string' ? data.version : undefined;

    if (!latest) return null;

    const hasUpdate = currentVersion ? compareVersions(latest, currentVersion) > 0 : true;

    return {
      current: currentVersion,
      latest,
      hasUpdate,
      installCmd: detectInstallCommand(HARNESS_NPM_PACKAGE),
    };
  } catch {
    // Offline, timeout, or network error
    return null;
  }
}

/**
 * Interactively ask the user if they want to download the harness update before opening.
 * In non-interactive environments, logs a notice and returns false.
 */
export async function promptHarnessUpdate(info: HarnessUpdateInfo): Promise<boolean> {
  if (!isInteractiveEnvironment()) {
    const currentLabel = info.current ? `v${info.current}` : 'not installed';
    logger.info(`💡 Nexus Harness update available: ${currentLabel} → v${info.latest} (run: ${info.installCmd})`);
    return false;
  }

  const banner = [
    chalk.bold.cyan('📦 Nexus Harness update available!'),
    '',
    `  ${chalk.dim('Current:')}  ${info.current ? `v${info.current}` : chalk.yellow('Not installed')}`,
    `  ${chalk.green.bold('Latest:')}   v${info.latest}`,
    '',
    chalk.dim(`Install command: ${info.installCmd}`),
  ].join('\n');

  console.log(
    boxen(banner, {
      padding: 1,
      margin: { top: 0, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'cyan',
    }),
  );

  try {
    return await confirm({
      message: info.current
        ? `Download and install harness v${info.latest} before opening?`
        : `Download and install Nexus Harness v${info.latest} before opening?`,
      default: true,
    });
  } catch {
    // Esc/Ctrl+C or prompt abort
    return false;
  }
}

/**
 * Execute the download/install command for the harness update.
 */
export async function downloadHarnessUpdate(
  installCmd: string,
  options?: { runner?: (command: string, args: string[], options: Record<string, unknown>) => Promise<unknown> },
): Promise<boolean> {
  logger.info(`Downloading harness update: ${chalk.cyan(installCmd)} …`);
  try {
    if (options?.runner) {
      const parts = installCmd.split(' ');
      const [cmd, ...args] = parts;
      if (cmd) {
        await options.runner(cmd, args, {});
      }
    } else {
      await execa(installCmd, {
        shell: true,
        stdio: 'inherit',
      });
    }
    logger.success('Nexus Harness downloaded and installed successfully! ✨');
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Failed to download harness update: ${message}`);
    logger.info('Opening harness with current version...');
    return false;
  }
}
