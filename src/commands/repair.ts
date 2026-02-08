/**
 * NEXUS CLI - Repair Command
 *
 * The `nexus repair [path]` command restores missing or corrupted .nexus/
 * files WITHOUT updating templates to a newer version.
 *
 * Use this when:
 *   - Files were accidentally deleted from .nexus/
 *   - A file's structure is corrupted (empty, broken frontmatter, invalid JSON)
 *   - You want to fix issues without changing template content
 *
 * For upgrading to the latest CLI templates, use `nexus upgrade` instead.
 */

import path from 'node:path';

import fs from 'fs-extra';

import { repairProject } from '../generators/index.js';
import type { NexusManifest } from '../types/config.js';
import { logger } from '../utils/logger.js';
import { version } from '../version.js';

/**
 * Handler for `nexus repair [path]`.
 *
 * @param targetPath - Optional path to the project to repair (defaults to cwd)
 */
export async function repairCommand(targetPath?: string): Promise<void> {
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
    logger.error('No valid .nexus/manifest.json found in this project.');
    logger.newline();
    logger.info('The repair command requires an existing NEXUS project with a valid manifest.');
    logger.info('If the manifest itself is corrupted, try `nexus upgrade` instead.');
    logger.info('To add NEXUS to an existing project, run:');
    logger.newline();
    logger.nexus('  nexus adopt');
    logger.newline();
    process.exit(1);
    return;
  }

  const config = manifest.config;

  logger.nexus(`Repairing "${config.displayName}" NEXUS ecosystem...`);
  logger.newline();

  try {
    const result = await repairProject(targetDir, config);

    const fixCount = result.created.length + result.repaired.length;

    if (fixCount === 0) {
      logger.nexus('All NEXUS files are intact — nothing to repair.');
      logger.newline();
      return;
    }

    if (result.created.length > 0) {
      logger.info(`✨ Restored (${result.created.length} missing files):`);
      for (const f of result.created) {
        logger.info(`   + ${f}`);
      }
    }

    if (result.repaired.length > 0) {
      logger.info(`🔧 Repaired (${result.repaired.length} corrupted files):`);
      for (const f of result.repaired) {
        logger.info(`   ⚕ ${f}`);
      }
    }

    logger.info(`🔒 Untouched (${result.preserved.length} valid files preserved)`);

    logger.newline();
    logger.nexus(
      `Repair complete! Fixed ${fixCount} file${fixCount === 1 ? '' : 's'}.`,
    );
    logger.info('Your project knowledge was preserved.');
    logger.newline();
  } catch (err) {
    logger.error('Repair failed.');
    if (err instanceof Error) {
      logger.error(err.message);
    }
    process.exit(1);
  }
}
