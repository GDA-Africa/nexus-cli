/**
 * NEXUS CLI — File System Utility Unit Tests
 *
 * Tests for src/utils/file-system.ts
 *
 * Critical regression coverage:
 *   - fileExists() must return false for directories (this is the bug that caused
 *     "No .nexus/skills/ directory found" even when the directory existed)
 *   - dirExists() must return true for directories and false for files/missing paths
 */

import path from 'node:path';
import os from 'node:os';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  fileExists,
  dirExists,
  ensureDirectory,
  writeFile,
  readFile,
} from '../../src/utils/file-system.js';

/* ──────────────────────────────────────────────────────────────
 * Test Setup
 * ────────────────────────────────────────────────────────────── */

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `nexus-fs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.ensureDir(tmpDir);
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

/* ──────────────────────────────────────────────────────────────
 * fileExists()
 * ────────────────────────────────────────────────────────────── */

describe('fileExists()', () => {
  it('returns true for an existing file', async () => {
    const filePath = path.join(tmpDir, 'hello.txt');
    await fs.writeFile(filePath, 'hello', 'utf-8');
    expect(await fileExists(filePath)).toBe(true);
  });

  it('returns false for a missing path', async () => {
    const filePath = path.join(tmpDir, 'nonexistent.txt');
    expect(await fileExists(filePath)).toBe(false);
  });

  /**
   * REGRESSION TEST — this was the root cause of the production bug.
   * fileExists was being used to check .nexus/skills/ (a directory).
   * stat.isFile() returns false for directories, so the check always
   * failed even when the folder was right there.
   */
  it('returns false for a directory (regression: dirExists bug)', async () => {
    const dirPath = path.join(tmpDir, 'some-directory');
    await fs.ensureDir(dirPath);
    expect(await fileExists(dirPath)).toBe(false);
  });

  it('returns false for nested missing file', async () => {
    const filePath = path.join(tmpDir, 'nested', 'deep', 'file.md');
    expect(await fileExists(filePath)).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────
 * dirExists()
 * ────────────────────────────────────────────────────────────── */

describe('dirExists()', () => {
  it('returns true for an existing directory', async () => {
    const dirPath = path.join(tmpDir, '.nexus', 'skills');
    await fs.ensureDir(dirPath);
    expect(await dirExists(dirPath)).toBe(true);
  });

  it('returns false for a missing directory', async () => {
    const dirPath = path.join(tmpDir, '.nexus', 'skills');
    expect(await dirExists(dirPath)).toBe(false);
  });

  it('returns false for a file path (not a directory)', async () => {
    const filePath = path.join(tmpDir, 'manifest.json');
    await fs.writeFile(filePath, '{}', 'utf-8');
    expect(await dirExists(filePath)).toBe(false);
  });

  it('returns true for the skills subdirectories (core, custom, community)', async () => {
    for (const sub of ['core', 'custom', 'community']) {
      const dirPath = path.join(tmpDir, '.nexus', 'skills', sub);
      await fs.ensureDir(dirPath);
      expect(await dirExists(dirPath)).toBe(true);
    }
  });

  it('returns false once a directory is removed', async () => {
    const dirPath = path.join(tmpDir, '.nexus', 'skills');
    await fs.ensureDir(dirPath);
    expect(await dirExists(dirPath)).toBe(true);
    await fs.remove(dirPath);
    expect(await dirExists(dirPath)).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────
 * ensureDirectory()
 * ────────────────────────────────────────────────────────────── */

describe('ensureDirectory()', () => {
  it('creates a directory that does not exist', async () => {
    const dirPath = path.join(tmpDir, 'new', 'nested', 'dir');
    await ensureDirectory(dirPath);
    expect(await dirExists(dirPath)).toBe(true);
  });

  it('is idempotent — does not throw if directory already exists', async () => {
    const dirPath = path.join(tmpDir, 'existing');
    await fs.ensureDir(dirPath);
    await expect(ensureDirectory(dirPath)).resolves.not.toThrow();
    expect(await dirExists(dirPath)).toBe(true);
  });
});

/* ──────────────────────────────────────────────────────────────
 * writeFile()
 * ────────────────────────────────────────────────────────────── */

describe('writeFile()', () => {
  it('creates a file with the given content', async () => {
    const filePath = path.join(tmpDir, 'output.md');
    await writeFile(filePath, '# Hello');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('# Hello');
  });

  it('creates parent directories automatically', async () => {
    const filePath = path.join(tmpDir, 'deep', 'nested', 'path', 'file.ts');
    await writeFile(filePath, 'export {}');
    expect(await fileExists(filePath)).toBe(true);
  });

  it('overwrites an existing file', async () => {
    const filePath = path.join(tmpDir, 'overwrite.md');
    await writeFile(filePath, 'original');
    await writeFile(filePath, 'updated');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('updated');
  });
});

/* ──────────────────────────────────────────────────────────────
 * readFile()
 * ────────────────────────────────────────────────────────────── */

describe('readFile()', () => {
  it('returns the file content as a string', async () => {
    const filePath = path.join(tmpDir, 'test.md');
    await fs.writeFile(filePath, '# Test', 'utf-8');
    expect(await readFile(filePath)).toBe('# Test');
  });

  it('returns null for a missing file', async () => {
    const filePath = path.join(tmpDir, 'missing.md');
    expect(await readFile(filePath)).toBeNull();
  });

  it('returns null for a directory path (not a file)', async () => {
    const dirPath = path.join(tmpDir, 'a-dir');
    await fs.ensureDir(dirPath);
    expect(await readFile(dirPath)).toBeNull();
  });
});
