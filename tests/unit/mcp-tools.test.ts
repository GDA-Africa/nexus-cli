/**
 * NEXUS CLI — MCP Tool Handler Unit Tests
 *
 * Tests for src/mcp/tools.ts + src/mcp/context.ts + src/mcp/server.ts
 *
 * Covers:
 *   - resolveBrainContext: error when no .nexus/ exists
 *   - wakeTool: token format, session.json written, doctor counts present
 *   - queryKnowledgeTool: keyword filter, category filter, limit, newest-first
 *   - getActivePlanTool: no active plan, active plan with next unchecked step
 *   - planTickTool: ticks a step, out-of-range rejection, missing plan rejection
 *   - planNoteTool: appends timestamped note
 *   - addKnowledgeEntryTool: appends before footer, duplicate rejection
 *   - listSkillsTool / getSkillTool: custom > core > community precedence
 *   - server end-to-end over InMemoryTransport: tools list + calls + isError
 */

import os from 'node:os';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { McpToolError, resolveBrainContext, type BrainContext } from '../../src/mcp/context.js';
import { buildMcpServer } from '../../src/mcp/server.js';
import {
  addKnowledgeEntryTool,
  getActivePlanTool,
  getContextTool,
  getSkillTool,
  listSkillsTool,
  planNoteTool,
  planTickTool,
  queryKnowledgeTool,
  wakeTool,
} from '../../src/mcp/tools.js';

/* ──────────────────────────────────────────────────────────────
 * Fixture
 * ────────────────────────────────────────────────────────────── */

let tmpDir: string;
let ctx: BrainContext;

const KNOWLEDGE_FIXTURE = `# Test Knowledge Base

> Append-only log.

## Entries

### [gotcha] Mount renames break npm
**2026-06-01** — npm install fails with ENOTEMPTY on mounted filesystems.

### [architecture] Markdown is the source of truth
**2026-06-02** — No database, no daemon. Everything lives in .nexus/.

### [gotcha] Hardcoded versions in tests
**2026-06-03** — Version-relative assertions survive releases; absolute ones break.

---

*Test footer — last entry 2026-06-03*
`;

const PLAN_FIXTURE = `---
nexus_plan: true
id: "test-plan"
title: "A test plan"
status: "in_progress"
created: "2026-06-10"
updated: "2026-06-10"
owner: "tester"
phase: "test"
---

## Goal
Test things.

## Steps
- [x] 1. First step
- [ ] 2. Second step
- [ ] 3. Third step

## Notes

## Evidence
`;

async function makeBrain(dir: string): Promise<void> {
  await fs.ensureDir(path.join(dir, '.nexus', 'docs'));
  await fs.ensureDir(path.join(dir, '.nexus', 'plans'));
  await fs.ensureDir(path.join(dir, '.nexus', 'state'));
  for (const sub of ['core', 'custom', 'community']) {
    await fs.ensureDir(path.join(dir, '.nexus', 'skills', sub));
  }

  await fs.writeFile(path.join(dir, '.nexus', 'docs', 'index.md'), '# Test Brain\n\n## ⏭️ What\'s Next\n');
  await fs.writeFile(path.join(dir, '.nexus', 'docs', 'knowledge.md'), KNOWLEDGE_FIXTURE);
  await fs.writeFile(path.join(dir, '.nexus', 'plans', 'test-plan.md'), PLAN_FIXTURE);
  await fs.writeJson(path.join(dir, '.nexus', 'plans', '_active.json'), {
    active: ['test-plan'],
    set_at: '2026-06-10T00:00:00.000Z',
    by: 'test',
  });

  await fs.writeFile(
    path.join(dir, '.nexus', 'skills', 'core', 'database.md'),
    '---\nname: "database"\ndescription: "Core database skill"\ntriggers: ["db", "query"]\n---\n\nCore content.\n',
  );
  await fs.writeFile(
    path.join(dir, '.nexus', 'skills', 'custom', 'database.md'),
    '---\nname: "database"\ndescription: "Custom override"\n---\n\nCustom content wins.\n',
  );
  await fs.writeFile(
    path.join(dir, '.nexus', 'skills', 'community', 'stripe.md'),
    '---\nname: "stripe"\ndescription: "Community stripe skill"\n---\n\nStripe content.\n',
  );
}

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `nexus-mcp-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await makeBrain(tmpDir);
  ctx = resolveBrainContext(tmpDir);
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

/* ──────────────────────────────────────────────────────────────
 * Context
 * ────────────────────────────────────────────────────────────── */

describe('resolveBrainContext', () => {
  it('throws McpToolError when no .nexus exists', async () => {
    const bare = path.join(os.tmpdir(), `nexus-mcp-bare-${Date.now()}`);
    await fs.ensureDir(bare);
    try {
      expect(() => resolveBrainContext(bare)).toThrow(McpToolError);
    } finally {
      await fs.remove(bare);
    }
  });

  it('resolves all brain paths', () => {
    expect(ctx.projectRoot).toBe(tmpDir);
    expect(ctx.nexusDir).toBe(path.join(tmpDir, '.nexus'));
    expect(ctx.plansDir).toBe(path.join(tmpDir, '.nexus', 'plans'));
  });
});

/* ──────────────────────────────────────────────────────────────
 * Read tools
 * ────────────────────────────────────────────────────────────── */

describe('wakeTool', () => {
  it('issues a token, records the session, and includes plan + doctor info', async () => {
    const result = await wakeTool(ctx);

    expect(result.token).toMatch(/^NX-WAKE-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-\d{4}-\d{2}-\d{2}$/);
    expect(result.activePlan).toBe('test-plan');
    expect(result.nextStep).toContain('Second step');
    expect(typeof result.doctorErrors).toBe('number');
    expect(typeof result.doctorWarnings).toBe('number');

    const session = await fs.readJson(path.join(ctx.nexusDir, 'state', 'session.json'));
    expect(session.token).toBe(result.token);
    expect(session.issued_by).toBe('nexus mcp (nexus_wake)');
  });
});

describe('queryKnowledgeTool', () => {
  it('filters by keyword across title and body', async () => {
    const result = await queryKnowledgeTool(ctx, { query: 'npm ENOTEMPTY' });
    expect(result.returned).toBe(1);
    expect(result.entries[0]?.title).toBe('Mount renames break npm');
  });

  it('filters by category and returns newest first', async () => {
    const result = await queryKnowledgeTool(ctx, { category: 'gotcha' });
    expect(result.returned).toBe(2);
    expect(result.entries[0]?.title).toBe('Hardcoded versions in tests');
  });

  it('respects limit', async () => {
    const result = await queryKnowledgeTool(ctx, { limit: 1 });
    expect(result.returned).toBe(1);
    expect(result.total).toBe(3);
  });
});

describe('getActivePlanTool', () => {
  it('returns the active plan with steps and next step', async () => {
    const result = await getActivePlanTool(ctx);
    expect(result.id).toBe('test-plan');
    expect(result.status).toBe('in_progress');
    expect(result.steps).toHaveLength(3);
    expect(result.nextStep).toContain('Second step');
    expect(result.markdown).toContain('A test plan');
  });

  it('reports gracefully when no plan is active', async () => {
    await fs.writeJson(path.join(ctx.plansDir, '_active.json'), { active: [], set_at: '', by: 'test' });
    const result = await getActivePlanTool(ctx);
    expect(result.id).toBeNull();
    expect(result.note).toContain('No active plan');
  });
});

/* ──────────────────────────────────────────────────────────────
 * Write tools
 * ────────────────────────────────────────────────────────────── */

describe('planTickTool', () => {
  it('ticks a step and reports the next unchecked step', async () => {
    const result = await planTickTool(ctx, { id: 'test-plan', step: 2 });
    expect(result.checked).toBe(true);
    expect(result.nextStep).toContain('Third step');

    const content = await fs.readFile(path.join(ctx.plansDir, 'test-plan.md'), 'utf-8');
    expect(content).toContain('- [x] 2. Second step');
  });

  it('rejects out-of-range steps with a clean error', async () => {
    await expect(planTickTool(ctx, { id: 'test-plan', step: 9 })).rejects.toThrow(/out of range/);
  });

  it('rejects unknown plan ids', async () => {
    await expect(planTickTool(ctx, { id: 'nope', step: 1 })).rejects.toThrow(/not found/i);
  });
});

describe('planNoteTool', () => {
  it('appends a timestamped note', async () => {
    await planNoteTool(ctx, { id: 'test-plan', message: 'hello from mcp' });
    const content = await fs.readFile(path.join(ctx.plansDir, 'test-plan.md'), 'utf-8');
    expect(content).toMatch(/## Notes\n[\s\S]*hello from mcp/);
  });
});

describe('addKnowledgeEntryTool', () => {
  it('appends a formatted entry before the footer', async () => {
    await addKnowledgeEntryTool(ctx, {
      category: 'pattern',
      title: 'MCP tools beat file reads',
      body: 'Targeted retrieval avoids context pollution.',
      why: 'Smaller payloads, fewer missed gotchas.',
      howToApply: 'Use nexus_query_knowledge before tasks.',
    });

    const content = await fs.readFile(path.join(ctx.docsDir, 'knowledge.md'), 'utf-8');
    expect(content).toContain('### [pattern] MCP tools beat file reads');
    expect(content).toContain('**Why:** Smaller payloads');
    // Footer still last
    expect(content.trimEnd().endsWith('*Test footer — last entry 2026-06-03*')).toBe(true);
    // New entry is parseable
    const result = await queryKnowledgeTool(ctx, { category: 'pattern' });
    expect(result.entries[0]?.title).toBe('MCP tools beat file reads');
  });

  it('rejects duplicate entries (append-only discipline)', async () => {
    await expect(
      addKnowledgeEntryTool(ctx, {
        category: 'gotcha',
        title: 'Mount renames break npm',
        body: 'Duplicate of an existing entry.',
      }),
    ).rejects.toThrow(/already exists/);
  });
});

/* ──────────────────────────────────────────────────────────────
 * Skills tools
 * ────────────────────────────────────────────────────────────── */

describe('skills tools', () => {
  it('lists skills with custom > core > community precedence (deduped)', async () => {
    const { skills } = await listSkillsTool(ctx);
    const names = skills.map((s) => `${s.name}:${s.source}`);
    expect(names).toContain('database:custom');
    expect(names).toContain('stripe:community');
    expect(names).not.toContain('database:core');
  });

  it('reads a skill honoring precedence', async () => {
    const skill = await getSkillTool(ctx, { name: 'database' });
    expect(skill.source).toBe('custom');
    expect(skill.markdown).toContain('Custom content wins.');
  });

  it('errors cleanly on unknown skills', async () => {
    await expect(getSkillTool(ctx, { name: 'missing' })).rejects.toThrow(/not found/);
  });
});

/* ──────────────────────────────────────────────────────────────
 * Server end-to-end (InMemoryTransport)
 * ────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────
 * getContextTool — budget discipline
 *
 * Regression cover for the v1.2 Track A defect: the budget used to be
 * subtracted only AFTER plan/knowledge/skills/vitals were fully composed, and
 * `truncated` was only ever set inside the docs loop. So a pack could blow
 * past `maxChars` and still report `truncated: false` — which is worse than
 * being over budget, because callers trust that flag.
 * ────────────────────────────────────────────────────────────── */

/** Knowledge file with `count` entries whose bodies are `bodyChars` long. */
function bigKnowledge(count: number, bodyChars: number): string {
  const entries = Array.from({ length: count }, (_, i) =>
    `### [gotcha] Budget overflow entry ${i}\n**2026-06-0${(i % 9) + 1}** — ${'x'.repeat(bodyChars)}\n`,
  ).join('\n');

  return `# Test Knowledge Base\n\n## Entries\n\n${entries}\n---\n\n*footer*\n`;
}

/** The sections the budget actually governs. */
function chargedSize(result: Awaited<ReturnType<typeof getContextTool>>): number {
  const { plan, knowledge, skills, vitals, docs } = result;
  return JSON.stringify({ plan, knowledge, skills, vitals, docs }).length;
}

describe('getContextTool budget', () => {
  it('keeps the composed pack within maxChars even when knowledge is huge', async () => {
    await fs.writeFile(path.join(ctx.docsDir, 'knowledge.md'), bigKnowledge(5, 8000));

    const result = await getContextTool(ctx, { task: 'budget overflow', maxChars: 4000 });

    expect(chargedSize(result)).toBeLessThanOrEqual(4000);
  });

  it('reports truncated:true when knowledge was dropped and no docs were requested', async () => {
    // The exact defect: with no agent recipe there are no docs, so the old
    // implementation never reached the only line that set `truncated`.
    await fs.writeFile(path.join(ctx.docsDir, 'knowledge.md'), bigKnowledge(5, 8000));

    const result = await getContextTool(ctx, { task: 'budget overflow', maxChars: 2000 });

    expect(result.docs).toHaveLength(0);
    expect(result.truncated).toBe(true);
  });

  it('caps an individual knowledge body instead of letting one entry eat the pack', async () => {
    await fs.writeFile(path.join(ctx.docsDir, 'knowledge.md'), bigKnowledge(1, 9000));

    const result = await getContextTool(ctx, { task: 'budget overflow', maxChars: 60000 });

    expect(result.knowledge).toHaveLength(1);
    // 1200-char cap plus the ellipsis marker.
    expect(result.knowledge[0].body.length).toBeLessThanOrEqual(1201);
    expect(result.truncated).toBe(true);
  });

  it('does not claim truncation when everything fits', async () => {
    const result = await getContextTool(ctx, { task: 'markdown source of truth', maxChars: 60000 });

    expect(result.truncated).toBe(false);
    expect(chargedSize(result)).toBeLessThanOrEqual(60000);
  });

  it('still composes the high-priority plan slice under a tight budget', async () => {
    await fs.writeFile(path.join(ctx.docsDir, 'knowledge.md'), bigKnowledge(5, 8000));

    const result = await getContextTool(ctx, { task: 'budget overflow', maxChars: 2000 });

    // Plan is charged but never rejected — it is the most task-relevant slice
    // and is bounded by construction.
    expect(result.plan).not.toBeNull();
    expect(result.plan?.id).toBe('test-plan');
  });
});

describe('buildMcpServer (end-to-end)', () => {
  it('registers all 17 tools and serves calls over a transport', async () => {
    const server = buildMcpServer({ rootDir: tmpDir });
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const { tools } = await client.listTools();
    expect(tools).toHaveLength(17);
    const toolNames = tools.map((t) => t.name);
    for (const name of [
      'nexus_list_agents',
      'nexus_get_agent',
      'nexus_get_context',
      'nexus_get_handoff',
      'nexus_wake',
      'nexus_get_vital_signs',
      'nexus_query_knowledge',
      'nexus_get_active_plan',
      'nexus_list_plans',
      'nexus_get_plan',
      'nexus_brief',
      'nexus_doctor',
      'nexus_list_skills',
      'nexus_get_skill',
      'nexus_plan_tick',
      'nexus_plan_note',
      'nexus_add_knowledge_entry',
    ]) {
      expect(toolNames).toContain(name);
    }

    // Read call round-trip
    const wake = await client.callTool({ name: 'nexus_wake', arguments: {} });
    const wakeText = (wake.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    expect(wakeText).toContain('NX-WAKE-');

    // Write call round-trip
    const tick = await client.callTool({
      name: 'nexus_plan_tick',
      arguments: { id: 'test-plan', step: 2 },
    });
    expect(tick.isError ?? false).toBe(false);

    // Handler errors surface as isError, not protocol crashes
    const bad = await client.callTool({ name: 'nexus_get_plan', arguments: { id: 'nope' } });
    expect(bad.isError).toBe(true);

    // v1.1: composed context round-trip
    const ctxCall = await client.callTool({
      name: 'nexus_get_context',
      arguments: { task: 'fix the npm mount ENOTEMPTY problem' },
    });
    expect(ctxCall.isError ?? false).toBe(false);
    const ctxText = (ctxCall.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    const composed = JSON.parse(ctxText);
    expect(composed.plan?.id).toBe('test-plan');
    expect(composed.knowledge.some((e: { title: string }) => e.title.includes('Mount renames'))).toBe(true);

    // Fix #3: handoff orchestration round-trip — main-thread driven, never crashes
    const handoff = await client.callTool({
      name: 'nexus_get_handoff',
      arguments: { agent: 'nexus-implementer' },
    });
    expect(handoff.isError ?? false).toBe(false);
    const handoffText = (handoff.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    expect(JSON.parse(handoffText).orchestration).toBe('main-thread');

    await client.close();
    await server.close();
  });
});
