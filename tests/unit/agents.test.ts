/**
 * NEXUS CLI — Agents Unit Tests (v1.1 "Contextualized Agents")
 *
 * Covers:
 *   - parseAgentContent: valid frontmatter, defaults, invalid status/role fallbacks, errors
 *   - restricted YAML: inline arrays, dash lists, nested maps
 *   - collectAgentSummaries / resolveAgent: precedence custom > core > community
 *   - generateAgents: core four + claude outputs + READMEs; enableAgents=false
 *   - renderAgentRolesBlock / replaceAgentRolesBlock: fenced idempotency
 *   - reconcile: custom agents SACRED on upgrade; core agents replaced
 *   - doctor D11: unverified done plans flagged; evidence/waiver pass
 */

import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  generateAgents,
  renderAgentRolesBlock,
  replaceAgentRolesBlock,
  coreAgentRolesSummaries,
} from '../../src/generators/agents.js';
import { upgradeProject } from '../../src/generators/index.js';
import type { NexusConfig } from '../../src/types/config.js';
import {
  parseAgentContent,
  collectAgentSummaries,
  resolveAgent,
  AgentParseError,
} from '../../src/utils/agents/parser.js';
import { buildHandoffChain, nextInChain } from '../../src/utils/agents/handoff.js';
import { buildDoctorContext } from '../../src/utils/doctor/context.js';
import { D11_unverified_done } from '../../src/utils/doctor/checks/D11.js';

const AGENT_FIXTURE = `---
nexus_agent: true
agent: test-agent
version: 1.0.0
role: verification
triggers: ["write tests", "verify"]
tools:
  read: [nexus_wake, nexus_get_active_plan]
  write: [nexus_plan_note]
context:
  docs: [06_test_strategy.md]
  knowledge_categories:
    - gotcha
    - pattern
  skills: ["testing-strategy"]
  plan_scope: active
handoff:
  after: nexus-implementer
status: active
---

# Agent: test-agent

## Mission
Verify everything.
`;

/* ──────────────────────────────────────────────────────────────
 * Parser
 * ────────────────────────────────────────────────────────────── */

describe('parseAgentContent', () => {
  it('parses full frontmatter incl. nested maps, inline arrays, and dash lists', () => {
    const def = parseAgentContent(AGENT_FIXTURE);
    expect(def.frontmatter.agent).toBe('test-agent');
    expect(def.frontmatter.role).toBe('verification');
    expect(def.frontmatter.triggers).toEqual(['write tests', 'verify']);
    expect(def.frontmatter.tools.read).toEqual(['nexus_wake', 'nexus_get_active_plan']);
    expect(def.frontmatter.tools.write).toEqual(['nexus_plan_note']);
    expect(def.frontmatter.context.docs).toEqual(['06_test_strategy.md']);
    expect(def.frontmatter.context.knowledge_categories).toEqual(['gotcha', 'pattern']);
    expect(def.frontmatter.context.plan_scope).toBe('active');
    expect(def.frontmatter.handoff.after).toBe('nexus-implementer');
    expect(def.body).toContain('Verify everything.');
  });

  it('throws a clean error when frontmatter is missing', () => {
    expect(() => parseAgentContent('# No frontmatter')).toThrow(AgentParseError);
  });

  it('throws when the agent name is missing', () => {
    expect(() => parseAgentContent('---\nrole: build\n---\nbody')).toThrow(/missing required field/);
  });

  it('falls back to safe defaults on unknown role/status (defensive parsing)', () => {
    const def = parseAgentContent('---\nagent: x\nrole: wizard\nstatus: banana\n---\nbody');
    expect(def.frontmatter.role).toBe('custom');
    expect(def.frontmatter.status).toBe('active');
  });
});

/* ──────────────────────────────────────────────────────────────
 * Precedence
 * ────────────────────────────────────────────────────────────── */

describe('agent precedence', () => {
  let tmpDir: string;
  let agentsDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-agents-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    agentsDir = path.join(tmpDir, '.nexus', 'agents');
    for (const sub of ['core', 'custom', 'community']) await fs.ensureDir(path.join(agentsDir, sub));
    await fs.writeFile(path.join(agentsDir, 'core', 'worker.md'), AGENT_FIXTURE.replace('test-agent', 'worker'));
    await fs.writeFile(
      path.join(agentsDir, 'custom', 'worker.md'),
      AGENT_FIXTURE.replace('test-agent', 'worker').replace('Verify everything.', 'CUSTOM OVERRIDE'),
    );
    await fs.writeFile(path.join(agentsDir, 'community', 'extra.md'), AGENT_FIXTURE.replace('test-agent', 'extra'));
  });

  afterEach(async () => fs.remove(tmpDir));

  it('dedupes by precedence custom > core > community', async () => {
    const summaries = await collectAgentSummaries(agentsDir);
    const worker = summaries.find((s) => s.name === 'worker');
    expect(worker?.source).toBe('custom');
    expect(summaries.map((s) => s.name).sort()).toEqual(['extra', 'worker']);
  });

  it('resolveAgent returns the custom override', async () => {
    const resolved = await resolveAgent(agentsDir, 'worker');
    expect(resolved?.source).toBe('custom');
    expect(resolved?.definition.body).toContain('CUSTOM OVERRIDE');
  });
});

/* ──────────────────────────────────────────────────────────────
 * Generator
 * ────────────────────────────────────────────────────────────── */

const baseConfig = {
  projectName: 'test-app',
  displayName: 'Test App',
  projectType: 'web',
  frontendFramework: 'nextjs',
  backendStrategy: 'integrated',
  backendFramework: 'none',
  dataStrategy: 'cloud-first',
  appPatterns: [],
  features: [],
  packageManager: 'npm',
  testFramework: 'vitest',
  git: false,
  installDeps: false,
  persona: { tone: 'friendly', verbosity: 'balanced', identity: 'Nexus', customDirective: '' },
} as unknown as NexusConfig;

describe('generateAgents', () => {
  it('emits the core four + claude subagents + READMEs', () => {
    const files = generateAgents(baseConfig);
    const paths = files.map((f) => f.path);

    for (const name of ['nexus-implementer', 'nexus-test-writer', 'nexus-reviewer', 'nexus-doc-keeper']) {
      expect(paths).toContain(`.nexus/agents/core/${name}.md`);
      expect(paths).toContain(`.claude/agents/${name}.md`);
    }
    expect(paths).toContain('.nexus/agents/README.md');
    expect(paths).toContain('.nexus/agents/custom/README.md');
  });

  it('generated core agents are parseable by our own parser (round-trip)', () => {
    const files = generateAgents(baseConfig);
    const core = files.filter((f) => f.path.startsWith('.nexus/agents/core/'));
    for (const file of core) {
      const def = parseAgentContent(file.content);
      expect(def.frontmatter.agent).toMatch(/^nexus-/);
      expect(def.frontmatter.triggers.length).toBeGreaterThan(0);
      expect(def.body).toContain('## Mission');
    }
  });

  it('test-writer must ask before scaffolding and never self-verify', () => {
    const files = generateAgents(baseConfig);
    const tw = files.find((f) => f.path === '.nexus/agents/core/nexus-test-writer.md');
    expect(tw?.content).toContain('STOP AND ASK');
    expect(tw?.content).toContain('WAIVER');
    expect(tw?.content).toContain('never your own implementation');
  });

  it('returns nothing when enableAgents is false', () => {
    expect(generateAgents({ ...baseConfig, enableAgents: false } as NexusConfig)).toEqual([]);
  });

  /** Pull the `tools:` line out of a Claude subagent's frontmatter. */
  function subagentToolsLine(content: string): string {
    const line = content.split('\n').find((l) => l.startsWith('tools:'));
    return line ?? '';
  }

  it('implementer subagent can actually edit files (Edit + Write granted)', () => {
    const files = generateAgents(baseConfig);
    const impl = files.find((f) => f.path === '.claude/agents/nexus-implementer.md');
    const tools = subagentToolsLine(impl?.content ?? '');
    expect(tools).toContain('Edit');
    expect(tools).toContain('Write');
    expect(tools).toContain('Bash');
  });

  it('reviewer subagent is read-only — no Edit/Write (separation of duties)', () => {
    const files = generateAgents(baseConfig);
    const reviewer = files.find((f) => f.path === '.claude/agents/nexus-reviewer.md');
    const tools = subagentToolsLine(reviewer?.content ?? '');
    expect(tools).toContain('Read');
    expect(tools).not.toContain('Edit');
    expect(tools).not.toContain('Write');
  });

  it('subagent MCP tools are namespaced as mcp__nexus-brain__*', () => {
    const files = generateAgents(baseConfig);
    const impl = files.find((f) => f.path === '.claude/agents/nexus-implementer.md');
    const tools = subagentToolsLine(impl?.content ?? '');
    expect(tools).toContain('mcp__nexus-brain__nexus_wake');
    expect(tools).toContain('mcp__nexus-brain__nexus_plan_tick');
    // Bare (un-namespaced) brain tool names must not leak into the tools list.
    expect(tools).not.toMatch(/(?:^|,\s)nexus_wake/);
  });

  it('subagent description states real capability, not "MCP tools only"', () => {
    const files = generateAgents(baseConfig);
    const impl = files.find((f) => f.path === '.claude/agents/nexus-implementer.md');
    expect(impl?.content).toContain('Can read, edit, and run code');
    const reviewer = files.find((f) => f.path === '.claude/agents/nexus-reviewer.md');
    expect(reviewer?.content).toContain('Read-only');
  });

  it('core agent source frontmatter persists tools.exec (round-trips through parser)', () => {
    const files = generateAgents(baseConfig);
    const impl = files.find((f) => f.path === '.nexus/agents/core/nexus-implementer.md');
    const def = parseAgentContent(impl?.content ?? '');
    expect(def.frontmatter.tools.exec).toContain('Edit');
    const reviewerFile = files.find((f) => f.path === '.nexus/agents/core/nexus-reviewer.md');
    const reviewer = parseAgentContent(reviewerFile?.content ?? '');
    expect(reviewer.frontmatter.tools.exec).not.toContain('Edit');
  });
});

describe('buildHandoffChain', () => {
  it('orders the core four pipeline from handoff.after links', () => {
    const chain = buildHandoffChain([
      { name: 'nexus-reviewer', after: 'nexus-test-writer' },
      { name: 'nexus-implementer' },
      { name: 'nexus-doc-keeper', after: 'nexus-reviewer' },
      { name: 'nexus-test-writer', after: 'nexus-implementer' },
    ]);
    expect(chain).toEqual([
      'nexus-implementer',
      'nexus-test-writer',
      'nexus-reviewer',
      'nexus-doc-keeper',
    ]);
  });

  it('nextInChain returns the successor, or null at the end', () => {
    const chain = ['a', 'b', 'c'];
    expect(nextInChain(chain, 'a')).toBe('b');
    expect(nextInChain(chain, 'c')).toBeNull();
    expect(nextInChain(chain, 'missing')).toBeNull();
  });

  it('tolerates cycles and orphans without looping, placing every agent once', () => {
    const chain = buildHandoffChain([
      { name: 'x', after: 'y' },
      { name: 'y', after: 'x' }, // cycle
      { name: 'z', after: 'nonexistent' }, // orphan → treated as a root
    ]);
    expect([...chain].sort()).toEqual(['x', 'y', 'z']);
    expect(chain).toHaveLength(3);
  });
});

describe('agent roles block', () => {
  it('is idempotent: replacing twice yields one block', () => {
    const block = renderAgentRolesBlock(coreAgentRolesSummaries());
    const original = '# AGENTS.md\nSome instructions.\n';
    const once = replaceAgentRolesBlock(original, block);
    const twice = replaceAgentRolesBlock(once, block);
    expect(twice.match(/NEXUS:AGENT_ROLES:START/g)).toHaveLength(1);
    expect(twice).toContain('nexus-test-writer');
  });
});

/* ──────────────────────────────────────────────────────────────
 * Reconcile sacredness
 * ────────────────────────────────────────────────────────────── */

describe('upgrade + agents', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-agents-upg-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(path.join(tmpDir, '.nexus', 'docs'));
  });

  afterEach(async () => fs.remove(tmpDir));

  it('custom agents are SACRED; core agents are replaced', async () => {
    const customPath = path.join(tmpDir, '.nexus', 'agents', 'custom', 'README.md');
    await fs.ensureDir(path.dirname(customPath));
    await fs.writeFile(customPath, 'MY CUSTOM NOTES — do not touch');

    const corePath = path.join(tmpDir, '.nexus', 'agents', 'core', 'nexus-implementer.md');
    await fs.ensureDir(path.dirname(corePath));
    await fs.writeFile(corePath, '---\nagent: nexus-implementer\n---\nOLD CONTENT');

    const result = await upgradeProject(tmpDir, baseConfig);

    expect(result.preserved).toContain('.nexus/agents/custom/README.md');
    expect(await fs.readFile(customPath, 'utf-8')).toBe('MY CUSTOM NOTES — do not touch');

    expect(result.replaced).toContain('.nexus/agents/core/nexus-implementer.md');
    expect(await fs.readFile(corePath, 'utf-8')).toContain('## Mission');
  });
});

/* ──────────────────────────────────────────────────────────────
 * Doctor D11 — unverified done
 * ────────────────────────────────────────────────────────────── */

describe('D11 unverified done', () => {
  let tmpDir: string;

  const planWith = (evidence: string): string => `---
nexus_plan: true
id: "p1"
title: "Plan One"
status: "done"
---

## Goal
g

## Steps
- [x] 1. step

## Evidence
${evidence}
`;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-d11-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(path.join(tmpDir, '.nexus', 'plans'));
    await fs.ensureDir(path.join(tmpDir, '.nexus', 'docs'));
  });

  afterEach(async () => fs.remove(tmpDir));

  async function runD11(evidence: string) {
    await fs.writeFile(path.join(tmpDir, '.nexus', 'plans', 'p1.md'), planWith(evidence));
    const ctx = await buildDoctorContext(tmpDir, path.join(tmpDir, '.nexus'));
    return D11_unverified_done.run(ctx);
  }

  it('flags done plans with empty evidence', async () => {
    const findings = await runD11('');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.id).toBe('D11');
    expect(findings[0]?.severity).toBe('warn');
  });

  it('passes with test evidence', async () => {
    const findings = await runD11('- 2026-06-11 — vitest: 422 tests passing');
    expect(findings).toHaveLength(0);
  });

  it('passes with an explicit waiver', async () => {
    const findings = await runD11('- 2026-06-11 — WAIVER: docs-only change, approved by Halton');
    expect(findings).toHaveLength(0);
  });

  it('ignores plans that are not done', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.nexus', 'plans', 'p1.md'),
      planWith('').replace('status: "done"', 'status: "in_progress"'),
    );
    const ctx = await buildDoctorContext(tmpDir, path.join(tmpDir, '.nexus'));
    expect(await D11_unverified_done.run(ctx)).toHaveLength(0);
  });
});
