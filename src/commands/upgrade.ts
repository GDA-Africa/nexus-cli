/**
 * NEXUS CLI - Upgrade Command
 *
 * The `nexus upgrade [path]` command regenerates the .nexus/ ecosystem
 * with the latest CLI templates while preserving project knowledge.
 *
 * Strategy:
 *   - REPLACE: AI instructions, tool files, manifest, .nexus/index.md
 *   - PRESERVE: knowledge.md, any doc with `status: populated`
 *   - SMART: Template docs get replaced; populated docs are kept
 *
 * The command reads `.nexus/manifest.json` to recover the original
 * project config, regenerates everything, then applies the strategy.
 */

import path from 'node:path';

import fs from 'fs-extra';

import { upgradeProject } from '../generators/index.js';
import type { NexusManifest } from '../types/config.js';
import { logger } from '../utils/logger.js';
import { version } from '../version.js';

/**
 * Handler for `nexus upgrade [path]`.
 *
 * @param targetPath - Optional path to the project to upgrade (defaults to cwd)
 */
export async function upgradeCommand(targetPath?: string): Promise<void> {
  logger.banner(version);

  const targetDir = targetPath
    ? path.resolve(process.cwd(), targetPath)
    : process.cwd();

  // ─── Check for .nexus/manifest.json ──────────────────────
  const manifestPath = path.join(targetDir, '.nexus', 'manifest.json');
  let manifest: NexusManifest;

  try {
    const raw = await fs.readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(raw) as NexusManifest;
  } catch {
    logger.error('No .nexus/manifest.json found in this project.');
    logger.newline();
    logger.info('The upgrade command requires an existing NEXUS project.');
    logger.info('To add NEXUS to an existing project, run:');
    logger.newline();
    logger.nexus('  nexus adopt');
    logger.newline();
    process.exit(1);
    return; // unreachable but satisfies TS
  }

  const config = manifest.config;
  const oldVersion = manifest.cli?.version ?? 'unknown';

  logger.nexus(`Upgrading "${config.displayName}" NEXUS ecosystem...`);
  logger.newline();
  logger.info(`Previous CLI version: ${oldVersion}`);
  logger.info(`Current CLI version:  ${version}`);
  logger.newline();

  try {
    const result = await upgradeProject(targetDir, config);

    // Log results
    if (result.created.length > 0) {
      logger.info(`✨ Created (${result.created.length} new files):`);
      for (const f of result.created) {
        logger.info(`   + ${f}`);
      }
    }

    if (result.repaired.length > 0) {
      logger.info(`🔧 Repaired (${result.repaired.length} corrupted files restored):`);
      for (const f of result.repaired) {
        logger.info(`   ⚕ ${f}`);
      }
    }

    if (result.replaced.length > 0) {
      logger.info(`🔄 Replaced (${result.replaced.length} files updated to latest):`);
      for (const f of result.replaced) {
        logger.info(`   ↻ ${f}`);
      }
    }

    if (result.preserved.length > 0) {
      logger.info(`🔒 Preserved (${result.preserved.length} files with project knowledge):`);
      for (const f of result.preserved) {
        logger.info(`   ✓ ${f}`);
      }
    }

    logger.newline();
    logger.nexus(
      `Upgrade complete! NEXUS ecosystem updated from v${oldVersion} → v${version}.`,
    );
    logger.info(
      'Your project knowledge (populated docs, knowledge base, progress) was preserved.',
    );
    logger.newline();
  } catch (err) {
    logger.error('Upgrade failed.');
    if (err instanceof Error) {
      logger.error(err.message);
    }
    process.exit(1);
  }
}
