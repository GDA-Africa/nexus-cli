# NEXUS CLI — GitHub Copilot Instructions

> **This file is automatically read by GitHub Copilot on every interaction.**
> It ensures all AI-assisted development follows NEXUS project standards.
> Full instructions also at `.nexus/ai/instructions.md`.

## 🧠 Before You Do Anything

**READ THE PROJECT INDEX FIRST:** `.nexus/docs/index.md`

This file is the single source of truth for the project's current state, what has been built, what hasn't, and what to work on next. Do not assume — check the index.

## Project Overview

- **Name:** NEXUS CLI (`@nexus-framework/cli`)
- **Version:** 0.1.0
- **Purpose:** AI-native project scaffolding tool by GDA Africa
- **License:** Apache 2.0

## Key Documentation

| File | What It Tells You |
|------|-------------------|
| `.nexus/docs/index.md` | **START HERE** — Full project status, what's built, what's next |
| `.nexus/docs/01_vision.md` | Product requirements, user stories, success metrics |
| `.nexus/docs/07_implementation.md` | Technical architecture, build phases, file-by-file plan |
| `CONTRIBUTING.md` | Commit standards, PR process, code style |
| `README.md` | Public-facing project overview |

## Tech Stack (Do Not Change Without Discussion)

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5.7, strict mode, ESM (NodeNext)
- **CLI:** Commander.js 12.x
- **Prompts:** @inquirer/prompts 7.x
- **Template Engine:** Mustache 4.x
- **Testing:** Vitest 3.x
- **Linting:** ESLint 8.x + Prettier 3.x
- **Package Manager:** yarn

## Code Standards

1. **TypeScript strict mode** — no `any`, no implicit returns
2. **ESM only** — use `import`/`export`, never `require()`
3. **File extensions in imports** — always use `.js` extension (e.g., `import { foo } from './bar.js'`)
4. **Conventional Commits** — every commit must be `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`
5. **Test everything** — every new feature needs unit tests in `tests/unit/`
6. **Validate after changes** — run `npx tsc --noEmit`, `yarn test`, `yarn lint`

## Architecture Rules

- **Generators return `GeneratedFile[]`** — they never write to disk directly
- **The orchestrator (`src/generators/index.ts`)** collects all files and writes them via `writeGeneratorResult()`
- **Types live in `src/types/`** — config.ts, prompts.ts, templates.ts
- **Utils are pure functions** — no side effects except file-system.ts and git.ts
- **Prompts use @inquirer/prompts** (not legacy inquirer)

## What's Already Built (Don't Recreate)

- Full CLI with `nexus init` and `nexus adopt` commands
- Interactive prompt system (6 modules)
- Generator engine (8 modules including landing page + ai-config)
- Type system (4 modules)
- Utility layer (6 modules including project-detector)
- 73 unit tests (all passing)
- AI config generation (`.nexus/ai/` + root pointer files + onboarding protocol)
- Centralized `.nexus/` folder (docs, AI config, manifest)
- GitHub Actions CI, commitlint, CODEOWNERS, PR/issue templates

## Current Priorities

Check `.nexus/docs/index.md` → "What's Next" section for the latest priorities.
