import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { replaceVitalSignsBlock, syncCommand } from '../../src/commands/sync.js';

const captureVitalSignsMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/utils/sensors/index.js', () => ({
  captureVitalSigns: captureVitalSignsMock,
}));

describe('syncCommand()', () => {
  let tmpDir: string;
  let logSpy: MockInstance;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-sync-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(path.join(tmpDir, '.nexus', 'docs'));
    await fs.writeFile(
      path.join(tmpDir, '.nexus', 'docs', 'index.md'),
      [
        '# Index',
        '<!-- NEXUS:VITAL_SIGNS:START -->',
        'old block',
        '<!-- NEXUS:VITAL_SIGNS:END -->',
      ].join('\n'),
      'utf-8',
    );

    captureVitalSignsMock.mockReset();
    captureVitalSignsMock.mockResolvedValue({
      capturedAt: '2026-05-02T16:00:00.000Z',
      git: { branch: 'main', aheadOfMain: 2, lastCommit: 'abc123 — test', isDirty: false },
      files: { staleFolders: [{ folder: 'src/utils', staleDays: 5 }] },
      tests: { passed: 12, failed: 1, skipped: 0, durationMs: 800, source: 'vitest' },
      packages: { outdatedCount: 3, vulnerableCount: 1 },
    });

    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fs.remove(tmpDir);
  });

  it('writes updated Vital Signs block by default', async () => {
    await syncCommand(tmpDir, {});

    const index = await fs.readFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), 'utf-8');
    expect(index).toContain('## 🩺 Vital Signs (auto)');
    expect(index).toContain('abc123 — test');
    expect(index).toContain('3 outdated · 1 vulnerable');
  });

  it('persists the snapshot to .nexus/state/last-sync.json when write:true (B1)', async () => {
    // Nothing else in src/ ever wrote this file — doctor/context.ts and
    // brain-detector.ts both read it, so vitalSigns was always null and
    // `nexus doctor` (D08) could never actually exit 0.
    await syncCommand(tmpDir, { write: true });

    const snapshot = await fs.readJson(path.join(tmpDir, '.nexus', 'state', 'last-sync.json'));
    expect(snapshot.capturedAt).toBe('2026-05-02T16:00:00.000Z');
    expect(snapshot.git.branch).toBe('main');
    expect(snapshot.tests.passed).toBe(12);
  });

  it('does not persist the snapshot in dry-run mode', async () => {
    await syncCommand(tmpDir, { dryRun: true });

    expect(await fs.pathExists(path.join(tmpDir, '.nexus', 'state', 'last-sync.json'))).toBe(false);
  });

  it('does not write file in dry-run mode', async () => {
    const before = await fs.readFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), 'utf-8');

    await syncCommand(tmpDir, { dryRun: true, json: true });

    const after = await fs.readFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), 'utf-8');
    expect(after).toBe(before);
    expect(logSpy).toHaveBeenCalled();
  });

  it('prints scoped json when --json and --scope are used', async () => {
    await syncCommand(tmpDir, { dryRun: true, json: true, scope: 'git' });

    const logged = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).toContain('"git"');
    expect(logged).toContain('"branch": "main"');
  });
});

describe('replaceVitalSignsBlock()', () => {
  it('replaces fenced block idempotently', () => {
    const content = [
      'before',
      '<!-- NEXUS:VITAL_SIGNS:START -->',
      'old',
      '<!-- NEXUS:VITAL_SIGNS:END -->',
      'after',
    ].join('\n');

    const block = [
      '<!-- NEXUS:VITAL_SIGNS:START -->',
      'new',
      '<!-- NEXUS:VITAL_SIGNS:END -->',
    ].join('\n');

    const once = replaceVitalSignsBlock(content, block);
    const twice = replaceVitalSignsBlock(once, block);

    expect(once).toContain('new');
    expect(twice).toBe(once);
  });
});
