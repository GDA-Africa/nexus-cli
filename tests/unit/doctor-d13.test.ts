import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { D13_gated_plan_unaligned } from '../../src/utils/doctor/checks/D13.js';
import type { DoctorContext } from '../../src/utils/doctor/types.js';
import { GRILLING_PENDING_MARKER } from '../../src/utils/skills/gate.js';

const GRILLING_SKILL = `---
skill: grilling
version: 1.0.0
framework: shared
category: procedure
invocation: model
gate:
  plan_types:
    - feature
    - refactor
    - spike
  record: "## Grilling"
triggers:
  - "new feature"
  - "major fix"
author: "@nexus-framework/skills"
status: active
---

# Skill: Grilling (Shared)
`;

describe('D13 — alignment gate', () => {
  let tmpDir: string;
  let ctx: DoctorContext;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-d13-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(path.join(tmpDir, '.nexus', 'plans'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, '.nexus', 'skills', 'core'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.nexus', 'skills', 'core', 'grilling.md'), GRILLING_SKILL);
    ctx = { cwd: tmpDir, vitalSigns: null, plans: [], activePlans: null };
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function addPlan(
    id: string,
    frontmatter: string,
    body = '',
    status = 'in_progress',
  ): Promise<void> {
    const fileName = `${id}.md`;
    await fs.writeFile(
      path.join(tmpDir, '.nexus', 'plans', fileName),
      `---\nnexus_plan: true\nid: "${id}"\ntitle: "T"\nstatus: "${status}"\n${frontmatter}\n---\n\n## Goal\nG.\n${body}`,
    );
    ctx.plans.push({
      id,
      title: 'T',
      status: status as never,
      owner: 'x',
      updated: '',
      phase: '',
      fileName,
    });
  }

  it('flags an in-progress feature plan with no record', async () => {
    await addPlan('add-auth', 'type: "feature"');
    const findings = await D13_gated_plan_unaligned.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('warn');
    expect(findings[0]?.description).toContain('add-auth');
  });

  it('escalates to error under --strict', async () => {
    await addPlan('add-auth', 'type: "feature"');
    const findings = await D13_gated_plan_unaligned.run({ ...ctx, strict: true });
    expect(findings[0]?.severity).toBe('error');
  });

  it('does not flag a draft plan — nothing is committed yet', async () => {
    await addPlan('add-auth', 'type: "feature"', '', 'draft');
    expect(await D13_gated_plan_unaligned.run(ctx)).toEqual([]);
  });

  it('does not flag a plan whose record is filled', async () => {
    await addPlan('add-auth', 'type: "feature"', '\n## Grilling\n**Ask:** Ship auth.\n');
    expect(await D13_gated_plan_unaligned.run(ctx)).toEqual([]);
  });

  it('flags a plan whose record is still the untouched template', async () => {
    await addPlan('add-auth', 'type: "feature"', `\n## Grilling\n<!-- ${GRILLING_PENDING_MARKER} -->\n`);
    expect(await D13_gated_plan_unaligned.run(ctx)).toHaveLength(1);
  });

  it('does not flag an ordinary bug plan', async () => {
    await addPlan('fix-typo', 'type: "bug"');
    expect(await D13_gated_plan_unaligned.run(ctx)).toEqual([]);
  });

  it('flags a bug plan marked major', async () => {
    await addPlan('fix-data-loss', 'type: "bug"\nmajor: true');
    expect(await D13_gated_plan_unaligned.run(ctx)).toHaveLength(1);
  });

  it('does not flag a chore', async () => {
    await addPlan('bump-deps', 'type: "chore"');
    expect(await D13_gated_plan_unaligned.run(ctx)).toEqual([]);
  });

  it('is silent when no skill declares a gate', async () => {
    await fs.rm(path.join(tmpDir, '.nexus', 'skills', 'core', 'grilling.md'));
    await addPlan('add-auth', 'type: "feature"');
    expect(await D13_gated_plan_unaligned.run(ctx)).toEqual([]);
  });

  it('classifies pre-v1.3 plans that have no explicit type field', async () => {
    await addPlan('legacy', 'source: "template:feature"');
    expect(await D13_gated_plan_unaligned.run(ctx)).toHaveLength(1);
  });
});
