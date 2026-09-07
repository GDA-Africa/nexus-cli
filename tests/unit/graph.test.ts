import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { beforeEach, describe, expect, it } from 'vitest';

import { runGraphCommand } from '../../src/commands/graph.js';
import { renderGraphDigest } from '../../src/utils/graph/digest.js';
import { parseProject, slug } from '../../src/utils/graph/parser.js';
import type { ProjectGraph } from '../../src/utils/graph/types.js';

let tmpDir: string;

/** Build a small, realistic NEXUS-brain project to parse. */
async function makeGraphProject(dir: string): Promise<void> {
  // brain + docs
  await fs.ensureDir(path.join(dir, '.nexus', 'docs'));
  await fs.ensureDir(path.join(dir, '.nexus', 'plans'));
  await fs.ensureDir(path.join(dir, '.nexus', 'state'));
  await fs.ensureDir(path.join(dir, 'src'));
  await fs.ensureDir(path.join(dir, 'tests'));

  // manifest
  await fs.writeFile(
    path.join(dir, '.nexus', 'manifest.json'),
    JSON.stringify({
      version: '1.0.0',
      generatedAt: '2026-09-07T00:00:00.000Z',
      config: { displayName: 'Graph Fixture', testFramework: 'vitest', frontendFramework: 'none' },
    }),
  );

  // vision with product features
  await fs.writeFile(
    path.join(dir, '.nexus', 'docs', '01_vision.md'),
    [
      '---',
      'nexus_doc: true',
      'title: "Graph Fixture Vision"',
      'status: populated',
      '---',
      '',
      '## Product Vision',
      '',
      'A small fixture app.',
      '',
      '## Core Features (MVP)',
      '',
      '## Feature 1: Auth',
      '## Feature 2: Billing',
      '',
    ].join('\n'),
  );

  // index with a feature backlog table
  await fs.writeFile(
    path.join(dir, '.nexus', 'docs', 'index.md'),
    [
      '## Feature Backlog',
      '',
      '| # | Feature | Priority | Status |',
      '|---|---------|----------|--------|',
      '| 1 | Logging & Observability | P1 | 📋 Draft |',
      '| 2 | Export to CSV | P2 | 💡 Scoped |',
      '',
    ].join('\n'),
  );

  // plans: one feature plan and one feature-scoped work plan
  await fs.writeFile(
    path.join(dir, '.nexus', 'plans', 'feature-auth.md'),
    [
      '---',
      'nexus_plan: true',
      'id: "feature-auth"',
      'title: "Auth feature plan"',
      'status: in_progress',
      'type: feature',
      '---',
      '',
      '## Stepby',
      '',
      '## Notes',
      '',
      '- 2026-09-07 — implemented login',
      '- 2026-09-07 — enforced RBAC',
      '',
    ].join('\n'),
  );
  await fs.writeFile(
    path.join(dir, '.nexus', 'plans', 'fix-billing.md'),
    [
      '---',
      'nexus_plan: true',
      'id: "fix-billing"',
      'title: "Billing bug fix"',
      'status: done',
      'type: bug',
      '---',
      '',
      '## Notes',
      '',
      '- 2026-09-06 — refunded duplicate charge',
      '',
    ].join('\n'),
  );

  // verify.json
  await fs.writeFile(
    path.join(dir, '.nexus', 'verify.json'),
    JSON.stringify({ checks: [{ id: 'types', run: 'npx tsc --noEmit' }] }),
  );

  // a state record
  await fs.writeFile(
    path.join(dir, '.nexus', 'state', 'chameleon.json'),
    JSON.stringify({ generatedAt: '2026-09-07T00:00:00.000Z' }),
  );

  // source + test files
  await fs.writeFile(path.join(dir, 'src', 'auth.ts'), 'export const login = () => true;\n');
  await fs.writeFile(path.join(dir, 'src', 'billing.ts'), 'export const charge = () => 0;\n');
  await fs.writeFile(path.join(dir, 'tests', 'auth.test.ts'), 'import { it } from "vitest"; it("ok", () => true);\n');
  await fs.writeFile(path.join(dir, 'tests', 'billing.test.ts'), 'it("ok", () => true);\n');
}

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `nexus-graph-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await makeGraphProject(tmpDir);
});

describe('parseProject', () => {
  it('parses a real-ish project into a non-empty, connected graph', async () => {
    const graph = await parseProject(tmpDir);

    expect(graph.project.name).toBe('Graph Fixture');
    expect(graph.project.testFramework).toBe('vitest');
    expect(graph.project.hasBrain).toBe(true);

    // requirements from vision features + index backlog
    expect(graph.requirements.length).toBeGreaterThanOrEqual(3);
    const titles = graph.requirements.map((r) => r.title);
    expect(titles.some((t) => /Feature 1: Auth/i.test(t))).toBe(true);
    expect(titles.some((t) => /Auth/i.test(t))).toBe(true);

    // tasks from plan files
    expect(graph.tasks.map((t) => t.id)).toEqual(expect.arrayContaining(['feature-auth', 'fix-billing']));
    expect(graph.tasks.find((t) => t.id === 'feature-auth')?.type).toBe('feature');

    // files + test targets
    expect(graph.files.some((f) => f.path === 'src/auth.ts' && f.kind === 'source')).toBe(true);
    expect(graph.testTargets.map((t) => t.path)).toEqual(
      expect.arrayContaining(['tests/auth.test.ts', 'tests/billing.test.ts']),
    );

    // evidence from verify + chameleon + notes
    expect(graph.evidence.some((e) => e.kind === 'verify')).toBe(true);
    expect(graph.evidence.some((e) => e.kind === 'chameleon')).toBe(true);
    expect(graph.evidence.some((e) => e.kind === 'plan-note')).toBe(true);
  });

  it('produces a fully internally-consistent graph (no dangling edges)', async () => {
    const graph = await parseProject(tmpDir);
    const allIds = new Set<string>();
    for (const n of [...graph.requirements, ...graph.features, ...graph.tasks, ...graph.evidence]) {
      allIds.add(n.id);
    }
    for (const t of graph.testTargets) allIds.add(t.path);

    for (const edge of graph.edges) {
      expect(allIds.has(edge.from), `edge.from ${edge.from} must resolve`).toBe(true);
      expect(allIds.has(edge.to), `edge.to ${edge.to} must resolve`).toBe(true);
    }
    for (const task of graph.tasks) {
      for (const evidenceId of task.evidenceIds) {
        expect(allIds.has(evidenceId), `task ${task.id} evidence ${evidenceId} must resolve`).toBe(true);
      }
    }
  });

  it('links task notes to evidence as a supports edge', async () => {
    const graph = await parseProject(tmpDir);
    const authTask = graph.tasks.find((t) => t.id === 'feature-auth');
    expect(authTask?.evidenceIds.length).toBeGreaterThan(0);
    const supports = graph.edges.filter((e) => e.kind === 'supports' && e.from === 'feature-auth');
    expect(supports.length).toBeGreaterThan(0);
  });

  it('never throws on malformed markdown / missing dirs', async () => {
    // A project with a brain but garbage prose (no frontmatter, no headings).
    await fs.ensureDir(path.join(tmpDir, '.nexus', 'docs'));
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', '01_vision.md'), 'just prose\nno structure\n'.repeat(5));
    let graph: ProjectGraph;
    try {
      graph = await parseProject(tmpDir);
    } catch (err) {
      expect.fail(`expected tolerant parse, got ${String(err)}`);
      return;
    }
    expect(graph.project.hasBrain).toBe(true);
    // A doc with a bare brain dir still yields a valid graph.
    const bare = path.join(tmpDir, 'bare');
    await fs.ensureDir(path.join(bare, '.nexus', 'docs'));
    const bareGraph = await parseProject(bare);
    expect(Array.isArray(bareGraph.edges)).toBe(true);
    expect(bareGraph.project.name).toBe('bare');
  });
});

describe('runGraphCommand', () => {
  it('writes the JSON graph to a file with --file', async () => {
    const outFile = path.join(tmpDir, 'out.json');
    const graph = await runGraphCommand({ root: tmpDir, file: outFile });
    expect(graph.requirements.length).toBeGreaterThan(0);
    const onDisk = JSON.parse(await fs.readFile(outFile, 'utf-8')) as ProjectGraph;
    expect(onDisk.project.name).toBe('Graph Fixture');
  });
});

describe('renderGraphDigest', () => {
  it('renders the spine and does not throw on an empty graph', async () => {
    const graph = await parseProject(tmpDir);
    const digest = renderGraphDigest(graph);
    expect(digest).toContain('# Graph Fixture — project graph');
    expect(digest).toContain('## Spine');
    expect(digest).toMatch(/requirements \| features \| tasks/);

    const empty = await parseProject(path.join(tmpDir, 'does-not-exist'));
    const emptyDigest = renderGraphDigest(empty);
    expect(emptyDigest).toContain('project graph');
  });
});

describe('slug', () => {
  it('produces stable, filesystem-safe ids', () => {
    expect(slug('  Feature 1: Auth!! ')).toBe('feature-1-auth');
    // Non-ASCII accents are stripped to keep id ASCII-safe and slug-stable.
    expect(slug('Café & Crème — Export')).toBe('caf-cr-me-export');
  });
});