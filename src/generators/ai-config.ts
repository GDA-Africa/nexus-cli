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

Before doing anything, run \`nexus wake\` and **echo the printed token in your
first response**. This proves you actually read the brain.

\`\`\`
$ nexus wake          # prints a token like NX-WAKE-7K9F-2026-05-02
\`\`\`

- The token is deterministic: brain content + today's date. It is recorded in
  \`.nexus/state/session.json\`, and \`nexus doctor\` (D09) flags commits made
  without a registered wake.
- During work, keep the active plan current: \`nexus plan tick\` / \`nexus plan note\`.
- On task completion, run \`nexus plan done <id>\`.
- Skipping the handshake is visible, not impossible — if the user tells you to
  skip it, note that in your response.
- **MCP alternative:** if the \`nexus-brain\` MCP server is connected (see
  \`.mcp.json\`), call the \`nexus_wake\` tool instead — same token, plus the
  active plan and doctor counts in one call.`;

/**
 * MCP server section — v1.0 headline feature.
 * Embedded in every generated AI instruction file.
 */
export const MCP_SECTION = `## 🔌 NEXUS Brain MCP Server (PREFERRED INTERFACE)

This project ships an MCP server that exposes the brain as tools. It is
registered in \`.mcp.json\` (command: \`npx -y @nexus-framework/cli mcp\`) and
works with Claude Code, Claude Cowork, OpenAI Codex, Cursor, and any other
MCP client.

**If the \`nexus_*\` tools are available, PREFER them over reading brain files
by hand** — they return targeted data and validate every write.

| Tool | Use for |
|------|---------|
| \`nexus_wake\` | Session start — handshake token + active plan + doctor counts |
| \`nexus_get_active_plan\` | Current unit of work + next unchecked step |
| \`nexus_query_knowledge\` | Targeted gotcha/pattern lookup before decisions & debugging |
| \`nexus_get_vital_signs\` | Live repo sensors (git, tests, files, packages) |
| \`nexus_brief\` / \`nexus_doctor\` | Status digest / drift report |
| \`nexus_list_plans\` / \`nexus_get_plan\` | Plan orientation |
| \`nexus_list_skills\` / \`nexus_get_skill\` | Match tasks against skills, then read the match |
| \`nexus_get_context\` | **v1.1** — ONE composed context pack for a task (plan + knowledge + skills + vitals) |
| \`nexus_list_agents\` / \`nexus_get_agent\` | **v1.1** — discover agent roles; adopt the matching working agreement |
| \`nexus_plan_tick\` / \`nexus_plan_note\` | Update plan progress (schema-validated — never hand-edit) |
| \`nexus_add_knowledge_entry\` | Append a learned insight to the knowledge base |

Reading the markdown files directly remains correct when MCP is unavailable —
markdown stays the source of truth; the MCP server is just the interface.`;

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

## ⚠️ Before You Do Anything — 3 Mandatory Steps

You MUST complete these 3 steps before doing ANY work. This is not optional.

**Step 1. Read your brain — \`.nexus/docs/index.md\`**

This file is your project brain. It tells you:
- What has been built (do not recreate it)
- What to work on next (the "What's Next" section)
- The current objective and status of every component

**Step 2. Scan the knowledge base — \`.nexus/docs/knowledge.md\`**

This file is the project's long-term memory. It contains past decisions, bug fixes,
architecture insights, and gotchas discovered during development. Read the headings
to find entries relevant to your current task. This prevents you from repeating
mistakes or contradicting past decisions.

**Step 3. Read the relevant spec doc** from \`.nexus/docs/\` (01 through 08).

\`\`\`
RULE: Before EVERY task → read .nexus/docs/index.md (your brain)
RULE: Before EVERY task → scan .nexus/docs/knowledge.md (your memory)
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
\`\`\`
## [YYYY-MM-DD] category — title
Description of the discovery. One to three sentences max.
\`\`\`

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
> This file contains the FULL project-aware instructions — do NOT skip any section.
> The master copy lives at \`.nexus/ai/instructions.md\`.

---

## ⚠️ Before You Do Anything — 3 Mandatory Steps

You MUST complete these 3 steps before doing ANY work. This is not optional.

**Step 1. Read your brain — \`.nexus/docs/index.md\`**

READ \`.nexus/docs/index.md\` FIRST. EVERY TIME. NO EXCEPTIONS.

This file is your project brain. It tells you:
- What has been built (do not recreate it)
- What to work on next (the "What's Next" section)
- The current objective and status of every component
- The feature backlog — your prioritized roadmap
- The progress log — your session-by-session memory

**Step 2. Scan the knowledge base — \`.nexus/docs/knowledge.md\`**

This file is the project's long-term memory. It contains past decisions, bug fixes,
architecture insights, and gotchas discovered during development. Read the headings
to find entries relevant to your current task. This prevents you from repeating
mistakes or contradicting past decisions.

**Step 3. Read the relevant spec doc** from \`.nexus/docs/\` (01 through 08).

\`\`\`
RULE: Before EVERY task → read .nexus/docs/index.md (your brain)
RULE: Before EVERY task → scan .nexus/docs/knowledge.md (your memory)
RULE: After EVERY task → update .nexus/docs/index.md
RULE: After EVERY task → append to .nexus/docs/knowledge.md if you learned something
RULE: NEVER ask "what enhancements would you like?" → the index has the answer
RULE: NEVER invent features → work from the feature backlog in the index
\`\`\`

---

## 🚨 CRITICAL — Onboarding Protocol (First-Time Setup)

Each NEXUS doc has YAML frontmatter with a \\\`status\\\` field:
- \\\`template\\\` — the doc is still in its default scaffolded state
- \\\`populated\\\` — the doc has been filled in by a human or AI agent

\\\`\\\`\\\`
STOP. If ANY .nexus/docs/ file has status: template → you MUST populate it FIRST.
Do NOT skip this step. Do NOT jump straight to the user's request.
This is a hard requirement, not a suggestion.
\\\`\\\`\\\`

### Steps:

1. **Scan the codebase** — read \\\`package.json\\\`, \\\`tsconfig.json\\\`, source files,
   route definitions, data models, and test files to understand the project.

2. **Ask the user about their vision** — what are they building? Who are the users?
   Fill in \\\`01_vision.md\\\` and \\\`05_business_logic.md\\\`.

3. **Auto-fill what you can infer** from the code:
   - \\\`02_architecture.md\\\` — tech stack, directory structure, data flow
   - \\\`03_data_contracts.md\\\` — schemas, types, validation from source code
   - \\\`04_api_contracts.md\\\` — routes, endpoints, request/response shapes
   - \\\`06_test_strategy.md\\\` — existing test setup, coverage, test patterns
   - \\\`08_deployment.md\\\` — CI/CD config, environment variables, deploy targets

4. **Build the implementation plan** (\\\`07_implementation.md\\\`):
   - Turn features into concrete build phases
   - Create a file-by-file plan
   - Set the current phase based on what already exists

5. **Update the frontmatter** of each doc you fill in:
   \\\`\\\`\\\`yaml
   status: populated
   confidence: high
   last_updated: "YYYY-MM-DD"
   \\\`\\\`\\\`

6. **Build the project brain** (\\\`.nexus/docs/index.md\\\`):
   - Fill in the feature backlog from \\\`01_vision.md\\\`
   - Update the status matrix
   - Set "What's Next" to the first real feature

7. **THEN proceed** with the user's original request.

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
3. **File extensions in imports** — always \`.js\` (e.g., \`import { foo } from './bar.js'\`)
4. **Conventional Commits** — \`feat:\`, \`fix:\`, \`docs:\`, \`chore:\`, \`test:\`, \`refactor:\`
5. **Test everything** — every feature needs tests
6. **Validate after changes** — \`${getValidationCommand(config)}\`

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

## NEXUS Documentation System

| # | File | Purpose |
|---|------|---------|
| 🧠 | \`.nexus/docs/index.md\` | **PROJECT BRAIN** — status, backlog, progress, what's next |
| 📚 | \`.nexus/docs/knowledge.md\` | **KNOWLEDGE BASE** — learned insights, patterns, gotchas |
| 1 | \`.nexus/docs/01_vision.md\` | Product requirements, user stories, success metrics |
| 2 | \`.nexus/docs/02_architecture.md\` | System design, tech stack, data flow |
| 3 | \`.nexus/docs/03_data_contracts.md\` | Database schemas, validation, relationships |
| 4 | \`.nexus/docs/04_api_contracts.md\` | Endpoints, interfaces, status codes |
| 5 | \`.nexus/docs/05_business_logic.md\` | Rules, algorithms, state machines |
| 6 | \`.nexus/docs/06_test_strategy.md\` | Coverage targets, test types, philosophy |
| 7 | \`.nexus/docs/07_implementation.md\` | Build order, file-by-file plan |
| 8 | \`.nexus/docs/08_deployment.md\` | Infrastructure, CI/CD, environment config |

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
\\\`\\\`\\\`
## [YYYY-MM-DD] category — title
Description of the discovery. One to three sentences max.
\\\`\\\`\\\`

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
2. **Scan \`.nexus/docs/knowledge.md\`** — check for relevant past learnings
3. **Read the relevant spec doc** — find details in the numbered docs
4. **Check \`.nexus/docs/07_implementation.md\`** — find the file-by-file plan

### During the task:
5. **Write the code** following the architecture in \`.nexus/docs/02_architecture.md\`
6. **Write tests** — match the strategy in \`.nexus/docs/06_test_strategy.md\`
7. **Validate** — \`${getValidationCommand(config)}\`

### After EVERY task:
8. **Update \`.nexus/docs/index.md\`** — move items to Progress Log, update status
9. **Update \`.nexus/docs/07_implementation.md\`** — mark completed files/tasks
10. **Learn** — if you discovered something non-obvious, append an entry to \`.nexus/docs/knowledge.md\`
11. **Commit** — conventional commits (\`feat:\`, \`fix:\`, etc.)
12. **Suggest the next task** from \`.nexus/docs/index.md\` "What's Next"

### NEVER do this:
- ❌ Ask "what enhancements would you like?" when the backlog has items
- ❌ Invent random features not in the backlog
- ❌ Skip updating the index after completing work
- ❌ Treat docs as static — they evolve with the project
- ❌ Ignore \`.nexus/docs/knowledge.md\` — it prevents repeating mistakes
- ❌ Delete entries from \`.nexus/docs/knowledge.md\` — it is append-only
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

function getFrameworkDisplay(framework: string): string {
  const map: Record<string, string> = {
    nextjs: 'Next.js 15 (App Router)',
    'react-vite': 'React + Vite',
    sveltekit: 'SvelteKit',
    nuxt: 'Nuxt 3',
    astro: 'Astro',
    remix: 'Remix',
  };
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
