/**
 * NEXUS MCP — nexus_get_context (P0 pack overhaul) unit tests
 *
 * Covers:
 *   - contract_version on the composed pack
 *   - ContextFloorOverflow thrown (not a gutted pack) when a floor section
 *     (task, gate) does not fit the declared budget
 *   - evicted[] / budget{} report what didn't make it in and why
 *   - section order: gate, skills, plan, knowledge, docs, vitals (vitals last)
 *   - no durationMs / wall-clock value anywhere in the composed pack
 *   - vitals read from the cached last-sync.json snapshot; no execa call
 *   - docs cut at a paragraph boundary, not a raw byte prefix mid-sentence
 *   - two identical calls on an unchanged tree return byte-identical packs
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BrainContext } from '../../src/mcp/context.js';
import { ContextFloorOverflow, getContextTool } from '../../src/mcp/tools.js';
import { countTokens } from '../../src/utils/tokens.js';

const execaMock = vi.hoisted(() => vi.fn());
vi.mock('execa', () => ({ execa: execaMock }));

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
author: "@nexus-framework/skills"
status: active
---

# Skill: Grilling (Shared)
`;

const AGENT_WITH_DOCS = `---
nexus_agent: true
agent: test-agent
version: 1.0.0
role: verification
triggers: ["write tests"]
tools:
  read: [nexus_wake]
  write: []
context:
  docs: [06_test_strategy.md]
  knowledge_categories: []
  plan_scope: active
handoff:
  after: none
status: active
---

# Agent: test-agent

## Mission
Verify things.
`;

describe('getContextTool — pack overhaul (P0)', () => {
  let tmpDir: string;
  let ctx: BrainContext;

  beforeEach(async () => {
    execaMock.mockReset();
    execaMock.mockImplementation(() => {
      throw new Error('nexus_get_context must never shell out (B4)');
    });

    tmpDir = path.join(os.tmpdir(), `nexus-ctx-pack-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const nexusDir = path.join(tmpDir, '.nexus');
    await fs.mkdir(path.join(nexusDir, 'skills', 'core'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'agents', 'core'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'plans'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'docs'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'state'), { recursive: true });

    await fs.writeFile(path.join(nexusDir, 'skills', 'core', 'grilling.md'), GRILLING);
    await fs.writeFile(path.join(nexusDir, 'agents', 'core', 'test-agent.md'), AGENT_WITH_DOCS);

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

  it('reports a contract_version', async () => {
    const pack = await getContextTool(ctx, { task: 'orient' });
    expect(pack.contract_version).toBe('1.0.0');
  });

  it('composes sections in priority order: gate, skills, plan, knowledge, docs, vitals', async () => {
    const pack = await getContextTool(ctx, { task: 'orient' });
    const keys = Object.keys(pack);
    const order = ['gate', 'skills', 'plan', 'knowledge', 'docs', 'vitals'].map((k) => keys.indexOf(k));

    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('throws ContextFloorOverflow — not a gutted pack — when the task alone does not fit', async () => {
    const hugeTask = 'orient '.repeat(2000); // guaranteed to exceed the 500-token floor
    const err = await getContextTool(ctx, { task: hugeTask, maxTokens: 500 }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ContextFloorOverflow);
    expect((err as ContextFloorOverflow).section).toBe('task');
    expect((err as ContextFloorOverflow).maxTokens).toBe(500);
  });

  it('throws ContextFloorOverflow on the gate when the task leaves no room for it', async () => {
    // Activate the gate so it costs real tokens (not the empty-declarations
    // shortcut), then size the task to consume almost the entire floor.
    await fs.writeFile(
      path.join(ctx.plansDir, 'add-auth.md'),
      '---\nnexus_plan: true\nid: "add-auth"\ntitle: "T"\nstatus: "in_progress"\ntype: "feature"\n---\n\n## Goal\nG.\n',
    );
    await fs.writeFile(
      path.join(ctx.plansDir, '_active.json'),
      JSON.stringify({ active: ['add-auth'], set_at: '2026-08-21', by: 'test' }),
    );

    const budget = 500;
    let task = 'x';
    // Grow the task until it alone is one token short of the whole budget,
    // guaranteeing gate (composed right after) cannot fit in what remains.
    while (countTokens(JSON.stringify(task)) < budget - 1) {
      task += ' word';
    }

    const err = await getContextTool(ctx, { task, maxTokens: budget }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ContextFloorOverflow);
    expect((err as ContextFloorOverflow).section).toBe('gate');
  });

  it('reports evicted[] and a consistent budget{} when knowledge is dropped', async () => {
    const bigEntries = Array.from(
      { length: 5 },
      (_, i) => `### [gotcha] Entry ${i}\n**2026-06-0${(i % 9) + 1}** — ${'x'.repeat(8000)}\n`,
    ).join('\n');
    await fs.writeFile(path.join(ctx.docsDir, 'knowledge.md'), `# Knowledge\n\n${bigEntries}\n`);

    const pack = await getContextTool(ctx, { task: 'gotcha entry overflow', maxTokens: 600 });

    expect(pack.truncated).toBe(true);
    expect(pack.evicted.length).toBeGreaterThan(0);
    for (const eviction of pack.evicted) {
      expect(eviction.cost).toBeGreaterThan(0);
      expect(['budget', 'floor']).toContain(eviction.reason);
    }
    expect(pack.budget.maxTokens).toBe(600);
    expect(pack.budget.used + pack.budget.remaining).toBe(pack.budget.maxTokens);
    expect(pack.budget.used).toBeLessThanOrEqual(pack.budget.maxTokens);
  });

  it('never contains durationMs or reads it from anywhere', async () => {
    await fs.writeFile(
      path.join(ctx.nexusDir, 'state', 'last-sync.json'),
      JSON.stringify({
        capturedAt: '2026-08-20T00:00:00.000Z',
        git: { branch: 'main', aheadOfMain: 0, lastCommit: 'abc — msg', isDirty: true },
        files: { staleFolders: [] },
        tests: { passed: 10, failed: 0, skipped: 0, durationMs: 4321, source: 'vitest' },
        packages: { outdatedCount: 0, vulnerableCount: 0 },
      }),
    );

    const pack = await getContextTool(ctx, { task: 'orient' });

    expect(JSON.stringify(pack)).not.toContain('durationMs');
    expect(JSON.stringify(pack)).not.toContain('4321');
  });

  it('reads vitals from the cached last-sync.json and never calls execa', async () => {
    await fs.writeFile(
      path.join(ctx.nexusDir, 'state', 'last-sync.json'),
      JSON.stringify({
        capturedAt: '2026-08-20T00:00:00.000Z',
        git: { branch: 'feat/pack-health', aheadOfMain: 3, lastCommit: 'abc — msg', isDirty: true },
        files: { staleFolders: [] },
        tests: { passed: 12, failed: 1, skipped: 0, durationMs: 900, source: 'vitest' },
        packages: { outdatedCount: 0, vulnerableCount: 0 },
      }),
    );

    const pack = await getContextTool(ctx, { task: 'orient' });

    expect(pack.vitals.branch).toBe('feat/pack-health');
    expect(pack.vitals.dirty).toBe(true); // regression: old code read a `.dirty` field that never existed on GitSensorData
    expect(pack.vitals.testsSummary).toContain('"passed":12');
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('degrades vitals gracefully (never null) when no snapshot exists yet, still without execa', async () => {
    const pack = await getContextTool(ctx, { task: 'orient' });

    expect(pack.vitals).toEqual({ branch: null, dirty: null, testsSummary: 'not yet synced' });
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('cuts a doc at a paragraph boundary instead of a raw mid-sentence prefix', async () => {
    const paragraphs = Array.from(
      { length: 40 },
      (_, i) => `Paragraph ${i}. This is a complete sentence that ends cleanly right here.`,
    );
    await fs.writeFile(path.join(ctx.docsDir, '06_test_strategy.md'), paragraphs.join('\n\n'));

    const pack = await getContextTool(ctx, { task: 'write tests', agent: 'test-agent', maxTokens: 550 });

    expect(pack.docs).toHaveLength(1);
    const excerpt = pack.docs[0]?.excerpt ?? '';
    expect(excerpt.length).toBeGreaterThan(0);
    expect(excerpt.length).toBeLessThan(paragraphs.join('\n\n').length);
    // A boundary cut ends on a full paragraph — no dangling partial sentence.
    expect(excerpt.trimEnd().endsWith('.')).toBe(true);
    expect(pack.truncated).toBe(true);
    expect(pack.evicted.some((e) => e.section === 'docs:06_test_strategy.md')).toBe(true);
  });

  it('produces a byte-identical pack across two calls on an unchanged tree', async () => {
    await fs.writeFile(
      path.join(ctx.nexusDir, 'state', 'last-sync.json'),
      JSON.stringify({
        capturedAt: '2026-08-20T00:00:00.000Z',
        git: { branch: 'main', aheadOfMain: 0, lastCommit: 'abc — msg', isDirty: false },
        files: { staleFolders: [] },
        tests: { passed: 1, failed: 0, skipped: 0, durationMs: 10, source: 'vitest' },
        packages: { outdatedCount: 0, vulnerableCount: 0 },
      }),
    );

    const first = await getContextTool(ctx, { task: 'orient' });
    const second = await getContextTool(ctx, { task: 'orient' });

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
