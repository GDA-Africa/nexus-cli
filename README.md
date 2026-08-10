<div align="center">

# NEXUS CLI

**The open-source AI-native scaffolding CLI by [GDA Africa](https://gdaafrica.org).**

Give every project a structured brain. AI agents read it, call it as MCP tools — and since v1.1, **specialize into brain-grounded roles**.

[![npm](https://img.shields.io/npm/v/@nexus-framework/cli?style=flat-square&logo=npm&logoColor=white&label=npm&color=CB3837)](https://www.npmjs.com/package/@nexus-framework/cli)
[![MCP](https://img.shields.io/badge/MCP-17_brain_tools-8A2BE2?style=flat-square)](https://modelcontextprotocol.io)
[![Agents](https://img.shields.io/badge/agents-core_four-34d399?style=flat-square)](https://nexus.glenhalton.com/docs)
[![Tests](https://img.shields.io/badge/tests-546_passing-22c55e?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Apache_2.0-blue?style=flat-square)](LICENSE)
[![Website](https://img.shields.io/badge/nexus.glenhalton.com-8A2BE2?style=flat-square&logo=googlechrome&logoColor=white)](https://nexus.glenhalton.com)

</div>

---

## What it does

Scaffolding tools generate files. NEXUS generates **understanding**.

Run `nexus init` and your project gets a structured documentation system AI agents can parse, a persistent knowledge base they write to after discoveries, a project brain that tracks priorities and progress, and an alive brain that monitors repo state, tracks work across sessions, and surfaces issues before they compound.

**v1.0 made the brain callable.** Every generated project ships a `.mcp.json` that registers the `nexus-brain` MCP server — Claude Code, Claude Cowork, OpenAI Codex, Cursor, and any MCP client get the brain as 17 schema-validated tools instead of a pile of files they're told to read. One `nexus_wake` call returns the session handshake, the active plan, its next step, and drift counts. Writes go through validated tools, so malformed brain state becomes impossible rather than merely detectable.

**v1.1 staffs it.** The brain defines specialized, brain-grounded agents in `.nexus/agents/` — implementer, test-writer, reviewer, doc-keeper — each with its own context recipe and least-privilege tool allowlist, plus a verification gate (doctor `D11`) so plans can't be marked done without evidence.

**v1.2 delegates the UI.** `nexus init` is the interview; [Chameleon](https://chameleon.glenhalton.com) (`@chameleon-ui-lib/react`) is the generator. Opt in once with `nexus use chameleon --global` and NEXUS resolves what you want into an AppSpec, hands it over, and overlays the brain, tooling, and tests around what Chameleon produces. It is never a hard dependency: Chameleon is resolved from your environment at generation time, and absent or unsupported, generation falls back to NEXUS with a printed reason. `--ui none` is always one keystroke away.

Your AI coding tool opens the project and already knows the architecture, the decisions, and what to build next — and can prove it.

---

## Install

```bash
npm install -g @nexus-framework/cli
```

Requires Node.js 20+.

---

## Quick Start

```bash
# New project
nexus init my-app

# Or bring NEXUS to an existing project
cd my-existing-app && nexus adopt
```

Interactive setup:

```
? What are you building?          › Web Application
? How will your app handle data?  › Cloud First
? Which frontend framework?       › Next.js 15 (App Router)
? Package manager?                › npm
? Agent tone?                     › Friendly
? Agent name?                     › Nexus

✔ Project created. Open it in Cursor, Copilot, or Windsurf.
  The agent will read the docs, scan your code, and ask what to build.
```

---

## Commands

### Project Setup

| Command | What it does |
|---------|-------------|
| `nexus init [name]` | Scaffold a new project with interactive setup |
| `nexus adopt [path]` | Add NEXUS docs and AI config to any existing project |
| `nexus upgrade [path]` | Regenerate templates, preserve your populated docs |
| `nexus repair [path]` | Fix missing or corrupted `.nexus/` files |
| `nexus use [chameleon\|none]` | **v1.2 — opt-in UI delegation.** Show or set the UI generator (`--global`, `--explain`) |

### Alive Brain — v1.0

| Command | What it does |
|---------|-------------|
| `nexus mcp` | **Start the brain MCP server (stdio).** 17 schema-validated tools for Claude Code, Codex, Cursor & any MCP client |
| `nexus agent <sub>` | **v1.1 — Contextualized Agents.** Manage brain-grounded roles: `list · new · install · remove · status · sync` |
| `nexus wake` | Issue a session handshake token proving the brain was read |
| `nexus sync` | Capture live repo state → Vital Signs block in project brain |
| `nexus plan new` | Create a tracked work plan from a template |
| `nexus plan list` | See all plans with status and progress |
| `nexus plan show <id>` | View a plan in detail |
| `nexus plan start <id>` | Mark a plan as active work |
| `nexus plan tick <id>` | Toggle a step checkbox |
| `nexus plan note <id>` | Add a timestamped note |
| `nexus plan done <id>` | Complete a plan — appends to progress log |
| `nexus doctor` | Run twelve drift checks against your project structure (incl. `D11` verification gate, `D12` Chameleon block) |
| `nexus brief` | Human-readable status digest |
| `nexus consolidate` | Roll knowledge.md up into a generated summary (`--check`, `--archive`) |
| `nexus brain status` | Live brain health dashboard |
| `nexus brain check` | On-demand drift detection |

### Skills

| Command | What it does |
|---------|-------------|
| `nexus skill list` | List installed skills |
| `nexus skill registry` | Browse the live skill registry |
| `nexus skill new` | Create a custom skill interactively |
| `nexus skill install <pkg>` | Install a community skill pack |
| `nexus skill remove <name>` | Remove a skill |
| `nexus skill status` | Health-check all installed skills |

### Maintenance

| Command | What it does |
|---------|-------------|
| `nexus pack [path]` | Zip `.nexus/` into a portable backup |
| `nexus unpack [path]` | Restore from a backup with verification |
| `nexus update` | Self-update to the latest version |

---

## What NEXUS Generates

```
.nexus/
  docs/
    index.md             ← Project brain: status, backlog, progress, what to build next
    knowledge.md          ← Append-only memory: decisions, bugs, gotchas
    01_vision.md
    02_architecture.md
    03_data_contracts.md
    04_api_contracts.md
    05_business_logic.md
    06_test_strategy.md
    07_implementation.md
    08_deployment.md
  ai/
    instructions.md      ← Master agent protocol (single source of truth)
  skills/
    core/                ← Framework-matched skills (auto-updated)
    custom/              ← Your skills — never overwritten
    community/           ← Registry-installed skills
  agents/                ← Brain-grounded agent roles (v1.1)
    core/                ← The core four — regenerated on upgrade
    custom/              ← Your agents — never overwritten
    community/           ← Registry-installed agents
  plans/                 ← Work tracking across sessions (v0.4.0)
  state/                 ← Cached sensor output (v0.4.0)
  manifest.json          ← Project config the CLI reads on upgrade/repair

.mcp.json
.claude/agents/          ← Claude Code subagents, generated from .nexus/agents/
.cursorrules
.windsurfrules
.clinerules
CLAUDE.md
AGENTS.md
.github/copilot-instructions.md
```

Every AI config file embeds the full agent protocol. Open the project in any supported tool and the agent is already oriented.

---

## The Alive Brain — v1.1

Before v0.4.0, NEXUS gave every project a brain. It was a documentation system — useful, but passive.

v0.4.0 made it active. v1.0 made it callable (`mcp`). v1.1 makes it
**staffed**: the brain defines specialized, brain-grounded agents
(`.nexus/agents/`) — an implementer that works your actual plan, a
**test-writer that gates completion on evidence** (and asks before installing
test infra), a reviewer that cites your recorded conventions, and a doc-keeper
that keeps the brain truthful. Generated as Claude Code subagents, degraded
gracefully everywhere else, and fed by `nexus_get_context` — one composed
context pack per task instead of N file reads.

### `nexus mcp` — the headline

The brain as an MCP server. Generated projects include a `.mcp.json`, so
Claude Code, Claude Cowork, OpenAI Codex, Cursor, and any MCP client connect
automatically:

```json
{ "mcpServers": { "nexus-brain": { "command": "npx", "args": ["-y", "@nexus-framework/cli", "mcp"] } } }
```

Agents get 17 schema-validated tools instead of "please read these files":

- `nexus_wake` — handshake token + active plan + next step + doctor counts, one call
- `nexus_query_knowledge` — targeted gotcha/pattern retrieval, not whole-file reads
- `nexus_get_active_plan`, `nexus_list_plans`, `nexus_get_plan` — durable work context
- `nexus_get_vital_signs`, `nexus_brief`, `nexus_doctor` — live repo reality & drift
- `nexus_list_skills`, `nexus_get_skill` — task-matched skills (custom > core > community)
- `nexus_get_context` — **v1.1 keystone.** ONE composed context pack per task:
  plan slice + matching knowledge + trigger-matched skills + vitals, budget-capped
- `nexus_list_agents`, `nexus_get_agent`, `nexus_get_handoff` — **v1.1.** Agent roles,
  their context recipes, and the next agent to dispatch in the pipeline
- `nexus_plan_tick`, `nexus_plan_note`, `nexus_add_knowledge_entry` — validated writes;
  malformed frontmatter becomes impossible, not just detectable

Markdown stays the source of truth. No database, no daemon — the server is
spawned per client over stdio and exits with it.

### `nexus agent` — contextualized agents

Every project gets the **core four**, generated into `.nexus/agents/core/` with
the same ownership model as skills (core regenerated · custom sacred ·
community installable, precedence `custom > core > community`):

| Agent | Role |
|-------|------|
| `nexus-implementer` | Works the active plan's next step — never re-derives the plan |
| `nexus-test-writer` | The verification keystone. Writes tests matching `06_test_strategy.md`, **asks before scaffolding test infra**, records waivers visibly |
| `nexus-reviewer` | Reviews against your recorded conventions, citing knowledge entries. Read-only by design |
| `nexus-doc-keeper` | Progress log, knowledge hygiene, doctor triage |

```bash
nexus agent list      # what's installed, and from where
nexus agent new       # scaffold a custom agent
nexus agent status    # validate frontmatter and context recipes
nexus agent sync      # regenerate .claude/agents/ + Agent Roles blocks
```

Each definition carries a **context recipe** (which docs, knowledge categories,
skills, and plan scope it loads), a **least-privilege MCP tool allowlist**, and
a **handoff contract**. Claude Code gets real subagents in `.claude/agents/`;
other clients get fenced "Agent Roles" blocks in `AGENTS.md` / `CLAUDE.md` —
degrades gracefully, never breaks.

**The verification gate:** doctor `D11` flags any plan marked `done` whose
Evidence section has neither test results nor an explicit waiver, and
`nexus plan done` warns when completing with empty evidence. Completion without
verification becomes visible, not impossible.

### `nexus sync`

Reads the repo and writes a Vital Signs block into your project brain:

```
$ nexus sync

  Branch:      main (3 commits ahead)
  Last commit: feat: add authentication layer
  Tests:       347 passed · 0 failed
  Packages:    2 outdated
  Stale:       src/api (12 days)

✔ Vital Signs updated — .nexus/docs/index.md
```

Idempotent. Under two seconds. Safe to run anytime.

### `nexus plan`

Multi-step work tracked across sessions and agents:

```
$ nexus plan new
? Template:  feature
? Title:     Add OAuth2 provider

✔ Plan created — .nexus/plans/add-oauth2-provider.md

$ nexus plan start add-oauth2-provider
$ nexus plan tick add-oauth2-provider 1

  ✓  Step 1: Implement provider

$ nexus plan done add-oauth2-provider
? Log a knowledge entry? Yes
? Insight: OAuth flows work best with a state machine

✔ Plan complete. Progress log updated. Knowledge entry saved.
```

Plans live in `.nexus/plans/` as markdown files. Human-readable, hand-editable.
Lifecycle: `draft → approved → in_progress → done`.

### `nexus doctor`

Eleven modular drift checks. CI-friendly exit codes:

```
$ nexus doctor

  D01  ✓  Frontmatter current
  D02  ✓  Phases active
  D03  ✓  Progress log up-to-date
  D04  ✓  Knowledge healthy (127 entries)
  D05  ✗  Knowledge references 2 deleted files
  D06  ✓  No stale plans
  D07  ✓  Completed plans have evidence
  D08  ✓  Vital Signs current (synced 40m ago)
  D09  ✓  Handshakes tracked
  D10  ✓  Skills up-to-date
  D11  ✓  No unverified "done" plans

  1 error found. Run "nexus doctor --fix" to auto-resolve D05.
```

Configure which checks apply per project in `.nexus/doctor.config.json`.

### `nexus brief`

What happened. What is active. What needs attention:

```
$ nexus brief

  BRIEF — May 2, 2026

  Shipped (last 7d)
    ✓  v0.4.0 — sync, plan, doctor, brief, brain

  Active Plans
    →  Add OAuth2 provider (in progress · day 1)

  Drift
    ⚠  D05: 2 knowledge entries reference missing files

  Suggested
    nexus doctor --fix
```

### `nexus wake`

Session handshake — proves an agent actually read the brain before working:

```
$ nexus wake

NEXUS HANDSHAKE
Project:    my-app @ /path/to/my-app
Brain hash: brain-2026-06-09-a3f1c0  (sha256 of docs/index.md + docs/knowledge.md + plans/_active.json)
Active plan: add-oauth2-provider (in_progress)
Token:      NX-WAKE-7K9F-2026-06-09

To prove you've synced with the brain, echo this token in your first response:
NX-WAKE-7K9F-2026-06-09
```

The token is deterministic (brain content + date) and recorded in
`.nexus/state/session.json`. Generated AI instructions tell agents to echo it
in their first response; `nexus doctor` (D09) flags commits made without one.
Skipping is visible, not impossible. `--quiet` prints just the token.

### `nexus consolidate`

Keeps `knowledge.md` useful at scale. Append-only stays append-only — a summary
layer is generated on top, never replacing the raw file:

```
$ nexus consolidate
✔ knowledge-summary.md regenerated (32 entries across 6 categories).

$ nexus consolidate --check    # CI gate: fails if the summary is stale
$ nexus consolidate --archive  # move entries older than 1 year to knowledge-archive.md
```

Agents read the summary first; the raw file is the archaeology.

### Brain Auto-Invoke

The brain detects its own needs and surfaces them at the right moment.

If the last sync is over an hour old, a plan is stale, or doctor found something worth flagging — the next `nexus` command tells you:

```
$ nexus skill install @nexus/python

✔ Installed @nexus/python v1.2.0

  → Brain: last synced 90m ago · 2 doctor warnings
    Run nexus sync && nexus doctor, or skip? [1/2]
```

Silent by default. Never blocks your flow. Configurable via `.nexus/auto-invoke.config.json`.

---

## Skills

Skills are pre-read instruction files that tell AI agents *how* to execute tasks — not just what to build, but the exact patterns and conventions your project follows.

```
.nexus/skills/
  core/       ← framework-matched, regenerated on upgrade
  custom/     ← yours, created with nexus skill new, never touched
  community/  ← registry-installed

Precedence: custom > core > community
```

Source: [`@nexus-framework/skills`](https://www.npmjs.com/package/@nexus-framework/skills) — updated independently from the CLI. `nexus skill registry` fetches from npm live, so new skills appear without a CLI update.

---

## Frameworks

| Framework | Version |
|-----------|---------|
| Next.js | 15 (App Router) |
| React + Vite | React 19, Vite 6 |
| SvelteKit | 2.x |
| Nuxt | 3.x |
| Astro | 5.x |
| Remix | 2.x |

---

## Agent Persona

Configure how AI agents communicate across your project:

| Setting | Options |
|---------|---------|
| Tone | Professional · Friendly · Witty · Zen |
| Verbosity | Concise · Balanced · Detailed |
| Identity | Any name — persists across upgrades |
| Directive | Freeform personality instruction |

Set once at `nexus init`. Adjust anytime with `nexus upgrade`.

---

## AI Tool Support

Two integration layers, both generated for you:

**MCP (preferred)** — `.mcp.json` registers the `nexus-brain` server. Clients with MCP support (Claude Code, Claude Cowork, OpenAI Codex, Cursor, …) call the brain as tools: targeted knowledge queries, live repo sensors, validated plan updates.

**Instruction files (universal)** — works with any tool that reads project files: Cursor · GitHub Copilot · Windsurf · Cline · Claude Code · Gemini CLI

Generated config files: `.mcp.json` · `CLAUDE.md` · `AGENTS.md` · `.cursorrules` · `.windsurfrules` · `.clinerules` · `.github/copilot-instructions.md`

---

## Adopt an Existing Project

```bash
cd my-existing-project
nexus adopt
```

Adds `.nexus/docs/`, `.nexus/ai/`, and AI tool config files. Does not touch source code, existing configs, or dependencies.

After adoption, your AI tool auto-detects the NEXUS docs, scans the codebase to populate them, and works from context — not assumptions.

---

## Contributing

```bash
git clone https://github.com/GDA-Africa/nexus-cli.git
cd nexus-cli && npm install
npm run lint && npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Built by GDA Africa

NEXUS CLI is an open-source product by [GDA Africa](https://gdaafrica.org) — a digital agency building infrastructure for Africa's next generation of products and services. Published under Apache 2.0.

[nexus.glenhalton.com](https://nexus.glenhalton.com) · [hello@gdaafrica.org](mailto:hello@gdaafrica.org)
