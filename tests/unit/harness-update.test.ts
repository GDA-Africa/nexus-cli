/**
 * NEXUS CLI — Harness Update Utility Unit Tests
 *
 * Tests for src/utils/harness-update.ts
 */

import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as autoInvokeConfig from '../../src/utils/auto-invoke-config.js';
import {
  checkForHarnessUpdate,
  detectInstalledHarnessVersion,
  downloadHarnessUpdate,
  HARNESS_NPM_PACKAGE,
  promptHarnessUpdate,
  type HarnessUpdateInfo,
} from '../../src/utils/harness-update.js';

function mockNpmResponse(version: string): Response {
  return new Response(JSON.stringify({ version }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('detectInstalledHarnessVersion', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-harness-detect-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('detects version from resolved binary directory structure', async () => {
    const pkgDir = path.join(tmpDir, 'apps', 'nexus-harness');
    const binDir = path.join(pkgDir, 'bin');
    await fs.ensureDir(binDir);
    await fs.writeJson(path.join(pkgDir, 'package.json'), {
      name: HARNESS_NPM_PACKAGE,
      version: '1.2.3',
    });
    const fakeBin = path.join(binDir, 'nexus-harness.js');
    await fs.writeFile(fakeBin, '// bin');

    const version = await detectInstalledHarnessVersion(tmpDir, fakeBin);
    expect(version).toBe('1.2.3');
  });

  it('detects version from project node_modules/@nexus-framework/harness', async () => {
    const modPkgDir = path.join(tmpDir, 'node_modules', '@nexus-framework', 'harness');
    await fs.ensureDir(modPkgDir);
    await fs.writeJson(path.join(modPkgDir, 'package.json'), {
      name: HARNESS_NPM_PACKAGE,
      version: '1.4.0',
    });

    const version = await detectInstalledHarnessVersion(tmpDir, null);
    expect(version).toBe('1.4.0');
  });

  it('returns null when no harness is installed', async () => {
    const version = await detectInstalledHarnessVersion(tmpDir, null);
    expect(version).toBeNull();
  });
});

describe('checkForHarnessUpdate', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: ReturnType<typeof vi.spyOn<any, any>>;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchSpy = vi.spyOn(globalThis as any, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns null on network error', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));
    const result = await checkForHarnessUpdate('1.0.0', 500);
    expect(result).toBeNull();
  });

  it('returns null when fetch times out', async () => {
    fetchSpy.mockImplementation(() => new Promise((_, reject) => {
      setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 50);
    }));
    const result = await checkForHarnessUpdate('1.0.0', 10);
    expect(result).toBeNull();
  });

  it('returns null when response is not ok', async () => {
    fetchSpy.mockResolvedValue(new Response('Not found', { status: 404 }));
    const result = await checkForHarnessUpdate('1.0.0', 500);
    expect(result).toBeNull();
  });

  it('returns hasUpdate: false when installed version is up to date', async () => {
    fetchSpy.mockResolvedValue(mockNpmResponse('1.1.1'));
    const result = await checkForHarnessUpdate('1.1.1', 500);
    expect(result).not.toBeNull();
    expect(result?.hasUpdate).toBe(false);
    expect(result?.current).toBe('1.1.1');
    expect(result?.latest).toBe('1.1.1');
  });

  it('returns hasUpdate: true when registry has a newer version', async () => {
    fetchSpy.mockResolvedValue(mockNpmResponse('2.0.0'));
    const result = await checkForHarnessUpdate('1.1.1', 500);
    expect(result).not.toBeNull();
    expect(result?.hasUpdate).toBe(true);
    expect(result?.current).toBe('1.1.1');
    expect(result?.latest).toBe('2.0.0');
    expect(result?.installCmd).toContain(HARNESS_NPM_PACKAGE);
  });

  it('returns hasUpdate: true when no harness is installed', async () => {
    fetchSpy.mockResolvedValue(mockNpmResponse('1.1.1'));
    const result = await checkForHarnessUpdate(null, 500);
    expect(result).not.toBeNull();
    expect(result?.hasUpdate).toBe(true);
    expect(result?.current).toBeNull();
    expect(result?.latest).toBe('1.1.1');
  });
});

describe('promptHarnessUpdate', () => {
  let isInteractiveSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    isInteractiveSpy = vi.spyOn(autoInvokeConfig, 'isInteractiveEnvironment');
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    isInteractiveSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('returns false without prompting in non-interactive environments', async () => {
    isInteractiveSpy.mockReturnValue(false);

    const info: HarnessUpdateInfo = {
      current: '1.0.0',
      latest: '1.1.0',
      hasUpdate: true,
      installCmd: 'npm install -g @nexus-framework/harness',
    };

    const shouldDownload = await promptHarnessUpdate(info);
    expect(shouldDownload).toBe(false);
  });
});

describe('downloadHarnessUpdate', () => {
  it('executes the install command via custom runner', async () => {
    const runner = vi.fn().mockResolvedValue(undefined);
    const success = await downloadHarnessUpdate('npm install -g @nexus-framework/harness', { runner });

    expect(success).toBe(true);
    expect(runner).toHaveBeenCalledWith('npm', ['install', '-g', '@nexus-framework/harness'], {});
  });

  it('handles runner failure gracefully and returns false', async () => {
    const runner = vi.fn().mockRejectedValue(new Error('Permission denied'));
    const success = await downloadHarnessUpdate('npm install -g @nexus-framework/harness', { runner });

    expect(success).toBe(false);
  });
});
