import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CHAMELEON_BLOCK_END, CHAMELEON_BLOCK_START } from '../../src/utils/chameleon/agent-block.js';
import { D12_chameleon_block_lost } from '../../src/utils/doctor/checks/D12.js';
import type { DoctorContext } from '../../src/utils/doctor/types.js';

const block = `${CHAMELEON_BLOCK_START}\n## Chameleon UI\n${CHAMELEON_BLOCK_END}`;

describe('D12 — Chameleon agent block', () => {
  let tmpDir: string;
  let ctx: DoctorContext;
  let originalConfigHome: string | undefined;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-d12-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(path.join(tmpDir, '.nexus'), { recursive: true });

    // Keep the global config out of the way so only the project config counts.
    originalConfigHome = process.env.NEXUS_CONFIG_HOME;
    process.env.NEXUS_CONFIG_HOME = path.join(tmpDir, 'global');

    ctx = { cwd: tmpDir, vitalSigns: null, plans: [], activePlans: null };
  });

  afterEach(async () => {
    if (originalConfigHome === undefined) {
      delete process.env.NEXUS_CONFIG_HOME;
    } else {
      process.env.NEXUS_CONFIG_HOME = originalConfigHome;
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const useChameleon = async (): Promise<void> => {
    await fs.writeFile(path.join(tmpDir, '.nexus', 'config.json'), JSON.stringify({ ui: 'chameleon' }), 'utf8');
  };

  it('flags partial loss even with no NEXUS-side preference set', async () => {
    // The block is written by Chameleon, so a project can be using Chameleon
    // without NEXUS holding a `ui` preference. Partial loss is self-evident.
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# NEXUS\n', 'utf8');
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), `# NEXUS\n\n${block}\n`, 'utf8');

    const findings = await D12_chameleon_block_lost.run(ctx);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.description).toContain('CLAUDE.md');
  });

  it('says nothing for a project with no Chameleon involvement at all', async () => {
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# NEXUS\n', 'utf8');
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# NEXUS\n', 'utf8');

    expect(await D12_chameleon_block_lost.run(ctx)).toEqual([]);
  });

  it('flags total loss when the preference says Chameleon', async () => {
    await useChameleon();
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# NEXUS\n', 'utf8');
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# NEXUS\n', 'utf8');

    const findings = await D12_chameleon_block_lost.run(ctx);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.description).toContain('no Chameleon guidance');
  });

  it('flags total loss on generation evidence alone, whatever the config now says', async () => {
    await fs.mkdir(path.join(tmpDir, '.nexus', 'state'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.nexus', 'state', 'chameleon.json'),
      JSON.stringify({ status: 'generated' }),
      'utf8',
    );
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# NEXUS\n', 'utf8');

    expect(await D12_chameleon_block_lost.run(ctx)).toHaveLength(1);
  });

  it('does not fire on a skipped generation record', async () => {
    await fs.mkdir(path.join(tmpDir, '.nexus', 'state'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.nexus', 'state', 'chameleon.json'),
      JSON.stringify({ status: 'skipped' }),
      'utf8',
    );
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# NEXUS\n', 'utf8');

    expect(await D12_chameleon_block_lost.run(ctx)).toEqual([]);
  });

  it('says nothing when every agent file has the block', async () => {
    await useChameleon();
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), `# NEXUS\n\n${block}\n`, 'utf8');
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), `# NEXUS\n\n${block}\n`, 'utf8');

    expect(await D12_chameleon_block_lost.run(ctx)).toEqual([]);
  });

  it('warns when regeneration dropped the block from one file', async () => {
    await useChameleon();
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Freshly regenerated\n', 'utf8');
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), `# NEXUS\n\n${block}\n`, 'utf8');

    const findings = await D12_chameleon_block_lost.run(ctx);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ id: 'D12', severity: 'warn' });
    expect(findings[0]?.description).toContain('CLAUDE.md');
    expect(findings[0]?.fixHint).toContain('chameleon agents init');
  });
});
