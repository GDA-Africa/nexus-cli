import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChameleonInstall } from '../../src/types/chameleon.js';
import type { NexusConfig } from '../../src/types/config.js';
import { DEFAULT_PERSONA } from '../../src/types/config.js';
import {
  CHAMELEON_BLOCK_END,
  CHAMELEON_BLOCK_START,
  applyChameleonBlock,
  captureChameleonBlocks,
  extractChameleonBlock,
  includeChameleonFragment,
  restoreChameleonBlocks,
} from '../../src/utils/chameleon/agent-block.js';
import {
  delegateToChameleon,
  isChameleonOwned,
  mergePackageJson,
  planChameleonDelegation,
  writeChameleonEvidence,
} from '../../src/utils/chameleon/delegate.js';
import type { ChameleonExec } from '../../src/utils/chameleon/runner.js';
import { chameleonSupport } from '../../src/utils/chameleon/support.js';

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
  git: true,
  installDeps: false,
  persona: DEFAULT_PERSONA,
  ...overrides,
});

const install = (overrides: Partial<ChameleonInstall> = {}): ChameleonInstall => ({
  available: true,
  cliVersion: '2.0.0-alpha.1',
  libraryVersion: '2.0.0-alpha.1',
  capabilities: ['appspec-v2', 'validate-only', 'json-envelope'],
  resolvedFrom: 'local',
  ...overrides,
});

describe('chameleonSupport', () => {
  it('routes React + Vite through `chameleon new`', () => {
    expect(chameleonSupport(config())).toMatchObject({ supported: true, path: 'new' });
  });

  it('routes Next.js through `chameleon init` into a NEXUS skeleton', () => {
    expect(chameleonSupport(config({ frontendFramework: 'nextjs' })))
      .toMatchObject({ supported: true, path: 'init' });
  });

  it('supports a component library with no app framework', () => {
    expect(chameleonSupport(config({ frontendFramework: 'none', projectType: 'ui-library' })))
      .toMatchObject({ supported: true, path: 'init' });
  });

  it('refuses native targets regardless of framework', () => {
    const support = chameleonSupport(config({ projectType: 'mobile' }));

    expect(support.supported).toBe(false);
    expect(support.reason).toContain('React Native');
  });

  it('refuses non-React frameworks', () => {
    expect(chameleonSupport(config({ frontendFramework: 'sveltekit' })).supported).toBe(false);
  });

  it('refuses a project with no UI at all', () => {
    expect(chameleonSupport(config({ frontendFramework: 'none', projectType: 'api' })).supported).toBe(false);
  });
});

describe('planChameleonDelegation', () => {
  it('runs path A when Chameleon supports AppSpec v2', () => {
    expect(planChameleonDelegation(config(), install())).toMatchObject({ run: true, path: 'new' });
  });

  it('skips with a reason when Chameleon is absent', () => {
    const decision = planChameleonDelegation(
      config(),
      { available: false, capabilities: [], reason: 'not installed' },
    );

    expect(decision).toEqual({ run: false, reason: 'not installed' });
  });

  it('skips path B until `chameleon init` is framework-aware', () => {
    const decision = planChameleonDelegation(config({ frontendFramework: 'nextjs' }), install());

    expect(decision.run).toBe(false);
    expect(decision.reason).toContain('CH-05');
  });

  it('runs path B once the capability is advertised', () => {
    const decision = planChameleonDelegation(
      config({ frontendFramework: 'nextjs' }),
      install({ capabilities: ['appspec-v2', 'init-framework-aware'] }),
    );

    expect(decision).toMatchObject({ run: true, path: 'init' });
  });

  it('never runs for a native target, even with everything available', () => {
    const decision = planChameleonDelegation(
      config({ projectType: 'mobile' }),
      install({ capabilities: ['appspec-v2', 'init-framework-aware'] }),
    );

    expect(decision.run).toBe(false);
  });
});

describe('delegateToChameleon', () => {
  let tmpDir: string;
  let projectRoot: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-delegate-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tmpDir, { recursive: true });
    projectRoot = path.join(tmpDir, 'bakery-crm');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('validates before generating, and reports both envelopes', async () => {
    const calls: string[][] = [];
    const exec: ChameleonExec = vi.fn(async (_bin, args) => {
      calls.push(args);
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          ok: true,
          command: 'new',
          version: '2.0.0-alpha.1',
          filesWritten: ['bakery-crm/package.json', 'bakery-crm/src/App.tsx'],
          warnings: [],
        }),
        stderr: '',
      };
    });

    const result = await delegateToChameleon({ config: config(), projectRoot, install: install(), exec });

    expect(result.status).toBe('generated');
    expect(result.envelopes).toHaveLength(2);
    expect(calls[0]).toContain('--validate-only');
    expect(calls[1]).not.toContain('--validate-only');
    expect(result.filesWritten).toContain('bakery-crm/src/App.tsx');
  });

  it('does not generate when validation fails', async () => {
    const exec: ChameleonExec = vi.fn(async () => ({
      exitCode: 1,
      stdout: JSON.stringify({
        ok: false,
        command: 'new',
        version: '2.0.0-alpha.1',
        errors: [{
          code: 'INVALID_APP_SPEC',
          message: '1 error(s).',
          validationErrors: [{ path: '$.pages[0].spec.template', message: "Unknown template: 'x'." }],
        }],
      }),
      stderr: '',
    }));

    const result = await delegateToChameleon({ config: config(), projectRoot, install: install(), exec });

    expect(result.status).toBe('failed');
    expect(exec).toHaveBeenCalledTimes(1);
    expect(result.reason).toContain('INVALID_APP_SPEC');
    expect(result.reason).toContain('$.pages[0].spec.template');
  });

  it('cleans up the temporary spec file', async () => {
    let specPath: string | undefined;
    const exec: ChameleonExec = vi.fn(async (_bin, args) => {
      specPath = args[args.indexOf('--app-spec') + 1];
      return {
        exitCode: 0,
        stdout: JSON.stringify({ ok: true, command: 'new', version: '2.0.0-alpha.1' }),
        stderr: '',
      };
    });

    await delegateToChameleon({ config: config(), projectRoot, install: install(), exec });

    expect(specPath).toBeTruthy();
    await expect(fs.access(specPath!)).rejects.toThrow();
  });

  it('skips without calling Chameleon when the target is unsupported', async () => {
    const exec: ChameleonExec = vi.fn();

    const result = await delegateToChameleon({
      config: config({ projectType: 'mobile' }), projectRoot, install: install(), exec,
    });

    expect(result.status).toBe('skipped');
    expect(exec).not.toHaveBeenCalled();
  });

  it('records evidence, spec included', async () => {
    const exec: ChameleonExec = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true, command: 'new', version: '2.0.0-alpha.1', filesWritten: ['a.ts'],
      }),
      stderr: '',
    }));

    const result = await delegateToChameleon({ config: config(), projectRoot, install: install(), exec });
    await fs.mkdir(projectRoot, { recursive: true });
    await writeChameleonEvidence(projectRoot, result, install());

    const raw = await fs.readFile(path.join(projectRoot, '.nexus', 'state', 'chameleon.json'), 'utf8');
    const evidence = JSON.parse(raw) as Record<string, unknown>;

    expect(evidence.status).toBe('generated');
    expect(evidence.appSpec).toMatchObject({ version: 2 });
    expect(evidence.envelopes).toHaveLength(2);
  });
});

describe('overlay helpers', () => {
  it('knows which files Chameleon owns', () => {
    expect(isChameleonOwned('package.json')).toBe(true);
    expect(isChameleonOwned('src/App.tsx')).toBe(true);
    expect(isChameleonOwned('.nexus/docs/index.md')).toBe(false);
    expect(isChameleonOwned('eslint.config.js')).toBe(false);
  });

  it('merges NEXUS tooling in without overriding Chameleon', () => {
    const chameleonPkg = JSON.stringify({
      name: 'bakery-crm',
      scripts: { dev: 'vite', lint: 'eslint .' },
      dependencies: { react: '^18.3.1' },
      devDependencies: { typescript: '^5.6.0' },
    });
    const nexusPkg = JSON.stringify({
      name: 'nexus-version',
      scripts: { dev: 'next dev', test: 'vitest' },
      devDependencies: { typescript: '^5.4.0', eslint: '^9.0.0', vitest: '^3.0.0' },
    });

    const merged = JSON.parse(mergePackageJson(chameleonPkg, nexusPkg)) as {
      name: string;
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(merged.name).toBe('bakery-crm');
    expect(merged.scripts.dev).toBe('vite');
    expect(merged.scripts.test).toBe('vitest');
    // The point of the merge: `lint: "eslint ."` ships with no eslint,
    // so NEXUS supplies the dependency that makes the script runnable.
    expect(merged.devDependencies.eslint).toBe('^9.0.0');
    expect(merged.devDependencies.typescript).toBe('^5.6.0');
  });
});

describe('agent block preservation', () => {
  let projectRoot: string;

  const block = `${CHAMELEON_BLOCK_START}\n## Chameleon UI (v2.0.0)\nUse chameleon components.\n${CHAMELEON_BLOCK_END}`;

  beforeEach(async () => {
    projectRoot = path.join(os.tmpdir(), `nexus-agent-block-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(projectRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  it('extracts and re-applies a block', () => {
    const content = `# CLAUDE.md\n\n${block}\n`;

    expect(extractChameleonBlock(content)).toBe(block);
    expect(extractChameleonBlock('# CLAUDE.md')).toBeNull();

    const refreshed = block.replace('v2.0.0', 'v2.1.0');
    expect(applyChameleonBlock(content, refreshed)).toContain('v2.1.0');
    expect(applyChameleonBlock(content, refreshed)).not.toContain('v2.0.0');
  });

  it('appends when there is no block yet, without stacking copies', () => {
    const once = applyChameleonBlock('# CLAUDE.md', block);
    const twice = applyChameleonBlock(once, block);

    expect(twice.match(new RegExp(CHAMELEON_BLOCK_START, 'g'))).toHaveLength(1);
  });

  it('survives a NEXUS regeneration that rewrites the file', async () => {
    const claudePath = path.join(projectRoot, 'CLAUDE.md');
    await fs.writeFile(claudePath, `# Old NEXUS instructions\n\n${block}\n`, 'utf8');

    const captured = await captureChameleonBlocks(projectRoot);
    expect(captured.get('CLAUDE.md')).toBe(block);

    // NEXUS regenerates CLAUDE.md wholesale — the block is gone.
    await fs.writeFile(claudePath, '# Fresh NEXUS instructions\n', 'utf8');

    const restored = await restoreChameleonBlocks(projectRoot, captured);
    const after = await fs.readFile(claudePath, 'utf8');

    expect(restored).toEqual(['CLAUDE.md']);
    expect(after).toContain('# Fresh NEXUS instructions');
    expect(after).toContain(CHAMELEON_BLOCK_START);
  });

  it('leaves a file alone when the block was never removed', async () => {
    const claudePath = path.join(projectRoot, 'CLAUDE.md');
    await fs.writeFile(claudePath, `# NEXUS\n\n${block}\n`, 'utf8');

    const captured = await captureChameleonBlocks(projectRoot);
    const restored = await restoreChameleonBlocks(projectRoot, captured);

    expect(restored).toEqual([]);
    const after = await fs.readFile(claudePath, 'utf8');
    expect(after.match(new RegExp(CHAMELEON_BLOCK_START, 'g'))).toHaveLength(1);
  });

  it('splices a chameleon.agent.md fragment into the files NEXUS owns', async () => {
    await fs.writeFile(path.join(projectRoot, 'CLAUDE.md'), '# NEXUS\n', 'utf8');
    await fs.writeFile(path.join(projectRoot, 'AGENTS.md'), '# NEXUS\n', 'utf8');
    await fs.writeFile(
      path.join(projectRoot, 'chameleon.agent.md'),
      '## Chameleon UI — instructions for AI agents\n',
      'utf8',
    );

    const updated = await includeChameleonFragment(projectRoot);
    const claude = await fs.readFile(path.join(projectRoot, 'CLAUDE.md'), 'utf8');

    expect(updated).toEqual(['CLAUDE.md', 'AGENTS.md']);
    expect(claude).toContain(CHAMELEON_BLOCK_START);
    expect(claude).toContain('instructions for AI agents');
  });

  it('is a no-op when there is no fragment', async () => {
    await fs.writeFile(path.join(projectRoot, 'CLAUDE.md'), '# NEXUS\n', 'utf8');

    expect(await includeChameleonFragment(projectRoot)).toEqual([]);
  });
});
