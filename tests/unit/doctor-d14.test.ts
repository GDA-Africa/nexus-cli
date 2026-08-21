import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { D14_context_load } from '../../src/utils/doctor/checks/D14.js';
import type { DoctorContext } from '../../src/utils/doctor/types.js';

describe('D14 — context load', () => {
  let tmpDir: string;
  let ctx: DoctorContext;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-d14-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(path.join(tmpDir, '.github'), { recursive: true });
    ctx = { cwd: tmpDir, vitalSigns: null, plans: [], activePlans: null };
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const write = (file: string, bytes: number) =>
    fs.writeFile(path.join(tmpDir, file), 'x'.repeat(bytes));

  it('is silent when no instruction file exists', async () => {
    expect(await D14_context_load.run(ctx)).toEqual([]);
  });

  it('is silent for a file inside the budget', async () => {
    await write('CLAUDE.md', 8 * 1024);
    expect(await D14_context_load.run(ctx)).toEqual([]);
  });

  it('warns when a file exceeds the 10 KB budget', async () => {
    await write('CLAUDE.md', 13 * 1024);
    const findings = await D14_context_load.run(ctx);
    const budget = findings.filter((f) => f.severity === 'warn');
    expect(budget).toHaveLength(1);
    expect(budget[0]?.description).toContain('CLAUDE.md');
  });

  it('escalates to error under --strict', async () => {
    await write('CLAUDE.md', 13 * 1024);
    const findings = await D14_context_load.run({ ...ctx, strict: true });
    expect(findings.find((f) => f.description.includes('budget'))?.severity).toBe('error');
  });

  it('errors past 16 KB even without --strict — that is unmaintainable, not just large', async () => {
    await write('CLAUDE.md', 20 * 1024);
    const findings = await D14_context_load.run(ctx);
    expect(findings.find((f) => f.description.includes('budget'))?.severity).toBe('error');
  });

  it('measures per file, not per project — six files under budget stay silent', async () => {
    // Six harnesses load six different files; a session pays for one, not the
    // sum. Summing to 48 KB here would report a cost no agent ever pays.
    for (const f of ['CLAUDE.md', 'AGENTS.md', '.cursorrules', '.windsurfrules', '.clinerules']) {
      await write(f, 8 * 1024);
    }
    await write(path.join('.github', 'copilot-instructions.md'), 8 * 1024);
    expect(await D14_context_load.run(ctx).then((f) => f.filter((x) => x.severity !== 'info'))).toEqual([]);
  });

  it('reports near-identical files as info', async () => {
    await write('CLAUDE.md', 8 * 1024);
    await write('.cursorrules', 8 * 1024 + 20);
    const info = (await D14_context_load.run(ctx)).filter((f) => f.severity === 'info');
    expect(info).toHaveLength(1);
    expect(info[0]?.description).toContain('near-identical');
  });

  it('does not report files of genuinely different sizes as duplicates', async () => {
    await write('CLAUDE.md', 8 * 1024);
    await write('.cursorrules', 1 * 1024);
    expect((await D14_context_load.run(ctx)).filter((f) => f.severity === 'info')).toEqual([]);
  });
});
