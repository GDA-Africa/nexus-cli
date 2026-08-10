import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  filterChameleonOwned,
  finishUiDelegation,
  prepareUiDelegation,
  preserveChameleonBlocks,
  runPreWriteDelegation,
} from '../../src/generators/ui-delegation.js';
import type { NexusConfig } from '../../src/types/config.js';
import { DEFAULT_PERSONA } from '../../src/types/config.js';
import {
  CHAMELEON_BLOCK_END,
  CHAMELEON_BLOCK_START,
} from '../../src/utils/chameleon/agent-block.js';
import type { ChameleonExec } from '../../src/utils/chameleon/runner.js';
import type { GeneratedFile } from '../../src/types/templates.js';

const config = (overrides: Partial<NexusConfig> = {}): NexusConfig => ({
  projectName: 'bakery-crm',
  displayName: 'Bakery CRM',
  projectType: 'web',
  dataStrategy: 'cloud-first',
  appPatterns: [],
  frontendFramework: 'react-vite',
  backendStrategy: 'integrated',
  backendFramework: 'none',
  testFramework: 'vitest',
  packageManager: 'npm',
  git: false,
  installDeps: false,
  persona: DEFAULT_PERSONA,
  uiProvider: 'chameleon',
  ...overrides,
});

const chameleonBlock = `${CHAMELEON_BLOCK_START}\n## Chameleon UI (v2.0.0-alpha.1)\nPrefer Chameleon components.\n${CHAMELEON_BLOCK_END}`;

/**
 * A fake Chameleon that behaves like the real one: answers `--version`, and on
 * `new` writes the same file set `scaffoldApp()` does — including the agent
 * files it splices its block into.
 */
function fakeChameleon(projectRoot: string): ChameleonExec {
  return vi.fn(async (_bin, args) => {
    const envelope = (command: string, extra: Record<string, unknown> = {}): string =>
      JSON.stringify({ ok: true, command, version: '2.0.0-alpha.1', ...extra });

    if (args.includes('--version')) {
      return {
        exitCode: 0,
        stdout: envelope('version', { data: { cli: '2.0.0-alpha.1', library: '2.0.0-alpha.1' } }),
        stderr: '',
      };
    }

    if (args.includes('--validate-only')) {
      return { exitCode: 0, stdout: envelope('new', { data: { valid: true, errors: [] } }), stderr: '' };
    }

    await fs.mkdir(path.join(projectRoot, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'package.json'),
      JSON.stringify({
        name: 'bakery-crm',
        scripts: { dev: 'vite', lint: 'eslint .' },
        dependencies: { react: '^18.3.1' },
        devDependencies: { typescript: '^5.6.0' },
      }, null, 2),
      'utf8',
    );
    await fs.writeFile(path.join(projectRoot, 'src', 'App.tsx'), 'export default function App() {}\n', 'utf8');
    for (const file of ['CLAUDE.md', 'AGENTS.md', '.cursorrules']) {
      await fs.writeFile(path.join(projectRoot, file), `${chameleonBlock}\n`, 'utf8');
    }

    return {
      exitCode: 0,
      stdout: envelope('new', { filesWritten: ['package.json', 'src/App.tsx', 'CLAUDE.md'] }),
      stderr: '',
    };
  });
}

describe('UI delegation across a generation run', () => {
  let tmpDir: string;
  let projectRoot: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-ui-deleg-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tmpDir, { recursive: true });
    projectRoot = path.join(tmpDir, 'bakery-crm');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  /** Stand-in for `writeGeneratorResult` — NEXUS writing its own files. */
  async function writeNexusFiles(files: GeneratedFile[]): Promise<void> {
    for (const file of files) {
      const full = path.join(projectRoot, file.path);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, file.content, 'utf8');
    }
  }

  const nexusFiles = (): GeneratedFile[] => [
    { path: 'package.json', content: JSON.stringify({
      name: 'bakery-crm',
      scripts: { test: 'vitest run' },
      devDependencies: { eslint: '^9.0.0', vitest: '^3.0.0' },
    }) },
    { path: 'src/App.tsx', content: '// NEXUS version\n' },
    { path: 'CLAUDE.md', content: '# NEXUS instructions\n' },
    { path: 'AGENTS.md', content: '# NEXUS instructions\n' },
    { path: '.nexus/docs/index.md', content: '# brain\n' },
  ];

  it('does nothing at all when the provider is none', async () => {
    const exec: ChameleonExec = vi.fn();

    const state = await prepareUiDelegation(config({ uiProvider: 'none' }), projectRoot, exec);

    expect(state.enabled).toBe(false);
    expect(exec).not.toHaveBeenCalled();
    expect(filterChameleonOwned(nexusFiles(), state).files).toHaveLength(5);
  });

  it('runs the full path A flow and keeps both tools\' work', async () => {
    const exec = fakeChameleon(projectRoot);

    let state = await prepareUiDelegation(config(), projectRoot, exec);
    expect(state.enabled).toBe(true);

    state = await runPreWriteDelegation(state, config(), projectRoot);
    expect(state.result?.status).toBe('generated');
    // Chameleon's block was lifted off before NEXUS could overwrite it.
    expect(state.capturedBlocks?.size).toBe(3);

    // NEXUS stands back from the files Chameleon owns...
    const filtered = filterChameleonOwned(nexusFiles(), state);
    expect(filtered.files.map((f) => f.path)).toEqual(['CLAUDE.md', 'AGENTS.md', '.nexus/docs/index.md']);
    expect(filtered.state.heldPackageJson).toBeDefined();

    await writeNexusFiles(filtered.files);
    state = await finishUiDelegation(filtered.state, config(), projectRoot);

    // Chameleon's app source survived.
    await expect(fs.readFile(path.join(projectRoot, 'src', 'App.tsx'), 'utf8'))
      .resolves.toBe('export default function App() {}\n');

    // NEXUS's tooling was merged into Chameleon's package.json, so the `lint`
    // script Chameleon ships is finally runnable.
    const pkg = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.scripts).toMatchObject({ dev: 'vite', lint: 'eslint .', test: 'vitest run' });
    expect(pkg.devDependencies.eslint).toBe('^9.0.0');

    // NEXUS's instructions won the file, but Chameleon's block came back.
    const claude = await fs.readFile(path.join(projectRoot, 'CLAUDE.md'), 'utf8');
    expect(claude).toContain('# NEXUS instructions');
    expect(claude).toContain(CHAMELEON_BLOCK_START);
    expect(claude).toContain('Prefer Chameleon components.');

    // And the whole thing is on the record.
    const evidence = JSON.parse(
      await fs.readFile(path.join(projectRoot, '.nexus', 'state', 'chameleon.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(evidence.status).toBe('generated');
    expect(evidence.install).toMatchObject({ cliVersion: '2.0.0-alpha.1' });
  });

  it('falls back to NEXUS generation when Chameleon fails, without losing files', async () => {
    const exec: ChameleonExec = vi.fn(async (_bin, args) => {
      if (args.includes('--version')) {
        return {
          exitCode: 0,
          stdout: JSON.stringify({
            ok: true, command: 'version', version: '2.0.0-alpha.1',
            data: { cli: '2.0.0-alpha.1', library: '2.0.0-alpha.1' },
          }),
          stderr: '',
        };
      }
      return {
        exitCode: 1,
        stdout: JSON.stringify({
          ok: false, command: 'new', version: '2.0.0-alpha.1',
          errors: [{ code: 'DIR_NOT_EMPTY', message: 'Target directory is not empty.' }],
        }),
        stderr: '',
      };
    });

    let state = await prepareUiDelegation(config(), projectRoot, exec);
    state = await runPreWriteDelegation(state, config(), projectRoot);

    expect(state.enabled).toBe(false);
    expect(state.result?.status).toBe('failed');

    // Nothing is filtered out, so NEXUS generates the complete project itself.
    const filtered = filterChameleonOwned(nexusFiles(), state);
    expect(filtered.files).toHaveLength(5);

    await writeNexusFiles(filtered.files);
    await finishUiDelegation(filtered.state, config(), projectRoot);

    await expect(fs.readFile(path.join(projectRoot, 'src', 'App.tsx'), 'utf8'))
      .resolves.toBe('// NEXUS version\n');
  });

  it('skips delegation for a native target even when Chameleon is available', async () => {
    const exec = fakeChameleon(projectRoot);

    const state = await prepareUiDelegation(config({ projectType: 'mobile' }), projectRoot, exec);

    expect(state.enabled).toBe(false);
    expect(state.decision.reason).toContain('React Native');
    // Only the version handshake ran — `new` was never called.
    expect(exec).toHaveBeenCalledTimes(1);
  });
});

describe('preserveChameleonBlocks', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = path.join(os.tmpdir(), `nexus-preserve-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(projectRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  it('carries the block across a regeneration that rewrites the file', async () => {
    const claudePath = path.join(projectRoot, 'CLAUDE.md');
    await fs.writeFile(claudePath, `# Old\n\n${chameleonBlock}\n`, 'utf8');

    const result = await preserveChameleonBlocks(projectRoot, async () => {
      await fs.writeFile(claudePath, '# Regenerated by nexus upgrade\n', 'utf8');
      return 'done';
    });

    const after = await fs.readFile(claudePath, 'utf8');
    expect(result).toBe('done');
    expect(after).toContain('# Regenerated by nexus upgrade');
    expect(after).toContain(CHAMELEON_BLOCK_START);
  });

  it('is a no-op for projects that never used Chameleon', async () => {
    const claudePath = path.join(projectRoot, 'CLAUDE.md');
    await fs.writeFile(claudePath, '# Old\n', 'utf8');

    await preserveChameleonBlocks(projectRoot, async () => {
      await fs.writeFile(claudePath, '# Regenerated\n', 'utf8');
    });

    await expect(fs.readFile(claudePath, 'utf8')).resolves.toBe('# Regenerated\n');
  });
});
