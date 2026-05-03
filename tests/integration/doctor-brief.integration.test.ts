import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildBriefData, renderBriefPretty } from '../../src/commands/brief.js';
import { buildDoctorContext } from '../../src/utils/doctor/context.js';
import { runDoctor } from '../../src/utils/doctor/index.js';

describe('doctor + brief integration', () => {
  let tmpDir: string;
  let nexusDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-doctor-brief-int-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    nexusDir = path.join(tmpDir, '.nexus');

    await fs.mkdir(path.join(nexusDir, 'docs'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'plans'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'state'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'skills'), { recursive: true });

    await fs.writeFile(
      path.join(nexusDir, 'docs', 'index.md'),
      [
        '# Index',
        '<!-- NEXUS:VITAL_SIGNS:START -->',
        'healthy block',
        '<!-- NEXUS:VITAL_SIGNS:END -->',
        '## ✅ Progress Log',
        '- 2026-05-02 — ✅ Completed plan `done-plan`: Done Plan',
      ].join('\n'),
      'utf8',
    );

    await fs.writeFile(path.join(nexusDir, 'docs', 'knowledge.md'), '# Knowledge\n', 'utf8');

    await fs.writeFile(
      path.join(nexusDir, 'plans', 'active-plan.md'),
      [
        '---',
        'id: "active-plan"',
        'title: "Active Plan"',
        'status: "in_progress"',
        'updated: "2026-05-02"',
        '---',
        '',
        '## Steps',
        '- [ ] step',
      ].join('\n'),
      'utf8',
    );

    await fs.writeFile(
      path.join(nexusDir, 'plans', 'done-plan.md'),
      [
        '---',
        'id: "done-plan"',
        'title: "Done Plan"',
        'status: "done"',
        'updated: "2026-05-02"',
        '---',
        '',
        '## Evidence',
        '- tests passed',
      ].join('\n'),
      'utf8',
    );

    await fs.writeFile(
      path.join(nexusDir, 'state', 'last-sync.json'),
      JSON.stringify({ capturedAt: new Date().toISOString() }),
      'utf8',
    );

    await fs.writeFile(
      path.join(nexusDir, 'state', 'session.json'),
      JSON.stringify({ token: 'NX-WAKE-TEST' }),
      'utf8',
    );

    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { '@nexus-framework/skills': '^0.1.1' } }),
      'utf8',
    );

    await fs.writeFile(
      path.join(nexusDir, 'skills', 'README.md'),
      'Sourced from `@nexus-framework/skills@0.1.1`.',
      'utf8',
    );
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('produces doctor report and brief digest from the same repo state', async () => {
    const ctx = await buildDoctorContext(tmpDir, nexusDir);
    const doctorReport = await runDoctor(ctx, { minSeverity: 'info' });

    const brief = await buildBriefData(tmpDir, nexusDir, '7 days ago');
    const rendered = renderBriefPretty(brief);

    expect(doctorReport.summary.error).toBe(0);
    expect(brief.plans.length).toBe(2);
    expect(rendered).toContain('Nexus Brief');
    expect(rendered).toContain('Active plans');
  });
});
