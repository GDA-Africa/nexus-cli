# NEXUS CLI — AI Agent Instructions

> **This file is the single source of truth for all AI coding assistants.**
> Root-level config files (.cursorrules, .windsurfrules, .clinerules, AGENTS.md) point here.
> `.github/copilot-instructions.md` embeds a copy of this content.

---

## ⚠️ Before You Do Anything

**Read `.nexus/docs/index.md` FIRST.** It is the project brain — the single source of truth for:
- What has been built (don't recreate it)
- What hasn't been built yet
- What to work on next
- The full file inventory and module map

Then read `.nexus/docs/07_implementation.md` for the technical architecture and build plan.

---

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | NEXUS CLI (`@nexus-framework/cli`) |
| **Version** | 0.1.0 |
| **Purpose** | AI-native project scaffolding tool — generates production-ready project structures with documentation AI agents can parse |
| **Org** | GDA Africa |
| **License** | Apache 2.0 |
| **Repo** | https://github.com/GDA-Africa/nexus-cli |

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
- **Docs generator** — `src/generators/docs.ts` generates `.nexus/docs/` (8 files + index + manifest)

---

## Key Files

| File | Purpose |
|------|---------|
| `.nexus/docs/index.md` | **PROJECT BRAIN** — read this first |
| `.nexus/docs/01_vision.md` | Product vision, user stories, success metrics |
| `.nexus/docs/07_implementation.md` | Technical architecture, build phases, file-by-file plan |
| `src/cli.ts` | CLI entry point (Commander.js) |
| `src/commands/init.ts` | Main `nexus init` command |
| `src/generators/index.ts` | Generator orchestrator |
| `src/generators/ai-config.ts` | AI agent config generator |
| `src/types/config.ts` | NexusConfig and all union types |
| `CONTRIBUTING.md` | Contribution standards |
| `README.md` | Public-facing project overview |

---

## What's Built (45 tests passing)

- Full CLI (`nexus init`, `--version`, `--help`)
- 6 prompt modules (project type, data strategy, patterns, frameworks, features)
- 8 generator modules (structure, docs, config, tests, CI/CD, landing page, ai-config, orchestrator)
- 4 type modules (config, prompts, templates, index)
- 6 utility modules (logger, validator, package-manager, git, file-system, index)
- Branded landing pages for Next.js, React+Vite, SvelteKit, Nuxt, Astro
- AI agent config generation (`.nexus/ai/` + root pointer files for Cursor, Windsurf, Cline, Copilot)
- Centralized `.nexus/` folder (docs, AI config, manifest — one folder to opt in/out)
- GitHub Actions CI, CODEOWNERS, PR/issue templates, commitlint

---

## NEXUS Documentation System

All documentation lives under `.nexus/docs/`:

| # | File | Purpose |
|---|------|---------|
| — | `.nexus/docs/index.md` | Project brain — status, module map, what's next |
| 1 | `.nexus/docs/01_vision.md` | Product requirements, user stories, success metrics |
| 7 | `.nexus/docs/07_implementation.md` | Technical architecture, build phases, file-by-file plan |

---

## Workflow

When implementing a feature:

1. **Read the relevant doc** — find the spec in `.nexus/docs/`
2. **Check the implementation plan** — `.nexus/docs/07_implementation.md`
3. **Write the code** following the architecture rules above
4. **Write tests** — add tests in `tests/unit/`
5. **Validate** — `npx tsc --noEmit && yarn test && yarn lint`
6. **Commit** — use conventional commits (`feat:`, `fix:`, etc.)
7. **Update the index** — `.nexus/docs/index.md` when you complete tasks

---

## Current Priorities

See `.nexus/docs/index.md` → "What's Next" for the up-to-date priority list.
