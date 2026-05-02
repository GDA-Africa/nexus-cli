<div align="center">

# NEXUS CLI

**The open-source AI-native scaffolding CLI by [GDA Africa](https://gdaafrica.org).**

Give every project a structured brain. AI agents read it, build from it, and remember what they learn.

[![npm](https://img.shields.io/npm/v/@nexus-framework/cli?style=flat-square&logo=npm&logoColor=white&label=npm&color=CB3837)](https://www.npmjs.com/package/@nexus-framework/cli)
[![Tests](https://img.shields.io/badge/tests-347_passing-22c55e?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Apache_2.0-blue?style=flat-square)](LICENSE)
[![Website](https://img.shields.io/badge/nexus.glenhalton.com-8A2BE2?style=flat-square&logo=googlechrome&logoColor=white)](https://nexus.glenhalton.com)

</div>

---

## What it does

Scaffolding tools generate files. NEXUS generates **understanding**.

Run `nexus init` and your project gets a structured documentation system AI agents can parse, a persistent knowledge base they write to after discoveries, a project brain that tracks priorities and progress — and in v0.4.0, an alive brain that monitors repo state, tracks work across sessions, and surfaces issues before they compound.

Your AI coding tool opens the project and already knows the architecture, the decisions, and what to build next.

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

### Alive Brain — v0.4.0

| Command | What it does |
|---------|-------------|
| `nexus sync` | Capture live repo state → Vital Signs block in project brain |
| `nexus plan new` | Create a tracked work plan from a template |
| `nexus plan list` | See all plans with status and progress |
| `nexus plan show <id>` | View a plan in detail |
| `nexus plan start <id>` | Mark a plan as active work |
| `nexus plan tick <id>` | Toggle a step checkbox |
| `nexus plan note <id>` | Add a timestamped note |
| `nexus plan done <id>` | Complete a plan — appends to progress log |
| `nexus doctor` | Run ten drift checks against your project structure |
| `nexus brief` | Human-readable status digest |
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
  plans/                 ← Work tracking across sessions (v0.4.0)
  state/                 ← Cached sensor output (v0.4.0)

.cursorrules
.windsurfrules
.clinerules
AGENTS.md
.github/copilot-instructions.md
```

Every AI config file embeds the full agent protocol. Open the project in any supported tool and the agent is already oriented.

---

## The Alive Brain — v0.4.0

Before v0.4.0, NEXUS gave every project a brain. It was a documentation system — useful, but passive.

v0.4.0 makes it active.

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

Ten modular drift checks. CI-friendly exit codes:

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

Works with any tool that reads project files.

Cursor · GitHub Copilot · Windsurf · Cline · Claude Code · Gemini CLI

Supported config files: `.cursorrules` · `.windsurfrules` · `.clinerules` · `AGENTS.md` · `.github/copilot-instructions.md`

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
