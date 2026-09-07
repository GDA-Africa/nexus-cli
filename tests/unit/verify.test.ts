import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { planDoneCommand, planNewCommand, planVerifyCommand } from '../../src/commands/plan.js';
import { D11_unverified_done } from '../../src/utils/doctor/checks/D11.js';
import type { DoctorContext } from '../../src/utils/doctor/types.js';
import {
  formatEvidenceBlock,
  generateDefaultVerifyManifest,
  loadVerifyManifest,
  parseEvidenceBlock,
  saveVerifyManifest,
  type VerifyEvidenceBlock,
} from '../../src/utils/verify/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Provable Done — Verify Manifest & Evidence', () => {
  let tmpDir: string;
  let nexusDir: string;
  let plansDir: string;

  const dummyCtx: DoctorContext = {
    cwd: '',
    minSeverity: 'info',
    plans: [],
    manifest: null,
    git: {
      branch: 'main',
      dirty: false,
      lastCommitHash: 'abc',
      lastCommitMessage: 'feat: test',
      lastCommitDate: '2026-09-07',
      commitsAhead: 0,
    },
    knowledgeSummary: null,
    strict: false,
  };

  beforeEach(async () => {
    tmpDir = path.join(__dirname, '..', 'fixtures', `tmp-verify-${Date.now()}`);
    nexusDir = path.join(tmpDir, '.nexus');
    plansDir = path.join(nexusDir, 'plans');

    await fs.ensureDir(plansDir);
    await fs.ensureDir(path.join(nexusDir, 'docs'));
    await fs.ensureDir(path.join(nexusDir, 'state'));

    await fs.writeFile(
      path.join(nexusDir, 'docs', 'index.md'),
      '# Project Index\n\n## Current Objective\n\n## What Has Been Built\n\n## Progress Log\n',
    );
    await fs.writeFile(path.join(nexusDir, 'docs', 'knowledge.md'), '# Knowledge Base\n');
    await fs.writeFile(path.join(plansDir, '_active.json'), JSON.stringify({ active: [] }));
    await fs.writeFile(
      path.join(nexusDir, 'state', 'session.json'),
      JSON.stringify({ token: 'NX-WAKE-TEST-2026-09-07' }),
    );
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('generateDefaultVerifyManifest derives checks from package.json and tsconfig.json', async () => {
    await fs.writeJson(path.join(tmpDir, 'package.json'), {
      scripts: { test: 'vitest run', lint: 'eslint .' },
    });
    await fs.writeJson(path.join(tmpDir, 'tsconfig.json'), {});

    const manifest = await generateDefaultVerifyManifest(tmpDir);
    expect(manifest.checks).toHaveLength(3);
    expect(manifest.checks.map((c) => c.id)).toEqual(['types', 'tests', 'lint']);
  });

  it('loadVerifyManifest and saveVerifyManifest roundtrip', async () => {
    const manifest = {
      checks: [{ id: 'unit', run: 'node -v' }],
    };
    await saveVerifyManifest(nexusDir, manifest);

    const loaded = await loadVerifyManifest(nexusDir);
    expect(loaded).not.toBeNull();
    expect(loaded?.checks).toHaveLength(1);
    expect(loaded?.checks[0]?.id).toBe('unit');
  });

  it('formatEvidenceBlock and parseEvidenceBlock roundtrip valid JSON', () => {
    const block: VerifyEvidenceBlock = {
      verified_at: '2026-09-07T10:00:00.000Z',
      brain_hash: 'brain-test-hash',
      wake_token: 'NX-WAKE-TEST-2026-09-07',
      checks: [
        { id: 'types', run: 'tsc --noEmit', exit: 0, duration_ms: 50, summary: 'Passed cleanly' },
        { id: 'tests', run: 'vitest run', exit: 0, duration_ms: 120, summary: '45 passed' },
      ],
    };

    const formatted = formatEvidenceBlock(block);
    expect(formatted).toContain('```json');
    expect(formatted).toContain('brain-test-hash');

    const parsed = parseEvidenceBlock(formatted);
    expect(parsed).toEqual(block);
  });

  it('planVerifyCommand executes checks and records machine evidence in plan', async () => {
    // Write an executable mock check
    await saveVerifyManifest(nexusDir, {
      checks: [{ id: 'mock-test', run: 'node -e "console.log(\'12 passed\')"' }],
    });

    // Create a plan
    const origCwd = process.cwd();
    try {
      process.chdir(tmpDir);
      await planNewCommand('Feature Verify Test');

      const result = await planVerifyCommand('feature-verify-test');
      expect(result.success).toBe(true);
      expect(result.evidence.checks).toHaveLength(1);
      expect(result.evidence.checks[0]?.exit).toBe(0);
      expect(result.evidence.checks[0]?.summary).toBe('12 passed');

      const planContent = await fs.readFile(path.join(plansDir, 'feature-verify-test.md'), 'utf8');
      expect(planContent).toContain('```json');
      expect(planContent).toContain('"id": "mock-test"');
      expect(planContent).toContain('"exit": 0');
    } finally {
      process.chdir(origCwd);
    }
  });

  describe('D11 v2 gate behavior', () => {
    it('D11 flags done plan with no evidence', async () => {
      const planFile = 'plan-empty.md';
      await fs.writeFile(
        path.join(plansDir, planFile),
        ['---', 'id: "plan-empty"', 'status: "done"', '---', '', '# Plan', '', '## Evidence', ''].join('\n'),
      );

      const findings = await D11_unverified_done.run({
        ...dummyCtx,
        cwd: tmpDir,
        plans: [
          { fileName: planFile, id: 'plan-empty', title: 'Empty', status: 'done', owner: '', updated: '', phase: '' },
        ],
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]?.severity).toBe('warn');
      expect(findings[0]?.description).toContain('lacks valid machine verification evidence');
    });

    it('D11 flags done plan with "tests skipped" prose (keyword sniff regression check)', async () => {
      const planFile = 'plan-skipped.md';
      await fs.writeFile(
        path.join(plansDir, planFile),
        [
          '---',
          'id: "plan-skipped"',
          'status: "done"',
          '---',
          '',
          '# Plan',
          '',
          '## Evidence',
          '- tests skipped because they were taking too long to run',
        ].join('\n'),
      );

      const findings = await D11_unverified_done.run({
        ...dummyCtx,
        cwd: tmpDir,
        plans: [
          { fileName: planFile, id: 'plan-skipped', title: 'Skipped', status: 'done', owner: '', updated: '', phase: '' },
        ],
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]?.description).toContain('lacks valid machine verification evidence');
    });

    it('D11 flags done plan where machine checks failed', async () => {
      const planFile = 'plan-failed.md';
      const failingEvidence: VerifyEvidenceBlock = {
        verified_at: '2026-09-07T10:00:00.000Z',
        brain_hash: 'brain-hash',
        checks: [
          { id: 'tests', run: 'npm test', exit: 1, duration_ms: 100, summary: '1 failed' },
        ],
      };

      await fs.writeFile(
        path.join(plansDir, planFile),
        [
          '---',
          'id: "plan-failed"',
          'status: "done"',
          '---',
          '',
          '# Plan',
          '',
          '## Evidence',
          formatEvidenceBlock(failingEvidence),
        ].join('\n'),
      );

      const findings = await D11_unverified_done.run({
        ...dummyCtx,
        cwd: tmpDir,
        plans: [
          { fileName: planFile, id: 'plan-failed', title: 'Failed', status: 'done', owner: '', updated: '', phase: '' },
        ],
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]?.description).toContain('has failing verification checks');
    });

    it('D11 passes done plan with passing machine evidence', async () => {
      const planFile = 'plan-passed.md';
      const passingEvidence: VerifyEvidenceBlock = {
        verified_at: '2026-09-07T10:00:00.000Z',
        brain_hash: 'brain-hash',
        checks: [
          { id: 'types', run: 'tsc --noEmit', exit: 0, duration_ms: 50 },
          { id: 'tests', run: 'npm test', exit: 0, duration_ms: 100, summary: '30 passed' },
        ],
      };

      await fs.writeFile(
        path.join(plansDir, planFile),
        [
          '---',
          'id: "plan-passed"',
          'status: "done"',
          '---',
          '',
          '# Plan',
          '',
          '## Evidence',
          formatEvidenceBlock(passingEvidence),
        ].join('\n'),
      );

      const findings = await D11_unverified_done.run({
        ...dummyCtx,
        cwd: tmpDir,
        plans: [
          { fileName: planFile, id: 'plan-passed', title: 'Passed', status: 'done', owner: '', updated: '', phase: '' },
        ],
      });

      expect(findings).toHaveLength(0);
    });

    it('D11 passes done plan with explicit waiver marker', async () => {
      const planFile = 'plan-waiver.md';
      await fs.writeFile(
        path.join(plansDir, planFile),
        [
          '---',
          'id: "plan-waiver"',
          'status: "done"',
          '---',
          '',
          '# Plan',
          '',
          '## Evidence',
          'WAIVER: approved by tech lead due to upstream outage',
        ].join('\n'),
      );

      const findings = await D11_unverified_done.run({
        ...dummyCtx,
        cwd: tmpDir,
        plans: [
          { fileName: planFile, id: 'plan-waiver', title: 'Waiver', status: 'done', owner: '', updated: '', phase: '' },
        ],
      });

      expect(findings).toHaveLength(0);
    });

    it('D11 elevates severity to error under strict mode', async () => {
      const planFile = 'plan-strict.md';
      await fs.writeFile(
        path.join(plansDir, planFile),
        ['---', 'id: "plan-strict"', 'status: "done"', '---', '', '# Plan', '', '## Evidence', ''].join('\n'),
      );

      const findings = await D11_unverified_done.run({
        ...dummyCtx,
        cwd: tmpDir,
        strict: true,
        plans: [
          { fileName: planFile, id: 'plan-strict', title: 'Strict', status: 'done', owner: '', updated: '', phase: '' },
        ],
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]?.severity).toBe('error');
    });
  });
});
