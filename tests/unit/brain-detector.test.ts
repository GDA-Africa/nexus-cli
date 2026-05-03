import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { detectBrainNeeds } from '../../src/utils/brain-detector.js';

describe('detectBrainNeeds', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-brain-detector-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(path.join(tmpDir, '.nexus', 'docs'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, '.nexus', 'plans'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, '.nexus', 'state'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('flags stale sync and missing vital signs when state is absent', async () => {
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), '# Index\n');

    const result = await detectBrainNeeds(tmpDir);

    expect(result.shouldSync).toBe(true);
    expect(result.reasons.some((r) => r.code === 'sync-stale')).toBe(true);
    expect(result.reasons.some((r) => r.code === 'vitals-missing')).toBe(true);
  });

  it('is healthy when sync is fresh and fences exist', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.nexus', 'docs', 'index.md'),
      '<!-- NEXUS:VITAL_SIGNS:START -->\nblock\n<!-- NEXUS:VITAL_SIGNS:END -->',
    );
    await fs.writeFile(
      path.join(tmpDir, '.nexus', 'state', 'last-sync.json'),
      JSON.stringify({ capturedAt: new Date().toISOString() }),
    );

    const result = await detectBrainNeeds(tmpDir);

    expect(result.shouldSync).toBe(false);
    expect(result.vitalsPresent).toBe(true);
  });
});
