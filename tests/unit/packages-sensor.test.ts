import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { capturePackagesSensor } from '../../src/utils/sensors/packages.js';

const execaMock = vi.hoisted(() => vi.fn());

vi.mock('execa', () => ({
  execa: execaMock,
}));

describe('packages.ts sensor', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-packages-sensor-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
    execaMock.mockReset();
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('returns null metrics when package.json is missing', async () => {
    const result = await capturePackagesSensor(tmpDir, 500);

    expect(result).toEqual({
      outdatedCount: null,
      vulnerableCount: null,
    });
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('parses outdated and vulnerabilities from npm json output', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0' }));

    execaMock.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args[0] === 'outdated') {
        return {
          stdout: JSON.stringify({
            vitest: { current: '3.0.0', wanted: '3.2.4', latest: '3.2.4' },
            eslint: { current: '8.0.0', wanted: '8.57.1', latest: '8.57.1' },
          }),
          stderr: '',
          exitCode: 1,
        };
      }

      if (args[0] === 'audit') {
        return {
          stdout: JSON.stringify({
            metadata: {
              vulnerabilities: {
                info: 0,
                low: 1,
                moderate: 2,
                high: 0,
                critical: 1,
                total: 4,
              },
            },
          }),
          stderr: '',
          exitCode: 1,
        };
      }

      throw new Error('unexpected command');
    });

    const result = await capturePackagesSensor(tmpDir, 500);

    expect(result.outdatedCount).toBe(2);
    expect(result.vulnerableCount).toBe(4);
  });

  it('degrades to null values when command output is not parseable', async () => {
    await fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0' }));

    execaMock.mockResolvedValue({
      stdout: 'not-json',
      stderr: '',
      exitCode: 1,
    });

    const result = await capturePackagesSensor(tmpDir, 500);

    expect(result.outdatedCount).toBeNull();
    expect(result.vulnerableCount).toBeNull();
  });
});
