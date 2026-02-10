# NEXUS CLI — Knowledge Base

> Append-only log of discoveries, decisions, and patterns learned while building this project.
> AI agents: scan before every task, append after completing work.

---

## [2026-02-07] architecture — Generator pattern: never write to disk
Generators return `GeneratedFile[]` arrays. Only the orchestrator (`src/generators/index.ts`) calls `writeGeneratorResult()` to flush files to disk. This separation makes testing trivial — every generator test just inspects the returned array without touching the file system.

## [2026-02-07] convention — ESM import extensions are mandatory
TypeScript with `moduleResolution: "NodeNext"` requires `.js` extensions on every relative import even though source files are `.ts`. Example: `import { foo } from './bar.js'`. Forgetting the extension causes runtime "ERR_MODULE_NOT_FOUND" errors that TypeScript won't catch at compile time.

## [2026-02-07] convention — @inquirer/prompts not legacy inquirer
The project uses the modern `@inquirer/prompts` package (functional API) not the legacy `inquirer` package (class-based). Import individual functions: `import { input, select, checkbox } from '@inquirer/prompts'`. The legacy API will not work.

## [2026-02-07] architecture — Type unions as source of truth
All valid option sets (frameworks, project types, data strategies, patterns) are defined as TypeScript union types in `src/types/config.ts`. Prompts and generators import these types — never hardcode option lists in multiple places.

## [2026-02-08] architecture — YAML frontmatter as file status tracker
All generated `.nexus/docs/` files include YAML frontmatter: `status: template` (freshly generated) or `status: populated` (user has filled in content). The upgrade system reads this frontmatter to decide whether to replace or preserve a file. Smart file strategy: template → safe to overwrite, populated → preserve user work.

## [2026-02-08] architecture — Reconcile pattern for upgrade/repair
`reconcileNexusFiles(targetDir, config, mode)` is a shared core used by both `nexus upgrade` and `nexus repair`. The mode parameter (`'upgrade' | 'repair'`) controls behavior: upgrade replaces template-status files + all AI config, repair only fixes missing/corrupted files. This avoids code duplication between two very similar commands.

## [2026-02-08] architecture — File strategy categories
Three categories in the reconcile system:
1. **ALWAYS_REPLACE** — AI instructions, manifest, tool-specific files (these are generated, never user-edited)
2. **ALWAYS_PRESERVE** — knowledge.md (sacred user data, never overwrite)
3. **SMART** — Doc files checked via frontmatter status (template=replace, populated=preserve)

## [2026-02-08] gotcha — isCorrupted() detection heuristics
A file is considered corrupted if: (a) it exists but is empty/whitespace-only, (b) it's a markdown doc that's missing YAML frontmatter (`---` delimiters), (c) it's manifest.json with invalid JSON. These heuristics avoid false positives — a file with *any* valid content and proper frontmatter is considered healthy.

## [2026-02-08] architecture — Manifest recovery for upgrade
`nexus upgrade` reads `.nexus/manifest.json` to recover the original `NexusConfig` without re-prompting the user. This means manifest.json must always contain the full config used to generate the project. If manifest is missing/corrupt, upgrade fails gracefully with a message to run `nexus adopt` instead.

## [2026-02-08] pattern — Token-efficient doc templates
Doc templates were slimmed ~40% by removing verbose placeholder text and TODO items. Instead, each section has a one-line instruction comment. AI agents fill in real content; humans aren't confused by walls of placeholder text. Less tokens = faster AI processing = lower cost.

## [2026-02-08] pattern — Progressive knowledge system
The knowledge.md file is an append-only log that AI agents are instructed to: (1) scan before every task for relevant context, (2) append new entries after completing work. Categories: architecture, bug-fix, pattern, package, performance, convention, gotcha. Format: `## [date] category — title` followed by description.

## [2026-02-08] gotcha — Tool instruction files vs master instructions
Two levels of AI instructions: (a) master file at `.nexus/ai/instructions.md` (~full verbose, includes 7-step onboarding protocol), (b) tool-specific files (`.cursorrules`, `.windsurfrules`, etc.) that now embed FULL instructions — not lean pointers. Cross-file pointers were unreliable; older LLMs ignore them. Every tool file is self-contained.

## [2026-02-08] pattern — Pattern-aware business logic generation
`generateBusinessLogic()` in `src/generators/docs.ts` conditionally includes sections based on `appPatterns` selected during setup. If user chose offline-first → generates sync strategy section. If i18n → generates locale management section. Etc. This makes generated docs immediately relevant rather than generic.

## [2026-02-08] convention — Feature→backlog pipeline
Vision doc (`01_vision.md`) and implementation doc (`07_implementation.md`) include instructions for agents to log new feature ideas to a backlog section rather than implementing them immediately. This prevents scope creep during focused development sessions.

## [2026-02-08] gotcha — yarn vs npm for development
This project uses `yarn` for development (workspace package manager) but the CLI it generates uses whatever package manager the user selected during setup. Don't confuse the two — always use `yarn test`, `yarn lint`, `yarn build` when working on the CLI itself.

## [2026-02-08] package — Commander.js action handler types
Commander.js action handlers receive positional args as individual parameters, then options as the last parameter. For `command('init [project-name]')`, the handler signature is `(projectName: string | undefined, options: { adopt?: boolean })`. Getting this wrong causes silent bugs where options appear as the first arg.

## [2026-02-08] convention — Release ritual
Release process: (1) bump version in `package.json` + `src/version.ts`, (2) validate with `npx tsc --noEmit && yarn test && yarn lint`, (3) `yarn build`, (4) `npm publish --access public`, (5) `git tag vX.Y.Z && git push && git push --tags`. The version.ts file is the runtime source of truth for `nexus --version`.

## [2026-02-08] architecture — adopt vs init vs upgrade vs repair
Four commands, clear boundaries:
- `nexus init` — scaffold a new project from scratch (prompts → generators → write all files)
- `nexus adopt` — add `.nexus/` to an existing project (no scaffolding, just docs + AI config)
- `nexus upgrade` — regenerate `.nexus/` with latest templates (reads manifest for config, smart file strategy)
- `nexus repair` — fix missing/corrupted `.nexus/` files only (no replacement of valid files)

## [2026-02-08] gotcha — Vitest mocking with ESM
Vitest `vi.mock()` with ESM requires careful handling. Mock the module path with `.js` extension matching the import. Use `vi.hoisted()` for variables that need to be available in the mock factory. The mock factory runs before imports, so you can't reference imported values inside it.

## [2026-02-08] performance — Generated file arrays are cheap
A full `generateProject()` call creates ~40-50 `GeneratedFile` objects in memory. These are just `{ path, content }` pairs — pure strings. The expensive operation is the disk write, which happens once at the end. This means we can freely compose generators without worrying about performance.

## [2026-02-09] gotcha — knowledge.md path must be .nexus/docs/knowledge.md everywhere
The docs generator creates knowledge.md at `.nexus/docs/knowledge.md`, but the tool instruction files (Cursor, Windsurf, etc.) were referencing `.nexus/knowledge.md` — a path that doesn't exist. This caused AI agents in generated projects to look for the file in the wrong place. Always use `.nexus/docs/knowledge.md` in all instruction text.

## [2026-02-09] pattern — Knowledge Base Protocol must be explicit, not implied
Simply saying "append to knowledge.md" is not enough — AI agents (especially older LLMs) need the full protocol: entry format (`## [date] category — title`), all 7 category tags, when to read vs write, and the append-only rule. Without this, agents either skip it or write unstructured entries. The protocol is now a dedicated section in all shipped instruction files.

## [2026-02-09] architecture — Cognitive scaffolding for older LLMs
Shipped instructions must work with weaker models too. Design principles: (1) numbered steps instead of prose, (2) explicit paths — never rely on the agent inferring them, (3) repeat critical rules — older models lose context mid-document, (4) dedicated sections — don't bury important protocols inside workflow steps, (5) "3 Mandatory Steps" framing at the top gives even the weakest agent a clear entry point.

## [2026-02-09] gotcha — Dev instructions vs shipped instructions drift
Our own `.nexus/ai/instructions.md` and `.github/copilot-instructions.md` can drift from what `ai-config.ts` generates for users. After any change to the shipped generator, manually verify the same principles apply to our own files. The dev files are hand-written; the shipped files are code-generated — they have no automatic sync mechanism.

## [2026-02-09] architecture — Agent Persona system design
Persona is stored as `NexusPersona` on `NexusConfig` with 4 fields: `tone` (union of 5 vibes), `verbosity` (3 levels), `identity` (string — name the AI uses, defaults to "Nexus"), `customDirective` (freeform string). `DEFAULT_PERSONA` is used in `buildAdoptConfig()` so adopt never prompts for persona. The `getPersonaSection()` helper in `ai-config.ts` generates explicit LLM-friendly text for each setting — no vague instructions, always concrete behavioral guidance.

## [2026-02-09] architecture — Required field cascade on NexusConfig
Adding a required field to `NexusConfig` breaks everything that constructs one: (1) `src/prompts/index.ts` config assembly, (2) `src/generators/index.ts` `buildAdoptConfig()`, (3) every `baseConfig` in test files. When adding a new required field, touch all four locations in the same pass to avoid leaving the codebase in a broken state.

## [2026-02-09] convention — NEXUS identity evolution: scaffolding → framework
Starting v0.2.0, NEXUS is positioned as an "AI-native development framework" not just a "scaffolding tool." The scaffolding is one feature. The real value is the AI operating system: docs, knowledge, brain, persona, onboarding protocol. All public-facing text (README, package.json description, copilot instructions) should reflect this broader identity.

## [2026-02-09] architecture — Persona identity: string name not boolean
`NexusPersona.identity` was originally `boolean` ("Should the AI call itself Nexus? Y/N"). Changed to `string` so the AI introduces itself as "Nexus" and lets the user rename it to anything. Default is `'Nexus'`; an empty string means no custom identity. The name persists across `upgrade` and `repair` because `getPersonaSection()` embeds persistence language in the generated instructions. Touch points when changing a type on NexusPersona: type definition, DEFAULT_PERSONA, persona prompt, getPersonaSection(), all test baseConfigs.
