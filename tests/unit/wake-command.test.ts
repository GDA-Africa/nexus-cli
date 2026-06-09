import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { runWake } from '../../src/commands/wake.js';

const NOW = new Date('2026-06-09T12:00:00.000Z');
const TOKEN_PATTERN = /^NX-WAKE-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-2026-06-09$/;

describe('runWake()', () => {
  let tmpDir: string;
  let docsDir: string;
  let logSpy: MockInstance;

  beforeEach(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `nexus-wake-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    docsDir = path.join(tmpDir, '.nexus', 'docs');
    await fs.ensureDir(docsDir);
    await fs.writeFile(path.join(docsDir, 'index.md'), '# Index\nbrain content', 'utf-8');
    await fs.writeFile(path.join(docsDir, 'knowledge.md'), '# Knowledge', 'utf-8');
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fs.remove(tmpDir);
  });

  it('issues a token in the NX-WAKE-XXXX-YYYY-MM-DD format', async () => {
    const result = await runWake(tmpDir, { now: NOW });
    expect(result?.token).toMatch(TOKEN_PATTERN);
  });

  it('is deterministic: same brain + same date → same token', async () => {
    const first = await runWake(tmpDir, { now: NOW });
    const second = await runWake(tmpDir, { now: NOW });
    expect(second?.token).toBe(first?.token);
    expect(second?.brainHash).toBe(first?.brainHash);
  });

  it('changes the token when brain content changes', async () => {
    const before = await runWake(tmpDir, { now: NOW });
    await fs.appendFile(path.join(docsDir, 'index.md'), '\nnew insight', 'utf-8');
    const after = await runWake(tmpDir, { now: NOW });
    expect(after?.token).not.toBe(before?.token);
  });

  it('changes the token when the date changes', async () => {
    const today = await runWake(tmpDir, { now: NOW });
    const tomorrow = await runWake(tmpDir, { now: new Date('2026-06-10T12:00:00.000Z') });
    expect(tomorrow?.token).not.toBe(today?.token);
  });

  it('writes .nexus/state/session.json with the issued token', async () => {
    const result = await runWake(tmpDir, { now: NOW });

    const session = await fs.readJson(path.join(tmpDir, '.nexus', 'state', 'session.json'));
    expect(session.token).toBe(result?.token);
    expect(session.brain_hash).toBe(result?.brainHash);
    expect(session.issued_by).toBe('nexus wake');
    expect(session.issued_at).toBe(NOW.toISOString());
    expect(session.brain_hash_inputs).toContain('docs/index.md');
  });

  it('reports the first active plan when plans exist', async () => {
    const plansDir = path.join(tmpDir, '.nexus', 'plans');
    await fs.ensureDir(plansDir);
    await fs.writeJson(path.join(plansDir, '_active.json'), {
      active: ['my-plan'],
      set_at: '2026-06-01T00:00:00Z',
      by: 'test',
    });

    const result = await runWake(tmpDir, { now: NOW });
    expect(result?.activePlan).toBe('my-plan');
  });

  it('--no-active-plan skips plan lookup and prints no plan line', async () => {
    const result = await runWake(tmpDir, { now: NOW, activePlan: false });
    expect(result?.activePlan).toBeNull();

    const printed = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(printed).not.toContain('Active plan:');
  });

  it('--quiet prints only the token', async () => {
    const result = await runWake(tmpDir, { now: NOW, quiet: true });

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toBe(result?.token);
  });

  it('prints a full handshake block by default', async () => {
    await runWake(tmpDir, { now: NOW });

    const printed = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(printed).toContain('NEXUS HANDSHAKE');
    expect(printed).toContain('Brain hash: brain-2026-06-09-');
    expect(printed).toContain('echo this token in your first response');
  });

  it('tolerates a missing plans directory', async () => {
    const result = await runWake(tmpDir, { now: NOW });
    expect(result?.activePlan).toBeNull();
    expect(result?.token).toMatch(TOKEN_PATTERN);
  });
});
