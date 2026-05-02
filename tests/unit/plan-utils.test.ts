import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, describe, expect, it } from 'vitest';

import {
  parseChecklist,
  parsePlanContent,
  serializePlanContent,
  updateChecklistItem,
} from '../../src/utils/plans/parser.js';
import { canTransition, transitionFrontmatter } from '../../src/utils/plans/lifecycle.js';
import { readActivePlans, removeActivePlan, setActivePlan } from '../../src/utils/plans/active.js';
import { rebuildPlansIndex } from '../../src/utils/plans/index-builder.js';

const TMP_DIRS: string[] = [];

function samplePlan(id = 'plan-a', status = 'draft'): string {
  return `---
nexus_plan: true
id: "${id}"
title: "Plan ${id}"
status: "${status}"
created: "2026-05-02"
updated: "2026-05-02"
owner: "unassigned"
phase: "m2"
tags: ["feature"]
---

## Goal
Ship it.

## Steps
- [ ] first
- [ ] second

## Notes
- none
`;
}

async function tmpDir(): Promise<string> {
  const dir = path.join(os.tmpdir(), `nexus-plan-utils-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  TMP_DIRS.push(dir);
  await fs.ensureDir(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(TMP_DIRS.splice(0).map((dir) => fs.remove(dir)));
});

describe('plans parser', () => {
  it('parses and serializes a plan preserving key sections', () => {
    const parsed = parsePlanContent(samplePlan());
    expect(parsed.frontmatter.id).toBe('plan-a');
    expect(parsed.sections.find((s) => s.heading === 'Steps')?.content).toContain('- [ ] first');

    const roundTrip = serializePlanContent(parsed);
    expect(roundTrip).toContain('id: "plan-a"');
    expect(roundTrip).toContain('## Steps');
  });

  it('updates checklist items by 1-based index', () => {
    const steps = ['- [ ] one', '- [ ] two'].join('\n');
    const updated = updateChecklistItem(steps, 2, true);

    const checklist = parseChecklist(updated);
    expect(checklist[0]?.checked).toBe(false);
    expect(checklist[1]?.checked).toBe(true);
  });
});

describe('plans lifecycle', () => {
  it('allows draft -> in_progress and in_progress -> done', () => {
    expect(canTransition('draft', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'done')).toBe(true);
  });

  it('throws on invalid transition', () => {
    expect(() => transitionFrontmatter({ id: 'a', title: 'A', status: 'done' }, 'in_progress')).toThrow(
      'Invalid plan transition',
    );
  });
});

describe('active plan pointer', () => {
  it('sets and removes active plans', async () => {
    const dir = await tmpDir();
    await setActivePlan(dir, 'plan-a', 'test');

    const state = await readActivePlans(dir);
    expect(state.active).toContain('plan-a');

    await removeActivePlan(dir, 'plan-a', 'test');
    const next = await readActivePlans(dir);
    expect(next.active).toEqual([]);
  });
});

describe('plans index builder', () => {
  it('builds grouped plans dashboard', async () => {
    const dir = await tmpDir();
    await fs.writeFile(path.join(dir, 'plan-a.md'), samplePlan('plan-a', 'in_progress'), 'utf-8');
    await fs.writeFile(path.join(dir, 'plan-b.md'), samplePlan('plan-b', 'done'), 'utf-8');

    await rebuildPlansIndex(dir);

    const index = await fs.readFile(path.join(dir, 'index.md'), 'utf-8');
    expect(index).toContain('## Active');
    expect(index).toContain('plan-a');
    expect(index).toContain('## Done');
    expect(index).toContain('plan-b');
  });
});
