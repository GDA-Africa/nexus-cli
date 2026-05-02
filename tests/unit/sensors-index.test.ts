import { describe, expect, it, vi } from 'vitest';

import { captureVitalSigns } from '../../src/utils/sensors/index.js';

const gitMock = vi.hoisted(() => vi.fn());
const filesMock = vi.hoisted(() => vi.fn());
const testsMock = vi.hoisted(() => vi.fn());
const packagesMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/utils/sensors/git.js', () => ({
  captureGitSensor: gitMock,
}));

vi.mock('../../src/utils/sensors/files.js', () => ({
  captureFilesSensor: filesMock,
}));

vi.mock('../../src/utils/sensors/tests.js', () => ({
  captureTestsSensor: testsMock,
}));

vi.mock('../../src/utils/sensors/packages.js', () => ({
  capturePackagesSensor: packagesMock,
}));

describe('sensors index aggregator', () => {
  it('aggregates all sensor results into a single vital signs object', async () => {
    gitMock.mockResolvedValue({
      branch: 'main',
      aheadOfMain: 1,
      lastCommit: 'abc123 — test',
      isDirty: false,
    });

    filesMock.mockResolvedValue({
      staleFolders: [{ folder: 'src/utils', staleDays: 5 }],
    });

    testsMock.mockResolvedValue({
      passed: 10,
      failed: 0,
      skipped: 2,
      durationMs: 500,
      source: 'vitest',
    });

    packagesMock.mockResolvedValue({
      outdatedCount: 3,
      vulnerableCount: 1,
    });

    const result = await captureVitalSigns({ cwd: '/tmp/repo', timeoutMs: 500 });

    expect(result.git.branch).toBe('main');
    expect(result.files.staleFolders[0]?.folder).toBe('src/utils');
    expect(result.tests.passed).toBe(10);
    expect(result.packages.outdatedCount).toBe(3);
    expect(result.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(gitMock).toHaveBeenCalledWith('/tmp/repo');
    expect(filesMock).toHaveBeenCalledWith('/tmp/repo');
    expect(testsMock).toHaveBeenCalledWith('/tmp/repo', 500);
    expect(packagesMock).toHaveBeenCalledWith('/tmp/repo', 500);
  });

  it('falls back to empty values when a sensor throws', async () => {
    gitMock.mockRejectedValue(new Error('boom'));
    filesMock.mockResolvedValue({ staleFolders: [] });
    testsMock.mockResolvedValue({
      passed: 5,
      failed: 0,
      skipped: 0,
      durationMs: 200,
      source: 'vitest',
    });
    packagesMock.mockResolvedValue({ outdatedCount: 0, vulnerableCount: 0 });

    const result = await captureVitalSigns({ timeoutMs: 100 });

    expect(result.git).toEqual({
      branch: null,
      aheadOfMain: null,
      lastCommit: null,
      isDirty: null,
    });
    expect(result.tests.passed).toBe(5);
  });

  it('falls back when a sensor times out', async () => {
    gitMock.mockImplementation(() => new Promise(() => undefined));
    filesMock.mockResolvedValue({ staleFolders: [] });
    testsMock.mockResolvedValue({
      passed: 1,
      failed: 0,
      skipped: 0,
      durationMs: 100,
      source: 'vitest',
    });
    packagesMock.mockResolvedValue({ outdatedCount: 0, vulnerableCount: 0 });

    const result = await captureVitalSigns({ timeoutMs: 10 });

    expect(result.git.branch).toBeNull();
    expect(result.files.staleFolders).toEqual([]);
    expect(result.tests.passed).toBe(1);
  });
});
