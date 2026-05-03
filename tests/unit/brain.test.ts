import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { getNexusDir, computeBrainHash } from '../../src/utils/brain.js';

describe('brain.ts', () => {
  const tmpDir = path.join(os.tmpdir(), `nexus-brain-test-${Date.now()}`);

  beforeEach(async () => {
    await fs.ensureDir(tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('getNexusDir', () => {
    it('should find .nexus in the current directory', async () => {
      const nexusPath = path.join(tmpDir, '.nexus');
      await fs.ensureDir(nexusPath);

      const foundPath = getNexusDir(tmpDir);
      expect(foundPath).toBe(nexusPath);
    });

    it('should find .nexus in a parent directory', async () => {
      const nexusPath = path.join(tmpDir, '.nexus');
      await fs.ensureDir(nexusPath);

      const deepDir = path.join(tmpDir, 'src', 'components', 'deep', 'folder');
      await fs.ensureDir(deepDir);

      const foundPath = getNexusDir(deepDir);
      expect(foundPath).toBe(nexusPath);
    });

    it('should return null if .nexus not found in hierarchy', async () => {
      const noNexusPath = path.join(tmpDir, 'no-nexus-here');
      await fs.ensureDir(noNexusPath);

      const foundPath = getNexusDir(noNexusPath);
      expect(foundPath).toBeNull();
    });

    it('should return null if .nexus is a file and not a directory', async () => {
      const nexusFile = path.join(tmpDir, '.nexus');
      await fs.writeFile(nexusFile, 'not a dir');

      const foundPath = getNexusDir(tmpDir);
      expect(foundPath).toBeNull();
    });
  });

  describe('computeBrainHash', () => {
    it('should return a stable hash for identical content', async () => {
      const nexusPath = path.join(tmpDir, '.nexus');
      await fs.ensureDir(nexusPath);
      await fs.writeFile(path.join(nexusPath, 'file1.txt'), 'hello world');
      await fs.ensureDir(path.join(nexusPath, 'docs'));
      await fs.writeFile(path.join(nexusPath, 'docs', 'index.md'), '# index');

      const hash1 = await computeBrainHash(nexusPath);
      const hash2 = await computeBrainHash(nexusPath);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // sha256 hex
    });

    it('should return different hash when a file is added', async () => {
      const nexusPath = path.join(tmpDir, '.nexus');
      await fs.ensureDir(nexusPath);
      await fs.writeFile(path.join(nexusPath, 'file1.txt'), 'hello world');

      const hash1 = await computeBrainHash(nexusPath);

      await fs.writeFile(path.join(nexusPath, 'file2.txt'), 'new file');

      const hash2 = await computeBrainHash(nexusPath);

      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash when a file content changes', async () => {
      const nexusPath = path.join(tmpDir, '.nexus');
      await fs.ensureDir(nexusPath);
      const file = path.join(nexusPath, 'file1.txt');
      await fs.writeFile(file, 'hello world');

      const hash1 = await computeBrainHash(nexusPath);

      await fs.writeFile(file, 'hello world modified');

      const hash2 = await computeBrainHash(nexusPath);

      expect(hash1).not.toBe(hash2);
    });

    it('should ignore changes inside the `state` subdirectory', async () => {
      const nexusPath = path.join(tmpDir, '.nexus');
      await fs.ensureDir(nexusPath);
      await fs.writeFile(path.join(nexusPath, 'file1.txt'), 'hello world');

      const statePath = path.join(nexusPath, 'state');
      await fs.ensureDir(statePath);

      const hash1 = await computeBrainHash(nexusPath);

      await fs.writeFile(path.join(statePath, 'session.json'), '{"id": "1"}');

      const hash2 = await computeBrainHash(nexusPath);

      expect(hash1).toBe(hash2); // should match since `state` is ignored
    });
  });
});
