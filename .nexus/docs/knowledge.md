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

### [convention] Test Fixtures in tests/__fixtures__/
**2026-05-02** — Sensor tests need fixture git repos to read from. All test fixtures live in `tests/__fixtures__/`. Each fixture is a minimal .git directory with known commits, branches, dirty state. Fixtures are generated once; tests don't modify them. Rationale: reproducible, fast, CI-friendly.

**How to apply:** Before writing sensor tests, create fixture (e.g., `__fixtures__/repo-basic/` with 5 commits, `repo-monorepo/` with nested package.jsons). Use `vol` (memfs) for in-memory testing or real fixture dirs for integration tests.

### [gotcha] npm test / npm run test Varies by Framework
**2026-05-02** — The `tests` sensor shells out to detect and run test framework. Generated projects have vitest configured, but users might have jest, mocha, etc. The sensor tries multiple commands: `npm test`, `npx vitest run`, `npx jest --json`, with 2s timeout each. Returns null if none work.

**How to apply:** When implementing the tests sensor, start with the most common (npm test), fall back gracefully. Test against both vitest and jest configs.

### [architecture] Commands Are Thin Wrappers Around Utils
**2026-05-02** — v1.0 commands (sync, doctor, brief, wake, plan) are thin CLI wrappers around utilities in `src/utils/`. The pattern: `src/commands/sync.ts` is ~30 lines (parse args, call `utils/sync.ts`, handle errors). Business logic lives in utils. Commands are easy to test (mock utils), easy to reuse (call from other commands), easy to adapt (pipe output to other CLIs).

**How to apply:** M1 implementation: write `captureVitalSigns()` in utils, write a simple `src/commands/sync.ts` that calls it and writes to index.md. Tests live in `tests/unit/sensors.test.ts` and `tests/unit/sync.test.ts` (command integration).

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

**How to apply:** Treat `plans/index.md` as a derived artifact, never as user-edited source-of-truth.

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
