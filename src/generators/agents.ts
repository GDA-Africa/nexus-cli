/**
 * NEXUS CLI - Agents Generator (v1.1 "Contextualized Agents")
 *
 * Generates `.nexus/agents/` — brain-grounded role definitions — plus the
 * client outputs: `.claude/agents/<name>.md` (Claude Code subagents) and a
 * fenced "Agent Roles" block for AGENTS.md-style instruction files.
 *
 * Ownership rules (mirror the skills system):
 *   core/      — NEXUS-owned, regenerated on upgrade
 *   custom/    — user-owned, SACRED — never touched after creation
 *   community/ — installed via `nexus agent install`
 *
 * Spec: v1_1_contextualized_agents.md §2, §3
 */

import type { NexusConfig } from '../types/config.js';
import type { GeneratedFile } from '../types/templates.js';
import { buildHandoffChain } from '../utils/agents/handoff.js';
import { version } from '../version.js';

export const AGENT_ROLES_START = '<!-- NEXUS:AGENT_ROLES:START — managed by `nexus agent sync` -->';
export const AGENT_ROLES_END = '<!-- NEXUS:AGENT_ROLES:END -->';

/**
 * MCP server name as registered in generated `.mcp.json`. Claude Code namespaces
 * MCP tools in a subagent's `tools:` list as `mcp__<server>__<tool>`.
 */
const MCP_SERVER_NAME = 'nexus-brain';

interface CoreAgentSpec {
  name: string;
  role: string;
  triggers: string[];
  read: string[];
  write: string[];
  /**
   * Native Claude Code execution tools this agent needs. The reviewer is
   * deliberately read-only (no Edit/Write); builders get the full edit set.
   */
  exec: string[];
  docs: string[];
  knowledge: string[];
  skills: (framework: string) => string[];
  planScope: 'active' | 'none' | 'all';
  handoffAfter?: string;
  body: string;
}

/** Full edit capability for agents that write code/docs. */
const EXEC_EDIT = ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'];
/** Read-only capability for the reviewer — must never mutate the tree. */
const EXEC_READONLY = ['Read', 'Grep', 'Glob', 'Bash'];

/* ──────────────────────────────────────────────────────────────
 * The core four
 * ────────────────────────────────────────────────────────────── */

const CORE_AGENTS: CoreAgentSpec[] = [
  {
    name: 'nexus-implementer',
    role: 'build',
    triggers: ['implement', 'build', 'add feature', 'fix bug', 'refactor', 'next step'],
    read: ['nexus_wake', 'nexus_get_active_plan', 'nexus_query_knowledge', 'nexus_get_vital_signs', 'nexus_list_skills', 'nexus_get_skill', 'nexus_get_context'],
    write: ['nexus_plan_tick', 'nexus_plan_note'],
    exec: EXEC_EDIT,
    docs: ['02_architecture.md', '05_business_logic.md'],
    knowledge: ['architecture', 'pattern', 'gotcha', 'convention'],
    skills: (fw) => [`${fw}: all matching task triggers`],
    planScope: 'active',
    handoffAfter: undefined,
    body: `## Mission
Work the active plan's next unchecked step. Never re-derive a plan that already exists.

## Working Agreement
1. Session start: \`nexus_wake\` — echo the token.
2. \`nexus_get_active_plan\` → implement exactly the next unchecked step. If no plan is active and the task needs ≥3 steps, propose \`nexus plan new\` first.
3. Before architectural choices or debugging: \`nexus_query_knowledge\` with task keywords.
4. Match the task against skill triggers (\`nexus_list_skills\`) and follow the matching skill precisely.
5. Tick completed steps (\`nexus_plan_tick\`) and note decisions (\`nexus_plan_note\`) as you go.
6. Hand finished work to **nexus-test-writer** — do NOT mark your own work verified.

## Definition of Done
The step is ticked, decisions are noted, code compiles/lints, and the test-writer has been handed the change.

## Anti-Patterns
- ❌ Re-deriving plans from scratch when one is active
- ❌ Hand-editing plan or knowledge markdown when write tools exist
- ❌ Marking work complete without the verification handoff`,
  },
  {
    name: 'nexus-test-writer',
    role: 'verification',
    triggers: ['write tests', 'test this', 'coverage', 'verify', 'step complete'],
    read: ['nexus_wake', 'nexus_get_active_plan', 'nexus_query_knowledge', 'nexus_get_vital_signs', 'nexus_list_skills', 'nexus_get_skill'],
    write: ['nexus_plan_note', 'nexus_add_knowledge_entry'],
    exec: EXEC_EDIT,
    docs: ['06_test_strategy.md'],
    knowledge: ['gotcha', 'pattern', 'convention'],
    skills: (fw) => ['testing-strategy', `${fw}/testing`],
    planScope: 'active',
    handoffAfter: 'nexus-implementer',
    body: `## Mission
No work completes unverified. Every plan reaches \`done\` with test evidence — or an explicit, human-approved waiver. (Doctor D11 flags violations.)

## Working Agreement
1. **Detect, don't assume.** Call \`nexus_get_vital_signs\` (tests sensor) and read \`06_test_strategy.md\` before anything else.
2. **Testing IS set up →** write tests matching the strategy doc and the framework testing skill; run them; record results in the plan's Evidence via \`nexus_plan_note\` (include the pass count).
3. **Testing is NOT set up → STOP AND ASK.** Present a minimal proposal: framework-appropriate runner, one example test, an npm script, the exact files you would create, and zero source-code changes. Wait for explicit approval.
   - Approved → scaffold it, populate \`06_test_strategy.md\` (status: populated), and record the choice with \`nexus_add_knowledge_entry\` (category: convention).
   - Declined → add a WAIVER note to the plan ("tests waived by <human> on <date>: <reason>"). Visible, never silent.
4. Verify **other agents' work** — never your own implementation (separation of duties).

## Definition of Done
Tests pass and the count is in the plan's Evidence section — or a waiver note is. Nothing else counts.

## Anti-Patterns
- ❌ Installing test frameworks or dependencies without asking — EVER
- ❌ Letting a plan reach \`done\` with an empty Evidence section
- ❌ Deleting or weakening existing tests to make a change pass
- ❌ Testing implementation details instead of behavior`,
  },
  {
    name: 'nexus-reviewer',
    role: 'review',
    triggers: ['review', 'check this', 'pr', 'pull request', 'before merge'],
    read: ['nexus_wake', 'nexus_query_knowledge', 'nexus_get_vital_signs', 'nexus_doctor', 'nexus_brief', 'nexus_get_active_plan'],
    write: [],
    exec: EXEC_READONLY,
    docs: ['02_architecture.md'],
    knowledge: ['convention', 'gotcha', 'architecture', 'bug-fix'],
    skills: () => ['code-review'],
    planScope: 'active',
    handoffAfter: 'nexus-test-writer',
    body: `## Mission
Review changes against THIS project's recorded conventions and history — not generic best practice.

## Working Agreement
1. Ground every comment: cite the knowledge entry or doc section it comes from (\`nexus_query_knowledge\` per file/topic touched).
2. Run \`nexus_doctor\` — drift findings belong in the review.
3. Check the diff against the active plan's acceptance criteria.
4. Verify the Evidence section has test results (or a waiver). No evidence → request changes.
5. Read-only by design: you have no write tools. Findings go in the review, not the brain.

## Definition of Done
Every comment cites its source; acceptance criteria are checked off or challenged; verification evidence is confirmed.

## Anti-Patterns
- ❌ Generic style nitpicks with no grounding in project conventions
- ❌ Approving work whose plan has no test evidence and no waiver
- ❌ Re-litigating decisions already recorded in knowledge.md (raise a new entry instead)`,
  },
  {
    name: 'nexus-doc-keeper',
    role: 'hygiene',
    triggers: ['update docs', 'progress log', 'knowledge entry', 'session end', 'brain hygiene'],
    read: ['nexus_wake', 'nexus_get_active_plan', 'nexus_list_plans', 'nexus_query_knowledge', 'nexus_doctor', 'nexus_brief'],
    write: ['nexus_plan_note', 'nexus_add_knowledge_entry'],
    exec: ['Read', 'Edit', 'Write', 'Grep', 'Glob'],
    docs: ['index.md'],
    knowledge: ['convention'],
    skills: () => ['knowledge-logging', 'documentation'],
    planScope: 'all',
    handoffAfter: 'nexus-reviewer',
    body: `## Mission
Keep the brain truthful. Stale brains are worse than no brains — agents trust what they read.

## Working Agreement
1. After completed work: ensure the index Progress Log entry exists and the status matrix reflects reality.
2. Capture non-obvious discoveries as knowledge entries (1–3 sentences, correct category, Why + How to apply).
3. Run \`nexus_doctor\` and triage findings: fix what hygiene can fix, surface the rest to the human.
4. Knowledge is append-only — corrections are NEW entries that reference the old one, never edits.
5. Respect machine-managed fences (Vital Signs, Agent Roles) — never hand-edit between them.

## Definition of Done
Doctor reports no NEW hygiene findings from this session's work; the progress log tells the truth.

## Anti-Patterns
- ❌ Editing or deleting existing knowledge entries
- ❌ Logging routine task completion as knowledge (that's the Progress Log's job)
- ❌ Letting "I'll document it later" survive the session`,
  },
];

/* ──────────────────────────────────────────────────────────────
 * Rendering
 * ────────────────────────────────────────────────────────────── */

function renderAgentFile(spec: CoreAgentSpec, framework: string): string {
  const fmList = (items: string[]): string => `[${items.join(', ')}]`;
  return `---
nexus_agent: true
agent: ${spec.name}
version: 1.0.0
role: ${spec.role}
triggers: ${fmList(spec.triggers.map((t) => `"${t}"`))}
tools:
  read: ${fmList(spec.read)}
  write: ${fmList(spec.write)}
  exec: ${fmList(spec.exec)}
context:
  docs: ${fmList(spec.docs)}
  knowledge_categories: ${fmList(spec.knowledge)}
  skills: ${fmList(spec.skills(framework).map((s) => `"${s}"`))}
  plan_scope: ${spec.planScope}
handoff:
${spec.handoffAfter ? `  after: ${spec.handoffAfter}` : '  after: ""'}
status: active
---

# Agent: ${spec.name}

${spec.body}

---
*Generated by NEXUS CLI v${version} — regenerate client outputs with \`nexus agent sync\`.*
`;
}

/**
 * Translate a brain MCP tool name into the namespaced form Claude Code expects
 * in a subagent `tools:` list: `mcp__<server>__<tool>`.
 */
function mcpToolName(tool: string): string {
  return `mcp__${MCP_SERVER_NAME}__${tool}`;
}

/**
 * The full `tools:` allowlist for a Claude Code subagent: native execution
 * tools (so it can actually edit/run) + the agent's namespaced brain MCP tools.
 * Without the exec tools the subagent inherits nothing useful and cannot edit
 * files — the bug this fixes.
 */
export function claudeSubagentTools(spec: Pick<CoreAgentSpec, 'exec' | 'read' | 'write'>): string[] {
  const exec = spec.exec.length > 0 ? spec.exec : EXEC_EDIT;
  const mcp = [...spec.read, ...spec.write].map(mcpToolName);
  return [...exec, ...mcp];
}

/**
 * The `description:` line for a Claude Code subagent. States the real capability
 * set (so the model knows it can edit) instead of implying MCP-only access.
 */
export function subagentDescription(role: string, triggers: string[], exec: string[]): string {
  const effective = exec.length > 0 ? exec : EXEC_EDIT;
  const writes = effective.includes('Edit') || effective.includes('Write');
  const capability = writes
    ? `Can read, edit, and run code (${effective.join(', ')})`
    : `Read-only — reviews without modifying the tree (${effective.join(', ')})`;
  return `${role} agent for this NEXUS project. Triggers: ${triggers.join(', ')}. ${capability}, plus the nexus-brain MCP tools.`;
}

/** Claude Code subagent format: same body, client-appropriate frontmatter. */
function renderClaudeSubagent(spec: CoreAgentSpec, framework: string): string {
  const tools = claudeSubagentTools(spec);
  return `---
name: ${spec.name}
description: ${subagentDescription(spec.role, spec.triggers, spec.exec)}
tools: ${tools.join(', ')}
---

You are **${spec.name}**, a brain-grounded ${spec.role} agent in a NEXUS project.
The project brain is served by the \`nexus-brain\` MCP server (see .mcp.json).
Source of truth for this definition: \`.nexus/agents/core/${spec.name}.md\`.

${spec.body}

Context recipe: docs ${spec.docs.join(', ')}; knowledge categories ${spec.knowledge.join(', ')}; skills ${spec.skills(framework).join(', ')}; plan scope: ${spec.planScope}.
`;
}

/** The core agent pipeline order, derived from each agent's handoff.after link. */
export function coreHandoffChain(): string[] {
  return buildHandoffChain(
    CORE_AGENTS.map((a) => ({ name: a.name, after: a.handoffAfter })),
  );
}

/** Fenced Agent Roles block for AGENTS.md-style files (non-subagent clients). */
export function renderAgentRolesBlock(summaries: Array<{ name: string; role: string; mission: string }>): string {
  const rows = summaries
    .map((s) => `| \`${s.name}\` | ${s.role} | ${s.mission} |`)
    .join('\n');
  const chain = coreHandoffChain().map((n) => `\`${n}\``).join(' → ');
  return `${AGENT_ROLES_START}
## 🎭 Agent Roles (v1.1 Contextualized Agents)

This project defines specialized agent roles in \`.nexus/agents/\`. If your
client supports subagents, they are generated in \`.claude/agents/\`. If not,
adopt the matching role's working agreement when its triggers match your task.

| Agent | Role | Mission |
|-------|------|---------|
${rows}

### Orchestration — the main thread drives the handoff

Subagents **cannot invoke other subagents**, so the pipeline is sequenced by the
**main thread (you)**, not by the agents themselves:

${chain}

After an agent finishes, call \`nexus_get_handoff { agent: "<current>" }\` (or
follow the chain above) and dispatch the \`next\` agent yourself. A plan reaches
\`done\` only after the test-writer has produced Evidence — doctor **D11** flags
completions that skipped it. "Hand off to X" in an agent's body means *ask the
main thread to dispatch X*, never a subagent-to-subagent call.

Full definitions: \`.nexus/agents/\` (custom > core > community). Regenerate
client outputs with \`nexus agent sync\`.
${AGENT_ROLES_END}`;
}

/** Replace (or append) the fenced Agent Roles block in an instruction file. */
export function replaceAgentRolesBlock(content: string, renderedBlock: string): string {
  const start = content.indexOf(AGENT_ROLES_START);
  const end = content.indexOf(AGENT_ROLES_END);

  if (start !== -1 && end !== -1 && end > start) {
    return content.slice(0, start) + renderedBlock + content.slice(end + AGENT_ROLES_END.length);
  }

  return `${content.trimEnd()}\n\n${renderedBlock}\n`;
}

const MISSION_SUMMARIES: Record<string, string> = {
  'nexus-implementer': "Works the active plan's next step — never re-derives existing plans",
  'nexus-test-writer': 'No work completes unverified — asks before scaffolding test infra (D11 gate)',
  'nexus-reviewer': 'Reviews against recorded conventions, citing knowledge entries (read-only)',
  'nexus-doc-keeper': 'Keeps the brain truthful — progress log, knowledge hygiene, doctor triage',
};

/* ──────────────────────────────────────────────────────────────
 * Public API
 * ────────────────────────────────────────────────────────────── */

/** Generate all agent files + client outputs for a project. */
export function generateAgents(config: NexusConfig): GeneratedFile[] {
  if (config.enableAgents === false) return [];

  const framework = config.frontendFramework ?? 'shared';
  const files: GeneratedFile[] = [];

  for (const spec of CORE_AGENTS) {
    files.push({
      path: `.nexus/agents/core/${spec.name}.md`,
      content: renderAgentFile(spec, framework),
    });
    files.push({
      path: `.claude/agents/${spec.name}.md`,
      content: renderClaudeSubagent(spec, framework),
    });
  }

  files.push({ path: '.nexus/agents/README.md', content: renderAgentsReadme() });
  files.push({ path: '.nexus/agents/custom/README.md', content: renderCustomReadme() });

  return files;
}

export function coreAgentRolesSummaries(): Array<{ name: string; role: string; mission: string }> {
  return CORE_AGENTS.map((a) => ({
    name: a.name,
    role: a.role,
    mission: MISSION_SUMMARIES[a.name] ?? '',
  }));
}

function renderAgentsReadme(): string {
  const rows = CORE_AGENTS.map(
    (a) => `| \`${a.name}\` | ${a.role} | core | ${a.triggers.slice(0, 3).join(', ')} |`,
  ).join('\n');
  return `# NEXUS Agents

Brain-grounded role definitions. Match your task against each agent's
\`triggers\`; adopt the matching agent's working agreement (or switch to the
generated subagent in \`.claude/agents/\` if your client supports it).

| Agent | Role | Source | Triggers (sample) |
|-------|------|--------|-------------------|
${rows}

Directories: \`core/\` (NEXUS-owned, regenerated on upgrade) ·
\`custom/\` (yours — sacred, never touched) · \`community/\` (installed packs).
Precedence: custom > core > community.

Manage with \`nexus agent list|new|install|remove|status|sync\`.

*Generated by NEXUS CLI v${version}.*
`;
}

function renderCustomReadme(): string {
  return `# Custom Agents

Agents you create with \`nexus agent new\` live here. NEXUS NEVER modifies
this directory — not on upgrade, not on repair. A custom agent with the same
name as a core agent overrides it completely.

Run \`nexus agent sync\` after editing to regenerate client outputs.
`;
}
