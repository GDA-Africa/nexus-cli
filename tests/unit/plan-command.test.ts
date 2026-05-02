import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import {
  planDoneCommand,
  planNewCommand,
  planNoteCommand,
  planStartCommand,
  planTickCommand,
} from '../../src/commands/plan.js';

describe('plan command flow', () => {
  let tmpDir: string;
  let cwdSpy: MockInstance;
  let exitSpy: MockInstance;
  let logSpy: MockInstance;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-plan-command-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(path.join(tmpDir, '.nexus', 'plans'));
    await fs.ensureDir(path.join(tmpDir, '.nexus', 'docs'));
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), '# Index\n\n## ⏭️ What\'s Next\n', 'utf-8');

    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    exitSpy.mockRestore();
    logSpy.mockRestore();
    await fs.remove(tmpDir);
  });

  it('runs new -> start -> tick -> note -> done lifecycle', async () => {
    await planNewCommand('Ship M2 plans');

    const id = 'ship-m2-plans';
    const planPath = path.join(tmpDir, '.nexus', 'plans', `${id}.md`);
    expect(await fs.pathExists(planPath)).toBe(true);

    await planStartCommand(id);
    await planTickCommand(id, 1, true);
    await planNoteCommand(id, 'Implemented first vertical slice');
    await planDoneCommand(id, 'All MVP subcommands shipped');

    const finalPlan = await fs.readFile(planPath, 'utf-8');
    expect(finalPlan).toContain('status: "done"');
    expect(finalPlan).toContain('- [x] Step 1');
    expect(finalPlan).toContain('Implemented first vertical slice');
    expect(finalPlan).toContain('All MVP subcommands shipped');

    const active = await fs.readJson(path.join(tmpDir, '.nexus', 'plans', '_active.json')) as {
      active: string[];
    };
    expect(active.active).not.toContain(id);

    const plansIndex = await fs.readFile(path.join(tmpDir, '.nexus', 'plans', 'index.md'), 'utf-8');
    expect(plansIndex).toContain('ship-m2-plans');
    expect(plansIndex).toContain('✅ done');

    const projectIndex = await fs.readFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), 'utf-8');
    expect(projectIndex).toContain('Completed plan `ship-m2-plans`');
  });
});
