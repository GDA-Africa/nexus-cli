import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { syncCommand } from '../../src/commands/sync.js';

describe('sync integration (nexus-sample fixture)', () => {
  let tmpDir: string;
  let fixtureDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-sync-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fixtureDir = path.join(tmpDir, 'nexus-sample-copy');

    const source = path.join(process.cwd(), 'nexus-sample');
    await fs.copy(source, fixtureDir);

    // Ensure minimal .nexus/docs/index.md exists with fences
    const indexPath = path.join(fixtureDir, '.nexus', 'docs', 'index.md');
    await fs.ensureDir(path.dirname(indexPath));
    await fs.writeFile(
      indexPath,
      [
        '# Fixture Index',
        '',
        '<!-- NEXUS:VITAL_SIGNS:START -->',
        'placeholder',
        '<!-- NEXUS:VITAL_SIGNS:END -->',
      ].join('\n'),
      'utf-8',
    );
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('runs sync twice without duplicating the Vital Signs block', async () => {
    const indexPath = path.join(fixtureDir, '.nexus', 'docs', 'index.md');

    await syncCommand(fixtureDir, { write: true });
    const once = await fs.readFile(indexPath, 'utf-8');

    await syncCommand(fixtureDir, { write: true });
    const twice = await fs.readFile(indexPath, 'utf-8');

    const startFence = '<!-- NEXUS:VITAL_SIGNS:START';
    const endFence = '<!-- NEXUS:VITAL_SIGNS:END -->';

    expect(once.split(startFence).length - 1).toBe(1);
    expect(once.split(endFence).length - 1).toBe(1);
    expect(twice.split(startFence).length - 1).toBe(1);
    expect(twice.split(endFence).length - 1).toBe(1);
    expect(twice).toContain('## 🩺 Vital Signs (auto)');
  });
});
