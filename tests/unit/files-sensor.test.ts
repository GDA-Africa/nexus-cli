import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { captureFilesSensor, DEFAULT_STALE_FOLDERS } from '../../src/utils/sensors/files.js';

describe('files.ts sensor', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-files-sensor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('returns all default folders with -1 when missing', async () => {
    const result = await captureFilesSensor(tmpDir);

    expect(result.staleFolders).toHaveLength(DEFAULT_STALE_FOLDERS.length);
    for (const item of result.staleFolders) {
      expect(item.staleDays).toBe(-1);
    }
  });

  it('computes stale days from latest nested file mtime', async () => {
    const folder = path.join(tmpDir, 'src', 'commands', 'nested');
    await fs.ensureDir(folder);

    const oldFile = path.join(folder, 'old.ts');
    const newFile = path.join(folder, 'new.ts');
    await fs.writeFile(oldFile, 'old');
    await fs.writeFile(newFile, 'new');

    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    await fs.utimes(oldFile, tenDaysAgo, tenDaysAgo);
    await fs.utimes(newFile, twoDaysAgo, twoDaysAgo);

    const result = await captureFilesSensor(tmpDir);
    const commands = result.staleFolders.find((item) => item.folder === 'src/commands');

    expect(commands).toBeDefined();
    expect(commands?.staleDays).toBe(2);
  });

  it('uses folder mtime when directory is empty', async () => {
    const folder = path.join(tmpDir, 'tests', 'integration');
    await fs.ensureDir(folder);

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    await fs.utimes(folder, threeDaysAgo, threeDaysAgo);

    const result = await captureFilesSensor(tmpDir);
    const integration = result.staleFolders.find((item) => item.folder === 'tests/integration');

    expect(integration).toBeDefined();
    expect(integration?.staleDays).toBe(3);
  });
});
