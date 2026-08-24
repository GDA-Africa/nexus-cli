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
import { buildHandoffChain, nextInChain } from '../utils/agents/handoff.js';
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
import { parseSkillFrontmatter } from '../utils/skills/frontmatter.js';
import {
  collectGates,
  evaluateGate,
  taskLooksLikeBuild,
  type GateStatus,
} from '../utils/skills/gate.js';
import { rankByTriggers } from '../utils/skills/matching.js';
import type { SkillGate, SkillInvocation } from '../utils/skills/types.js';
import { CHARS_PER_TOKEN, countTokens } from '../utils/tokens.js';

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
  /** SKILL_SPEC v2 — 'procedure' marks a discipline the agent runs. */
  category: string | null;
  /** SKILL_SPEC v2 — defaults to 'model' when the field is absent. */
  invocation: SkillInvocation;
  /** SKILL_SPEC v2 — set when this skill is a precondition for a class of work. */
  gate: SkillGate | null;
  status: string;
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

      const fm = parseSkillFrontmatter(await fs.readFile(path.join(dir, fileName), 'utf-8'));
      skills.push({
        name,
        source,
        title: fm.title,
        description: fm.description,
        triggers: fm.triggers,
        category: fm.category,
        invocation: fm.invocation,
        gate: fm.gate,
        status: fm.status,
      });
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

export interface HandoffResult {
  /** Ordered agent pipeline derived from each agent's handoff.after link. */
  chain: string[];
  /** The agent the caller is currently acting as, if it matched the chain. */
  current: string | null;
  /** The agent the main thread should dispatch next, or null if the chain is done. */
  next: string | null;
  /** Handoffs are executed by the main thread — subagents cannot call subagents. */
  orchestration: 'main-thread';
  /** One-line instruction the main thread can act on directly. */
  guidance: string;
}

/**
 * Return the agent handoff pipeline and, given the current agent, the next one
 * to dispatch. The chain is derived from each agent's `handoff.after` link so it
 * reflects custom overrides, not a hardcoded order. Because Claude Code
 * subagents cannot invoke other subagents, the MAIN THREAD is the orchestrator:
 * it reads `next` and dispatches that agent itself.
 */
export async function getHandoffTool(
  ctx: BrainContext,
  input: { agent?: string } = {},
): Promise<HandoffResult> {
  const summaries = await collectAgentSummaries(agentsDir(ctx));
  const valid = summaries.filter((s) => s.status !== 'invalid');

  const nodes = await Promise.all(
    valid.map(async (s) => {
      const resolved = await resolveAgent(agentsDir(ctx), s.name);
      return { name: s.name, after: resolved?.definition.frontmatter.handoff.after };
    }),
  );

  const chain = buildHandoffChain(nodes);
  const current = input.agent && chain.includes(input.agent) ? input.agent : null;
  const next = current ? nextInChain(chain, current) : (chain[0] ?? null);

  const guidance = next
    ? current
      ? `Dispatch the "${next}" subagent next (it runs after "${current}").`
      : `Start the pipeline by dispatching the "${next}" subagent.`
    : current
      ? `"${current}" is the last agent in the pipeline — no further handoff.`
      : 'No agents are defined for this project.';

  return { chain, current, next, orchestration: 'main-thread', guidance };
}

export interface ComposeContextInput {
  /** Task description — used to match knowledge entries and skill triggers */
  task: string;
  /** Optional agent whose context recipe scopes the composition */
  agent?: string;
  /** Hard cap on composed payload size, in tokens (default 3000) */
  maxTokens?: number;
  /**
   * @deprecated Chars cannot express a model's context window — mapped onto
   * `maxTokens` (÷{@link CHARS_PER_TOKEN}) when `maxTokens` is not given.
   * Accepted through v1.2 for compatibility; prefer `maxTokens`.
   */
  maxChars?: number;
}

/** @deprecated renamed to {@link ComposeContextInput}. */
export type GetContextInput = ComposeContextInput;

/** One section (or one item within a section) that did not make it into the pack. */
export interface ContextEviction {
  section: string;
  /** Tokens the evicted content would have cost. */
  cost: number;
  /**
   * `'budget'` — ordinary priority-ranked content lost out to budget pressure.
   * `'floor'` — content that is supposed to always be present (the required
   * gated skill, the vitals digest) had to be dropped or degraded because
   * even the minimum form did not fit. Distinct from `ContextFloorOverflow`,
   * which is thrown — never evicted — when `task` or `gate` themselves do
   * not fit; those two are load-bearing enough that a degraded pack is worse
   * than an error.
   */
  reason: 'budget' | 'floor';
}

export interface ComposedContext {
  contract_version: string;
  task: string;
  agent: string | null;
  /**
   * v1.3 alignment gate. A floor section (see {@link ContextFloorOverflow}):
   * composed before every other section and never dropped — a gate that can
   * be crowded out of the pack is not a gate.
   */
  gate: GateStatus | null;
  skills: Array<{
    name: string;
    source: string;
    matchedTrigger: string;
    /** 0–1 relevance. 1 = the task contains the trigger verbatim. */
    score: number;
    /** True when this skill was injected by the gate rather than matched. */
    required?: boolean;
  }>;
  plan: { id: string; status: string; nextStep: string | null } | null;
  knowledge: KnowledgeMatch[];
  docs: Array<{ file: string; excerpt: string }>;
  vitals: { branch: string | null; dirty: boolean | null; testsSummary: string };
  truncated: boolean;
  /** What did not make it into the pack, and why. Empty when nothing was cut. */
  evicted: ContextEviction[];
  budget: { maxTokens: number; used: number; remaining: number };
}

/** `nexus_get_context`'s current output shape. Bump on a breaking change. */
const CONTRACT_VERSION = '1.0.0';

/**
 * Thrown when a floor section — `task` or `gate` — does not fit even the
 * declared budget on its own. These are the minimum an agent needs to not be
 * working blind; a caller that received a pack with either silently gutted
 * would have no way to know. Callers should retry with a larger `maxTokens`
 * or, for `task`, a shorter task description.
 */
export class ContextFloorOverflow extends Error {
  readonly section: string;
  readonly cost: number;
  readonly budget: number;
  readonly maxTokens: number;

  constructor(info: { section: string; cost: number; budget: number; maxTokens: number }) {
    super(
      `Context floor overflow: "${info.section}" costs ${info.cost} tokens but only ${info.budget} of ${info.maxTokens} remain. ` +
        'Raise maxTokens, or shorten the task description.',
    );
    this.name = 'ContextFloorOverflow';
    this.section = info.section;
    this.cost = info.cost;
    this.budget = info.budget;
    this.maxTokens = info.maxTokens;
  }
}

/**
 * Per-entry cap on knowledge bodies. Entries are freeform prose in an
 * append-only log, so one long entry must never be able to consume the pack.
 */
const KNOWLEDGE_BODY_CAP = 1200;

const DEFAULT_MAX_TOKENS = 3000;
const MIN_MAX_TOKENS = 500;
const MAX_MAX_TOKENS = 20000;

/** Resolve the token budget from `maxTokens`, or the deprecated `maxChars`. */
function resolveMaxTokens(input: ComposeContextInput): number {
  const requested =
    input.maxTokens ??
    (input.maxChars !== undefined ? Math.ceil(input.maxChars / CHARS_PER_TOKEN) : DEFAULT_MAX_TOKENS);
  return Math.max(MIN_MAX_TOKENS, Math.min(requested, MAX_MAX_TOKENS));
}

/**
 * Cut markdown at the last paragraph or heading boundary at or before
 * `maxChars`, falling back to a sentence end and then, only if the content
 * has neither, a raw prefix. Never a half sentence — a boundary cut is worse
 * than an absence only when the reader cannot tell it happened, and a
 * dangling clause is exactly that.
 */
function cutAtBoundary(content: string, maxChars: number): string {
  if (maxChars <= 0) return '';
  if (content.length <= maxChars) return content;

  const slice = content.slice(0, maxChars);
  const boundary = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n#'));
  if (boundary > 0) return slice.slice(0, boundary).trimEnd();

  const sentenceBoundary = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('.\n'));
  if (sentenceBoundary > 0) return slice.slice(0, sentenceBoundary + 1).trimEnd();

  return slice.trimEnd();
}

/** Cut `content` at a boundary until it fits `budgetTokens`. */
function truncateDocToBudget(content: string, budgetTokens: number): string {
  if (budgetTokens <= 0) return '';
  if (countTokens(content) <= budgetTokens) return content;

  let maxChars = Math.min(content.length, budgetTokens * CHARS_PER_TOKEN);
  let text = cutAtBoundary(content, maxChars);

  // The chars-per-token heuristic is only a starting point — verify against
  // the real tokenizer and walk the cut point back if it still overshoots.
  while (text.length > 0 && countTokens(text) > budgetTokens) {
    maxChars = Math.floor(maxChars * 0.9);
    text = cutAtBoundary(content, maxChars);
  }

  return text;
}

function summarizeTests(tests: VitalSigns['tests'] | undefined): string {
  if (!tests) return 'not yet synced';
  // durationMs deliberately omitted — a wall-clock value has no business in a
  // pack two identical calls are supposed to reproduce byte-for-byte (P0.4).
  const { passed, failed, skipped, source } = tests;
  return JSON.stringify({ passed, failed, skipped, source }).slice(0, 200);
}

/**
 * The v1.1 keystone: compose ONE scoped context pack for a task instead of
 * N piecemeal reads. Deterministic — keyword/trigger matching, no LLM.
 *
 * `maxTokens` is a hard cap on every section, not a suggestion: sections are
 * composed in priority order (gate → skills → plan → knowledge → docs →
 * vitals — least stable last, so its churn never shifts where anything else
 * gets cut) and every one of them is charged through `admit()` as it is
 * composed. `task` and `gate` are the floor — see {@link ContextFloorOverflow}
 * — and everything else is evictable and reported in `evicted`. `truncated`
 * is true whenever anything was cut, dropped, or degraded.
 */
export async function getContextTool(ctx: BrainContext, input: ComposeContextInput): Promise<ComposedContext> {
  const maxTokens = resolveMaxTokens(input);
  let budget = maxTokens;
  const evicted: ContextEviction[] = [];

  /** Charge the budget for one item. Returns whether it fit, and its cost. */
  const admit = (value: unknown): { ok: boolean; cost: number } => {
    const cost = countTokens(JSON.stringify(value) ?? '');
    if (cost > budget) return { ok: false, cost };
    budget -= cost;
    return { ok: true, cost };
  };

  /** Like `admit`, but a miss throws instead of returning — the floor. */
  const admitFloor = (section: string, value: unknown): void => {
    const cost = countTokens(JSON.stringify(value) ?? '');
    if (cost > budget) {
      throw new ContextFloorOverflow({ section, cost, budget, maxTokens });
    }
    budget -= cost;
  };

  // Agent recipe (optional)
  const resolved = input.agent ? await resolveAgent(agentsDir(ctx), input.agent) : null;
  const recipe = resolved?.definition.frontmatter.context ?? null;

  // Read the active plan up front — the gate needs it — without charging the
  // plan slice against the budget yet. The plan *section* of the pack is
  // composed later, after skills, per the priority order above.
  let planCandidate: ComposedContext['plan'] = null;
  let activePlanDoc: PlanDocument | null = null;
  if (recipe?.plan_scope !== 'none') {
    const state = await readActivePlans(ctx.plansDir);
    const activeId = state.active[0] ?? null;
    if (activeId) {
      const planDoc = await readPlanIfExists(ctx, activeId);
      if (planDoc) {
        activePlanDoc = planDoc;
        planCandidate = { id: activeId, status: planDoc.frontmatter.status, nextStep: firstUncheckedStep(planDoc) };
      }
    }
  }

  // Floor 1/2: the task itself. If the task description alone does not fit
  // the declared budget, nothing downstream is meaningful either.
  admitFloor('task', input.task);

  // Floor 2/2: the alignment gate. Depends on the plan read above, computed
  // before every section that competes for budget.
  const { skills: allSkills } = await listSkillsTool(ctx);
  const gateDeclarations = collectGates(allSkills);
  const gate = evaluateGate(activePlanDoc, gateDeclarations, {
    taskLooksLikeBuild: taskLooksLikeBuild(input.task),
  });
  admitFloor('gate', gate);

  // 1. Skills — trigger matching against the task. Small per entry, but the
  //    count is unbounded, so each one is admitted against the budget.
  const skills: ComposedContext['skills'] = [];

  // The gated skill is composed first — it is required, not offered, so it
  // must not depend on a trigger happening to match — but it still goes
  // through `admit()` like everything else. A miss here is `reason: 'floor'`
  // (not thrown: only task/gate are load-bearing enough to abort the call).
  if (gate.required && gate.skill) {
    const gated = allSkills.find((skill) => skill.name === gate.skill);
    if (gated) {
      const entry = {
        name: gated.name,
        source: gated.source,
        matchedTrigger: '<gate>',
        score: 1,
        required: true,
      };
      const result = admit(entry);
      if (result.ok) {
        skills.push(entry);
      } else {
        evicted.push({ section: `skills:${gated.name}`, cost: result.cost, reason: 'floor' });
      }
    }
  }

  // Everything else is ranked by relevance, so budget pressure drops the least
  // relevant skill rather than whichever one happened to sort last.
  const ranked = rankByTriggers(
    input.task,
    allSkills.filter((skill) => skill.name !== gate.skill || !gate.required),
    (skill) => skill.triggers,
  );

  for (const match of ranked) {
    const entry = {
      name: match.item.name,
      source: match.item.source,
      matchedTrigger: match.trigger,
      score: Number(match.score.toFixed(3)),
    };
    const result = admit(entry);
    if (!result.ok) {
      evicted.push({ section: `skills:${match.item.name}`, cost: result.cost, reason: 'budget' });
      break;
    }
    skills.push(entry);
  }

  // 2. Plan slice — the most task-relevant thing in the pack, but no longer
  //    unconditional: it goes through `admit()` like every other section.
  let plan: ComposedContext['plan'] = null;
  if (planCandidate) {
    const result = admit(planCandidate);
    if (result.ok) {
      plan = planCandidate;
    } else {
      evicted.push({ section: 'plan', cost: result.cost, reason: 'budget' });
    }
  }

  // 3. Knowledge — task keywords, optionally restricted to recipe categories.
  //    Entry bodies are arbitrarily long prose, so each is capped individually
  //    AND admitted against the remaining budget. Before this, five long
  //    entries could consume the whole pack and leave nothing for docs.
  const terms = input.task.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const knowledge: KnowledgeMatch[] = [];
  const knowledgePath = path.join(ctx.docsDir, 'knowledge.md');
  if (await fs.pathExists(knowledgePath)) {
    const parsed = parseKnowledge(await fs.readFile(knowledgePath, 'utf-8'));
    const candidates = parsed.entries
      .filter((e) => !recipe || recipe.knowledge_categories.length === 0 || recipe.knowledge_categories.includes(e.category))
      .filter((e) => {
        const hay = `${e.category} ${e.title} ${e.raw.join(' ')}`.toLowerCase();
        return terms.some((t) => hay.includes(t));
      })
      .slice(-5)
      .reverse()
      .map(toKnowledgeMatch);

    for (const match of candidates) {
      if (match.body.length > KNOWLEDGE_BODY_CAP) {
        const before = countTokens(match.body);
        match.body = `${match.body.slice(0, KNOWLEDGE_BODY_CAP).trimEnd()}…`;
        evicted.push({ section: `knowledge:${match.title}`, cost: before - countTokens(match.body), reason: 'budget' });
      }
      const result = admit(match);
      if (!result.ok) {
        evicted.push({ section: `knowledge:${match.title}`, cost: result.cost, reason: 'budget' });
        break;
      }
      knowledge.push(match);
    }
  }

  // 4. Recipe-named docs — whatever budget survives the sections above. Cut
  //    at a paragraph/heading boundary rather than a raw byte prefix landing
  //    mid-sentence (P0.5): a half sentence is worse than an absence, because
  //    the agent cannot tell it happened.
  const docs: ComposedContext['docs'] = [];
  for (const docFile of recipe?.docs ?? []) {
    const docPath = path.join(ctx.docsDir, docFile);
    if (!(await fs.pathExists(docPath))) continue;

    const content = await fs.readFile(docPath, 'utf-8');
    const section = `docs:${docFile}`;

    if (budget <= 0) {
      evicted.push({ section, cost: countTokens(content), reason: 'budget' });
      continue;
    }

    const full = admit({ file: docFile, excerpt: content });
    if (full.ok) {
      docs.push({ file: docFile, excerpt: content });
      continue;
    }

    // Reserve room for the wrapping `{file, excerpt}` shape, then cut the
    // excerpt at a boundary and re-verify — the char heuristic inside
    // `truncateDocToBudget` is a starting point, not a guarantee.
    const overhead = countTokens(JSON.stringify({ file: docFile, excerpt: '' }));
    let target = budget - overhead;
    let excerpt = truncateDocToBudget(content, target);
    let entry = { file: docFile, excerpt };
    let attempt = admit(entry);
    while (!attempt.ok && excerpt.length > 0) {
      target = Math.floor(target * 0.9);
      excerpt = truncateDocToBudget(content, target);
      entry = { file: docFile, excerpt };
      attempt = admit(entry);
    }

    if (excerpt.length === 0) {
      evicted.push({ section, cost: full.cost, reason: 'budget' });
      continue;
    }

    docs.push(entry);
    evicted.push({ section, cost: countTokens(content) - countTokens(excerpt), reason: 'budget' });
  }

  // 5. Vitals digest — last, deliberately (P0.4). It is the least stable
  //    section (branch/dirty/test counts change with every commit) and among
  //    the least useful, so it sits where its churn cannot shift the cut
  //    point for anything else or defeat prefix caching upstream. Read from
  //    the cached snapshot `nexus sync` writes (B1) — context assembly makes
  //    no execa call and no live test run (B4). durationMs never appears
  //    (P0.4): a wall-clock value would make two identical calls diverge.
  const cachedVitals = await readCachedVitalSigns(ctx);
  let vitals: ComposedContext['vitals'] = {
    branch: cachedVitals?.git.branch ?? null,
    dirty: cachedVitals?.git.isDirty ?? null,
    testsSummary: summarizeTests(cachedVitals?.tests),
  };
  const vitalsResult = admit(vitals);
  if (!vitalsResult.ok) {
    evicted.push({ section: 'vitals', cost: vitalsResult.cost, reason: 'floor' });
    // Degrade to a placeholder rather than drop the field — `vitals` is
    // always present in the pack's shape — without charging it further; at
    // this point the budget is exhausted by construction.
    vitals = { branch: null, dirty: null, testsSummary: 'omitted — over budget' };
  }

  const used = maxTokens - budget;

  return {
    contract_version: CONTRACT_VERSION,
    task: input.task,
    agent: input.agent ?? null,
    gate,
    skills,
    plan,
    knowledge,
    docs,
    vitals,
    truncated: evicted.length > 0,
    evicted,
    budget: { maxTokens, used, remaining: budget },
  };
}

/** Read the cached vital signs `nexus sync` wrote (B1). Never runs sensors. */
async function readCachedVitalSigns(ctx: BrainContext): Promise<VitalSigns | null> {
  try {
    const raw = await fs.readFile(path.join(ctx.nexusDir, 'state', 'last-sync.json'), 'utf-8');
    return JSON.parse(raw) as VitalSigns;
  } catch {
    return null;
  }
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

/**
 * Skill frontmatter now comes from the single shared parser in
 * `utils/skills/frontmatter.ts`.
 *
 * The parser that used to live here read only inline `triggers: [a, b]`, a form
 * no registry skill uses — so every skill parsed to zero triggers and the
 * skills section of the context pack never returned anything. It also looked
 * for `title:`/`name:`, which NEXUS skills do not carry (they use `skill:`),
 * so titles and descriptions were always null.
 */
