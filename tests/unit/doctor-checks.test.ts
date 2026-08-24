import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { D01_frontmatter_status_drift } from '../../src/utils/doctor/checks/D01.js';
import { D02_stale_phase } from '../../src/utils/doctor/checks/D02.js';
import { D03_progress_log_gap } from '../../src/utils/doctor/checks/D03.js';
import { D04_knowledge_bloat } from '../../src/utils/doctor/checks/D04.js';
import { D05_stale_knowledge_references } from '../../src/utils/doctor/checks/D05.js';
import { D06_plan_stale } from '../../src/utils/doctor/checks/D06.js';
import { D07_plan_orphan } from '../../src/utils/doctor/checks/D07.js';
import { D08_vital_signs_missing } from '../../src/utils/doctor/checks/D08.js';
import { D09_handshake_missed } from '../../src/utils/doctor/checks/D09.js';
import { D10_skills_drift } from '../../src/utils/doctor/checks/D10.js';
import type { DoctorContext } from '../../src/utils/doctor/types.js';

const execaMock = vi.hoisted(() => vi.fn());

vi.mock('execa', () => ({
  execa: execaMock,
}));

describe('Doctor Checks', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-doctor-checks-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(path.join(tmpDir, '.nexus', 'docs'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, '.nexus', 'state'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, '.nexus', 'skills'), { recursive: true });
    execaMock.mockReset();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const dummyCtx: DoctorContext = {
    cwd: '/fake/cwd',
    vitalSigns: null,
    plans: [],
    activePlans: null,
  };

  it('D01 detects template docs that look populated', async () => {
    const docPath = path.join(tmpDir, '.nexus', 'docs', '02_architecture.md');
    await fs.writeFile(docPath, [
      '---',
      'status: "template"',
      '---',
      '',
      '# Architecture',
      ...Array.from({ length: 25 }, (_, i) => `This is concrete implementation detail line ${i + 1}.`),
    ].join('\n'));

    const findings = await D01_frontmatter_status_drift.run({ ...dummyCtx, cwd: tmpDir });
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.id).toBe('D01');
  });

  it('D01 does not flag populated docs for legitimate bracket syntax', async () => {
    const docPath = path.join(tmpDir, '.nexus', 'docs', '04_api_contracts.md');
    await fs.writeFile(docPath, [
      '---',
      'status: "populated"',
      '---',
      '',
      '# API Contracts',
      '',
      '| Command | Description |',
      '|---------|-------------|',
      '| `nexus init [name]` | Scaffold a new project |',
      '| `nexus doctor [--strict]` | Run drift checks |',
      '',
      'Plan types: `[\'feature\', \'refactor\', \'spike\']` are gated by default.',
    ].join('\n'));

    const findings = await D01_frontmatter_status_drift.run({ ...dummyCtx, cwd: tmpDir });
    expect(findings).toHaveLength(0);
  });

  it('D01 flags populated docs that still contain unfilled scaffold comments', async () => {
    const docPath = path.join(tmpDir, '.nexus', 'docs', '05_business_logic.md');
    await fs.writeFile(docPath, [
      '---',
      'status: "populated"',
      '---',
      '',
      '# Business Logic',
      '',
      '## Business Rules',
      '<!-- Core rules of the application: what can/can\'t happen, constraints, permissions -->',
      '',
      '## State Machines',
      '<!-- Complex state flows: e.g. task lifecycle, auth flow, checkout process -->',
    ].join('\n'));

    const findings = await D01_frontmatter_status_drift.run({ ...dummyCtx, cwd: tmpDir });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.description).toContain('unresolved placeholders');
  });

  it('D02 flags stale active phase when stale folders exist', async () => {
    const findings = await D02_stale_phase.run({
      ...dummyCtx,
      plans: [
        { fileName: 'active.md', id: 'active', title: 'Active', status: 'in_progress', owner: '', updated: '2026-05-02', phase: '' },
      ],
      vitalSigns: {
        capturedAt: new Date().toISOString(),
        git: { branch: null, aheadOfMain: null, lastCommit: null, isDirty: null },
        files: { staleFolders: [{ folder: 'src/commands', staleDays: 30 }] },
        tests: { passed: null, failed: null, skipped: null, durationMs: null, source: null },
        packages: { outdatedCount: null, vulnerableCount: null },
      },
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.id).toBe('D02');
  });

  it('D03 reports done plans absent from progress log', async () => {
    const indexPath = path.join(tmpDir, '.nexus', 'docs', 'index.md');
    await fs.writeFile(indexPath, '# Index\n\n## ✅ Progress Log\n\n- none yet\n');

    const findings = await D03_progress_log_gap.run({
      ...dummyCtx,
      cwd: tmpDir,
      plans: [
        { fileName: 'done.md', id: 'done-plan', title: 'Done', status: 'done', owner: '', updated: '2026-05-02', phase: '' },
      ],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.id).toBe('D03');
  });

  describe('D04 - Knowledge Bloat', () => {
    it('does not fire on a small file below every threshold', async () => {
      const knowledgePath = path.join(tmpDir, '.nexus', 'docs', 'knowledge.md');
      await fs.writeFile(knowledgePath, '# Knowledge\n\n### [gotcha] Small\n**2026-06-01** — one entry.\n');

      const findings = await D04_knowledge_bloat.run({ ...dummyCtx, cwd: tmpDir });
      expect(findings).toHaveLength(0);
    });

    it('fires on byte size alone, well under the 200-entry / 800-line thresholds (P2)', async () => {
      // Mirrors this repo's own knowledge.md: 61 entries, 27,913 bytes — far
      // below 200 entries or 800 lines, but already ~3.5x the local-harness
      // orientation budget. The old entry-count-only check would not have
      // fired until entry 201 (≈90KB).
      const knowledgePath = path.join(tmpDir, '.nexus', 'docs', 'knowledge.md');
      const entries = Array.from(
        { length: 60 },
        (_, i) => `### [gotcha] Entry ${i}\n**2026-06-01** — ${'padding text '.repeat(30)}\n`,
      ).join('\n');
      await fs.writeFile(knowledgePath, `# Knowledge\n\n${entries}\n`);

      const content = await fs.readFile(knowledgePath, 'utf8');
      expect(content.split('\n').filter((l) => l.trim().startsWith('### [')).length).toBeLessThan(200);
      expect(content.split('\n').length).toBeLessThan(800);
      expect(Buffer.byteLength(content, 'utf8')).toBeGreaterThan(24_000);

      const findings = await D04_knowledge_bloat.run({ ...dummyCtx, cwd: tmpDir });
      expect(findings).toHaveLength(1);
      expect(findings[0]?.id).toBe('D04');
      expect(findings[0]?.fixHint).toContain('nexus consolidate');
    });
  });

  it('D05 reports missing file references in knowledge base', async () => {
    const knowledgePath = path.join(tmpDir, '.nexus', 'docs', 'knowledge.md');
    await fs.writeFile(knowledgePath, 'Use `src/legacy/missing.ts` when handling edge case.');

    const findings = await D05_stale_knowledge_references.run({ ...dummyCtx, cwd: tmpDir });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.id).toBe('D05');
  });

  it('D05 does not flag existing directories or Node builtin module specifiers', async () => {
    const knowledgePath = path.join(tmpDir, '.nexus', 'docs', 'knowledge.md');
    await fs.mkdir(path.join(tmpDir, 'src', 'utils', 'sensors'), { recursive: true });
    await fs.writeFile(
      knowledgePath,
      'Sensors live in `src/utils/sensors/`. File I/O uses `fs/promises`, not `node:fs/promises` sync APIs.',
    );

    const findings = await D05_stale_knowledge_references.run({ ...dummyCtx, cwd: tmpDir });
    expect(findings).toHaveLength(0);
  });

  it('D09 reports missing wake token in recent commit messages', async () => {
    await fs.writeFile(path.join(tmpDir, '.nexus', 'state', 'session.json'), JSON.stringify({ token: 'NX-WAKE-123' }));
    execaMock.mockResolvedValue({ stdout: 'feat: add command\nfix: typo' });

    const findings = await D09_handshake_missed.run({ ...dummyCtx, cwd: tmpDir });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.id).toBe('D09');
  });

  it('D10 detects drift between package dependency and generated skills readme version', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { '@nexus-framework/skills': '^0.1.2' } }),
    );
    await fs.writeFile(
      path.join(tmpDir, '.nexus', 'skills', 'README.md'),
      'Sourced from `@nexus-framework/skills@0.1.0`.',
    );

    const findings = await D10_skills_drift.run({ ...dummyCtx, cwd: tmpDir });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.id).toBe('D10');
  });

  describe('D06 - Stale Plan', () => {
    it('detects plans older than 14 days', async () => {
      const recent = new Date();
      recent.setDate(recent.getDate() - 1);
      const old = new Date();
      old.setDate(old.getDate() - 15);

      const ctx = {
        ...dummyCtx,
        plans: [
          { fileName: 'fresh.md', id: '1', title: 'P1', status: 'in_progress', owner: '', updated: recent.toISOString(), phase: '' },
          { fileName: 'stale.md', id: '2', title: 'P2', status: 'in_progress', owner: '', updated: old.toISOString(), phase: '' },
          { fileName: 'done.md', id: '3', title: 'P3', status: 'done', owner: '', updated: old.toISOString(), phase: '' }, // done not tracked 
        ]
      } as DoctorContext;

      const findings = await D06_plan_stale.run(ctx);
      expect(findings).toHaveLength(1);
      expect(findings[0].description).toContain('P2');
      expect(findings[0].description).toContain('stale.md');
    });
  });

  describe('D07 - Plan orphan', () => {
    it('flags done plans missing evidence', async () => {
      const planPath = path.join(tmpDir, '.nexus', 'plans');
      await fs.mkdir(planPath, { recursive: true });
      await fs.writeFile(
        path.join(planPath, 'done.md'),
        [
          '---',
          'id: "done"',
          'title: "Done"',
          'status: "done"',
          '---',
          '',
          '## Evidence',
          '_(to be filled)_',
        ].join('\n'),
      );

      const findings = await D07_plan_orphan.run({
        ...dummyCtx,
        cwd: tmpDir,
        plans: [
          { fileName: 'done.md', id: 'done', title: 'Done', status: 'done', owner: '', updated: '2026-05-02', phase: '' },
        ],
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]?.id).toBe('D07');
    });
  });

  describe('D08 - Vital Signs Missing', () => {
    it('reports missing vital signs', async () => {
      const findings = await D08_vital_signs_missing.run(dummyCtx);
      expect(findings).toHaveLength(1);
      expect(findings[0].description).toContain('missing');
      expect(findings[0].autoFixable).toBe(true);
    });

    it('reports stale vital signs', async () => {
      const old = new Date();
      old.setDate(old.getDate() - 2);
      
      const findings = await D08_vital_signs_missing.run({
        ...dummyCtx,
        vitalSigns: { capturedAt: old.toISOString() } as DoctorContext['vitalSigns'],
      });
      expect(findings).toHaveLength(1);
      expect(findings[0].description).toContain('older than 24 hours');
      expect(findings[0].autoFixable).toBe(true);
    });

    it('returns empty if healthy', async () => {
      const recent = new Date();
      const findings = await D08_vital_signs_missing.run({
        ...dummyCtx,
        vitalSigns: { capturedAt: recent.toISOString() } as DoctorContext['vitalSigns'],
      });
      expect(findings).toHaveLength(0);
    });
  });
});
