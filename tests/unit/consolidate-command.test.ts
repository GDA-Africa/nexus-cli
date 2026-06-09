import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { runConsolidate } from '../../src/commands/consolidate.js';

const NOW = new Date('2026-06-09T12:00:00.000Z');

const KNOWLEDGE = [
  '# Knowledge Base',
  '',
  '---',
  '',
  '### [architecture] Layered Design',
  '**2026-03-01** — Keep commands thin, utils pure.',
  '',
  '### [gotcha] Ancient Trap',
  '**2024-02-01** — Wisdom that predates the cutoff.',
  '',
].join('\n');

describe('runConsolidate()', () => {
  let tmpDir: string;
  let docsDir: string;
  let logSpy: MockInstance;

  beforeEach(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `nexus-consolidate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    docsDir = path.join(tmpDir, '.nexus', 'docs');
    await fs.ensureDir(docsDir);
    await fs.writeFile(path.join(docsDir, 'knowledge.md'), KNOWLEDGE, 'utf-8');
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined;
  });

  afterEach(async () => {
    logSpy.mockRestore();
    process.exitCode = undefined;
    await fs.remove(tmpDir);
  });

  it('writes knowledge-summary.md by default', async () => {
    await runConsolidate(tmpDir, { now: NOW });

    const summary = await fs.readFile(path.join(docsDir, 'knowledge-summary.md'), 'utf-8');
    expect(summary).toContain('# Knowledge — Consolidated View');
    expect(summary).toContain('## architecture (1 entry)');
    expect(summary).toContain('Layered Design');
    expect(summary).toContain('generated_at: "2026-06-09"');
  });

  it('--check fails when summary is missing', async () => {
    await runConsolidate(tmpDir, { check: true, now: NOW });
    expect(process.exitCode).toBe(1);
  });

  it('--check fails when summary is stale', async () => {
    await runConsolidate(tmpDir, { now: NOW });

    // Mutate knowledge.md after generating the summary
    await fs.appendFile(
      path.join(docsDir, 'knowledge.md'),
      '\n### [pattern] New Insight\n**2026-06-09** — Fresh discovery.\n',
      'utf-8',
    );

    await runConsolidate(tmpDir, { check: true, now: NOW });
    expect(process.exitCode).toBe(1);
  });

  it('--check passes when summary is current, even on a later date', async () => {
    await runConsolidate(tmpDir, { now: NOW });
    await runConsolidate(tmpDir, { check: true, now: new Date('2026-07-01T12:00:00.000Z') });
    expect(process.exitCode).toBeUndefined();
  });

  it('--archive moves year-old entries to knowledge-archive.md', async () => {
    await runConsolidate(tmpDir, { archive: true, now: NOW });

    const archive = await fs.readFile(path.join(docsDir, 'knowledge-archive.md'), 'utf-8');
    const knowledge = await fs.readFile(path.join(docsDir, 'knowledge.md'), 'utf-8');
    const summary = await fs.readFile(path.join(docsDir, 'knowledge-summary.md'), 'utf-8');

    expect(archive).toContain('Ancient Trap');
    expect(knowledge).not.toContain('Ancient Trap');
    expect(knowledge).toContain('Layered Design');
    // Summary reflects the post-archive state
    expect(summary).not.toContain('Ancient Trap');
  });

  it('--archive appends to an existing archive without clobbering it', async () => {
    await fs.writeFile(
      path.join(docsDir, 'knowledge-archive.md'),
      '# Existing Archive\n\n### [gotcha] Already Archived\n**2023-01-01** — Old entry.\n',
      'utf-8',
    );

    await runConsolidate(tmpDir, { archive: true, now: NOW });

    const archive = await fs.readFile(path.join(docsDir, 'knowledge-archive.md'), 'utf-8');
    expect(archive).toContain('Already Archived');
    expect(archive).toContain('Ancient Trap');
  });

  it('is idempotent — consolidating twice yields the same summary', async () => {
    await runConsolidate(tmpDir, { now: NOW });
    const first = await fs.readFile(path.join(docsDir, 'knowledge-summary.md'), 'utf-8');

    await runConsolidate(tmpDir, { now: NOW });
    const second = await fs.readFile(path.join(docsDir, 'knowledge-summary.md'), 'utf-8');

    expect(second).toBe(first);
  });

  it('warns and writes nothing when knowledge.md has no entries', async () => {
    await fs.writeFile(path.join(docsDir, 'knowledge.md'), '# Empty\n\nNo entries.\n', 'utf-8');

    await runConsolidate(tmpDir, { now: NOW });

    expect(await fs.pathExists(path.join(docsDir, 'knowledge-summary.md'))).toBe(false);
  });
});
