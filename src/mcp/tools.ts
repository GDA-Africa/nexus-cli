/**
 * NEXUS MCP — Tool handlers
 *
 * Pure(ish) handler functions behind the `nexus mcp` server. Each handler
 * takes a BrainContext plus validated input and returns a JSON-serializable
 * result. No console output, no process.exit — stdout belongs to the MCP
 * protocol. Reuses the same utils the CLI commands are built on, so MCP
 * writes go through identical validation (lifecycle, checklist parsing).
 *
 * Spec: .nexus/plans/release-v1-mcp-headline.md
 */

import path from 'node:path';

import fs from 'fs-extra';

import { buildBriefData, renderBriefMarkdown } from '../commands/brief.js';
import { issueWakeToken } from '../commands/wake.js';
import { collectAgentSummaries, resolveAgent } from '../utils/agents/parser.js';
import type { AgentSummary } from '../utils/agents/types.js';
import { buildDoctorContext } from '../utils/doctor/context.js';
import { runDoctor } from '../utils/doctor/index.js';
import type { DoctorReport } from '../utils/doctor/types.js';
import { parseKnowledge, type KnowledgeEntry } from '../utils/knowledge.js';
import { readActivePlans } from '../utils/plans/active.js';
import { collectPlanSummaries, rebuildPlansIndex } from '../utils/plans/index-builder.js';
import {
  appendSectionEntry,
  getSection,
  parseChecklist,
  parsePlanContent,
  setSection,
  updateChecklistItem,
  writePlanFile,
} from '../utils/plans/parser.js';
import type { PlanDocument, PlanSummary } from '../utils/plans/types.js';
import { captureVitalSigns, type VitalSigns } from '../utils/sensors/index.js';

import { McpToolError, type BrainContext } from './context.js';

/* ──────────────────────────────────────────────────────────────
 * Read tools
 * ────────────────────────────────────────────────────────────── */

export interface WakeToolResult {
  token: string;
  brainHash: string;
  activePlan: string | null;
  activePlanStatus: string | null;
  nextStep: string | null;
  doctorErrors: number;
  doctorWarnings: number;
  instructions: string;
}

/** Session handshake: token + compact brain digest in one call. */
export async function wakeTool(ctx: BrainContext, input: { agent?: string } = {}): Promise<WakeToolResult> {
  const result = await issueWakeToken(ctx.nexusDir, {
    issuedBy: input.agent ? `nexus mcp (agent: ${input.agent})` : 'nexus mcp (nexus_wake)',
  });

  let nextStep: string | null = null;
  if (result.activePlan) {
    const plan = await readPlanIfExists(ctx, result.activePlan);
    if (plan) nextStep = firstUncheckedStep(plan);
  }

  const doctorCtx = await buildDoctorContext(ctx.projectRoot, ctx.nexusDir);
  const report = await runDoctor(doctorCtx, { minSeverity: 'warn' });

  return {
    ...result,
    nextStep,
    doctorErrors: report.summary.error,
    doctorWarnings: report.summary.warn,
    instructions:
      'Echo this token in your first response to prove the brain was read. ' +
      'Use nexus_get_active_plan for full plan context before starting work.',
  };
}

/** Live repo sensors (git, files, tests, packages). */
export async function getVitalSignsTool(ctx: BrainContext): Promise<VitalSigns> {
  return captureVitalSigns({ cwd: ctx.projectRoot });
}

export interface QueryKnowledgeInput {
  /** Space-separated keywords matched against category, title, and body. */
  query?: string;
  /** Restrict to one category tag, e.g. "gotcha". */
  category?: string;
  /** Maximum entries returned (default 10). */
  limit?: number;
}

export interface KnowledgeMatch {
  category: string;
  title: string;
  date: string | null;
  body: string;
}

/** Targeted retrieval over .nexus/docs/knowledge.md (append-only log). */
export async function queryKnowledgeTool(
  ctx: BrainContext,
  input: QueryKnowledgeInput,
): Promise<{ total: number; returned: number; entries: KnowledgeMatch[] }> {
  const knowledgePath = path.join(ctx.docsDir, 'knowledge.md');
  if (!(await fs.pathExists(knowledgePath))) {
    throw new McpToolError('No knowledge base found at .nexus/docs/knowledge.md.');
  }

  const parsed = parseKnowledge(await fs.readFile(knowledgePath, 'utf-8'));
  let entries = parsed.entries;

  if (input.category) {
    const wanted = input.category.toLowerCase();
    entries = entries.filter((entry) => entry.category.toLowerCase() === wanted);
  }

  if (input.query) {
    const terms = input.query.toLowerCase().split(/\s+/).filter(Boolean);
    entries = entries.filter((entry) => {
      const haystack = `${entry.category} ${entry.title} ${entry.raw.join(' ')}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  const limit = Math.max(1, Math.min(input.limit ?? 10, 50));
  const selected = entries.slice(-limit).reverse(); // newest entries live at the bottom

  return {
    total: entries.length,
    returned: selected.length,
    entries: selected.map(toKnowledgeMatch),
  };
}

export interface ActivePlanResult {
  id: string | null;
  status: string | null;
  title: string | null;
  nextStep: string | null;
  steps: Array<{ index: number; checked: boolean; text: string }>;
  markdown: string | null;
  note: string;
}

/** The active plan with its next unchecked step — the "what am I doing" call. */
export async function getActivePlanTool(ctx: BrainContext): Promise<ActivePlanResult> {
  const state = await readActivePlans(ctx.plansDir);
  const id = state.active[0] ?? null;

  if (!id) {
    return {
      id: null,
      status: null,
      title: null,
      nextStep: null,
      steps: [],
      markdown: null,
      note: 'No active plan. Use nexus_list_plans to see available plans, or `nexus plan new` to open one.',
    };
  }

  const plan = await readPlanIfExists(ctx, id);
  if (!plan) {
    throw new McpToolError(`Active plan "${id}" points to a missing file: .nexus/plans/${id}.md`);
  }

  const stepsSection = getSection(plan, 'Steps');
  const checklist = stepsSection ? parseChecklist(stepsSection.content) : [];

  return {
    id,
    status: plan.frontmatter.status,
    title: plan.frontmatter.title,
    nextStep: firstUncheckedStep(plan),
    steps: checklist.map((item, index) => ({ index: index + 1, checked: item.checked, text: item.text })),
    markdown: await fs.readFile(planPath(ctx, id), 'utf-8'),
    note: state.note ?? '',
  };
}

/** All plans with status, for orientation. */
export async function listPlansTool(
  ctx: BrainContext,
  input: { status?: string },
): Promise<{ plans: PlanSummary[] }> {
  let plans = await collectPlanSummaries(ctx.plansDir);
  if (input.status) {
    plans = plans.filter((plan) => plan.status === input.status);
  }
  return { plans };
}

/** Full markdown of one plan. */
export async function getPlanTool(ctx: BrainContext, input: { id: string }): Promise<{ id: string; markdown: string }> {
  const filePath = planPath(ctx, input.id);
  if (!(await fs.pathExists(filePath))) {
    throw new McpToolError(`Plan not found: .nexus/plans/${input.id}.md`);
  }
  return { id: input.id, markdown: await fs.readFile(filePath, 'utf-8') };
}

/** Markdown status digest (same output as `nexus brief --md`). */
export async function briefTool(ctx: BrainContext, input: { since?: string }): Promise<{ markdown: string }> {
  const data = await buildBriefData(ctx.projectRoot, ctx.nexusDir, input.since ?? '7 days ago');
  return { markdown: renderBriefMarkdown(data) };
}

/** Drift report (D01–D10 checks). */
export async function doctorTool(
  ctx: BrainContext,
  input: { minSeverity?: 'info' | 'warn' | 'error' },
): Promise<DoctorReport> {
  const doctorCtx = await buildDoctorContext(ctx.projectRoot, ctx.nexusDir);
  return runDoctor(doctorCtx, { minSeverity: input.minSeverity ?? 'info' });
}

/* ──────────────────────────────────────────────────────────────
 * Skills tools (precedence: custom > core > community)
 * ────────────────────────────────────────────────────────────── */

const SKILL_DIRS = ['custom', 'core', 'community'] as const;
export type SkillSource = (typeof SKILL_DIRS)[number];

export interface SkillSummary {
  name: string;
  source: SkillSource;
  title: string | null;
  description: string | null;
  triggers: string[];
}

/** List every installed skill across custom/, core/, community/. */
export async function listSkillsTool(ctx: BrainContext): Promise<{ skills: SkillSummary[] }> {
  const skills: SkillSummary[] = [];
  const seen = new Set<string>();

  for (const source of SKILL_DIRS) {
    const dir = path.join(ctx.skillsDir, source);
    if (!(await fs.pathExists(dir))) continue;

    const entries = (await fs.readdir(dir)).filter(
      (name) => name.endsWith('.md') && name.toLowerCase() !== 'readme.md',
    );

    for (const fileName of entries.sort()) {
      const name = fileName.replace(/\.md$/, '');
      if (seen.has(name)) continue; // higher-precedence dir already provided it
      seen.add(name);

      const meta = parseSkillFrontmatter(await fs.readFile(path.join(dir, fileName), 'utf-8'));
      skills.push({ name, source, ...meta });
    }
  }

  return { skills };
}

/** Read one skill by name, honoring custom > core > community precedence. */
export async function getSkillTool(
  ctx: BrainContext,
  input: { name: string },
): Promise<{ name: string; source: SkillSource; markdown: string }> {
  const fileName = `${input.name.replace(/\.md$/, '')}.md`;

  for (const source of SKILL_DIRS) {
    const filePath = path.join(ctx.skillsDir, source, fileName);
    if (await fs.pathExists(filePath)) {
      return { name: input.name, source, markdown: await fs.readFile(filePath, 'utf-8') };
    }
  }

  throw new McpToolError(
    `Skill "${input.name}" not found in .nexus/skills/{custom,core,community}. Use nexus_list_skills to browse.`,
  );
}

/* ──────────────────────────────────────────────────────────────
 * Agents tools (v1.1 — precedence: custom > core > community)
 * ────────────────────────────────────────────────────────────── */

function agentsDir(ctx: BrainContext): string {
  return path.join(ctx.nexusDir, 'agents');
}

/** List installed agent definitions. */
export async function listAgentsTool(ctx: BrainContext): Promise<{ agents: AgentSummary[] }> {
  return { agents: await collectAgentSummaries(agentsDir(ctx)) };
}

/** Read one agent definition by name. */
export async function getAgentTool(
  ctx: BrainContext,
  input: { name: string },
): Promise<{ name: string; source: string; markdown: string }> {
  const resolved = await resolveAgent(agentsDir(ctx), input.name);
  if (!resolved) {
    throw new McpToolError(
      `Agent "${input.name}" not found in .nexus/agents/{custom,core,community}. Use nexus_list_agents to browse.`,
    );
  }
  const markdown = await fs.readFile(resolved.filePath, 'utf-8');
  return { name: input.name, source: resolved.source, markdown };
}

export interface GetContextInput {
  /** Task description — used to match knowledge entries and skill triggers */
  task: string;
  /** Optional agent whose context recipe scopes the composition */
  agent?: string;
  /** Soft cap on composed payload size (default 12000 chars) */
  maxChars?: number;
}

export interface ComposedContext {
  task: string;
  agent: string | null;
  plan: { id: string; status: string; nextStep: string | null } | null;
  knowledge: KnowledgeMatch[];
  skills: Array<{ name: string; source: string; matchedTrigger: string }>;
  vitals: { branch: string | null; dirty: boolean | null; testsSummary: string };
  docs: Array<{ file: string; excerpt: string }>;
  truncated: boolean;
}

/**
 * The v1.1 keystone: compose ONE scoped context pack for a task instead of
 * N piecemeal reads. Deterministic — keyword/trigger matching, no LLM.
 */
export async function getContextTool(ctx: BrainContext, input: GetContextInput): Promise<ComposedContext> {
  const maxChars = Math.max(2000, Math.min(input.maxChars ?? 12000, 60000));
  let budget = maxChars;
  let truncated = false;

  // Agent recipe (optional)
  const resolved = input.agent ? await resolveAgent(agentsDir(ctx), input.agent) : null;
  const recipe = resolved?.definition.frontmatter.context ?? null;

  // 1. Plan slice
  let plan: ComposedContext['plan'] = null;
  if (recipe?.plan_scope !== 'none') {
    const state = await readActivePlans(ctx.plansDir);
    const activeId = state.active[0] ?? null;
    if (activeId) {
      const planDoc = await readPlanIfExists(ctx, activeId);
      if (planDoc) {
        plan = { id: activeId, status: planDoc.frontmatter.status, nextStep: firstUncheckedStep(planDoc) };
      }
    }
  }

  // 2. Knowledge — task keywords, optionally restricted to recipe categories
  const terms = input.task.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  let knowledge: KnowledgeMatch[] = [];
  const knowledgePath = path.join(ctx.docsDir, 'knowledge.md');
  if (await fs.pathExists(knowledgePath)) {
    const parsed = parseKnowledge(await fs.readFile(knowledgePath, 'utf-8'));
    knowledge = parsed.entries
      .filter((e) => !recipe || recipe.knowledge_categories.length === 0 || recipe.knowledge_categories.includes(e.category))
      .filter((e) => {
        const hay = `${e.category} ${e.title} ${e.raw.join(' ')}`.toLowerCase();
        return terms.some((t) => hay.includes(t));
      })
      .slice(-5)
      .reverse()
      .map(toKnowledgeMatch);
  }

  // 3. Skills — trigger matching against the task
  const { skills: allSkills } = await listSkillsTool(ctx);
  const skills: ComposedContext['skills'] = [];
  for (const skill of allSkills) {
    const matched = skill.triggers.find((trigger) => input.task.toLowerCase().includes(trigger.toLowerCase()));
    if (matched) skills.push({ name: skill.name, source: skill.source, matchedTrigger: matched });
  }

  // 4. Vitals digest (cheap snapshot, no test run)
  const vs = await captureVitalSigns({ cwd: ctx.projectRoot, timeoutMs: 1500 });
  const vitals = {
    branch: (vs.git as { branch?: string | null }).branch ?? null,
    dirty: (vs.git as { dirty?: boolean | null }).dirty ?? null,
    testsSummary: JSON.stringify(vs.tests).slice(0, 200),
  };

  // 5. Recipe-named docs — excerpts within budget
  const docs: ComposedContext['docs'] = [];
  budget -= JSON.stringify({ plan, knowledge, skills, vitals }).length;
  for (const docFile of recipe?.docs ?? []) {
    const docPath = path.join(ctx.docsDir, docFile);
    if (!(await fs.pathExists(docPath))) continue;
    const content = await fs.readFile(docPath, 'utf-8');
    const excerpt = content.length > budget ? content.slice(0, Math.max(0, budget)) : content;
    if (excerpt.length < content.length) truncated = true;
    if (excerpt.length > 0) {
      docs.push({ file: docFile, excerpt });
      budget -= excerpt.length;
    }
    if (budget <= 0) {
      truncated = true;
      break;
    }
  }

  return { task: input.task, agent: input.agent ?? null, plan, knowledge, skills, vitals, docs, truncated };
}

/* ──────────────────────────────────────────────────────────────
 * Write tools — schema-validated brain mutations
 * ────────────────────────────────────────────────────────────── */

export interface PlanTickInput {
  id: string;
  /** 1-based step index as shown by nexus_get_active_plan. */
  step: number;
  /** Set false to reopen a step. Default true. */
  checked?: boolean;
}

export async function planTickTool(
  ctx: BrainContext,
  input: PlanTickInput,
): Promise<{ id: string; step: number; checked: boolean; nextStep: string | null }> {
  const plan = await requirePlan(ctx, input.id);

  const stepsSection = getSection(plan, 'Steps');
  if (!stepsSection) {
    throw new McpToolError(`Plan "${input.id}" has no "Steps" section.`);
  }

  const checklist = parseChecklist(stepsSection.content);
  if (input.step < 1 || input.step > checklist.length) {
    throw new McpToolError(
      `Step ${input.step} is out of range — plan "${input.id}" has ${checklist.length} steps (1-based).`,
    );
  }

  const checked = input.checked !== false;
  const next = setSection(plan, 'Steps', updateChecklistItem(stepsSection.content, input.step, checked));
  next.frontmatter.updated = todayStamp();

  await writePlanFile(planPath(ctx, input.id), next);
  await rebuildPlansIndex(ctx.plansDir);

  return { id: input.id, step: input.step, checked, nextStep: firstUncheckedStep(next) };
}

export async function planNoteTool(
  ctx: BrainContext,
  input: { id: string; message: string },
): Promise<{ id: string; noted: string }> {
  const plan = await requirePlan(ctx, input.id);

  const stamp = new Date().toISOString();
  const next = appendSectionEntry(plan, 'Notes', `- ${stamp} — ${input.message}`);
  next.frontmatter.updated = todayStamp();

  await writePlanFile(planPath(ctx, input.id), next);
  await rebuildPlansIndex(ctx.plansDir);

  return { id: input.id, noted: `${stamp} — ${input.message}` };
}

export const KNOWLEDGE_CATEGORIES = [
  'architecture',
  'bug-fix',
  'pattern',
  'package',
  'performance',
  'convention',
  'gotcha',
  'integration',
] as const;

export interface AddKnowledgeInput {
  category: (typeof KNOWLEDGE_CATEGORIES)[number];
  title: string;
  /** 1–3 sentence insight. */
  body: string;
  /** Optional "Why" line appended as **Why:** ... */
  why?: string;
  /** Optional "How to apply" line appended as **How to apply:** ... */
  howToApply?: string;
}

/** Append a validated entry to the append-only knowledge base. */
export async function addKnowledgeEntryTool(
  ctx: BrainContext,
  input: AddKnowledgeInput,
): Promise<{ heading: string; appended: true }> {
  const knowledgePath = path.join(ctx.docsDir, 'knowledge.md');
  if (!(await fs.pathExists(knowledgePath))) {
    throw new McpToolError('No knowledge base found at .nexus/docs/knowledge.md.');
  }

  const heading = `### [${input.category}] ${input.title}`;
  const entryLines = [heading, `**${todayStamp()}** — ${input.body.trim()}`];
  if (input.why) entryLines.push(`**Why:** ${input.why.trim()}`);
  if (input.howToApply) entryLines.push(`**How to apply:** ${input.howToApply.trim()}`);

  const content = await fs.readFile(knowledgePath, 'utf-8');
  const parsed = parseKnowledge(content);

  if (parsed.entries.some((entry) => entry.category === input.category && entry.title === input.title)) {
    throw new McpToolError(
      `An entry "[${input.category}] ${input.title}" already exists. The knowledge base is append-only — pick a new title.`,
    );
  }

  const updated = insertBeforePostamble(content, parsed.postamble, entryLines.join('\n'));
  await fs.writeFile(knowledgePath, updated, 'utf-8');

  return { heading, appended: true };
}

/* ──────────────────────────────────────────────────────────────
 * Internals
 * ────────────────────────────────────────────────────────────── */

function planPath(ctx: BrainContext, id: string): string {
  return path.join(ctx.plansDir, `${id}.md`);
}

async function readPlanIfExists(ctx: BrainContext, id: string): Promise<PlanDocument | null> {
  const filePath = planPath(ctx, id);
  if (!(await fs.pathExists(filePath))) return null;
  return parsePlanContent(await fs.readFile(filePath, 'utf-8'));
}

async function requirePlan(ctx: BrainContext, id: string): Promise<PlanDocument> {
  const plan = await readPlanIfExists(ctx, id);
  if (!plan) {
    throw new McpToolError(`Plan not found: .nexus/plans/${id}.md`);
  }
  return plan;
}

function firstUncheckedStep(plan: PlanDocument): string | null {
  const stepsSection = getSection(plan, 'Steps');
  if (!stepsSection) return null;
  const unchecked = parseChecklist(stepsSection.content).find((item) => !item.checked);
  return unchecked?.text ?? null;
}

function todayStamp(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

function toKnowledgeMatch(entry: KnowledgeEntry): KnowledgeMatch {
  return {
    category: entry.category,
    title: entry.title,
    date: entry.date,
    body: entry.raw.slice(1).join('\n').trim(),
  };
}

/** Insert a new entry before the file footer (trailing `---` + signature), or append. */
function insertBeforePostamble(content: string, postamble: string[], entry: string): string {
  const trimmedPostamble = postamble.join('\n');

  if (trimmedPostamble.trim().length > 0 && content.endsWith(trimmedPostamble)) {
    const head = content.slice(0, content.length - trimmedPostamble.length).trimEnd();
    return `${head}\n\n${entry}\n\n${trimmedPostamble.trimStart()}`;
  }

  return `${content.trimEnd()}\n\n${entry}\n`;
}

function parseSkillFrontmatter(content: string): {
  title: string | null;
  description: string | null;
  triggers: string[];
} {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { title: null, description: null, triggers: [] };

  const block = match[1] ?? '';
  const grab = (key: string): string | null => {
    const line = block.match(new RegExp(`^${key}:\\s*"?(.+?)"?\\s*$`, 'm'));
    return line?.[1] ?? null;
  };

  const triggersInline = block.match(/^triggers:\s*\[(.*)\]\s*$/m)?.[1];
  const triggers = triggersInline
    ? triggersInline.split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    : [];

  return { title: grab('title') ?? grab('name'), description: grab('description'), triggers };
}
