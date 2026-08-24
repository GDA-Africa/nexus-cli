/**
 * NEXUS CLI — Doctor command / runDoctor unit tests (P1 shipped-bug fixes)
 *
 * Covers:
 *   - B2: `--severity` filters display only; the summary reflects every
 *     finding, so it can never silently zero out the exit code.
 *   - B6: D07 and D11 double-report a `done` plan with no Evidence; the
 *     combined report keeps only D07's finding, while each check's own
 *     isolated `.run()` verdict is unchanged.
 *   - B3: `doctor --fix` recomputes after fixing, so a successful fix
 *     actually clears the exit code instead of reporting stale findings.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runDoctorCommand } from '../../src/commands/doctor.js';
import { D07_plan_orphan } from '../../src/utils/doctor/checks/D07.js';
import { D11_unverified_done } from '../../src/utils/doctor/checks/D11.js';
import { buildDoctorContext } from '../../src/utils/doctor/context.js';
import { runDoctor } from '../../src/utils/doctor/index.js';
import type { DoctorContext } from '../../src/utils/doctor/types.js';

const execaMock = vi.hoisted(() => vi.fn());
vi.mock('execa', () => ({ execa: execaMock }));

describe('runDoctor — B2: summary reflects unfiltered findings', () => {
  const dummyCtx: DoctorContext = { cwd: '/fake/cwd', vitalSigns: null, plans: [], activePlans: null };

  it('does not let --severity zero out the summary it filtered from', async () => {
    const infoCheck = {
      id: 'DX1',
      name: 'x',
      description: 'x',
      run: async () => [{ id: 'DX1', severity: 'info' as const, description: 'an info finding' }],
    };
    const warnCheck = {
      id: 'DX2',
      name: 'x',
      description: 'x',
      run: async () => [{ id: 'DX2', severity: 'warn' as const, description: 'a warning' }],
    };

    const report = await runDoctor(dummyCtx, { checks: [infoCheck, warnCheck], minSeverity: 'error' });

    // Old bug: findings were filtered to minSeverity BEFORE the summary was
    // computed, so `--severity error` made the warning vanish from the
    // counts along with the display — silently forcing a green exit code.
    expect(report.findings).toHaveLength(0);
    expect(report.summary.warn).toBe(1);
    expect(report.summary.info).toBe(1);
    expect(report.summary.error).toBe(0);
  });
});

describe('runDoctor — B6: D07/D11 dedupe one fault on the same plan', () => {
  let tmpDir: string;
  let nexusDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-b6-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    nexusDir = path.join(tmpDir, '.nexus');
    await fs.mkdir(path.join(nexusDir, 'plans'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'docs'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'state'), { recursive: true });
  });

  afterEach(async () => fs.rm(tmpDir, { recursive: true, force: true }));

  async function writePlan(evidence: string): Promise<void> {
    await fs.writeFile(
      path.join(nexusDir, 'plans', 'p1.md'),
      ['---', 'nexus_plan: true', 'id: "p1"', 'title: "Plan One"', 'status: "done"', '---', '', '## Evidence', evidence, ''].join(
        '\n',
      ),
    );
  }

  it('reports a plan with empty Evidence once, from D07, not from both', async () => {
    await writePlan('');

    const ctx = await buildDoctorContext(tmpDir, nexusDir);
    const combined = await runDoctor(ctx, { checks: [D07_plan_orphan, D11_unverified_done] });

    const forThisPlan = combined.findings.filter((f) => f.planId === 'p1');
    expect(forThisPlan).toHaveLength(1);
    expect(forThisPlan[0]?.id).toBe('D07');

    // Each check's own isolated verdict is untouched — the dedupe lives in
    // the combined report, not in D11's own logic.
    expect(await D11_unverified_done.run(ctx)).toHaveLength(1);
    expect(await D07_plan_orphan.run(ctx)).toHaveLength(1);
  });

  it('still lets D11 fire alone when D07 does not flag the plan', async () => {
    // Evidence section is non-empty (so D07 is satisfied) but carries no
    // verification signal or waiver (so D11 still has a real fault to report).
    await writePlan('- some notes, nothing verified yet');

    const ctx = await buildDoctorContext(tmpDir, nexusDir);
    const combined = await runDoctor(ctx, { checks: [D07_plan_orphan, D11_unverified_done] });

    expect(combined.findings.filter((f) => f.id === 'D07')).toHaveLength(0);
    expect(combined.findings.filter((f) => f.id === 'D11')).toHaveLength(1);
  });
});

describe('runDoctorCommand — B3: exit code reflects post-fix state', () => {
  let tmpDir: string;
  let nexusDir: string;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-b3-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    nexusDir = path.join(tmpDir, '.nexus');
    await fs.mkdir(path.join(nexusDir, 'docs'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'plans'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'state'), { recursive: true });

    await fs.writeFile(
      path.join(nexusDir, 'docs', 'index.md'),
      ['# Index', '<!-- NEXUS:VITAL_SIGNS:START -->', 'placeholder', '<!-- NEXUS:VITAL_SIGNS:END -->', ''].join('\n'),
    );
    await fs.writeFile(path.join(nexusDir, 'docs', 'knowledge.md'), '# Knowledge\n');

    execaMock.mockReset();
    execaMock.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('exits non-zero on a fresh project — no snapshot yet, D08 warns (B1 precondition)', async () => {
    const { exitCode, report } = await runDoctorCommand(tmpDir, nexusDir, { json: true });

    expect(exitCode).toBe(1);
    expect(report.findings.some((f) => f.id === 'D08')).toBe(true);
  });

  it('exits 0 after --fix runs sync and the D08 warning actually clears', async () => {
    // Old bug: --fix ran `nexus sync` but the exit code was already computed
    // from the pre-fix report, so a successful fix still exited 1.
    const { exitCode, report } = await runDoctorCommand(tmpDir, nexusDir, { json: true, fix: true });

    expect(exitCode).toBe(0);
    expect(report.findings.some((f) => f.id === 'D08')).toBe(false);
    expect(await fs.stat(path.join(nexusDir, 'state', 'last-sync.json')).then(
      () => true,
      () => false,
    )).toBe(true);
  });

  it('persists the post-fix report, not the stale pre-fix one', async () => {
    await runDoctorCommand(tmpDir, nexusDir, { json: true, fix: true });

    const persisted = JSON.parse(await fs.readFile(path.join(nexusDir, 'state', 'doctor.json'), 'utf8'));
    expect(persisted.summary.warn).toBe(0);
  });
});
