import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChameleonExec } from '../../src/utils/chameleon/runner.js';
import {
  BASELINE_CAPABILITIES,
  detectChameleon,
  hasCapability,
  parseEnvelope,
  resolveChameleonBin,
  runChameleon,
} from '../../src/utils/chameleon/runner.js';

/** A fake CLI that always answers with the given envelope. */
function fakeExec(envelope: unknown, exitCode = 0): ChameleonExec {
  return vi.fn(async () => ({
    exitCode,
    stdout: typeof envelope === 'string' ? envelope : JSON.stringify(envelope),
    stderr: '',
  }));
}

const versionEnvelope = {
  ok: true,
  command: 'version',
  version: '2.0.0-alpha.1',
  data: { cli: '2.0.0-alpha.1', library: '2.0.0-alpha.1' },
};

describe('parseEnvelope', () => {
  it('parses a clean envelope', () => {
    expect(parseEnvelope(JSON.stringify(versionEnvelope))?.command).toBe('version');
  });

  it('tolerates leading noise from npx', () => {
    const noisy = `npm warn exec fetching package\n${JSON.stringify(versionEnvelope)}`;

    expect(parseEnvelope(noisy)?.ok).toBe(true);
  });

  it('returns undefined for output that is not an envelope', () => {
    expect(parseEnvelope('')).toBeUndefined();
    expect(parseEnvelope('command not found')).toBeUndefined();
    expect(parseEnvelope(JSON.stringify({ hello: 'world' }))).toBeUndefined();
  });
});

describe('runChameleon', () => {
  const cwd = '/tmp/does-not-matter';

  it('always passes --json', async () => {
    const exec = fakeExec(versionEnvelope);

    await runChameleon(['list'], { cwd, exec, bin: 'chameleon', binArgs: [] });

    expect(exec).toHaveBeenCalledWith('chameleon', ['list', '--json'], { cwd });
  });

  it('does not duplicate an explicit --json', async () => {
    const exec = fakeExec(versionEnvelope);

    await runChameleon(['list', '--json'], { cwd, exec, bin: 'chameleon', binArgs: [] });

    expect(exec).toHaveBeenCalledWith('chameleon', ['list', '--json'], { cwd });
  });

  it('refuses `agents init` in write mode', async () => {
    const exec = fakeExec(versionEnvelope);

    const result = await runChameleon(['agents', 'init'], { cwd, exec, bin: 'chameleon', binArgs: [] });

    expect(result.failure).toBe('refused');
    expect(result.message).toContain('NEXUS owns');
    expect(exec).not.toHaveBeenCalled();
  });

  it('allows `agents init --fragment`, which does not touch NEXUS-owned files', async () => {
    const exec = fakeExec({ ok: true, command: 'agents init', version: '2.0.0', data: {} });

    const result = await runChameleon(['agents', 'init', '--fragment'], {
      cwd, exec, bin: 'chameleon', binArgs: [],
    });

    expect(result.failure).toBeUndefined();
    expect(exec).toHaveBeenCalled();
  });

  it('reports a missing CLI rather than throwing', async () => {
    const exec: ChameleonExec = vi.fn(async () => ({ exitCode: 1, stdout: '', stderr: 'npm error 404' }));

    const result = await runChameleon(['list'], { cwd, exec, bin: 'npx', binArgs: [] });

    expect(result.ok).toBe(false);
    expect(result.failure).toBe('not-found');
  });

  it('reports an exec that throws as a missing CLI', async () => {
    const exec: ChameleonExec = vi.fn(async () => {
      throw new Error('spawn ENOENT');
    });

    const result = await runChameleon(['list'], { cwd, exec, bin: 'chameleon', binArgs: [] });

    expect(result.failure).toBe('not-found');
    expect(result.message).toContain('ENOENT');
  });

  it('treats a well-formed failure envelope as not ok, keeping the details', async () => {
    const envelope = {
      ok: false,
      command: 'new',
      version: '2.0.0-alpha.1',
      errors: [{ code: 'DIR_NOT_EMPTY', message: 'Target directory is not empty: app' }],
    };
    const result = await runChameleon(['new', 'app'], {
      cwd, exec: fakeExec(envelope, 1), bin: 'chameleon', binArgs: [],
    });

    expect(result.ok).toBe(false);
    expect(result.failure).toBeUndefined();
    expect(result.envelope?.errors?.[0]?.code).toBe('DIR_NOT_EMPTY');
  });
});

describe('resolveChameleonBin', () => {
  let tmpDir: string;
  let originalOverride: string | undefined;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-chameleon-bin-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tmpDir, { recursive: true });
    originalOverride = process.env.NEXUS_CHAMELEON_BIN;
    delete process.env.NEXUS_CHAMELEON_BIN;
  });

  afterEach(async () => {
    if (originalOverride === undefined) {
      delete process.env.NEXUS_CHAMELEON_BIN;
    } else {
      process.env.NEXUS_CHAMELEON_BIN = originalOverride;
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('prefers an explicit override', async () => {
    process.env.NEXUS_CHAMELEON_BIN = '/opt/chameleon';

    expect(await resolveChameleonBin(tmpDir)).toEqual({
      bin: '/opt/chameleon', binArgs: [], resolvedFrom: 'env',
    });
  });

  it('uses the project-local binary when present', async () => {
    const binDir = path.join(tmpDir, 'node_modules', '.bin');
    await fs.mkdir(binDir, { recursive: true });
    await fs.writeFile(path.join(binDir, 'chameleon'), '#!/bin/sh\n', 'utf8');

    const resolved = await resolveChameleonBin(tmpDir);

    expect(resolved.resolvedFrom).toBe('local');
    expect(resolved.bin).toBe(path.join(binDir, 'chameleon'));
  });

  it('falls back to npx without installing anything', async () => {
    const resolved = await resolveChameleonBin(tmpDir);

    expect(resolved).toEqual({ bin: 'npx', binArgs: ['--no-install', 'chameleon'], resolvedFrom: 'npx' });
  });
});

describe('detectChameleon', () => {
  const cwd = '/tmp/does-not-matter';

  it('reports absence as a normal outcome', async () => {
    const exec: ChameleonExec = vi.fn(async () => ({ exitCode: 1, stdout: '', stderr: 'not found' }));

    const install = await detectChameleon({ cwd, exec });

    expect(install.available).toBe(false);
    expect(install.capabilities).toEqual([]);
    expect(install.reason).toBeTruthy();
  });

  it('assumes the baseline when no capabilities are advertised', async () => {
    const install = await detectChameleon({ cwd, exec: fakeExec(versionEnvelope) });

    expect(install.available).toBe(true);
    expect(install.cliVersion).toBe('2.0.0-alpha.1');
    expect(install.capabilities).toEqual(BASELINE_CAPABILITIES);
    expect(hasCapability(install, 'appspec-v2')).toBe(true);
    expect(hasCapability(install, 'init-framework-aware')).toBe(false);
  });

  it('uses the advertised capability list when Chameleon sends one', async () => {
    const exec = fakeExec({
      ...versionEnvelope,
      data: {
        cli: '2.0.0-beta.1',
        library: '2.0.0-beta.1',
        capabilities: ['appspec-v2', 'target-none', 'init-framework-aware'],
      },
    });

    const install = await detectChameleon({ cwd, exec });

    expect(install.capabilities).toEqual(['appspec-v2', 'target-none', 'init-framework-aware']);
    expect(hasCapability(install, 'init-framework-aware')).toBe(true);
  });

  it('ignores a malformed capability list', async () => {
    const exec = fakeExec({
      ...versionEnvelope,
      data: { cli: '2.0.0', library: '2.0.0', capabilities: 'target-none' },
    });

    const install = await detectChameleon({ cwd, exec });

    expect(install.capabilities).toEqual(BASELINE_CAPABILITIES);
  });
});
