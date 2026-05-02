import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureTestsSensor } from '../../src/utils/sensors/tests.js';

const execaMock = vi.hoisted(() => vi.fn());

vi.mock('execa', () => ({
  execa: execaMock,
}));

describe('tests.ts sensor', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-tests-sensor-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
    execaMock.mockReset();
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('returns parsed JSON summary when command emits JSON output', async () => {
    await fs.writeFile(path.join(tmpDir, 'yarn.lock'), '');

    execaMock.mockResolvedValue({
      stdout: JSON.stringify({
        numPassedTests: 12,
        numFailedTests: 1,
        numPendingTests: 2,
        duration: 987,
      }),
      stderr: '',
      exitCode: 0,
    });

    const result = await captureTestsSensor(tmpDir, 2000);

    expect(result.passed).toBe(12);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(2);
    expect(result.durationMs).toBe(987);
    expect(result.source).toContain('yarn vitest run --reporter=json');
  });

  it('falls back to text parsing when JSON parsing fails', async () => {
    execaMock.mockResolvedValue({
      stdout: 'Tests  3 failed | 20 passed | 4 skipped\nDuration  2.5s',
      stderr: '',
      exitCode: 1,
    });

    const result = await captureTestsSensor(tmpDir, 2000);

    expect(result.passed).toBe(20);
    expect(result.failed).toBe(3);
    expect(result.skipped).toBe(4);
    expect(result.durationMs).toBe(2500);
    expect(result.source).toContain('npx vitest run --reporter=json');
  });

  it('returns null metrics when commands fail or timeout', async () => {
    execaMock.mockRejectedValue(new Error('timeout'));

    const result = await captureTestsSensor(tmpDir, 10);

    expect(result).toEqual({
      passed: null,
      failed: null,
      skipped: null,
      durationMs: null,
      source: null,
    });
  });
});
