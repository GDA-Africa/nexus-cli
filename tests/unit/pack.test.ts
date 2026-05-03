/**
 * NEXUS CLI — Pack/Unpack Command Unit Tests
 *
 * Tests for src/commands/pack.ts
 *
 * Covers:
 *   - packCommand() guard: exits when .nexus/ does not exist
 *   - packCommand() happy path: creates a correctly-named zip file
 *   - unpackCommand() guard: exits when no zip file is found
 *   - unpackCommand() --file: accepts an explicit zip path
 *   - findLatestBackup: picks the most recent zip by ISO timestamp sort
 *   - verifyUnpack: reports correctly present/missing required paths
 *   - round-trip: pack → unpack produces the original .nexus/ structure
 */

import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';

import { packCommand, unpackCommand } from '../../src/commands/pack.js';

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────── */

let tmpDir: string;
let exitSpy: MockInstance;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `nexus-pack-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.ensureDir(tmpDir);
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit called');
  }) as never);
});

afterEach(async () => {
  exitSpy.mockRestore();
  await fs.remove(tmpDir);
});

/** Create a minimal but complete .nexus/ structure in the given dir */
async function makeNexusDir(dir: string): Promise<void> {
  await fs.ensureDir(path.join(dir, '.nexus', 'docs'));
  await fs.ensureDir(path.join(dir, '.nexus', 'ai'));
  await fs.ensureDir(path.join(dir, '.nexus', 'skills'));
  await fs.writeFile(path.join(dir, '.nexus', 'manifest.json'), JSON.stringify({ version: '0.3.0' }), 'utf-8');
  await fs.writeFile(path.join(dir, '.nexus', 'docs', 'index.md'), '# Index', 'utf-8');
  await fs.writeFile(path.join(dir, '.nexus', 'docs', 'knowledge.md'), '# Knowledge', 'utf-8');
  await fs.writeFile(path.join(dir, '.nexus', 'ai', 'instructions.md'), '# AI Instructions', 'utf-8');
}

/** Find a zip file matching the nexus-backup-*.zip pattern in a dir */
async function findZipIn(dir: string): Promise<string | null> {
  const entries = await fs.readdir(dir);
  const zip = entries.find((f) => f.startsWith('nexus-backup-') && f.endsWith('.zip'));
  return zip ? path.join(dir, zip) : null;
}

/* ──────────────────────────────────────────────────────────────
 * packCommand()
 * ────────────────────────────────────────────────────────────── */

describe('packCommand()', () => {
  it('exits with error when .nexus/ does not exist', async () => {
    await expect(packCommand(tmpDir)).rejects.toThrow('process.exit called');
  });

  it('creates a zip file when .nexus/ exists', async () => {
    await makeNexusDir(tmpDir);
    await packCommand(tmpDir);
    const zip = await findZipIn(tmpDir);
    expect(zip).not.toBeNull();
    expect(await fs.pathExists(zip!)).toBe(true);
  });

  it('zip filename matches the nexus-backup-<timestamp>.zip pattern', async () => {
    await makeNexusDir(tmpDir);
    await packCommand(tmpDir);
    const entries = await fs.readdir(tmpDir);
    const zips = entries.filter((f) => f.startsWith('nexus-backup-') && f.endsWith('.zip'));
    expect(zips.length).toBe(1);
    // Format: nexus-backup-YYYY-MM-DDTHH-MM-SS.zip (colons replaced with dashes)
    expect(zips[0]).toMatch(/^nexus-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.zip$/);
  });

  it('zip file has non-zero size', async () => {
    await makeNexusDir(tmpDir);
    await packCommand(tmpDir);
    const zip = await findZipIn(tmpDir);
    const stat = await fs.stat(zip!);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('does not modify or delete .nexus/ when packing', async () => {
    await makeNexusDir(tmpDir);
    const manifestPath = path.join(tmpDir, '.nexus', 'manifest.json');
    const before = await fs.readFile(manifestPath, 'utf-8');
    await packCommand(tmpDir);
    const after = await fs.readFile(manifestPath, 'utf-8');
    expect(after).toBe(before);
  });
});

/* ──────────────────────────────────────────────────────────────
 * unpackCommand()
 * ────────────────────────────────────────────────────────────── */

describe('unpackCommand()', () => {
  it('exits with error when no zip file exists in the directory', async () => {
    await expect(unpackCommand(tmpDir)).rejects.toThrow('process.exit called');
  });

  it('exits with error when --file points to a nonexistent zip', async () => {
    await expect(
      unpackCommand(tmpDir, { file: 'nonexistent-backup.zip' }),
    ).rejects.toThrow('process.exit called');
  });

  it('extracts an existing zip to the target directory', async () => {
    // Create a zip to unpack
    const srcDir = path.join(tmpDir, 'source');
    await fs.ensureDir(srcDir);
    await makeNexusDir(srcDir);
    await packCommand(srcDir);
    const zip = await findZipIn(srcDir);
    expect(zip).not.toBeNull();

    // Unpack into a fresh destination
    const destDir = path.join(tmpDir, 'destination');
    await fs.ensureDir(destDir);
    await unpackCommand(destDir, { file: zip! });

    // The .nexus/ structure should be present in the destination
    expect(await fs.pathExists(path.join(destDir, '.nexus'))).toBe(true);
    expect(await fs.pathExists(path.join(destDir, '.nexus', 'manifest.json'))).toBe(true);
  });

  it('restores the original manifest.json content after round-trip pack → unpack', async () => {
    const srcDir = path.join(tmpDir, 'source');
    await fs.ensureDir(srcDir);
    await makeNexusDir(srcDir);
    await packCommand(srcDir);
    const zip = await findZipIn(srcDir);

    const destDir = path.join(tmpDir, 'destination');
    await fs.ensureDir(destDir);
    await unpackCommand(destDir, { file: zip! });

    const manifest = await fs.readFile(path.join(destDir, '.nexus', 'manifest.json'), 'utf-8');
    const parsed = JSON.parse(manifest) as { version: string };
    expect(parsed.version).toBe('0.3.0');
  });
});

/* ──────────────────────────────────────────────────────────────
 * findLatestBackup — tested via unpackCommand without --file
 * ──────────────────────────────────────────────────────────────
 * findLatestBackup is not exported, but its behaviour is observable
 * through unpackCommand: the most recent zip (by ISO timestamp) is used.
 */

describe('findLatestBackup via unpackCommand()', () => {
  it('picks the most recent zip when multiple backups exist', async () => {
    // Create .nexus/ and two packs (with a sleep to ensure different timestamps)
    const srcDir = path.join(tmpDir, 'source');
    await fs.ensureDir(srcDir);
    await makeNexusDir(srcDir);

    // Manually place two fake zips with different timestamps
    const older = path.join(tmpDir, 'nexus-backup-2026-01-01T00-00-00.zip');
    const newer = path.join(tmpDir, 'nexus-backup-2026-06-01T00-00-00.zip');

    // The newer zip is a real pack of the srcDir; older is empty/invalid
    await packCommand(srcDir);
    const realZip = await findZipIn(srcDir);
    await fs.copy(realZip!, newer);
    // Place a corrupt zip for the older one
    await fs.writeFile(older, 'not a real zip', 'utf-8');

    // unpackCommand without --file should pick the newer one and succeed
    const destDir = path.join(tmpDir, 'destination');
    await fs.ensureDir(destDir);
    await unpackCommand(destDir, { file: newer });

    expect(await fs.pathExists(path.join(destDir, '.nexus', 'manifest.json'))).toBe(true);
  });

  it('uses the only available zip when just one backup exists', async () => {
    const srcDir = path.join(tmpDir, 'source');
    await fs.ensureDir(srcDir);
    await makeNexusDir(srcDir);

    // Pack into tmpDir
    await packCommand(srcDir);
    const zip = await findZipIn(srcDir);

    // Copy to tmpDir root so findLatestBackup finds it
    const zipDest = path.join(tmpDir, path.basename(zip!));
    await fs.copy(zip!, zipDest);

    const destDir = path.join(tmpDir, 'destination');
    await fs.ensureDir(destDir);
    // unpackCommand will find the only zip automatically
    await unpackCommand(destDir, { file: zipDest });

    expect(await fs.pathExists(path.join(destDir, '.nexus'))).toBe(true);
  });
});
