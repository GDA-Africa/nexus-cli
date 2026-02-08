# NEXUS CLI — AI Agent Instructions

> **This file is the single source of truth for all AI coding assistants.**
> Root-level config files (.cursorrules, .windsurfrules, .clinerules, AGENTS.md) point here.
> `.github/copilot-instructions.md` embeds a copy of this content.

---

## ⚠️ Before You Do Anything

1. **Read `.nexus/docs/index.md` FIRST.** It is the project brain — what's built, what's next, full module map.
2. **Scan `.nexus/knowledge.md`** for relevant decisions, gotchas, and patterns.
3. **Read `.nexus/docs/07_implementation.md`** for the technical architecture.

---

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | NEXUS CLI (`@nexus-framework/cli`) |
| **Version** | 0.1.3 |
| **Purpose** | AI-native project scaffolding tool — generates production-ready project structures with documentation AI agents can parse |
| **Org** | GDA Africa |
| **License** | Apache 2.0 |
| **Repo** | https://github.com/GDA-Africa/nexus-cli |
| **npm** | https://www.npmjs.com/package/@nexus-framework/cli |

---

## Tech Stack — Do Not Change Without Discussion

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.7, strict mode, ESM (NodeNext) |
| CLI | Commander.js 12.x |
| Prompts | @inquirer/prompts 7.x |
| Templates | Mustache 4.x |
| Testing | Vitest 3.x |
| Linting | ESLint 8.x + Prettier 3.x |
| Package Manager | yarn |

---

## Code Rules

1. **TypeScript strict mode** — no `any`, no implicit returns, no unused variables
2. **ESM only** — `import`/`export`, never `require()`
3. **File extensions in imports** — always `.js` (e.g., `import { foo } from './bar.js'`)
4. **Conventional Commits** — `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`
5. **Test everything** — every feature needs tests in `tests/unit/`
6. **Validate after changes** — run `npx tsc --noEmit && yarn test && yarn lint`

---

## Architecture Rules

- **Generators return `GeneratedFile[]`** — they never write to disk directly
- **The orchestrator (`src/generators/index.ts`)** collects all files and writes via `writeGeneratorResult()`
- **Types live in `src/types/`** — config.ts, prompts.ts, templates.ts
- **Utils are pure functions** — no side effects except file-system.ts and git.ts
- **Prompts use `@inquirer/prompts`** (not legacy `inquirer`)
- **Landing pages are framework-specific** — see `src/generators/landing-page.ts`
- **AI config generator** — `src/generators/ai-config.ts` generates `.nexus/ai/` + root pointers
- **Docs generator** — `src/generators/docs.ts` generates `.nexus/docs/` (8 files + index + knowledge + manifest)
- **Reconcile pattern** — `reconcileNexusFiles()` is shared core for both upgrade and repair commands

---

## Key Files

| File | Purpose |
|------|---------|
| `.nexus/docs/index.md` | **PROJECT BRAIN** — read this first |
| `.nexus/knowledge.md` | **KNOWLEDGE BASE** — scan before tasks, append after |
| `.nexus/docs/01_vision.md` | Product vision, user stories, success metrics |
| `.nexus/docs/07_implementation.md` | Technical architecture, build phases |
| `src/cli.ts` | CLI entry point (Commander.js, 4 commands) |
| `src/commands/init.ts` | `nexus init` — scaffold new project |
| `src/commands/adopt.ts` | `nexus adopt` — add NEXUS to existing project |
| `src/commands/upgrade.ts` | `nexus upgrade` — regenerate with latest templates |
| `src/commands/repair.ts` | `nexus repair` — fix missing/corrupted files |
| `src/generators/index.ts` | Generator orchestrator + reconcile system |
| `src/generators/ai-config.ts` | AI agent config generator |
| `src/generators/docs.ts` | Documentation + knowledge generator |
| `src/types/config.ts` | NexusConfig and all union types |

---

## NEXUS Documentation System

| # | File | Purpose |
|---|------|---------|
| — | `.nexus/docs/index.md` | Project brain — status, module map, what's next |
| — | `.nexus/knowledge.md` | Progressive knowledge base — append-only log |
| 1 | `.nexus/docs/01_vision.md` | Product requirements, user stories, success metrics |
| 7 | `.nexus/docs/07_implementation.md` | Technical architecture, build phases |

---

## Knowledge Base Protocol

**Before every task:** Scan `.nexus/knowledge.md` for entries relevant to your work.

**After completing work:** Append a new entry if you discovered something worth remembering:
```
## [YYYY-MM-DD] category — title
Description of the discovery.
```
Categories: `architecture`, `bug-fix`, `pattern`, `package`, `performance`, `convention`, `gotcha`

---

## Workflow

1. **Read the brain** — `.nexus/docs/index.md`
2. **Scan knowledge** — `.nexus/knowledge.md`
3. **Read the spec** — find relevant doc in `.nexus/docs/`
4. **Write the code** following architecture rules
5. **Write tests** in `tests/unit/`
6. **Validate** — `npx tsc --noEmit && yarn test && yarn lint`
7. **Commit** — conventional commits (`feat:`, `fix:`, etc.)
8. **Update the brain** — `.nexus/docs/index.md` when you complete tasks
9. **Record knowledge** — append to `.nexus/knowledge.md` if you learned something

---

## Current Priorities

See `.nexus/docs/index.md` → "What's Next" for the up-to-date priority list.
