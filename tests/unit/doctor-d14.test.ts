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

describe('D14 — project-total orientation check', () => {
  let tmpDir: string;
  let ctx: DoctorContext;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-d14-total-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(path.join(tmpDir, '.nexus', 'docs'), { recursive: true });
    ctx = { cwd: tmpDir, vitalSigns: null, plans: [], activePlans: null };
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const writeInstruction = (file: string, bytes: number, marker: 'full' | 'none') =>
    fs.writeFile(
      path.join(tmpDir, file),
      `${'x'.repeat(Math.max(0, bytes - marker.length - 20))}\n<!--nexus-reads:${marker === 'full' ? '.nexus/docs/index.md,.nexus/docs/knowledge.md' : 'none'}-->\n`,
    );

  const writeHarnesses = (yaml: string) => fs.writeFile(path.join(tmpDir, '.nexus', 'harnesses.yml'), yaml);

  it('is silent absent harnesses.yml when the instruction file plus its brain files fit the default budget', async () => {
    await writeInstruction('CLAUDE.md', 2 * 1024, 'full');
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), 'x'.repeat(1024));
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'knowledge.md'), 'x'.repeat(1024));

    const findings = await D14_context_load.run(ctx);
    expect(findings.filter((f) => f.description.startsWith('Project-total'))).toEqual([]);
  });

  it('fires as info (not warn) absent harnesses.yml, even over the default budget', async () => {
    // Reproduces the measured real-world shape from nexus-harness-work.md §1:
    // a small instruction file, but the two brain files it points at are large.
    // DEFAULT_ORIENTATION_BUDGET is a sensible fallback for *measurement*,
    // not a budget the user declared — a fresh, unconfigured project must
    // never fail its exit code over a number it never opted into. A real
    // scaffold lands here too (~16.1-16.2 KB against the 16 KB default),
    // which is exactly why this must stay info: zero warns on a fresh project.
    await writeInstruction('CLAUDE.md', 2 * 1024, 'full');
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), 'x'.repeat(12 * 1024));
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'knowledge.md'), 'x'.repeat(12 * 1024));

    const findings = await D14_context_load.run(ctx);
    const total = findings.find((f) => f.description.startsWith('Project-total'));
    expect(total).toBeDefined();
    expect(total?.severity).toBe('info');
    expect(total?.description).toContain('CLAUDE.md');
    expect(total?.description).toContain('index.md');
    expect(total?.description).toContain('knowledge.md');
  });

  it('stays info absent harnesses.yml even under --strict — strict only escalates a declared budget', async () => {
    await writeInstruction('CLAUDE.md', 2 * 1024, 'full');
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), 'x'.repeat(12 * 1024));
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'knowledge.md'), 'x'.repeat(12 * 1024));

    const findings = await D14_context_load.run({ ...ctx, strict: true });
    const total = findings.find((f) => f.description.startsWith('Project-total'));
    expect(total?.severity).toBe('info');
  });

  it('does NOT sum in brain files when the instruction file structurally does not point at them', async () => {
    // A native-pointer or static-fallback file — reads:none — is
    // self-contained even if knowledge.md happens to be huge.
    await writeInstruction('CLAUDE.md', 500, 'none');
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), 'x'.repeat(50 * 1024));
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'knowledge.md'), 'x'.repeat(50 * 1024));

    const findings = await D14_context_load.run(ctx);
    expect(findings.filter((f) => f.description.startsWith('Project-total'))).toEqual([]);
  });

  it('uses a configured harness\'s own orientation_budget, not the default, when harnesses.yml is present', async () => {
    await writeHarnesses(`
default: claude-code
harnesses:
  claude-code: { window: 4096, orientation_budget: 1500, tool_calling: native }
`);
    // Comfortably under the 16 KB default, but over this harness's 1500-byte budget.
    await writeInstruction('CLAUDE.md', 2 * 1024, 'full');
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), 'x'.repeat(200));
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'knowledge.md'), 'x'.repeat(200));

    const findings = await D14_context_load.run(ctx);
    const total = findings.find((f) => f.description.startsWith('Project-total'));
    expect(total).toBeDefined();
    expect(total?.description).toContain('claude-code');
    expect(total?.fixHint).toContain('harnesses.yml');
  });

  it('passes for a harness correctly sized to its own budget — the local-model success case', async () => {
    // The DoD scenario: a small native-pointer file, well inside a tight
    // local-model budget, with huge brain files it structurally never reads.
    await writeHarnesses(`
default: ollama-local
harnesses:
  ollama-local: { window: 4096, orientation_budget: 1500, tool_calling: unreliable, file: CLAUDE.md }
`);
    await writeInstruction('CLAUDE.md', 400, 'none');
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), 'x'.repeat(28 * 1024));
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'knowledge.md'), 'x'.repeat(27 * 1024));

    const findings = await D14_context_load.run(ctx);
    expect(findings.filter((f) => f.description.startsWith('Project-total'))).toEqual([]);
  });

  it('warns (not error) when a declared budget is exceeded, without --strict', async () => {
    await writeHarnesses(`
default: claude-code
harnesses:
  claude-code: { window: 4096, orientation_budget: 1500, tool_calling: native }
`);
    await writeInstruction('CLAUDE.md', 2 * 1024, 'full');
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), 'x'.repeat(200));
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'knowledge.md'), 'x'.repeat(200));

    const findings = await D14_context_load.run(ctx);
    const total = findings.find((f) => f.description.startsWith('Project-total'));
    expect(total?.severity).toBe('warn');
  });

  it('escalates to error under --strict when the exceeded budget was declared', async () => {
    await writeHarnesses(`
default: claude-code
harnesses:
  claude-code: { window: 4096, orientation_budget: 1500, tool_calling: native }
`);
    await writeInstruction('CLAUDE.md', 2 * 1024, 'full');
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), 'x'.repeat(200));
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'knowledge.md'), 'x'.repeat(200));

    const findings = await D14_context_load.run({ ...ctx, strict: true });
    const total = findings.find((f) => f.description.startsWith('Project-total'));
    expect(total?.severity).toBe('error');
  });

  it('skips a declared harness with no generated file of its own, without crashing', async () => {
    await writeHarnesses(`
default: ollama-local
harnesses:
  ollama-local: { window: 4096, orientation_budget: 1500, tool_calling: unreliable }
`);
    // No file override and "ollama-local" is not in the canonical map — this
    // harness has nothing on disk to measure.
    await expect(D14_context_load.run(ctx)).resolves.toEqual([]);
  });

  it('reports a malformed harnesses.yml as its own error finding rather than throwing', async () => {
    await writeHarnesses('default: missing\nharnesses: {}\n');
    await writeInstruction('CLAUDE.md', 500, 'none');

    const findings = await D14_context_load.run(ctx);
    const configError = findings.find((f) => f.description.includes('harnesses.yml is invalid'));
    expect(configError).toBeDefined();
    expect(configError?.severity).toBe('error');
  });
});
