/**
 * v1.0 release-gate e2e (spec §13):
 *
 *   fresh project → scaffold → wake → plan new → plan start →
 *   plan tick × N → plan done → index.md Progress Log updated →
 *   sync → consolidate → doctor has no errors
 *
 * Exercises the whole Alive Brain loop against a real temp directory,
 * with no mocks around the brain files themselves.
 */

import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { runConsolidate } from '../../src/commands/consolidate.js';
import {
  planDoneCommand,
  planNewCommand,
  planStartCommand,
  planTickCommand,
} from '../../src/commands/plan.js';
import { syncCommand } from '../../src/commands/sync.js';
import { runWake } from '../../src/commands/wake.js';
import { generateAiConfig } from '../../src/generators/ai-config.js';
import { generateDocs } from '../../src/generators/docs.js';
import { DEFAULT_PERSONA, type NexusConfig } from '../../src/types/config.js';
import { writeGeneratorResult } from '../../src/utils/index.js';

const config: NexusConfig = {
  projectName: 'e2e-app',
  displayName: 'E2E App',
  projectType: 'web',
  dataStrategy: 'cloud-first',
  appPatterns: [],
  frontendFramework: 'nextjs',
  backendStrategy: 'integrated',
  backendFramework: 'none',
  testFramework: 'vitest',
  packageManager: 'npm',
  git: true,
  installDeps: false,
  persona: DEFAULT_PERSONA,
};

describe('alive brain lifecycle (v1.0 release gate)', () => {
  let projectDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-e2e-'));

    // Scaffold the v1.0 brain the way `nexus init` does (non-interactive core)
    const directories = [
      { path: '.nexus' },
      { path: '.nexus/docs' },
      { path: '.nexus/ai' },
      { path: '.nexus/plans' },
      { path: '.nexus/state' },
      { path: '.github' },
    ];
    const files = [...generateDocs(config), ...generateAiConfig(config)];
    await writeGeneratorResult(projectDir, files, directories);

    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.chdir(projectDir);
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    vi.restoreAllMocks();
    await fs.remove(projectDir);
  });

  it('scaffolds the full v1.0 layout', async () => {
    for (const expected of [
      '.nexus/docs/index.md',
      '.nexus/docs/knowledge.md',
      '.nexus/plans/_active.json',
      '.nexus/plans/index.md',
      '.nexus/state/session.json',
      'CLAUDE.md',
      'AGENTS.md',
    ]) {
      expect(await fs.pathExists(path.join(projectDir, expected)), expected).toBe(true);
    }

    // Vital Signs fences present in fresh index.md
    const index = await fs.readFile(path.join(projectDir, '.nexus/docs/index.md'), 'utf-8');
    expect(index).toContain('NEXUS:VITAL_SIGNS:START');

    // Generated AI instructions reference the wake protocol (§13)
    for (const aiFile of ['CLAUDE.md', 'AGENTS.md']) {
      const content = await fs.readFile(path.join(projectDir, aiFile), 'utf-8');
      expect(content, aiFile).toContain('Session Handshake (REQUIRED)');
      expect(content, aiFile).toContain('nexus wake');
    }

    const instructions = await fs.readFile(
      path.join(projectDir, '.nexus/ai/instructions.md'),
      'utf-8',
    );
    expect(instructions).toContain('Session Handshake (REQUIRED)');
  });

  it('wake issues a token and records the session', async () => {
    const result = await runWake(projectDir);
    expect(result?.token).toMatch(/^NX-WAKE-/);

    const session = await fs.readJson(path.join(projectDir, '.nexus/state/session.json'));
    expect(session.token).toBe(result?.token);
    expect(session.issued_by).toBe('nexus wake');
  });

  it('runs the full plan lifecycle and lands in the Progress Log', async () => {
    await planNewCommand('Ship the e2e feature', { type: 'feature' });

    const planPath = path.join(projectDir, '.nexus/plans/ship-the-e2e-feature.md');
    expect(await fs.pathExists(planPath)).toBe(true);

    await planStartCommand('ship-the-e2e-feature');
    const active = await fs.readJson(path.join(projectDir, '.nexus/plans/_active.json'));
    expect(active.active).toContain('ship-the-e2e-feature');

    // Tick a few steps
    await planTickCommand('ship-the-e2e-feature', 1);
    await planTickCommand('ship-the-e2e-feature', 2);
    const ticked = await fs.readFile(planPath, 'utf-8');
    expect(ticked).toContain('[x]');

    await planDoneCommand('ship-the-e2e-feature', 'All steps verified in e2e.');

    const donePlan = await fs.readFile(planPath, 'utf-8');
    expect(donePlan).toContain('status: "done"');

    const activeAfter = await fs.readJson(path.join(projectDir, '.nexus/plans/_active.json'));
    expect(activeAfter.active).not.toContain('ship-the-e2e-feature');

    // §13: index.md Progress Log updated
    const index = await fs.readFile(path.join(projectDir, '.nexus/docs/index.md'), 'utf-8');
    expect(index).toContain('Completed plan `ship-the-e2e-feature`');
  });

  it('sync fills the Vital Signs block', async () => {
    await syncCommand(projectDir, {});
    const index = await fs.readFile(path.join(projectDir, '.nexus/docs/index.md'), 'utf-8');
    expect(index).toContain('## 🩺 Vital Signs (auto)');
    expect(index).not.toContain('_Last sync: not yet synced_');
  });

  it('consolidate rolls knowledge.md into a summary', async () => {
    await fs.appendFile(
      path.join(projectDir, '.nexus/docs/knowledge.md'),
      '\n### [pattern] E2E Insight\n**2026-06-09** — The lifecycle holds together end to end.\n',
      'utf-8',
    );

    await runConsolidate(projectDir, {});

    const summary = await fs.readFile(
      path.join(projectDir, '.nexus/docs/knowledge-summary.md'),
      'utf-8',
    );
    expect(summary).toContain('E2E Insight');
    expect(summary).toContain('status: auto');
  });

  it('doctor exits clean on the fresh project — no errors, no warnings', async () => {
    const { buildDoctorContext } = await import('../../src/utils/doctor/context.js');
    const { runDoctor } = await import('../../src/utils/doctor/index.js');

    const ctx = await buildDoctorContext(projectDir, path.join(projectDir, '.nexus'));
    const report = await runDoctor(ctx, { minSeverity: 'info' });

    // B1: this used to tolerate D08 firing warn on every run — nothing wrote
    // .nexus/state/last-sync.json, so vitalSigns was always null and doctor
    // could never actually reach exit 0. `sync fills the Vital Signs block`
    // above already ran `nexus sync`, which now persists that snapshot.
    expect(report.summary.error).toBe(0);
    expect(report.summary.warn, JSON.stringify(report.findings, null, 2)).toBe(0);
  });
});
