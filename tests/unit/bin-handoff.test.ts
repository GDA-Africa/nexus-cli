/**
 * NEXUS CLI — `nexus` bin handoff unit tests
 *
 * Covers the version picker, the global-layout detection for a harness-bundled CLI,
 * the harness placeholder package, and the loop guard, using temp-dir installs.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  compareVersions,
  DELEGATION_ENV,
  findHarnessBundledCli,
  readInstalledCli,
  resolveNexusHandoff,
} from '../../src/utils/bin-handoff.js';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): string {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'nexus-bin-handoff-')));
  roots.push(root);
  return root;
}

function write(file: string, content: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function writeCli(root: string, version: string, extra: Record<string, unknown> = {}): void {
  write(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: '@nexus-framework/cli',
      version,
      bin: { nexus: './bin/nexus.js' },
      ...extra,
    }),
  );
  write(path.join(root, 'bin', 'nexus.js'), '');
}

/** `<prefix>/lib/node_modules` with a standalone CLI and a harness bundling another CLI. */
function globalPrefix(
  standalone: string,
  bundled: string | undefined,
  layout = path.join('lib', 'node_modules'),
) {
  const nodeModules = path.join(fixture(), layout);
  const cliRoot = path.join(nodeModules, '@nexus-framework', 'cli');
  writeCli(cliRoot, standalone);
  const bundledRoot = path.join(
    nodeModules,
    '@nexus-framework',
    'harness',
    'node_modules',
    '@nexus-framework',
    'cli',
  );
  if (bundled !== undefined) writeCli(bundledRoot, bundled);
  return { cliRoot, bundledRoot };
}

describe('compareVersions', () => {
  it.each([
    ['2.0.0', '1.6.0', 1],
    ['1.6.0', '2.0.0', -1],
    ['1.10.0', '1.9.9', 1],
    ['2.0.0', '2.0.0', 0],
    ['2.0.0', '2.0.0-rc.1', 1],
    ['2.0.0-rc.2', '2.0.0-rc.10', -1],
    ['2.0.0-beta', '2.0.0-alpha', 1],
    ['1.0.0-1', '1.0.0-alpha', -1],
    ['2.0.0+build.1', '2.0.0', 0],
    ['0.0.0-harness-stub', '0.0.1', -1],
    ['garbage', '0.0.1', -1],
  ])('%s vs %s -> %i', (left, right, expected) => {
    expect(Math.sign(compareVersions(left, right))).toBe(expected);
  });
});

describe('readInstalledCli', () => {
  it('rejects the harness placeholder package and packages without a nexus bin', () => {
    const root = fixture();
    writeCli(path.join(root, 'real'), '2.0.0');
    expect(readInstalledCli(path.join(root, 'real'))?.version).toBe('2.0.0');
    writeCli(path.join(root, 'stub'), '0.0.0-harness-stub', {
      nexusOwner: '@nexus-framework/harness',
    });
    expect(readInstalledCli(path.join(root, 'stub'))).toBeUndefined();
    write(
      path.join(root, 'bare', 'package.json'),
      '{"name":"@nexus-framework/cli","version":"2.0.0"}',
    );
    expect(readInstalledCli(path.join(root, 'bare'))).toBeUndefined();
    expect(readInstalledCli(path.join(root, 'missing'))).toBeUndefined();
  });
});

describe('findHarnessBundledCli', () => {
  it('finds the harness bundle only in a global layout', () => {
    const posix = globalPrefix('2.0.0', '2.1.0');
    expect(findHarnessBundledCli(posix.cliRoot, 'linux')?.root).toBe(posix.bundledRoot);

    const windows = globalPrefix('2.0.0', '2.1.0', 'node_modules');
    expect(findHarnessBundledCli(windows.cliRoot, 'win32')?.root).toBe(windows.bundledRoot);
    // A project's node_modules is not lib/node_modules: its own CLI keeps answering.
    expect(findHarnessBundledCli(windows.cliRoot, 'linux')).toBeUndefined();
    expect(findHarnessBundledCli(fixture(), 'linux')).toBeUndefined();
  });
});

describe('resolveNexusHandoff', () => {
  it('hands off to a newer harness-bundled CLI', () => {
    const { cliRoot, bundledRoot } = globalPrefix('2.0.0', '2.1.0');
    expect(resolveNexusHandoff({ cliRoot, argv: ['wake'], env: {}, platform: 'linux' })).toEqual({
      kind: 'delegate',
      entry: path.join(bundledRoot, 'bin', 'nexus.js'),
      version: '2.1.0',
    });
  });

  it('answers itself when it is newer, equal, or alone', () => {
    for (const bundled of ['1.6.0', '2.0.0', undefined]) {
      const { cliRoot } = globalPrefix('2.0.0', bundled);
      expect(resolveNexusHandoff({ cliRoot, argv: ['wake'], env: {}, platform: 'linux' })).toEqual({
        kind: 'self',
      });
    }
  });

  it('names the answering install on --version', () => {
    const { cliRoot } = globalPrefix('2.0.0', '2.1.0');
    expect(
      resolveNexusHandoff({ cliRoot, argv: ['--version'], env: {}, platform: 'linux' }),
    ).toEqual({
      kind: 'version',
      text: '2.1.0 (via @nexus-framework/harness)',
    });
    expect(resolveNexusHandoff({ cliRoot, argv: ['-v'], env: {}, platform: 'linux' }).kind).toBe(
      'version',
    );
    expect(
      resolveNexusHandoff({ cliRoot, argv: ['--version', 'extra'], env: {}, platform: 'linux' })
        .kind,
    ).toBe('delegate');
  });

  it('never hands off a run that was already delegated (loop guard)', () => {
    const { cliRoot } = globalPrefix('2.0.0', '2.1.0');
    expect(
      resolveNexusHandoff({
        cliRoot,
        argv: ['wake'],
        env: { [DELEGATION_ENV]: '/x/bin/nexus.js' },
        platform: 'linux',
      }),
    ).toEqual({ kind: 'self' });
  });
});

describe('bin/nexus.js', () => {
  const binSource = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'bin',
    'nexus.js',
  );

  /** The real bin, with a dist/ whose handoff decision comes from TEST_HANDOFF. */
  function installBin(cliRoot: string, cliOutput: string): void {
    write(path.join(cliRoot, 'bin', 'nexus.js'), readFileSync(binSource, 'utf8'));
    write(
      path.join(cliRoot, 'package.json'),
      JSON.stringify({ name: '@nexus-framework/cli', type: 'module' }),
    );
    write(
      path.join(cliRoot, 'dist', 'cli.js'),
      `console.log(${JSON.stringify(cliOutput)}, process.env.NEXUS_BIN_DELEGATED === undefined)\n`,
    );
    write(
      path.join(cliRoot, 'dist', 'utils', 'bin-handoff.js'),
      'export function resolveNexusHandoff() { return JSON.parse(process.env.TEST_HANDOFF); }\n',
    );
  }

  it('runs its own CLI with the guard cleared, prints handed-off versions, and delegates with the guard set', () => {
    const root = fixture();
    installBin(path.join(root, 'cli'), 'own-cli');
    const bin = path.join(root, 'cli', 'bin', 'nexus.js');
    const run = (handoff: unknown, env: Record<string, string> = {}) =>
      spawnSync(process.execPath, [bin, 'wake'], {
        encoding: 'utf8',
        env: { ...process.env, TEST_HANDOFF: JSON.stringify(handoff), ...env },
      });

    expect(run({ kind: 'self' }, { [DELEGATION_ENV]: 'x' }).stdout.trim()).toBe('own-cli true');
    expect(
      run({ kind: 'version', text: '2.1.0 (via @nexus-framework/harness)' }).stdout.trim(),
    ).toBe('2.1.0 (via @nexus-framework/harness)');

    const other = path.join(root, 'other.mjs');
    write(
      other,
      'console.log("other-cli", process.argv.slice(2).join(" "), process.env.NEXUS_BIN_DELEGATED === process.argv[1])\n',
    );
    expect(run({ kind: 'delegate', entry: other, version: '2.1.0' }).stdout.trim()).toBe(
      'other-cli wake true',
    );
  });
});
