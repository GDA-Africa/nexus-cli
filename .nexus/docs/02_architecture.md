---
nexus_doc: true
id: "02_architecture"
title: "System Architecture"
status: populated
confidence: high
last_updated: "2026-08-24"
---

# System Architecture

**Project:** NEXUS CLI (`@nexus-framework/cli`)
**Type:** Node.js CLI (no frontend) — v1.4.0
**Data Strategy:** local-only — everything lives on disk under the target project's `.nexus/` directory; there is no database or remote service NEXUS itself talks to at runtime (skill/registry lookups reach npm, nothing else).

---

## 🏗️ Architecture Overview

NEXUS is a **scaffolding + brain generator**, not a running service. It ships two things:

1. A **CLI** (`bin/nexus.js` → `src/cli.ts`, Commander.js) that generates, adopts, upgrades, repairs, and inspects the `.nexus/` brain inside a target project.
2. An **MCP server** (`nexus mcp`, `src/mcp/`) that exposes that same brain as 17 schema-validated tools over stdio, so any MCP client (Claude Code, Claude Cowork, Codex, Cursor) can read/write it without shelling out to the CLI.

```
 nexus <command>            AI client (Claude Code, Codex, ...)
      │                                │
      ▼                                ▼
 src/commands/*.ts   ◄── shared ──►  src/mcp/server.ts (stdio)
      │                 utils/           │
      ▼                                  ▼
 src/generators/*.ts              src/mcp/tools.ts (zod schemas)
      │                                  │
      └──────────────┬───────────────────┘
                      ▼
         target project's .nexus/ directory
         (docs/, plans/, skills/, agents/, state/, ai/)
```

Both entry points funnel through the same `src/utils/*` primitives (brain locator, plan lifecycle, doctor checks, skill/agent resolution) — the CLI and the MCP server are two skins over one engine, not two implementations.

## 🛠️ Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Language | TypeScript 5.7, strict mode | Compiled with `tsc` to `dist/`, ESM only (`"type": "module"`) |
| CLI framework | Commander.js | Command parsing, `bin/nexus.js` shim |
| Prompts | `@inquirer/prompts` / `inquirer` | Interactive scaffolding wizard (`src/prompts/`) |
| Templating | Mustache | Renders generated docs/config from `TemplateContext` |
| MCP | `@modelcontextprotocol/sdk` + `zod` | Stdio server exposing brain tools with validated schemas |
| Terminal UX | chalk, boxen, ora, figlet, gradient-string | Banner, spinners, colored output |
| Packaging | archiver / unzipper | `nexus pack` / `nexus unpack` — zip the `.nexus/` brain |
| Testing | vitest (+ `@vitest/coverage-v8`) | Unit, integration, and e2e suites under `tests/` |
| Lint/format | ESLint 8 + typescript-eslint, Prettier | `npm run lint`, `npm run format` |
| Package manager | npm | `package.json` scripts and CI (`.github/workflows/ci.yml`) both use `npm ci`/`npm run` — see note below |
| Runtime target | Node.js ≥20 | `engines.node` in `package.json`; CI matrix runs 20 and 22 |

> **Note — package manager discrepancy:** the root `Project Identity` table in this repo's generated `CLAUDE.md` lists `yarn`, but the actual `package.json` scripts and CI workflow use `npm`. Treat `npm` as ground truth for this repo; the `yarn` label is stale scaffold metadata. Recorded in `knowledge.md`.

## 📁 Directory Structure

```
src/
├── cli.ts                 Commander entry point, registers all subcommands
├── index.ts                Public package export (./)
├── version.ts               Single source of truth for CLI version string
├── commands/                One file per top-level command (init, adopt, upgrade,
│                             repair, skill, pack, update, mcp, sync, plan, doctor,
│                             brief, consolidate, wake, agent, use)
├── generators/               Pure functions that produce file trees: structure,
│                             docs (8-doc brain + index + knowledge), config,
│                             tests, ci-cd, landing-page, ai-config, skills,
│                             agents, ui-delegation, spring-boot
├── prompts/                  Interactive wizard modules (one per config axis:
│                             project-type, frameworks, data-strategy, patterns,
│                             features, persona, skill-config, adoption)
├── mcp/                       MCP server: server.ts (tool registration),
│                             tools.ts (implementations + zod schemas),
│                             context.ts (nexus_get_context composition)
├── types/                     Shared type definitions (config, manifest,
│                             persona, chameleon/UI-delegation, templates)
└── utils/                     Engine internals shared by commands + MCP:
    ├── doctor/checks/         D01–D14 drift checks, one file per check
    ├── plans/                 Plan parsing, lifecycle state machine, index builder
    ├── sensors/                Live repo-reality probes (git, files, tests, packages)
    ├── skills/                 Skill frontmatter, matching, and the alignment gate
    ├── agents/                 Agent definition parsing + handoff chain
    ├── chameleon/               UI-delegation appspec/runner (`nexus use`)
    ├── brain.ts, manifest.ts, knowledge.ts, validator.ts, git.ts,
    │   file-system.ts, package-manager.ts, project-detector.ts, ...

tests/
├── unit/            One spec per module above (vitest)
├── integration/     sync + doctor/brief pipelines against a real temp project
└── e2e/              Full alive-brain lifecycle (init → sync → plan → doctor)
```

## 🔄 Data Flow

**Generation (`nexus init` / `adopt`):** prompts (`src/prompts/`) build a `NexusConfig` → `generators/index.ts` orchestrates the generator modules → each writes files into the target project (`.nexus/docs/*`, `.nexus/ai/instructions.md`, `.nexus/skills/`, `.nexus/agents/`, root pointer files) → `manifest.json` records the resolved config.

**Brain read (`nexus_get_context` / `nexus wake`):** an AI agent calls into `src/mcp/tools.ts` (or the CLI equivalent) → readers in `src/utils/` parse `.nexus/docs/index.md`, `knowledge.md`, `plans/`, and `skills/` from disk → `context.ts` composes one bounded, deterministic pack (plan slice + matching knowledge + triggered skills + vitals digest) capped by `maxChars`.

**Brain write (`nexus sync` / `plan tick` / `add_knowledge_entry`):** sensors in `src/utils/sensors/` probe the real repo (git log, file mtimes, test/package state) → the appropriate command/tool rewrites the fenced Vital Signs block in `index.md`, or appends/updates plan and knowledge markdown, always through the schema-validated path rather than free-text edits.

**Drift detection (`nexus doctor`):** each `D0*`/`D1*` check in `src/utils/doctor/checks/` reads current brain state and repo vitals, returns warn/info/error findings; `nexus brief` renders a human-readable digest on top of the same data.

There is no database and no server process outside the on-demand `nexus mcp` stdio server — every "data flow" above is markdown/JSON files on disk, read and written through validated utility functions rather than ad hoc string edits.
