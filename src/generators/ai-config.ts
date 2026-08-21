/**
 * NEXUS CLI - AI Config Generator
 *
 * Generates AI agent instruction files for every major coding assistant.
 *
 * Strategy:
 *   The master file lives in `.nexus/ai/instructions.md` — a single folder
 *   that beginners can understand ("this is for AI tools").
 *
 *   EVERY tool-specific config file gets the FULL project-aware instructions
 *   embedded directly. We do NOT rely on "go read another file" directives
 *   because AI tools ignore cross-file pointers too often.
 *
 *   Files generated:
 *     .nexus/ai/instructions.md       — master file (full content)
 *     .cursorrules                     — Cursor (full content)
 *     .windsurfrules                   — Windsurf (full content)
 *     .clinerules                      — Cline (full content)
 *     AGENTS.md                        — Claude Code / OpenAI Codex (full content)
 *     CLAUDE.md                        — Claude Code / Claude Cowork (full content)
 *     .github/copilot-instructions.md  — GitHub Copilot (full content)
 *     .mcp.json                        — NEXUS brain MCP server registration
 *
 *   Every file is project-aware — it references the actual framework, data
 *   strategy, test framework, and patterns chosen during `nexus init`.
 *   Every file includes the onboarding protocol that tells the AI to
 *   populate template docs BEFORE doing anything the user asks.
 */

import type { NexusConfig, NexusPersona } from '../types/config.js';
import type { GeneratedFile } from '../types/templates.js';
import { version } from '../version.js';

/* ──────────────────────────────────────────────────────────────
 * Shared sections
 * ────────────────────────────────────────────────────────────── */

/**
 * Session Handshake protocol — v1.0 "Alive Brain".
 * Embedded in every generated AI instruction file (spec §5.5 + §9).
 */
export const SESSION_HANDSHAKE_SECTION = `## 🤝 Session Handshake (REQUIRED)

Run \`nexus_wake\` (MCP) or \`nexus wake\` (CLI) and **echo the printed token in
your first response**. It proves you read the brain, and it carries the active
plan, the alignment gate, and doctor counts in one call.

Skipping is visible, not impossible: \`nexus doctor\` (D09) flags commits made
without a registered wake. If the user tells you to skip it, say so in your
response.`;

/**
 * MCP server section — v1.0 headline feature.
 * Embedded in every generated AI instruction file.
 */
export const MCP_SECTION = `## 🔌 NEXUS Brain MCP Server (PREFERRED INTERFACE)

Registered in \`.mcp.json\` (\`npx -y @nexus-framework/cli mcp\`). Works with
Claude Code, Claude Cowork, OpenAI Codex, Cursor, and any MCP client.

**If the \`nexus_*\` tools are available, prefer them over reading brain files by
hand** — they return targeted data and validate every write. Start with
\`nexus_get_context\`; it composes the pack the other read tools return piecemeal.
Call \`tools/list\` for the full set, or see \`.nexus/ai/instructions.md\` for what
each one is for.

Markdown stays the source of truth. The MCP server is the interface, not the
database — reading the files directly is always correct when MCP is absent.`;

/* ──────────────────────────────────────────────────────────────
 * Public API
 * ────────────────────────────────────────────────────────────── */

/**
 * Generate all AI agent configuration files for the project.
 */
export function generateAiConfig(config: NexusConfig): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Core instruction file (the single source of truth)
  files.push(generateInstructions(config));

  // Tool-specific files at expected root paths — each embeds full instructions
  files.push(generateCursorRules(config));
  files.push(generateWindsurfRules(config));
  files.push(generateClineRules(config));
  files.push(generateClaudeMd(config));
  files.push(generateAgentsMd(config));
  files.push(generateCopilotInstructions(config));

  // MCP server registration — Claude Code / Codex / Cursor pick this up
  files.push(generateMcpJson());

  return files;
}

/* ──────────────────────────────────────────────────────────────
 * MCP registration (.mcp.json)
 * ────────────────────────────────────────────────────────────── */

/**
 * Register the NEXUS brain MCP server for MCP-aware clients.
 * Claude Code and Codex read `.mcp.json` at the project root; Cursor
 * users can copy the same entry into `.cursor/mcp.json`.
 */
function generateMcpJson(): GeneratedFile {
  const config = {
    mcpServers: {
      'nexus-brain': {
        command: 'npx',
        args: ['-y', '@nexus-framework/cli', 'mcp'],
      },
    },
  };

  return { path: '.mcp.json', content: `${JSON.stringify(config, null, 2)}\n` };
}

/* ──────────────────────────────────────────────────────────────
 * Core instructions file (.nexus/ai/instructions.md)
 * ────────────────────────────────────────────────────────────── */

function generateInstructions(config: NexusConfig): GeneratedFile {
  const frameworkDisplay = getFrameworkDisplay(config.frontendFramework);
  const testDisplay = config.testFramework === 'none' ? 'None configured' : config.testFramework;
  const patternsDisplay =
    config.appPatterns.length > 0 ? config.appPatterns.join(', ') : 'None selected';
  const backendDisplay =
    config.backendFramework === 'none'
      ? `${config.backendStrategy} (no framework)`
      : `${config.backendFramework} (${config.backendStrategy})`;

  const content = `# ${config.displayName} — AI Agent Instructions

> **This file is the single source of truth for all AI coding assistants.**
> It is auto-generated by [NEXUS CLI](https://github.com/GDA-Africa/nexus-cli) v${version}.
> Root-level config files (.cursorrules, .windsurfrules, etc.) embed these same rules.

---

## ⚠️ Before You Do Anything — Orient First

Orienting is **one call**, not three file reads. Do it before ANY work.

**Step 1. Compose your context — \`nexus_get_context\`**

If the \`nexus-brain\` MCP server is connected (see \`.mcp.json\`), call:

\`\`\`
nexus_get_context({ task: "<what you were just asked to do>" })
\`\`\`

One call returns one bounded pack: the active plan and its next unchecked
step, the knowledge entries matching your task, the skills whose triggers
fire, live repo vitals, and the relevant doc excerpts. It is deterministic
keyword matching — the same information you would gather by hand, scoped to
the task and capped in size.

**Prefer this over reading brain files by hand.** Reading \`index.md\` and
\`knowledge.md\` in full costs thousands of tokens *per session*, and that
cost grows every time anyone appends to them — it scales with the project's
history rather than with your task. A context pack is bounded and gets more
relevant as the project grows, not less.

**Step 2. Read the relevant spec doc** from \`.nexus/docs/\` (01 through 08) —
only the one your task actually touches, and only if the pack did not
already carry it.

**Fallback — when MCP is unavailable.** Markdown stays the source of truth,
so reading by hand always works:

1. \`.nexus/docs/index.md\` — the "Current Objective" and "What's Next"
   sections. You rarely need the rest of the file.
2. \`.nexus/docs/knowledge-summary.md\` if it exists (\`nexus consolidate\`
   creates it) — the rolled-up view. Read the full append-only
   \`knowledge.md\` only for an entry the summary does not cover.
3. The relevant numbered spec doc.

\`\`\`
RULE: Before EVERY task → nexus_get_context(task), or the fallback above
RULE: NEVER read knowledge.md in full when the summary will do
RULE: After EVERY task → update .nexus/docs/index.md
RULE: After EVERY task → append to .nexus/docs/knowledge.md if you learned something
RULE: NEVER ask "what should we work on?" → the index tells you
RULE: NEVER invent features → work from the feature backlog in the index
\`\`\`

---

## 🚨 CRITICAL — Onboarding Protocol (First-Time Setup)

Each NEXUS doc has YAML frontmatter with a \\\`status\\\` field:
- \\\`template\\\` — the doc is still in its default scaffolded state (has TODO placeholders)
- \\\`populated\\\` — the doc has been filled in by a human or AI agent

\\\`\\\`\\\`
STOP. If ANY .nexus/docs/ file has status: template → you MUST populate it FIRST.
Do NOT skip this step. Do NOT jump straight to the user's request.
This is a hard requirement, not a suggestion.
\\\`\\\`\\\`

### Steps:

1. **Scan the codebase** — read \\\`package.json\\\`, \\\`tsconfig.json\\\`, source files in \\\`src/\\\`,
   route definitions, data models, and test files to understand the project.

2. **Ask the user about their vision** — what are they building? Who are the users?
   What features do they need? Fill in \\\`01_vision.md\\\` and \\\`05_business_logic.md\\\`.

3. **Auto-fill what you can infer** from the code:
   - \\\`02_architecture.md\\\` — tech stack, directory structure, data flow
   - \\\`03_data_contracts.md\\\` — schemas, types, validation from source code
   - \\\`04_api_contracts.md\\\` — routes, endpoints, request/response shapes
   - \\\`06_test_strategy.md\\\` — existing test setup, coverage, test patterns
   - \\\`08_deployment.md\\\` — CI/CD config, environment variables, deploy targets

4. **Build the implementation plan** (\\\`07_implementation.md\\\`):
   - Turn features from \\\`01_vision.md\\\` into concrete build phases
   - Create a file-by-file plan with every file that needs to be created
   - Set the current phase based on what already exists
   - This is HOW you know what code to write

5. **Update the frontmatter** of each doc you fill in:
   \\\`\\\`\\\`yaml
   status: populated
   confidence: high    # or medium/low
   last_updated: "YYYY-MM-DD"
   \\\`\\\`\\\`

6. **Build the project brain** (\\\`.nexus/docs/index.md\\\`):
   - Fill in the feature backlog from \\\`01_vision.md\\\` features
   - Update the status matrix to reflect what's populated
   - Update "What Has Been Built" to reflect current state
   - Set "What's Next" to the first real feature from the backlog
   - **This step is CRITICAL — this file drives all future work**

7. **THEN proceed** with the user's original request — or suggest
   the first item from "What's Next" in the index.

This onboarding flow only applies when docs have \\\`status: template\\\`.
Once all docs are \\\`populated\\\`, skip this section and work normally —
but ALWAYS read \\\`.nexus/docs/index.md\\\` before every task.

---

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | ${config.displayName} |
| **Type** | ${config.projectType} |
| **Framework** | ${frameworkDisplay} |
| **Data Strategy** | ${config.dataStrategy} |
| **Backend** | ${backendDisplay} |
| **Testing** | ${testDisplay} |
| **Package Manager** | ${config.packageManager} |
| **Generated With** | NEXUS CLI v${version} |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | ${frameworkDisplay} |
| Language | TypeScript (strict mode, ESM) |
| Data Strategy | ${config.dataStrategy} |
| Backend | ${backendDisplay} |
| Testing | ${testDisplay} |
| Package Manager | ${config.packageManager} |
| Patterns | ${patternsDisplay} |

---

## Code Rules

1. **TypeScript strict mode** — no \`any\`, no implicit returns, no unused variables
2. **ESM only** — use \`import\`/\`export\`, never \`require()\`
3. **File extensions in imports** — always use \`.js\` extension (e.g., \`import { foo } from './bar.js'\`)
4. **Conventional Commits** — \`feat:\`, \`fix:\`, \`docs:\`, \`chore:\`, \`test:\`, \`refactor:\`
5. **Test everything** — every feature needs tests in \`tests/unit/\`
6. **Validate after changes** — run \`${getValidationCommand(config)}\`

---

## Architecture Rules

- Follow the patterns described in \`.nexus/docs/02_architecture.md\`
- Data models must match contracts in \`.nexus/docs/03_data_contracts.md\`
- API endpoints must match contracts in \`.nexus/docs/04_api_contracts.md\`
- Business logic rules are in \`.nexus/docs/05_business_logic.md\`
- Build order is defined in \`.nexus/docs/07_implementation.md\`

---

## Key Directories

| Directory | Purpose |
|-----------|---------|
| \`src/\` | Application source code |
| \`tests/\` | Unit, integration, and E2E tests |
| \`.nexus/docs/\` | NEXUS documentation system (8 files + brain + knowledge) |
| \`.nexus/skills/\` | **NEXUS Skills** — pre-read AI task instructions (core / custom / community) |
| \`.nexus/\` | Project metadata, AI config, and manifest |
| \`public/\` | Static assets |
| \`.github/\` | CI/CD workflows, PR templates |

---

## 🧠 Skills Protocol

NEXUS Skills are pre-read instruction files that define **how to execute tasks** in this project.

**Before performing any significant task:**
1. Check \`.nexus/skills/\` for a relevant skill
2. Look in \`.nexus/skills/core/\` for framework-specific skills
3. Look in \`.nexus/skills/custom/\` for project-specific overrides
4. Look in \`.nexus/skills/community/\` for installed integration skills
5. Match the task you are about to perform against each skill's \`triggers\` list
6. If a match is found, read the skill file **fully** before proceeding
7. Follow the skill's steps and patterns precisely
8. If you deviate from a skill for a valid reason, log it in \`.nexus/docs/knowledge.md\`

**Precedence: \`custom/\` overrides \`core/\`, which overrides \`community/\`.**

Available skills are listed in \`.nexus/skills/README.md\`.

---

This project includes structured documentation files designed for both humans and AI:

| # | File | Purpose |
|---|------|---------|
| 🧠 | \`.nexus/docs/index.md\` | **PROJECT BRAIN** — status, backlog, progress, what's next |
| 📚 | \`.nexus/docs/knowledge.md\` | **KNOWLEDGE BASE** — learned insights, patterns, gotchas |
| 1 | \`.nexus/docs/01_vision.md\` | Product requirements, user stories, success metrics |
| 2 | \`.nexus/docs/02_architecture.md\` | System design, tech stack decisions, data flow |
| 3 | \`.nexus/docs/03_data_contracts.md\` | Database schemas, validation rules, relationships |
| 4 | \`.nexus/docs/04_api_contracts.md\` | Endpoints, request/response interfaces, status codes |
| 5 | \`.nexus/docs/05_business_logic.md\` | Rules, algorithms, state machines, decision flows |
| 6 | \`.nexus/docs/06_test_strategy.md\` | Coverage targets, test types, testing philosophy |
| 7 | \`.nexus/docs/07_implementation.md\` | Build order, file-by-file implementation plan |
| 8 | \`.nexus/docs/08_deployment.md\` | Infrastructure, CI/CD, environment configuration |

**Start with \`.nexus/docs/index.md\`** (your brain), then \`.nexus/docs/01_vision.md\`.

---

## 📚 Knowledge Base Protocol

The knowledge base (\`.nexus/docs/knowledge.md\`) is the project's long-term memory.
It is **append-only** — entries are never deleted, only added.

### When to READ it:
- **Before every task** — scan the headings for entries relevant to your work
- **Before architectural decisions** — check for past decisions and their rationale
- **Before debugging** — check for known gotchas and recurring bug patterns
- **Before choosing packages or patterns** — check for past evaluations

### When to WRITE to it:
- **After discovering something non-obvious** — a bug root cause, an architecture insight, a package quirk
- **After making a decision that future agents should know about**
- **NOT for routine task completion** — that goes in \`index.md\` Progress Log

### Entry format:

This is the format \`parseKnowledge\` reads and \`nexus_add_knowledge_entry\`
writes. An entry in any other shape is invisible to \`nexus_query_knowledge\`,
to the knowledge section of \`nexus_get_context\`, and to \`nexus consolidate\`.

\`\`\`
### [category] Short Title In Title Case
**YYYY-MM-DD** — What was discovered, in one or two sentences.
**Why:** the reason it happened, not just the symptom.
**How to apply:** what a future agent should do differently.
\`\`\`

The \`### \` heading level and the \`[category]\` brackets are both load-bearing —
\`## \` or a bare category will not parse. Prefer
\`nexus_add_knowledge_entry\` over hand-editing; it produces this shape for you.

### Categories:
| Tag | Use When |
|-----|----------|
| \`architecture\` | Design decisions, structural choices, why X over Y |
| \`bug-fix\` | Recurring bugs, root causes, things to watch for |
| \`pattern\` | Code patterns that work well (or don't) in this project |
| \`package\` | Package quirks, version issues, config gotchas |
| \`performance\` | Bottlenecks found, optimizations applied |
| \`convention\` | Team/project conventions established during development |
| \`gotcha\` | Non-obvious traps, edge cases, things that wasted time |

### Rules:
- **NEVER delete entries** — the knowledge base is append-only
- **Keep entries short** — 1-3 sentences, not essays
- **Use the format above** — so future agents can scan headings quickly

---

${SESSION_HANDSHAKE_SECTION}

---

${MCP_SECTION}

---

## Workflow — How To Work On This Project

### Before EVERY task:
1. **Read \`.nexus/docs/index.md\`** — check "Current Objective" and "What's Next"
2. **Scan \`.nexus/docs/knowledge.md\`** — check for relevant past learnings before making decisions
3. **Read the relevant spec doc** — find details in the numbered \`.nexus/docs/\` files
4. **Check \`.nexus/docs/07_implementation.md\`** — find the file-by-file plan

### During the task:
5. **Write the code** following the architecture in \`.nexus/docs/02_architecture.md\`
6. **Write tests** — match the strategy in \`.nexus/docs/06_test_strategy.md\`
7. **Validate** — \`${getValidationCommand(config)}\`

### After EVERY task:
8. **Update \`.nexus/docs/index.md\`**:
   - Move completed items from "What's Next" to "Progress Log"
   - Update the "Status Matrix" and "What Has Been Built"
   - Set the "Current Objective" to the next priority item
9. **Update \`.nexus/docs/07_implementation.md\`** — mark completed files/tasks
10. **Learn** — if you discovered something non-obvious (bug pattern, architecture insight, package quirk, performance fix), append an entry to \`.nexus/docs/knowledge.md\`
11. **Commit** — use conventional commits (\`feat:\`, \`fix:\`, etc.)
12. **Suggest the next task** from \`.nexus/docs/index.md\` "What's Next"

### NEVER do this:
- ❌ Ask "what enhancements would you like?" when the backlog has items
- ❌ Invent random features not in the backlog
- ❌ Skip updating the index after completing work
- ❌ Treat docs as static — they evolve with the project
- ❌ Ignore \`.nexus/docs/knowledge.md\` — it prevents repeating mistakes
- ❌ Delete entries from \`.nexus/docs/knowledge.md\` — it is append-only
${getPersonaSection(config.persona)}
*Generated by [NEXUS CLI](https://github.com/GDA-Africa/nexus-cli) v${version} — AI-native project scaffolding by [GDA Africa](https://github.com/GDA-Africa)*
`;

  return { path: '.nexus/ai/instructions.md', content };
}

/* ──────────────────────────────────────────────────────────────
 * Tool-specific instruction files
 *
 * Every AI tool gets the FULL project-aware instructions embedded
 * directly in its config file. We do NOT rely on "go read another
 * file" directives — AI tools ignore them too often.
 *
 * A shared helper generates the content; each tool function just
 * sets the correct output path and tool-specific header.
 * ────────────────────────────────────────────────────────────── */

/**
 * Generate full project-aware instruction content for any AI tool.
 * This is embedded directly in each tool's config file so the AI
 * never has to follow a cross-file pointer.
 */
function toolInstructionContent(config: NexusConfig, toolName: string): string {
  const frameworkDisplay = getFrameworkDisplay(config.frontendFramework);
  const testDisplay = config.testFramework === 'none' ? 'None configured' : config.testFramework;
  const patternsDisplay =
    config.appPatterns.length > 0 ? config.appPatterns.join(', ') : 'None selected';
  const backendDisplay =
    config.backendFramework === 'none'
      ? `${config.backendStrategy} (no framework)`
      : `${config.backendFramework} (${config.backendStrategy})`;

  return `# ${config.displayName} — ${toolName} Instructions

> Auto-generated by [NEXUS CLI](https://github.com/GDA-Africa/nexus-cli) v${version}.
> Deeper detail lives in \`.nexus/ai/instructions.md\` — this file points at it
> rather than repeating it, so it stays cheap to carry on every turn.

---

## ⚠️ Before You Do Anything — Orient First

Orienting is **one call**, not three file reads:

\`\`\`
nexus_get_context({ task: "<what you were just asked to do>" })
\`\`\`

One bounded pack: the active plan and its next unchecked step, matching
knowledge entries, the skills whose triggers fire, live repo vitals, relevant
doc excerpts, and the alignment gate. Deterministic keyword matching — the same
information you would gather by hand, scoped to the task and capped in size.

Reading \`index.md\` and \`knowledge.md\` in full costs thousands of tokens per
session, and grows with the project's history rather than with your task.

Then read the one spec doc in \`.nexus/docs/\` your task actually touches, if the
pack did not already carry it.

**Fallback — no MCP.** Markdown is the source of truth, so reading by hand
always works. In order: the "Current Objective" and backlog in
\`.nexus/docs/index.md\` (the project BRAIN) → \`knowledge-summary.md\` if
\`nexus consolidate\` has created it → the one numbered spec doc you need.

\`\`\`
RULE: Before EVERY task → nexus_get_context(task), or the fallback above
RULE: If the pack reports gate.required → run that skill and record it BEFORE code
RULE: NEVER read knowledge.md in full when the summary will do
RULE: After EVERY task → update index.md, and append to knowledge.md if you learned something
RULE: NEVER ask "what enhancements would you like?" → the backlog has the answer
RULE: NEVER invent features → work from the feature backlog in the index
\`\`\`

---

## 🚨 Onboarding Protocol — First-Time Setup

Every doc in \`.nexus/docs/\` carries a \`status:\` frontmatter field, either
\`status: template\` (still scaffolded) or \`populated\`.

\`\`\`
STOP. If ANY .nexus/docs/ file has status: template → populate it FIRST.
This is the task, ahead of whatever was just asked for. Not a suggestion.
\`\`\`

1. **Scan the codebase** — \`package.json\`, config, source, routes, models, tests.
2. **Ask the user about their vision** — what are they building, and for whom?
   That answers \`01_vision.md\` and \`05_business_logic.md\`; nothing in the code does.
3. **Infer the rest** from source: \`02_architecture\`, \`03_data_contracts\`,
   \`04_api_contracts\`, \`06_test_strategy\`, \`08_deployment\`.
4. **Turn features into build phases** in \`07_implementation.md\`, setting the
   current phase from what already exists.
5. **Update each filled doc's frontmatter** to \`status: populated\`, with
   \`confidence\` and today's \`last_updated\`.
6. **Build the project brain** — \`.nexus/docs/index.md\`: backlog from the vision,
   status matrix, and "What's Next" pointing at the first real feature.
7. **Then** proceed with the original request.

---

## Project Identity

| Field | Value |
|-------|-------|
| Name | ${config.displayName} |
| Type | ${config.projectType} |
| Framework | ${frameworkDisplay} |
| Data Strategy | ${config.dataStrategy} |
| Backend | ${backendDisplay} |
| Testing | ${testDisplay} |
| Package Manager | ${config.packageManager} |
| Patterns | ${patternsDisplay} |

---

## Code Rules

1. **TypeScript strict mode** — no \`any\`, no implicit returns
2. **ESM only** — \`import\`/\`export\`, never \`require()\`
3. **File extensions in imports** — always \`.js\`
4. **Conventional Commits** — \`feat:\`, \`fix:\`, \`docs:\`, \`chore:\`, \`test:\`, \`refactor:\`
5. **Test everything** — every feature needs tests
6. **Validate after changes** — \`${getValidationCommand(config)}\`

---

## 🧠 Skills

Skills say **how this project does a thing**. \`nexus_get_context\` already returns
the ones whose triggers match your task — read those fully before starting, and
follow their steps rather than improvising.

Two kinds. **Reference** skills are consulted before you produce an artifact.
**Procedure** skills (\`category: procedure\`) are a discipline you *run* to
completion — an interview, a diagnosis loop, a review pass; half-run means not
run. A procedure skill may be **gated**: the context pack sets \`gate.required\`
and names it, and you run it before writing code, not after.

Precedence is \`custom/\` > \`core/\` > \`community/\`. Without MCP, browse
\`.nexus/skills/\` and match your task against each skill's \`triggers\`. If you
deviate from a skill for a good reason, record why in \`knowledge.md\`.

---

## 📚 The Brain

\`.nexus/docs/index.md\` is the project brain — status, backlog, progress, what is
next. \`.nexus/docs/knowledge.md\` is append-only long-term memory: read it before
architectural decisions and before debugging; append to it when you discover
something non-obvious. **Never delete an entry.** Routine task completion goes in
the index Progress Log, not in knowledge.

Numbered spec docs \`01_vision\` through \`08_deployment\` sit beside them; open the
one your task touches. The knowledge entry format and its category vocabulary are
in \`.nexus/ai/instructions.md\` — read that before writing your first entry.

---

${SESSION_HANDSHAKE_SECTION}

---

${MCP_SECTION}

---

## Workflow

**Before EVERY task:** orient (above), and honour the gate if the pack sets one.

**During:** write code to the architecture in \`02_architecture.md\`, tests to
\`06_test_strategy.md\`, and run \`${getValidationCommand(config)}\`. Keep the plan
current — \`nexus plan tick\` / \`nexus plan note\`.

**After EVERY task:** update \`index.md\` and \`07_implementation.md\`, append to
\`knowledge.md\` if you learned something non-obvious, \`nexus plan done <id>\`,
commit with a conventional message, then name the next task from the backlog.

**NEVER do this:** ask "what enhancements would you like?" when the backlog has
items · invent features that are not in it · skip updating the index · delete a
knowledge entry (the log is append-only) · treat the docs as static.
${getPersonaSection(config.persona)}
*Generated by [NEXUS CLI](https://github.com/GDA-Africa/nexus-cli) v${version}*
`;
}

function generateCursorRules(config: NexusConfig): GeneratedFile {
  return { path: '.cursorrules', content: toolInstructionContent(config, 'Cursor') };
}

function generateWindsurfRules(config: NexusConfig): GeneratedFile {
  return { path: '.windsurfrules', content: toolInstructionContent(config, 'Windsurf') };
}

function generateClineRules(config: NexusConfig): GeneratedFile {
  return { path: '.clinerules', content: toolInstructionContent(config, 'Cline') };
}

function generateClaudeMd(config: NexusConfig): GeneratedFile {
  return { path: 'CLAUDE.md', content: toolInstructionContent(config, 'Claude Code / Claude Cowork') };
}

function generateAgentsMd(config: NexusConfig): GeneratedFile {
  return { path: 'AGENTS.md', content: toolInstructionContent(config, 'Claude Code / OpenAI Codex') };
}

/* ──────────────────────────────────────────────────────────────
 * GitHub Copilot — requires .github/copilot-instructions.md
 *
 * Uses the same shared content as all other tools.
 * ────────────────────────────────────────────────────────────── */

function generateCopilotInstructions(config: NexusConfig): GeneratedFile {
  return { path: '.github/copilot-instructions.md', content: toolInstructionContent(config, 'GitHub Copilot') };
}

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────── */

function getFrameworkDisplay(framework: string | null | undefined): string {
  const map: Record<string, string> = {
    nextjs: 'Next.js 15 (App Router)',
    'react-vite': 'React + Vite',
    sveltekit: 'SvelteKit',
    nuxt: 'Nuxt 3',
    astro: 'Astro',
    remix: 'Remix',
    none: 'None (no frontend)',
  };
  // Guard: partial manifests can leak null/undefined this far — never
  // render the literal string "undefined" into generated docs.
  if (!framework) return 'Unspecified';
  return map[framework] ?? framework;
}

function getValidationCommand(config: NexusConfig): string {
  const pm = config.packageManager;
  const runPrefix = pm === 'npm' ? 'npm run' : pm;
  const testCmd = config.testFramework !== 'none' ? ` && ${runPrefix} test` : '';
  return `npx tsc --noEmit${testCmd} && ${runPrefix} lint`;
}

/**
 * Build the 🎭 Agent Persona instruction section.
 *
 * This block tells the AI agent HOW to communicate with the user.
 * When identity is a non-empty string, the agent refers to itself by that name.
 * Tone descriptions are written for older LLMs — explicit and concrete.
 */
function getPersonaSection(persona: NexusPersona): string {
  const toneGuide: Record<string, string> = {
    professional:
      'Be direct, precise, and business-appropriate. Avoid slang, jokes, and filler. ' +
      'Use clear technical language. Keep responses structured with bullet points or numbered lists when appropriate.',
    friendly:
      'Be warm, encouraging, and approachable. Use a conversational tone — like a helpful teammate. ' +
      'Celebrate wins, be supportive when things go wrong, and explain things patiently.',
    witty:
      'Be clever and playful. Drop the occasional pun or pop-culture reference — but never at the expense of clarity. ' +
      'Keep the humor light and nerdy. Think "friendly senior dev who happens to be hilarious."',
    zen:
      'Be calm, minimalist, and contemplative. Use short sentences. Favor clarity over verbosity. ' +
      'Treat code as craft and the project as a garden to tend. Avoid urgency and noise.',
    pirate:
      'Arr! Ye be a swashbuckling code pirate sailing the digital seas. ' +
      'Use nautical metaphors (bugs are "barnacles," deploys are "setting sail," tests are "checking the rigging"). ' +
      'Keep it fun but still technically accurate. Never sacrifice clarity for the bit.',
  };

  const verbosityGuide: Record<string, string> = {
    concise:
      'Keep responses short and focused. Lead with the answer. Skip preamble. ' +
      'Only add context if the user asks or the situation is ambiguous.',
    balanced:
      'Provide enough context to understand the "why" without over-explaining. ' +
      'One or two sentences of context, then the solution. Add detail when the topic is complex.',
    detailed:
      'Give thorough explanations. Walk through your reasoning. Explain trade-offs. ' +
      'Include examples and edge cases. Great for learning and onboarding.',
  };

  const identityLine = persona.identity
    ? `**You are ${persona.identity}** — the AI-powered project partner. Refer to yourself as "${persona.identity}" in responses. ` +
      `When users see the name "${persona.identity}," they know the AI agent has read and understood ` +
      'the NEXUS documentation system. This is your signal that you are synced with the project brain. ' +
      `This name persists across upgrades and repairs — the user chose "${persona.identity}" and it stays.`
    : 'Do not refer to yourself by any special name. Respond as a standard AI assistant.';

  const customLine = persona.customDirective
    ? `\n**Custom directive from the developer:** "${persona.customDirective}"\n`
    : '';

  return `
## 🎭 Agent Persona

This section defines how you communicate with the user. Follow these personality directives in ALL responses.

### Identity
${identityLine}

### Tone: ${persona.tone}
${toneGuide[persona.tone] ?? toneGuide['friendly']}

### Verbosity: ${persona.verbosity}
${verbosityGuide[persona.verbosity] ?? verbosityGuide['balanced']}
${customLine}
---
`;
}
