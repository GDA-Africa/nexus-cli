/**
 * NEXUS CLI - Pack & Unpack Commands
 *
 * `nexus pack`   — Zips .nexus/ into nexus-backup-<timestamp>.zip for portable migration.
 * `nexus unpack` — Finds + unzips a nexus-backup-*.zip, then verifies the restored structure.
 */

import fs from 'node:fs';
import { createWriteStream } from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import archiver from 'archiver';
import unzipper from 'unzipper';

import { logger } from '../utils/logger.js';

// ─── Constants ────────────────────────────────────────────────

const NEXUS_DIR = '.nexus';
const ZIP_PREFIX = 'nexus-backup-';
const ZIP_PATTERN = /^nexus-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.zip$/;

/**
 * Directories and files that must be present after a successful unpack.
 */
const REQUIRED_AFTER_UNPACK = [
  '.nexus',
  '.nexus/docs',
  '.nexus/ai',
  '.nexus/manifest.json',
];

// ─── Pack ─────────────────────────────────────────────────────

/**
 * `nexus pack [path]`
 *
 * Zips the .nexus/ folder in the target directory into a portable
 * nexus-backup-<timestamp>.zip file placed in the same directory.
 * Safe to run anywhere — does not modify .nexus/ at all.
 */
export async function packCommand(targetPath?: string): Promise<void> {
  const cwd = targetPath ? path.resolve(targetPath) : process.cwd();
  const nexusDir = path.join(cwd, NEXUS_DIR);

  // Guard: .nexus/ must exist
  try {
    const stat = await fsp.stat(nexusDir);
    if (!stat.isDirectory()) {
      logger.error(`.nexus is not a directory at: ${cwd}`);
      process.exit(1);
    }
  } catch {
    logger.error(`No .nexus/ folder found at: ${cwd}`);
    logger.info('Run nexus init or nexus adopt first.');
    process.exit(1);
  }

  // Build output filename with ISO timestamp (colons → dashes for cross-platform)
  const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const zipName = `${ZIP_PREFIX}${ts}.zip`;
  const zipPath = path.join(cwd, zipName);

  logger.nexus(`Packing .nexus/ → ${zipName} …`);

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);

    // Add the whole .nexus/ directory, preserving internal structure
    archive.directory(nexusDir, NEXUS_DIR);

    void archive.finalize();
  });

  const stats = fs.statSync(zipPath);
  const kb = (stats.size / 1024).toFixed(1);

  logger.newline();
  logger.success(`Packed successfully!`);
  logger.info(`  File   : ${zipName}`);
  logger.info(`  Size   : ${kb} KB`);
  logger.info(`  Location: ${zipPath}`);
  logger.newline();
  logger.info('To migrate: copy this zip to another project or computer,');
  logger.info('then run:   nexus unpack');
  logger.newline();
}

// ─── Unpack ───────────────────────────────────────────────────

/**
 * `nexus unpack [path] [--file <zipfile>]`
 *
 * Finds the most recent nexus-backup-*.zip in the target directory
 * (or a specific file via --file), extracts it, then verifies the
 * restored .nexus/ structure is complete.
 *
 * Safe to run even if .nexus/ already exists — extracted files will
 * overwrite/merge but no existing file is deleted.
 */
export async function unpackCommand(
  targetPath?: string,
  options: { file?: string } = {},
): Promise<void> {
  const cwd = targetPath ? path.resolve(targetPath) : process.cwd();

  // Resolve the zip file to use
  let zipPath: string;

  if (options.file) {
    zipPath = path.isAbsolute(options.file)
      ? options.file
      : path.join(cwd, options.file);
  } else {
    zipPath = await findLatestBackup(cwd);
  }

  // Verify the zip exists
  try {
    await fsp.stat(zipPath);
  } catch {
    logger.error(`Zip file not found: ${zipPath}`);
    logger.newline();
    logger.info('Looking for a file matching: nexus-backup-YYYY-MM-DDTHH-MM-SS.zip');
    logger.info(`In directory: ${cwd}`);
    logger.newline();
    logger.info('To create one:  nexus pack');
    logger.info('To specify one: nexus unpack --file <path-to-zip>');
    process.exit(1);
  }

  const zipName = path.basename(zipPath);
  logger.nexus(`Unpacking ${zipName} → ${cwd} …`);

  // Extract
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: cwd }))
      .on('close', resolve)
      .on('error', reject);
  });

  logger.success('Extraction complete.');
  logger.newline();

  // Verify
  await verifyUnpack(cwd);
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Scan cwd for nexus-backup-*.zip files and return the most recent one.
 */
async function findLatestBackup(cwd: string): Promise<string> {
  let entries: string[];
  try {
    entries = await fsp.readdir(cwd);
  } catch {
    logger.error(`Cannot read directory: ${cwd}`);
    process.exit(1);
  }

  const zips = entries
    .filter((f) => ZIP_PATTERN.test(f))
    .sort()
    .reverse(); // ISO timestamps sort lexicographically, newest last → reverse for newest first

  if (zips.length === 0) {
    logger.error('No nexus-backup-*.zip file found in this directory.');
    logger.newline();
    logger.info('To create one:  nexus pack');
    logger.info('To specify one: nexus unpack --file <path-to-zip>');
    process.exit(1);
  }

  if (zips.length > 1) {
    logger.info(`Found ${zips.length} backup zips — using the most recent:`);
    logger.info(`  ${zips[0]}`);
    logger.info(`  (others: ${zips.slice(1).join(', ')})`);
    logger.newline();
  }

  return path.join(cwd, zips[0]);
}

/**
 * After extraction, verify all expected .nexus/ paths exist and report.
 */
async function verifyUnpack(cwd: string): Promise<void> {
  logger.info('Verifying restored structure …');
  logger.newline();

  let allOk = true;

  for (const rel of REQUIRED_AFTER_UNPACK) {
    const full = path.join(cwd, rel);
    try {
      await fsp.stat(full);
      logger.success(`  ✔  ${rel}`);
    } catch {
      logger.error(`  ✖  ${rel}  — MISSING`);
      allOk = false;
    }
  }

  // Also check for optional but expected items and report informatively
  const optionals = [
    '.nexus/skills',
    '.nexus/docs/knowledge.md',
    '.nexus/docs/index.md',
  ];

  for (const rel of optionals) {
    const full = path.join(cwd, rel);
    try {
      await fsp.stat(full);
      logger.success(`  ✔  ${rel}`);
    } catch {
      logger.warn(`  ⚠  ${rel}  — not present (optional)`);
    }
  }

  logger.newline();

  if (allOk) {
    logger.success('All required NEXUS files are in place.');
    logger.info('Your AI tools will detect .nexus/ automatically on next use.');
  } else {
    logger.warn('Some required files are missing. The archive may be incomplete.');
    logger.info('Run nexus repair to restore any missing files from templates.');
  }

  logger.newline();
}
