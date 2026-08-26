# NEXUS CLI — Knowledge Base

> **Progressive learning file.** Agents implementing v1.0 append entries here as they discover patterns, gotchas, and design decisions specific to nexus-cli.
> This file grows organically — never delete entries.

---

## How This Works

- **When to add:** After discovering something non-obvious about CLI implementation
- **When NOT to add:** Routine task completion (that goes in `index.md` Progress Log)
- **Format:** One entry = category tag + date + one-line insight + optional detail line
- **When to read:** Before implementing features in nexus-cli, scan for relevant patterns and gotchas

---

## Categories

| Tag | Use When |
|-----|----------|
| `architecture` | CLI structural decisions, command organization, design patterns |
| `bug-fix` | Recurring bugs, edge cases, platform-specific issues |
| `pattern` | Patterns that work well in this codebase |
| `package` | Package choices, version pins, dependency gotchas |
| `performance` | Bottlenecks, optimization opportunities |
| `convention` | Team/CLI conventions established during development |
| `gotcha` | Non-obvious traps, things that wasted time |
| `v1.0-design` | Design decisions specific to v1.0 Alive Brain features |

---

## Entries (v1.0 M1 & Beyond)

### [v1.0-design] Sensors are Pure Functions Living in utils/
**2026-05-02** — v1.0 M1 implements four sensor modules: `git.ts`, `files.ts`, `tests.ts`, `packages.ts` (all in `src/utils/sensors/`). Each exports an async function (git, files, testCoverage, packageHealth). No file writes, no CLI calls — pure functions that read repo state. Each has a 2-second timeout and graceful degradation (returns null if unavailable, not an error). `index.ts` exports `captureVitalSigns()` which calls all sensors in parallel and returns a typed VitalSigns object.

**Why:** Sensors must be testable in isolation. Pure functions with timeouts are bulletproof for CI/CD. Parallel sensor runs keep `nexus sync` fast even if one sensor is slow.

### [v1.0-design] Vital Signs Block Uses HTML Comment Fences
**2026-05-02** — The Vital Signs block injected into `index.md` lives between HTML-comment fences: `<!-- NEXUS:VITAL_SIGNS:START -->` ... `<!-- NEXUS:VITAL_SIGNS:END -->`. This makes the block machine-manageable (easy to find, replace, idempotent) while remaining valid markdown. `nexus sync` rewrites the entire block on each run — deterministic (no merge conflicts).

**Why:** HTML comments are invisible to markdown renderers but readable by CLI tools. Fences solve the "how do you update content in a markdown file without breaking it?" problem.

### [pattern] Template Fences = Safe File Mutation
**2026-05-02** — The Vital Signs fence pattern extends to other managed sections (plans/index.md, knowledge-summary.md in v1.0). Template fence pattern: `<!-- NEXUS:<SECTION>:START -->` ... `<!-- NEXUS:<SECTION>:END -->`. Any content outside fences is user-territory; inside fences is NEXUS-managed and rewritten on every command. This is the safe file mutation strategy.

**Why:** Users can add notes outside fences; NEXUS can manage its own content. No conflicts.

### [convention] Async All the Way — No sync file I/O
**2026-05-02** — nexus-cli uses async/await throughout. File I/O is `fs/promises` (async), not `fs.readFileSync`. CLI commands are async. Generators return promises. This matters for v1.0: sensors run in parallel, commands chain cleanly, no callback hell.

**How to apply:** All new v1.0 code should be async-first. If blocking is needed, use `sync-request` library (already available) only in fallback paths.

### [gotcha] git Command Output is Platform-Dependent
**2026-05-02** — The `git` sensor shells out to `git log`, `git status`, `git branch`. Output format differs slightly between Git versions and Windows vs Unix. The sensor uses regex patterns with case-insensitive matching and whitespace tolerance. On Windows, line endings are CRLF; on Unix, LF. Pattern: always trim().split('\n').

**How to apply:** When writing git sensor tests, test on both platforms or mock git output with real outputs from multiple versions.

### [pattern] Tests Use Vitest Snapshots for Sensor Output
**2026-05-02** — The Vital Signs block has a complex text rendering (table format). Vitest snapshots capture the exact output and flag changes. Snapshot tests for `sensors.test.ts`: (1) snapshot of raw VitalSigns JSON, (2) snapshot of rendered markdown block. Snapshot tests catch formatting regressions.

**How to apply:** When adding new sensor fields, update snapshots after verifying the output is correct.

### [convention] Test Fixtures — plan superseded by real temp dirs
**2026-05-02** — Original plan: sensor tests would read from fixture git repos checked into a *tests/__fixtures__/* directory (minimal `.git` dirs with known commits/branches/dirty state), generated once and never modified. Rationale at the time: reproducible, fast, CI-friendly.

**Correction (2026-08-24):** that directory was never built. Sensor tests instead create a real temporary git repo per test via `os.tmpdir()` (see e.g. `tests/unit/git-sensor.test.ts`), populated and torn down in `beforeEach`/`afterEach`. This entry is kept for history — do not look for a fixtures directory; it does not exist.

### [gotcha] npm test / npm run test Varies by Framework
**2026-05-02** — The `tests` sensor shells out to detect and run test framework. Generated projects have vitest configured, but users might have jest, mocha, etc. The sensor tries multiple commands: `npm test`, `npx vitest run`, `npx jest --json`, with 2s timeout each. Returns null if none work.

**How to apply:** When implementing the tests sensor, start with the most common (npm test), fall back gracefully. Test against both vitest and jest configs.

### [architecture] Commands Are Thin Wrappers Around Utils
**2026-05-02** — v1.0 commands (sync, doctor, brief, wake, plan) are thin CLI wrappers around utilities in `src/utils/`. The pattern: `src/commands/sync.ts` parses args, calls the sensor utilities, handles errors. Business logic lives in utils. Commands are easy to test (mock utils), easy to reuse (call from other commands), easy to adapt (pipe output to other CLIs).

**How to apply:** M1 implementation: write `captureVitalSigns()` in `src/utils/sensors/index.ts`, write a simple `src/commands/sync.ts` that calls it and writes to index.md. **Correction (2026-08-24):** there is no standalone `utils/sync.ts` — sync logic lives in `src/commands/sync.ts` plus `src/utils/sensors/*.ts`. Tests live in `tests/unit/sensors-index.test.ts`, `tests/unit/sync-command.test.ts`, and `tests/unit/sync-render.test.ts` (the planned `sensors.test.ts`/`sync.test.ts` names were never used).

### [convention] 306 Tests is the Floor
**2026-05-02** — nexus-cli has 306 passing unit tests (100% pass rate). v1.0 should not drop confidence. M1 estimates include test coverage: ~4 sensor unit tests + 1 snapshot test + 1 integration test per new command. Rough target: +15 tests for M1, +25 for M2, +20 for M3, +15 for M4. Total: v1.0.0 ships with ~380 tests.

**How to apply:** Before committing M1, run `npm test` and confirm test count is >= 306 + M1 estimate.

### [pattern] Logging Uses `@/utils/logger`
**2026-05-02** — nexus-cli has a logger utility (`src/utils/logger.ts`) that wraps console with structured messages: `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()`. Commands use the logger, not bare `console.log()`. Logs are testable (mock logger), quiet-mode-able (`--quiet` flag), CI-friendly.

**How to apply:** All v1.0 commands should use logger for user-facing messages. Tests mock logger or suppress output.

### [gotcha] Folder mtime can hide true file staleness
**2026-05-02** — While implementing `src/utils/sensors/files.ts`, using directory `mtime` as the primary freshness signal produced false "fresh" readings because creating a nested folder updates directory metadata even when actual source files are old. The reliable approach is: use latest **file** `mtime` when files exist, and only fall back to directory `mtime` when the folder tree is empty.

**How to apply:** For stale-day sensors, prefer latest file timestamps over directory timestamps to avoid under-reporting staleness.

### [gotcha] npm outdated/audit JSON can arrive with non-zero exit code
**2026-05-02** — `npm outdated --json` and `npm audit --json` frequently return useful JSON even when the command exits non-zero (for example when outdated or vulnerable packages exist). The sensor must parse stdout/stderr with `reject: false` instead of treating non-zero as a hard failure.

**How to apply:** For package-health sensors, prioritize parsing JSON payloads over exit-code-only logic.

### [architecture] Plans parser should mutate sections, not raw text
**2026-05-02** — For M2, the robust approach was parsing plans into `frontmatter + preamble + named sections` and mutating specific sections (`Steps`, `Notes`, `Evidence`) before re-serializing. Direct raw-string replacements were too brittle when humans reflow headings or add narrative text.

**How to apply:** Keep lifecycle and active-pointer logic pure/typed, and let the parser own markdown structure transforms.

### [pattern] Rebuild plans index after every plan mutation
**2026-05-02** — Recomputing `.nexus/plans/index.md` after each command (`new/start/tick/note/done`) keeps dashboard drift at zero and removes a whole class of stale-state bugs. The rebuild is fast because it only scans `.nexus/plans/*.md` and parses frontmatter.

**How to apply:** Treat `.nexus/plans/index.md` as a derived artifact, never as user-edited source-of-truth.

### [gotcha] MCP stdio purity — anything on stdout corrupts the protocol
**2026-06-10** — `nexus mcp` speaks JSON-RPC over stdout, so the auto-invoke hooks (interactive Brain Check prompt, post-command "→ Brain:" line) and the update banner must be bypassed for the `mcp` command, and all server diagnostics must go to stderr.

**Why:** A single stray `console.log` breaks every connected MCP client with a cryptic parse error.

**How to apply:** `cli.ts` guards with `isMcpInvocation()` (argv[2] === 'mcp'); MCP tool handlers throw `McpToolError` instead of calling logger/process.exit. Any new global CLI output must respect this guard.

### [architecture] MCP server is an interface, not a new source of truth
**2026-06-10** — v1.0's `nexus mcp` wraps the same utils the CLI commands use (brief/doctor/sensors/plan parser/knowledge parser); markdown in `.nexus/` remains the only persistent state. Write tools (plan_tick, plan_note, add_knowledge_entry) get schema validation for free by reusing the parser layer.

**Why:** No database/daemon keeps the v1.0 philosophy; reusing command internals means CLI and MCP can never disagree on semantics.

**How to apply:** New brain capabilities should land as a pure util first, then get both a CLI command and an MCP tool as thin wrappers.

### [pattern] Publish gate should compare against the npm registry, not git history
**2026-06-10** — The CI publish job previously compared package.json between HEAD~1 and HEAD, so a publish that failed mid-run (expired NPM_TOKEN, 2026-06-09) could never be retried without a dummy version bump. The gate now checks `npm view <pkg>@<version>` — publish runs whenever the version is not live.

**How to apply:** Idempotent release gates: ask the destination registry, not the repo, whether work is needed.

### [gotcha] npm bug #4828 — lockfiles can silently drop platform-native optionals
**2026-06-10** — A package-lock.json regenerated in a sandboxed/odd environment recorded only the darwin variants of rollup/esbuild natives, so `npm ci` on GitHub's Linux runners crashed vitest with "Cannot find module @rollup/rollup-linux-x64-gnu". CI now self-heals (verifies the native after `npm ci`, installs if absent).

**Why:** npm derives optional-dep entries from local install state, not the full packument matrix, when cache/tree state is partial.

**How to apply:** Regenerate lockfiles on a normal dev machine with `rm -rf node_modules package-lock.json && npm install`; after any lock regen, grep it for `rollup-linux-x64-gnu` before pushing. Keep the self-heal step in ci.yml.

### [bug-fix] `nexus init` overwrites populated brains — no existing-brain guard
**2026-06-11** — Running `nexus init --local` inside this repo replaced the populated index.md, 01/07 docs, ai/instructions.md, manifest, and every pointer file with fresh templates. Recovered via `git checkout` (all good versions were committed). The smart file strategy lives in `upgrade`/`repair` — `init` never checks for an existing `.nexus/`.

**Why:** Init was designed for empty directories; dogfooding v1.0 in this repo exposed the missing guard. One accidental command = total brain loss in any uncommitted project.

**How to apply:** Backlogged for v1.1: init must detect an existing brain and refuse (suggesting `nexus upgrade`), behind an explicit `--force`. Until fixed: never run `init` inside a brain-ed repo. Related: generated content showed "(undefined, local-only)" — framework value missing in template context; same backlog.

### [bug-fix] Upgrade data loss — root cause was `isCorrupted` + an inverted replace gate (CORRECTION)
**2026-06-11** — Correction to the earlier entry: the 2026-06-11 brain wipe was caused by `nexus upgrade` (not `init`). Two compounding flaws: (1) `isCorrupted()` treated any `.nexus/docs/` file without YAML frontmatter as corrupted, and corrupted files are force-replaced in BOTH upgrade and repair modes; (2) the smart check replaced everything not explicitly `status: populated`. Hand-written, frontmatter-less brains hit both.

**Why:** "Repair" semantics assumed all docs are generator-born. Hand-written brains (like this repo's) are first-class and must never be classified as broken scaffolding.

**How to apply:** Fixed pre-v1.0.0-publish: missing frontmatter is not corruption (only empty files, bad JSON, unclosed frontmatter); the replace gate is now `isTemplate()` — only explicit `status: template` is replaceable; every reconcile overwrite is first mirrored to `.nexus/state/upgrade-backup/<stamp>/`. Destructive-by-default is never acceptable in reconcile logic — preserve and back up.

### [architecture] v1.1 Agents — roles are generated views over one source of truth
**2026-06-11** — Agent definitions live in `.nexus/agents/` (custom > core > community, custom sacred — identical ownership model to skills); `.claude/agents/` subagents and the fenced "Agent Roles" blocks are regenerated views (`nexus agent sync`), never hand-edited. The registry copies are exported FROM the CLI generator, not duplicated.

**Why:** Client subagent formats will drift; views can be regenerated, sources cannot be un-forked.

**How to apply:** New client formats = new render target in agent sync, never a new authoring location. The same fence pattern (NEXUS:AGENT_ROLES) as Vital Signs keeps instruction files machine-patchable.

### [bug-fix] Auto-invoke must be non-interactive-safe — silent never prompts
**2026-06-17** — The pre-action "Brain Check" `select()` had no TTY guard and `shouldPromptInteractively` returned true even in `silent` mode when sync was >12h stale, so `nexus wake` (and any non-skipped command) threw `ExitPromptError` under any AI agent / CI / pipe and aborted before running. Fix: `shouldPromptInteractively(mode)` returns true ONLY for `interactive`; the prompt is additionally gated on `isInteractiveEnvironment()` (real stdin+stdout TTY, not CI, not `NEXUS_NONINTERACTIVE=1`); `select()` is wrapped in try/catch that degrades to `runSilentAutoActions`.

**Why:** NEXUS is built for AI agents — the one environment where there is never a TTY — so any unguarded interactive prompt is a guaranteed crash, not an edge case.

**How to apply:** Never call an inquirer prompt without first checking `isInteractiveEnvironment()` AND wrapping it to degrade gracefully. "Silent" mode must be genuinely silent; staleness drives opt-in silent actions (`auto_fix_doctor`), never a prompt.

### [bug-fix] Subagent tool allowlist must include native exec tools + namespaced MCP
**2026-06-17** — Generated `.claude/agents/*.md` subagents emitted only `name`+`description` and framed agents as "Uses the nexus-brain MCP tools", because the agent model (`AgentToolAllowlist`) tracked only `read`/`write` MCP tools. Any derived `tools:` listed only `nexus_*`, so the implementer could not edit files. Fix: added `tools.exec` (native client tools) per role — implementer/test-writer/doc-keeper get Edit+Write, reviewer is read-only (Read/Grep/Glob/Bash) — and `renderClaudeSubagent` now emits `tools: <exec> + mcp__nexus-brain__<tool>`. Both render paths (generator + `agent sync`) share `claudeSubagentTools`/`subagentDescription`.

**Why:** A Claude Code subagent's capability is its `tools:` frontmatter; MCP tools must be namespaced `mcp__<server>__<tool>`. Brain MCP tools are not execution tools — conflating them strips an agent of the ability to do its job.

**How to apply:** Keep `.nexus/agents/` source client-neutral (bare `exec` + `nexus_*` names); translate to client form only at render time. Existing projects must run `nexus agent sync` to pick up corrected subagents.

### [architecture] Agent handoffs are main-thread-orchestrated (subagents can't call subagents)
**2026-06-17** — The implementer→test-writer→reviewer→doc-keeper `handoff.after` chain was prose only; Claude Code subagents cannot invoke other subagents, so nothing sequenced the pipeline and D11's verification gate was reached by luck. Chose Option A: the MAIN THREAD is the orchestrator. Added `buildHandoffChain`/`nextInChain` (utils/agents/handoff.ts), the `nexus_get_handoff { agent? }` MCP tool (17 tools now), and an "Orchestration" section in the generated Agent Roles block. Option B (a `nexus orchestrate` command) is a deferred follow-up.

**Why:** A handoff that no component can execute is documentation, not control flow. The only actor that can dispatch subagents in sequence is the top-level thread.

**How to apply:** After an agent finishes, the main thread calls `nexus_get_handoff` and dispatches `next` itself. Keep `.nexus/agents/` chain client-neutral via `handoff.after`; the chain is derived, not hardcoded, so custom agents reorder it.

### [gotcha] D11 v1 evidence check is a keyword sniff — prose can't catch prose
**2026-07-05** — `EVIDENCE_SIGNALS = /\b(test|tests|passing|…)\b/i` passes any Evidence section that *mentions* tests: "tests skipped, didn't run them" satisfies the gate. The exact failure mode D11 exists for (agents claiming completion) walks through it.

**Why:** A regex over agent-written prose trusts the agent's words; the gate must trust machine facts (command, exit code, output hash) instead.

**How to apply:** Don't extend the regex — replace it. v1.2 design (`v1_2_provable_done.md`) specifies parseable evidence blocks + `doctor --verify` re-run. Until then treat D11 passes as advisory.

### [bug-fix] Never trust manifest.config raw — normalize at the read boundary
**2026-07-05** — `upgrade`/`repair` did `JSON.parse(raw) as NexusManifest` and handed `manifest.config` straight to generators; partial manifests (older CLIs, `adopt` on backend projects) rendered literal "undefined" into generated docs. Fixed with `normalizeManifestConfig()` (utils/manifest.ts): explicit defaults for every field, persona merged over DEFAULT_PERSONA, optional flags omitted not invented.

**Why:** `as`-casting external JSON gives compile-time confidence with zero runtime guarantee — the manifest is written by *other versions* of the CLI, so its shape is an input, not an invariant.

**How to apply:** Any new reader of manifest.json (or other cross-version state files) must go through a normalizer; add a display-level fallback too when interpolating into templates.

### [gotcha] CLAUDE.md package manager label (yarn) doesn't match reality (npm)
**2026-08-24** — The generated `CLAUDE.md` Project Identity table lists `yarn` as the package manager, but `package.json` scripts and `.github/workflows/ci.yml` both use `npm ci`/`npm run` exclusively. The manifest/config the generator read from is stale relative to the actual repo.
**Why:** Following CLAUDE.md's literal `yarn test`/`yarn lint` instructions would fail or use the wrong lockfile in this repo.
**How to apply:** Trust package.json scripts + CI workflow over the CLAUDE.md Project Identity table for tooling commands in this repo; use npm.

### [gotcha] D01 placeholder regex false-positives on bracket syntax in prose
**2026-08-24** — D01's `countPlaceholders()` (src/utils/doctor/checks/D01.ts) matches any `[...]` via `/\[[^\]]+\]/g`, so a populated doc containing markdown links or TypeScript array types (e.g. `AppPattern[]`, `[nexus.glenhalton.com]`) trips the "populated but has unresolved placeholders" warning even with zero actual placeholders.
**Why:** Don't chase this warning by stripping legitimate bracket syntax from docs — it degrades content to satisfy a heuristic bug, not a real gap.
**How to apply:** When D01 flags a populated doc, read the doc before assuming it's actually incomplete — check for real `TODO`/`(to be filled)` markers, not just any square bracket.

### [convention] index.md Release History is 3 versions behind git tags
**2026-08-24** — `git tag` shows v1.2.0, v1.3.0, v1.4.0 as published, but the Release History table in `.nexus/docs/index.md` stops at v1.1.3 (Aug 4, 2026). Commit subjects worth mining for the missing entries: `cc27d9d chore(release): 1.2.0`, `dc67d6e feat: v1.3.0 — Skills II, the alignment gate, and context load`, `88eedca feat: export MCP tool surface as a public ./mcp subpath`, plus whatever bumped to 1.4.0.
**Why:** This wasn't in scope for today's doc-population task, but a future session doing brain hygiene should close the gap rather than rediscover it.
**How to apply:** Before trusting index.md's version/feature history as current, cross-check against `git tag --sort=-v:refname` and `git log --oneline` for the gap.

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

## [2026-02-10] architecture — Pre-adoption interview for existing projects
Added `promptAdoption()` to gather context before running `nexus adopt` on existing projects. Collects project description, architecture type, tech stack, and pain points. This context is then passed to doc generators (`generateVision()`, `generateArchitecture()`, `generateProjectIndex()`) to pre-fill templates with actual project info instead of generic placeholders. Makes adopted projects feel AI-native from day one.

## [2026-02-10] architecture — Project detector signals for Spring Boot
Extended `ProjectSignals` with `hasPomXml` and `hasBuildGradle` to detect Maven/Gradle projects. Added Spring Boot detection logic: looks for `pom.xml` with `spring-boot-starter` or `build.gradle` with `org.springframework.boot`. This enables automatic framework detection when adopting existing Java projects.

## [2026-02-10] feature — Local-only mode with --local flag
Added `localOnly?: boolean` to `NexusConfig` and `--local` flag to `nexus init`. When enabled, the CLI skips creating git/CI files and appends `.nexus/` to `.gitignore`. Use case: experimenting with NEXUS structure without committing it to version control. The `writeGeneratorResult()` utility now skips writing files with empty content, which Spring Boot generator uses to avoid creating `package.json` for Maven projects.

## [2026-02-10] architecture — Visual CLI upgrades with gradient-string and boxen
Replaced plain text CLI output with gradient-string (cyan→blue→purple gradient for banner) and boxen (rounded border success messages). The `banner()` function now uses `nexusGradient()`, and `complete()`/`adoptComplete()` wrap output in boxen with padding. Makes the CLI feel more polished and modern while staying minimal.

## [2026-02-10] architecture — Spring Boot project generator
Created `src/generators/spring-boot.ts` with full Maven project generator: `pom.xml` (Spring Boot 3.2.0, Java 21), `application.properties`, `@SpringBootApplication` main class, sample REST controller (`/api/hello`, `/api/health`), and JUnit 5 test. The generator integrates with `generateDirectories()` to create proper Java package structure (`src/main/java/com/{packageName}/...`).

## [2026-02-10] architecture — Backend framework selection for API projects
Added `promptBackendFramework()` to prompt users building API projects for their backend framework choice (Express, Fastify, NestJS, Spring Boot). Also added `BackendFramework` type to `NexusConfig`. The prompts orchestrator now calls this for `projectType === 'api'`. This makes NEXUS framework-agnostic — works for Node.js and Java backends.

## [2026-02-10] architecture — UI library project type with Storybook
Added `'ui-library'` to `ProjectType` union for component library projects. When selected, `generateDirectories()` creates a Storybook-ready structure (components, stories, tests), and `getFrameworkDependencies()` adds Storybook 8.0 deps. UI library projects skip data strategy and pattern prompts since they're not full apps. Framework options include React, Vue, Svelte, Lit.

## [2026-02-10] convention — Feature branch workflow for organized PRs
When preparing multiple related changes for release, create separate feature branches from `develop` for each logical area (e.g., `feature/adoption-interview`, `feature/local-only-mode`, `feature/spring-boot-support`). Each branch gets focused commits with conventional commit messages. This makes PRs easier to review and allows independent merging if one feature needs more work.

## [2026-02-10] gotcha — Spring Boot needs empty package.json return
Spring Boot projects use Maven, not npm. The `generatePackageJson()` function now checks if `backendFramework === 'spring-boot'` and returns empty content. The `writeGeneratorResult()` utility was enhanced to skip writing files with empty content, preventing creation of unnecessary `package.json` in Java projects.

## [2026-02-10] pattern — Commit organization by feature area
When working with multiple simultaneous changes across many files, organize commits by feature area rather than by file type. For example, "feat: add Spring Boot generator" (spring-boot.ts), then "feat: add backend framework selection" (prompts), then "feat: add directory structure for Spring Boot" (structure.ts). This makes git history tell a story instead of being a jumble of unrelated changes.

---

## [2026-03-06] architecture — Skills System: the third knowledge layer
The Skills System (v0.3.0) adds a third layer to NEXUS's knowledge model. Layer 1: Project context docs (`01_vision.md` → `08_deployment.md`) answer *what are we building?*. Layer 2: State files (`index.md`, `knowledge.md`) answer *what has been decided?*. Layer 3: Skills (`.nexus/skills/`) answer *how do we execute tasks in this project?*. All three layers are needed — context and decisions without execution methodology still leads to agent drift.

## [2026-03-06] architecture — Skills live in the project, not as a runtime dependency
`@nexus-framework/skills` is the source registry, but skill files are *copied into* the project's `.nexus/skills/` directory at init time. The project does not depend on the package at runtime. This mirrors how NEXUS docs work — generated once, then owned by the project. This means skills work offline and can be customized in-place.

## [2026-03-06] architecture — Three-directory skill layout with sacred custom/
`.nexus/skills/` has three subdirectories with strict ownership rules: `core/` is owned by NEXUS (replaced on upgrade, sourced from `@nexus-framework/skills`). `custom/` is owned by the user (NEVER read, NEVER written, NEVER deleted by NEXUS — ever). `community/` is owned by the package registry (replaceable on `nexus skill install --force`). Breaking the `custom/` rule would destroy user work irreversibly.

## [2026-03-06] architecture — Skills Protocol must be embedded in all AI instruction files
The Skills Protocol (the 7-step agent pre-task checklist for `.nexus/skills/`) must be added to the master template in `ai-config.ts`. Because every AI tool file (`.cursorrules`, `.windsurfrules`, `.clinerules`, `AGENTS.md`, `copilot-instructions.md`) embeds the master instructions, adding it once to the template activates skills awareness across every AI tool simultaneously. This is the highest-leverage single change in the entire v0.3.0 implementation.

## [2026-03-06] convention — Skill frontmatter is the contract, not decoration
Every skill file requires YAML frontmatter with: `skill` (unique slug), `version` (semver), `framework` (`next.js` | `react-vite` | `sveltekit` | `nuxt` | `astro` | `remix` | `shared`), `category` (`ui` | `routing` | `data` | `testing` | `api` | `config` | `workflow`), `triggers` (array of natural language phrases), `author`, `status` (`active` | `draft` | `deprecated`). The `triggers` array is how agents identify which skill to read — without it, the matching protocol breaks. The `status` field controls enforcement: only `active` skills are mandatory; `draft` are optional guidance.

## [2026-03-06] pattern — Skills generator follows the same GeneratedFile[] pattern
`skills.generator.ts` must return `GeneratedFile[]` like every other generator — it must not write to disk directly. The orchestrator in `generators/index.ts` handles all disk writes via `writeGeneratorResult()`. This maintains the architecture invariant and keeps the generator fully unit-testable by inspecting returned arrays without touching the file system.

## [2026-03-06] architecture — `nexus-skills` repo must be published before nexus-cli implementation
`skills.generator.ts` sources skill file content from `@nexus-framework/skills`. The npm package must exist and be published before any code in nexus-cli can import from it. Implementation sequence: create `nexus-skills` repo → write SKILL_SPEC.md → write core skills for all 6 frameworks → publish `@nexus-framework/skills@0.1.0` → then and only then begin work in nexus-cli.

## [2026-03-06] pattern — Skill precedence rule: custom > core > community
When an agent is looking for a skill and finds matches in multiple directories, custom skills override core skills, and core skills override community skills. This ensures user customizations always take precedence over framework defaults, and official framework skills take precedence over third-party community skills. This rule must be stated explicitly in the Skills Protocol embedded in AI instruction files.

## [2026-03-06] architecture — nexus skill generate is v0.4.0, not v0.3.0
`nexus skill generate` (scan codebase, auto-draft custom skills) is the most complex feature in the Skills System and is intentionally deferred to v0.4.0. The v0.3.0 MVP delivers skill distribution (`skills.generator.ts`), the CLI management commands (`nexus skill new/list/install/remove`), and the AI protocol injection. `skill generate` requires AST-level pattern analysis and is out of scope until the base system is stable.

## [2026-03-06] gotcha — Skills System was built directly in nexus-cli, not from nexus-skills package
The original plan required publishing `@nexus-framework/skills` to npm first, then sourcing content from it. In practice, the skill content was authored directly inside `src/generators/skills.ts` (inlined as template strings), eliminating the blocking dependency. The `@nexus-framework/skills` registry can still be built later for community packs — `nexus skill install` is stubbed and ready. The `nexus-skills` npm blocker is therefore resolved and Skills System v0.3.0 is fully implemented and tested.

## [2026-03-06] gotcha — upgrade.test.ts count tests must include generateSkills in the total
`upgradeProject` and `repairProject` now also process skills files. Any test that asserts `totalResult === generateDocs.length + generateAiConfig.length` must be updated to also add `generateSkills.length`. Found this when all three count tests in `upgrade.test.ts` failed after wiring skills into the reconciler. Fix: import `generateSkills` and add its length to the expected total, and pre-populate skills files in the "never replaced" test.

## [2026-03-06] pattern — enableSkills === false explicit check, not !enableSkills
The skills generator must use `if (config.enableSkills === false) return []` not `if (!config.enableSkills)`. The `enableSkills` field is optional — `undefined` means the user did not disable it (default on). Using `!enableSkills` would incorrectly skip skill generation for users who did not explicitly answer the prompt. The explicit `=== false` check preserves the default-on behaviour.

## [2026-03-06] architecture — skills.ts wired to live @nexus-framework/skills package
`src/generators/skills.ts` now imports `getSkillContent` and `listSkills` from `@nexus-framework/skills`. The inline skill content (~900 lines) was deleted. The package has no TypeScript declarations so a local shim was created at `src/types/nexus-skills.d.ts`. Framework name mapping: CLI uses `nextjs`, package folder is `next.js` — handled by `FRAMEWORK_TO_SKILLS_DIR` map.

## [2026-03-06] gotcha — @nexus-framework/skills only has component-creation for sveltekit/nuxt/astro/remix at v0.1.0
Only `next.js` and `react-vite` have full skill coverage in the first publish. `sveltekit`, `nuxt`, `astro`, and `remix` only ship `component-creation.md`. Shared skills (15 files) fill the gap. Tests must assert on slugs that actually exist in the package — not the old inlined stubs. When new skills are added to the registry package, no code changes needed in nexus-cli.

## [2026-03-06] architecture — nexus pack uses archiver + unzipper (new dependencies)
`nexus pack` uses the `archiver` npm package to create ZIP archives and `unzipper` to extract them. Both were added as production dependencies with their `@types/*` counterparts as dev deps. Node's built-in `zlib` only handles gzip streams — it cannot create multi-file ZIP archives, so a library is required. `archiver` was chosen over `yazl`/`adm-zip` because it has a streaming directory-walk API that matches the `fs-extra` patterns already used in the project.

## [2026-03-06] pattern — Update notification fires after command, not before
The startup update check (`checkForUpdate`) is fired as a background Promise before `program.parseAsync()` is called, so the network request runs concurrently with the actual command. After the command completes, the Promise is awaited and the banner is printed only if an update exists. This avoids blocking startup and avoids inserting noise before command output. Commands that handle their own output (like `nexus update`) are not affected because the banner only prints on `hasUpdate === true`.

## [2026-03-06] convention — Release headlines are maintained in update-check.ts
`src/utils/update-check.ts` contains a `RELEASE_HEADLINES` map (version string → one-line feature description). When releasing a new version, add its entry to this map. The `getHeadline()` function falls back to the nearest older registered version if an exact match is not found — so intermediate patch versions between registered entries will still show a sensible message.
## [2026-03-06] architecture — nexus skill registry reads directly from installed npm package
`skillRegistryCommand` calls `listFrameworks()` and `listSkills(fw)` from `@nexus-framework/skills` using a dynamic import. No network required — reads from the locally installed package. A `ALIASES` map handles the CLI-friendly name `nextjs` mapping to the package folder name `next.js`. The `shared` framework is always shown last as it installs into every project. Output is grouped by framework with a total count footer.
## [2026-03-06] convention — Update RELEASE_HEADLINES in update-check.ts when shipping a new version
When bumping to a new version (e.g. 0.3.0), add its entry to the `RELEASE_HEADLINES` record in `src/utils/update-check.ts`. The key is the exact version string; the value is a short feature summary shown in the update banner. Without this entry the banner falls back to the nearest older version's message.

## [2026-03-07] bug-fix — fileExists() returns false for directories (dirExists bug)
`fileExists()` uses `stat.isFile()` which returns `false` for directories. All `nexus skill` subcommands were using `fileExists()` to check `.nexus/skills/` directory paths, causing them to always report "No .nexus/skills/ directory found" even when the directory existed. Fix: added `dirExists()` using `stat.isDirectory()` and swapped all 6 directory checks in `skill.ts`. Lesson: never use `fileExists()` on a path that might be a directory.

## [2026-03-07] gotcha — @inquirer/prompts hangs tests; must vi.mock() it
`skillNewCommand` calls `select()` and `input()` from `@inquirer/prompts` before checking if the output file already exists. Any test that reaches past the directory-guard will block waiting for TTY input. Fix: add `vi.mock('@inquirer/prompts', () => ({ input: vi.fn().mockResolvedValue('test-skill'), select: vi.fn().mockResolvedValue('ui') }))` at the top of any test file that calls `skillNewCommand`. This also enables testing the happy-path flow (creates the skill file).

## [2026-03-07] pattern — version.ts and package.json must be bumped together
`checkForUpdate()` reads the installed version from `src/version.ts`, not from `package.json`. If only `package.json` is bumped (e.g. by a user manually editing it), the update-check tests that mock the registry returning the "current" version will fail because the two sources disagree. Always bump both files atomically when releasing a patch.

## [2026-03-07] pattern — nexus skill registry fetches live from npm tarball
`skillRegistryCommand` no longer reads from the locally installed `@nexus-framework/skills` package. Instead it fetches the npm registry metadata for `@nexus-framework/skills/latest`, downloads the `.tgz` tarball in memory, decompresses it with `node:zlib`, and scans the tar header blocks (512-byte records) to extract file paths — never writing to disk. This means adding new skills to `@nexus-framework/skills` and publishing it is enough; users will see the updated list immediately without requiring a nexus-cli republish. Falls back to the locally installed package if the network is unavailable. Key detail: tar file paths inside npm tarballs are prefixed with `package/`, so paths look like `package/shared/git-workflow.md`.

## [2026-08-26] architecture — `nexus skill install` shares its tarball fetcher with `nexus skill registry`
`fetchLiveSkillRegistry()` (used by `skill registry`) used to scan only tar *paths*, never decoding content. It's now a thin wrapper over a new `fetchNpmTarball(pkgName)` in `src/commands/skill.ts`, which decodes every `.md` file's content (skipping non-`.md` bytes) and returns a 3-way result — `{ notFound: true }` on a real npm 404, `{ files, version }` on success, `null` on any other network failure — so callers can give an accurate error instead of a generic one. `skillInstallCommand` uses this to install any npm package's SKILL_SPEC-valid `.md` files into `.nexus/skills/community/`. `@nexus-framework/skills` itself is special-cased to require `--skill <slug>` (the official registry ships 40+ skills across 10 frameworks meant for `core/`, not a bulk dump into `community/`); any other package name installs everything valid it contains. Invalid frontmatter is skipped per-file (via the existing `validateSkillFrontmatter`), not a hard failure for the whole install.
