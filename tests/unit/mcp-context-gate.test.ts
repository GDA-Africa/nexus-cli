import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { BrainContext } from '../../src/mcp/context.js';
import { getContextTool, listSkillsTool } from '../../src/mcp/tools.js';

const GRILLING = `---
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

const COMPONENT = `---
skill: component-creation
version: 1.0.0
framework: shared
category: ui
triggers:
  - "new component"
  - "add a component"
author: "@nexus-framework/skills"
status: active
---

# Skill: Creating Components
`;

describe('nexus_get_context — skills and the alignment gate', () => {
  let tmpDir: string;
  let ctx: BrainContext;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-ctx-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const nexusDir = path.join(tmpDir, '.nexus');
    await fs.mkdir(path.join(nexusDir, 'skills', 'core'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'plans'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'docs'), { recursive: true });
    await fs.writeFile(path.join(nexusDir, 'skills', 'core', 'grilling.md'), GRILLING);
    await fs.writeFile(path.join(nexusDir, 'skills', 'core', 'component-creation.md'), COMPONENT);

    ctx = {
      projectRoot: tmpDir,
      nexusDir,
      plansDir: path.join(nexusDir, 'plans'),
      docsDir: path.join(nexusDir, 'docs'),
      skillsDir: path.join(nexusDir, 'skills'),
    };
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function activatePlan(id: string, frontmatter: string, body = ''): Promise<void> {
    await fs.writeFile(
      path.join(ctx.plansDir, `${id}.md`),
      `---\nnexus_plan: true\nid: "${id}"\ntitle: "T"\nstatus: "in_progress"\n${frontmatter}\n---\n\n## Goal\nG.\n${body}`,
    );
    await fs.writeFile(
      path.join(ctx.plansDir, '_active.json'),
      JSON.stringify({ active: [id], set_at: '2026-08-21', by: 'test' }),
    );
  }

  it('parses triggers from block-list frontmatter', async () => {
    // Regression: the old parser read only inline `triggers: [a, b]`, so every
    // registry skill reported zero triggers.
    const { skills } = await listSkillsTool(ctx);
    const component = skills.find((s) => s.name === 'component-creation');
    expect(component?.triggers).toEqual(['new component', 'add a component']);
    expect(component?.title).toBe('Skill: Creating Components');
  });

  it('actually returns a matching skill in the context pack', async () => {
    // Regression: this section returned an empty array for every task, always.
    const pack = await getContextTool(ctx, { task: 'add a new component to the header' });
    expect(pack.skills.map((s) => s.name)).toContain('component-creation');
  });

  it('injects the gated skill even when no trigger matches the task', async () => {
    await activatePlan('add-auth', 'type: "feature"');
    const pack = await getContextTool(ctx, { task: 'wire up the session table' });

    expect(pack.gate?.required).toBe(true);
    const gated = pack.skills.find((s) => s.name === 'grilling');
    expect(gated?.required).toBe(true);
    expect(gated?.matchedTrigger).toBe('<gate>');
  });

  it('lists the gated skill first', async () => {
    await activatePlan('add-auth', 'type: "feature"');
    const pack = await getContextTool(ctx, { task: 'add a new component' });
    expect(pack.skills[0]?.name).toBe('grilling');
  });

  it('does not require the gate once the record is filled', async () => {
    await activatePlan('add-auth', 'type: "feature"', '\n## Grilling\n**Ask:** Ship auth.\n');
    const pack = await getContextTool(ctx, { task: 'add a new component' });
    expect(pack.gate?.required).toBe(false);
    expect(pack.gate?.satisfiedBy).toContain('## Grilling');
  });

  it('does not gate a plain bug plan', async () => {
    await activatePlan('fix-typo', 'type: "bug"');
    const pack = await getContextTool(ctx, { task: 'fix the label typo' });
    expect(pack.gate?.required).toBe(false);
  });

  it('gates a bug plan marked major', async () => {
    await activatePlan('fix-data-loss', 'type: "bug"\nmajor: true');
    const pack = await getContextTool(ctx, { task: 'fix the upgrade data loss' });
    expect(pack.gate?.required).toBe(true);
  });

  it('survives a tiny budget without dropping the gate', async () => {
    await activatePlan('add-auth', 'type: "feature"');
    const pack = await getContextTool(ctx, { task: 'add a new component', maxChars: 2000 });
    expect(pack.gate?.required).toBe(true);
  });

  it('ranks skills by relevance and reports a score', async () => {
    const pack = await getContextTool(ctx, { task: 'add a new component' });
    expect(pack.skills[0]?.score).toBeGreaterThan(0);
  });
});
