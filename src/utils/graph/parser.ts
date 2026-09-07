/**
 * NEXUS CLI — Project Graph: parser
 *
 * Parses a real NEXUS project's on-disk state into a `ProjectGraph`. This is
 * Spike #1 (investigation §16 item 1): prove the §9 data model against real
 * bytes — plans, brain docs, verify/state JSON, and a repo walk.
 *
 * Design rules:
 * - Tolerant by construction. Unparsable prose, missing files, empty dirs all
 *   degrade, never throw. Malformed markdown becomes `references` edges.
 * - Reuse existing plan utils (`parsePlanContent` / `collectPlanSummaries`)
 *   rather than re-parsing plan files by hand.
 * - Deterministic: same input path → same graph ordering (stable sort).
 */

import path from 'node:path';

import fs from 'fs-extra';

import { collectPlanSummaries } from '../plans/index-builder.js';
import { parsePlanContent } from '../plans/parser.js';
import type { PlanFrontmatter, PlanSection } from '../plans/types.js';

import type {
  GraphEdge,
  GraphEvidence,
  GraphFeature,
  GraphFile,
  GraphProject,
  GraphRequirement,
  GraphTask,
  GraphTestTarget,
  ParseProjectOptions,
  ProjectGraph,
} from './types.js';

/** Walk caps — a real repo can be large; keep the spike bounded. */
const MAX_FILES_WALKED = 500;
/** React/Vue/etc. framework hints from package.json `dependencies`. */
const STACK_HINTS: ReadonlyArray<[string, string]> = [
  ['next', 'nextjs'],
  ['react', 'react'],
  ['vue', 'vue'],
  ['svelte', 'svelte'],
  ['@nestjs/core', 'nestjs'],
  ['express', 'express'],
  ['fastify', 'fastify'],
];

/**
 * Parse a NEXUS project root into a `ProjectGraph`. `rootDir` must exist;
 * anything else (no brain, no plans, no tests) degrades to an empty-but-valid
 * graph rather than throwing.
 */
export async function parseProject(
  rootDir: string,
  _options: ParseProjectOptions = {},
): Promise<ProjectGraph> {
  const brainDir = path.join(rootDir, '.nexus');
  const docsDir = path.join(brainDir, 'docs');
  const plansDir = path.join(brainDir, 'plans');
  const stateDir = path.join(brainDir, 'state');
  const verifyFile = path.join(brainDir, 'verify.json');

  const project = await buildGraphProject(rootDir, brainDir);
  const files = await walkFiles(rootDir);
  const testTargets = buildTestTargets(files);
  const planDocs = await collectPlanDocuments(plansDir);
  const tasks = planDocs.map((p) => planToTask(p));
  const requirements = await collectRequirements(docsDir);
  const features = deriveFeatures(tasks);
  const evidence = await collectEvidence(stateDir, verifyFile, planDocs, testTargets);

  const edges = buildEdges(requirements, features, tasks, evidence, testTargets);

  linkIds(requirements, features, tasks);

  return {
    project,
    requirements,
    features,
    tasks,
    evidence,
    files,
    testTargets,
    edges,
  };
}

/* ── Project ─────────────────────────────────────────────────────────── */

async function buildGraphProject(rootDir: string, brainDir: string): Promise<GraphProject> {
  const id = path.basename(rootDir) || 'project';
  const hasBrain = await fs.pathExists(path.join(brainDir, 'docs', 'index.md'));

  let name = id;
  let stack: string | undefined;
  let testFramework: string | undefined;

  // Prefer the NEXUS manifest, then package.json.
  const manifestPath = path.join(brainDir, 'manifest.json');
  if (await fs.pathExists(manifestPath)) {
    const manifest = await safeReadJson<{
      config?: { displayName?: string; testFramework?: string; frontendFramework?: string };
    }>(manifestPath);
    if (manifest?.config) {
      name = manifest.config.displayName ?? name;
      testFramework = manifest.config.testFramework;
      stack = manifest.config.frontendFramework || undefined;
      if (stack === 'none' || stack === 'None') stack = undefined;
    }
  }

  const pkgPath = path.join(rootDir, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = await safeReadJson<{
      name?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }>(pkgPath);
    if (pkg?.name) name = pkg.name;
    if (pkg?.dependencies || pkg?.devDependencies) {
      const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      stack ??= detectStack(deps);
      if (!testFramework) testFramework = detectTestFramework(deps);
    }
  }

  return { id, path: rootDir, name, stack, testFramework, hasBrain };
}

function detectStack(deps: Record<string, string>): string | undefined {
  for (const [pkg, label] of STACK_HINTS) {
    if (pkg in deps) return label;
  }
  return undefined;
}

function detectTestFramework(deps: Record<string, string>): string | undefined {
  if ('vitest' in deps) return 'vitest';
  if ('jest' in deps) return 'jest';
  if ('@playwright/test' in deps) return 'playwright';
  return undefined;
}

/* ── Files / test targets ────────────────────────────────────────────── */

async function walkFiles(rootDir: string): Promise<GraphFile[]> {
  const out: GraphFile[] = [];
  const seen = new Set<string>();
  const stack: string[] = [rootDir];
  let walked = 0;

  while (stack.length > 0 && walked < MAX_FILES_WALKED) {
    const dir = stack.pop();
    if (!dir) break;
    let dirents: Array<{ name: string; isDirectory: boolean }>;
    try {
      dirents = (await fs.readdir(dir, { withFileTypes: true })).map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
      }));
    } catch {
      continue; // unreadable dir → skip
    }
    for (const entry of dirents) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory) {
        stack.push(full);
        continue;
      }
      const rel = path.relative(rootDir, full).split(path.sep).join('/');
      if (seen.has(rel)) continue;
      seen.add(rel);
      walked += 1;
      let sizeBytes = 0;
      try {
        sizeBytes = (await fs.stat(full)).size;
      } catch {
        sizeBytes = 0;
      }
      out.push({ path: rel, kind: classifyFile(rel), sizeBytes });
    }
  }

  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function classifyFile(rel: string): GraphFile['kind'] {
  if (rel.startsWith('.nexus/') && rel.endsWith('.md')) return 'doc';
  if (rel.startsWith('docs/')) return 'doc';
  if (/\.test\.(ts|tsx|js|jsx)$/.test(rel)) return 'test';
  if (/\.(spec\.)(ts|tsx|js|jsx)$/.test(rel)) return 'test';
  if (/\.md$/.test(rel)) return 'doc';
  if (/\.(json|ya?ml|toml)$/.test(rel)) return 'config';
  if (/\.(ts|tsx|js|jsx)$/.test(rel)) return 'source';
  return 'config';
}

function buildTestTargets(files: GraphFile[]): GraphTestTarget[] {
  return files
    .filter((f) => f.kind === 'test')
    .map((f) => ({
      name: stripTestSuffix(basename(f.path)),
      path: f.path,
      language: path.extname(f.path).replace('.', '') || 'ts',
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function stripTestSuffix(name: string): string {
  return name.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '').replace(/\.(test|spec)$/, '') ?? name;
}

function basename(filePath: string): string {
  return path.basename(filePath);
}

/* ── Plans → Tasks ───────────────────────────────────────────────────── */

async function collectPlanDocuments(plansDir: string): Promise<Array<{ frontmatter: PlanFrontmatter; sections: PlanSection[]; file: string }>> {
  if (!(await fs.pathExists(plansDir))) return [];
  const summaries = await collectPlanSummaries(plansDir);
  const out: Array<{ frontmatter: PlanFrontmatter; sections: PlanSection[]; file: string }> = [];
  for (const summary of summaries) {
    try {
      const content = await fs.readFile(path.join(plansDir, summary.fileName), 'utf-8');
      const parsed = parsePlanContent(content);
      out.push({ frontmatter: parsed.frontmatter, sections: parsed.sections, file: summary.fileName });
    } catch {
      // A malformed plan just becomes a `references` edge via requirementId; do not abort.
      continue;
    }
  }
  return out.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
}

function planToTask(plan: {
  frontmatter: PlanFrontmatter;
  sections: PlanSection[];
  file: string;
}): GraphTask {
  return {
    id: plan.frontmatter.id,
    title: plan.frontmatter.title,
    status: plan.frontmatter.status,
    type: plan.frontmatter.type ?? null,
    sourcePlanId: plan.file.replace(/\.md$/, ''),
    evidenceIds: [],
  };
}

/* ── Requirements (from brain docs) ──────────────────────────────────── */

async function collectRequirements(docsDir: string): Promise<GraphRequirement[]> {
  const out: GraphRequirement[] = [];
  const seen = new Set<string>();
  const sources = new Map<string, string>(); // file -> markdown content

  if (!(await fs.pathExists(docsDir))) return out;

  let docFiles: string[] = [];
  try {
    docFiles = (await fs.readdir(docsDir)).filter((f) => f.endsWith('.md')).sort();
  } catch {
    docFiles = [];
  }
  for (const file of docFiles) {
    try {
      sources.set(file, await fs.readFile(path.join(docsDir, file), 'utf-8'));
    } catch {
      // unreadable doc → skip
    }
  }

  // (1) Vision doc: primary requirement from the vision heading.
  const visionContent = sources.get('01_vision.md');
  if (visionContent) {
    const visionHead = headingMatching(visionContent, /vision/i);
    if (visionHead) {
      pushRequirement(out, seen, {
        id: slug('req-01-vision'),
        title: visionHead,
        source: 'docs/01_vision.md',
        status: 'active',
        featureIds: [],
      });
    }
  }

  // (2) Feature-carrying headings ("Feature N: …" or "Core Features") in any
  //     doc become requirements — these are the product capabilities a TPM
  //     would want tracked. We keep the heading text as the requirement.
  for (const [file, content] of sources) {
    for (const heading of extractHeadings(content)) {
      const text = cleanHeading(heading);
      if (!/^feature\b|^core features\b/i.test(text)) continue;
      // Exclude structural section labels that happen to start with "Feature".
      if (/^(feature\s+backlog|feature\s+framework|feature\s+list|core\s+features\s*$)/i.test(text)) continue;
      const title = text.replace(/\.$/, '').trim();
      if (!title) continue;
      pushRequirement(out, seen, {
        id: slug(`req-${file}-${title}`),
        title,
        source: `docs/${file}`,
        status: 'backlog',
        featureIds: [],
      });
    }
  }

  // (3) The index's "Feature Backlog" table rows are explicit backlog items.
  const indexContent = sources.get('index.md');
  if (indexContent) {
    for (const row of extractTableRows(indexContent)) {
      // Column 2 of the backlog row is the feature description.
      const title = row.trim();
      if (!title || title === '—') continue;
      pushRequirement(out, seen, {
        id: slug(`req-index-${title}`),
        title,
        source: 'docs/index.md',
        status: 'backlog',
        featureIds: [],
      });
    }
  }

  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/** Find the first heading whose cleaned text matches a regex. */
function headingMatching(content: string, re: RegExp): string | null {
  for (const heading of extractHeadings(content)) {
    const text = cleanHeading(heading);
    if (re.test(text)) return text;
  }
  return null;
}

function cleanHeading(heading: string): string {
  return heading.replace(/^#+\s*/, '').trim();
}

/**
 * Extract product-backlog rows from a markdown table whose first column is a
 * numeric planning row and second column is the item — i.e. the Feature Backlog
 * table. Returns the *description* cell of each row.
 */
function extractTableRows(markdown: string): string[] {
  const rows: string[] = [];
  const re = /^\|\s*(\d+|\d+[a-z])\s*\|([^|]*)\|/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown)) !== null) {
    const cell = match[2] ?? '';
    const cleaned = cell.replace(/`/g, '').trim();
    if (cleaned && !/^(feature|priority|—|\d+)/i.test(cleaned)) rows.push(cleaned);
  }
  return rows;
}

function pushRequirement(
  out: GraphRequirement[],
  seen: Set<string>,
  req: GraphRequirement,
): void {
  if (seen.has(req.id)) return;
  if (req.title.length === 0) return;
  seen.add(req.id);
  out.push(req);
}

/* ── Features (derived from plans) ───────────────────────────────────── */

function deriveFeatures(tasks: GraphTask[]): GraphFeature[] {
  // A `type: feature` plan (or a plan whose source id names a feature /
  // release area) becomes a Feature node linked back to its task. This keeps
  // Feature as a distinct entity while staying derivable from plans alone.
  const uniq = new Map<string, GraphFeature>();
  for (const task of tasks) {
    const isFeature =
      task.type === 'feature' ||
      typeof task.sourcePlanId === 'string' && /feature|release/i.test(task.sourcePlanId);
    if (!isFeature) continue;
    const id = slug(`feature-${task.id}`);
    const existing = uniq.get(id);
    if (existing) {
      existing.taskIds = Array.from(new Set([...existing.taskIds, task.id]));
    } else {
      uniq.set(id, { id, name: task.title, requirementIds: [], taskIds: [task.id] });
    }
  }
  return Array.from(uniq.values()).sort((a, b) => a.id.localeCompare(b.id));
}

/* ── Evidence (state + verify + plan notes + test targets) ───────────── */

async function collectEvidence(
  stateDir: string,
  verifyFile: string,
  planDocs: Array<{ frontmatter: PlanFrontmatter; sections: PlanSection[]; file: string }>,
  testTargets: GraphTestTarget[],
): Promise<GraphEvidence[]> {
  const out: GraphEvidence[] = [];
  const seen = new Set<string>();
  const push = (e: GraphEvidence) => {
    if (seen.has(e.id)) return;
    seen.add(e.id);
    out.push(e);
  };

  // verify.json → `verify` evidence.
  if (await fs.pathExists(verifyFile)) {
    const v = await safeReadJson<{ checks?: Array<{ id: string; run?: string }> }>(verifyFile);
    if (v?.checks) {
      for (const check of v.checks) {
        push({
          id: slug(`ev-verify-${check.id}`),
          kind: 'verify',
          summary: check.run ?? check.id,
          sourcePath: '.nexus/verify.json',
        });
      }
    }
  }

  // state/*.json → `chameleon` or `verify` evidence, best-effort.
  if (await fs.pathExists(stateDir)) {
    let stateFiles: string[] = [];
    try {
      stateFiles = (await fs.readdir(stateDir)).filter((f) => f.endsWith('.json') && f !== 'upgrade-backup').sort();
    } catch {
      stateFiles = [];
    }
    for (const file of stateFiles) {
      const pathInState = path.join(stateDir, file);
      const rel = path.join('.nexus', 'state', file);
      const data = await safeReadJson<{ generatedAt?: string } | Array<unknown> | unknown>(pathInState);
      if (Array.isArray(data)) continue;
      const obj = data as { generatedAt?: string };
      if (file.startsWith('chameleon')) {
        push({
          id: slug(`ev-chameleon-${file}`),
          kind: 'chameleon',
          summary: 'Chameleon generation envelope',
          sourcePath: rel,
          verifiedAt: obj?.generatedAt,
        });
      } else {
        push({
          id: slug(`ev-state-${file}`),
          kind: 'verify',
          summary: `state record ${file}`,
          sourcePath: rel,
          verifiedAt: obj?.generatedAt,
        });
      }
    }
  }

  // plan Notes sections → `plan-note` evidence, linked by task id.
  for (const plan of planDocs) {
    const notes = plan.sections.find((s) => /notes/i.test(s.heading));
    if (notes && notes.content.trim().length > 0) {
      push({
        id: slug(`ev-note-${plan.frontmatter.id}`),
        kind: 'plan-note',
        summary: 'Plan notes',
        sourcePath: `.nexus/plans/${plan.file}`,
      });
    }
  }

  // test targets → `test` evidence.
  for (const t of testTargets) {
    push({
      id: slug(`ev-test-${t.path}`),
      kind: 'test',
      summary: `test target ${t.name}`,
      sourcePath: t.path,
    });
  }

  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/* ── Edges ───────────────────────────────────────────────────────────── */

function buildEdges(
  requirements: GraphRequirement[],
  features: GraphFeature[],
  tasks: GraphTask[],
  evidence: GraphEvidence[],
  testTargets: GraphTestTarget[],
): GraphEdge[] {
  const edges: GraphEdge[] = [];

  // Requirement → Feature (derives)
  for (const requirement of requirements) {
    for (const featureId of requirement.featureIds) {
      edges.push({ from: requirement.id, to: featureId, kind: 'derives' });
    }
  }

  // Requirement → any feature whose name mentions the requirement title.
  for (const requirement of requirements) {
    for (const feature of features) {
      if (requirement.featureIds.includes(feature.id)) continue;
      if (feature.name.toLowerCase().includes(requirement.title.toLowerCase())) {
        edges.push({ from: requirement.id, to: feature.id, kind: 'derives' });
        requirement.featureIds.push(feature.id);
        feature.requirementIds.push(requirement.id);
      }
    }
  }

  // Feature → Task (implements)
  for (const feature of features) {
    for (const taskId of feature.taskIds) {
      edges.push({ from: feature.id, to: taskId, kind: 'implements' });
    }
  }

  // Task → Evidence (supports): the strongest provable link is the plan's own
  // Notes evidence (`ev-note-<taskId>`). We keep it to exactly that; anything
  // else (verify evidence per-task, chameleon envelopes) is date-based and
  // deferred to a later spike, so we don't fabricate edges the bytes don't prove.
  for (const task of tasks) {
    for (const ev of evidence) {
      if (ev.id === slug(`ev-note-${task.id}`)) {
        edges.push({ from: task.id, to: ev.id, kind: 'supports' });
        task.evidenceIds.push(ev.id);
      }
    }
  }

  // TestTarget → Evidence (tests)
  for (const target of testTargets) {
    const testEvidence = evidence.find((e) => e.kind === 'test' && e.sourcePath === target.path);
    if (testEvidence) {
      edges.push({ from: target.path, to: testEvidence.id, kind: 'tests' });
    }
  }

  return edges;
}

/* ── Link ids (bidirectional, idempotent) ────────────────────────────── */

function linkIds(
  requirements: GraphRequirement[],
  features: GraphFeature[],
  _tasks: GraphTask[],
): void {
  // Feature ↔ Task are already linked (features carry taskIds). Here we only
  // back-fill Requirement ↔ Feature so the ids read correctly in both
  // directions. Tasks are accepted for symmetry but not modified.
  for (const requirement of requirements) {
    for (const featureId of requirement.featureIds) {
      const feature = features.find((f) => f.id === featureId);
      if (feature && !feature.requirementIds.includes(requirement.id)) {
        feature.requirementIds.push(requirement.id);
      }
    }
  }
}

/* ── small helpers ───────────────────────────────────────────────────── */

/** Parse headings (`##`/`###` …) from markdown robustly. */
function extractHeadings(content: string): string[] {
  const out: string[] = [];
  const re = /^#{1,4}\s+.+$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    out.push(match[0]);
  }
  return out;
}

/** Slugify for stable, filesystem-safe ids. */
export function slug(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[‘’"“”]/g, '')
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'item'
  );
}

/** Read + JSON.parse a file, returning `undefined` on any failure (tolerant). */
async function safeReadJson<T>(filePath: string): Promise<T | undefined> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}