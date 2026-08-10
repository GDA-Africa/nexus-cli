# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🦎 Chameleon UI delegation (opt-in)

`nexus init` is the interview; [Chameleon](https://chameleon.glenhalton.com)
(`@chameleon-ui-lib/react`) is the generator. NEXUS resolves what you want into
an AppSpec, hands it over, and overlays the brain, tooling, CI, and tests
around what Chameleon produces.

**Opt-in, remembered, never required:**

```bash
nexus use chameleon            # this project
nexus use chameleon --global   # every project
nexus use none                 # opt back out
nexus use --explain            # what's active, and which file said so
nexus init my-app --ui none    # always one keystroke away
```

Resolution order: `--ui` flag → project `.nexus/config.json` → global
`~/.config/nexus/config.json` → `none`. A saved preference is *stated* during
`init`, never asked about again.

- **No hard dependency.** Chameleon is resolved from your environment at
  generation time (`NEXUS_CHAMELEON_BIN` → project `node_modules/.bin` → `npx
  --no-install`). Absent, older, or broken, generation falls back to NEXUS with
  a printed reason — every project still builds with `--ui none`.
- **Capability-gated, not version-gated.** NEXUS asks what Chameleon can do and
  disables the paths that aren't available, so new Chameleon releases light up
  new paths without a NEXUS release.
- **Validated before it runs.** NEXUS validates the AppSpec locally, then again
  via `chameleon new --validate-only`, before anything is written.
- **Recorded, not claimed.** Every `--json` envelope is written to
  `.nexus/state/chameleon.json` as generation evidence.
- **Native is skipped, deliberately.** Chameleon's tree is DOM-bound, so an
  Expo target skips it and says so — a saved preference never produces a
  project that cannot boot.
- **Generated apps get a working toolchain.** NEXUS merges its scripts and
  devDependencies into Chameleon's `package.json`, which is what makes the
  `lint` script Chameleon ships actually runnable.

### 🛡 Fixed: `upgrade` no longer deletes Chameleon's agent block

`CLAUDE.md` and `AGENTS.md` are in NEXUS's `ALWAYS_REPLACE` set, so every
`init` / `upgrade` / `repair` rewrote them wholesale — silently deleting the
block `chameleon agents init` splices between `<!-- chameleon:start -->`
markers. NEXUS now captures that block before regenerating and restores it
after. New `D12` doctor check flags a project where it went missing.

## [1.1.3] — 2026-08-04

### 🛡 Fixed: "undefined" leaking into generated files

`upgrade` and `repair` passed `manifest.config` straight to the generators.
Manifests written by older CLIs, or by `adopt` on a backend-only project
(frontend framework detected as `null`), are **partial** — so template literals
rendered the literal string `undefined` into generated docs and AI config files.

- New `normalizeManifestConfig()` (`src/utils/manifest.ts`) fills every
  missing/null field with an explicit, valid default before generation.
  Unknown enum values are **preserved** — forward-compatible with manifests
  written by newer CLIs.
- `upgrade` and `repair` now normalize before handing config to the generators.
- `getFrameworkDisplay()` accepts `null`/`undefined` and renders `Unspecified`;
  `none` renders `None (no frontend)`.

No migration needed — the fix is transparent. If a previous `upgrade` wrote
`undefined` into your brain docs or AI config, re-run `nexus upgrade` to
regenerate them (populated docs stay preserved, as always).

Found while dogfooding v1.0 (2026-06-11 incident). 456/456 tests pass.

---

## [1.1.2] — 2026-06-11

### 🎭 Contextualized Agents (HEADLINE)

The brain stops contextualizing one generic agent and starts defining
specialized, brain-grounded agents. New primitive: `.nexus/agents/` with the
same ownership model as skills (core regenerated / custom SACRED / community
installable; precedence custom > core > community).

- **The core four**, generated for every project:
  - `nexus-implementer` — works the active plan's next step; never re-derives plans
  - `nexus-test-writer` — the verification keystone: detects test setup via
    sensors, writes tests matching `06_test_strategy.md`, **asks before
    scaffolding test infra** (never silent), records waivers visibly
  - `nexus-reviewer` — reviews against recorded conventions, citing knowledge
    entries; read-only tool allowlist by design
  - `nexus-doc-keeper` — progress log, knowledge hygiene, doctor triage
- **Agent definitions** carry context recipes (docs, knowledge categories,
  skills, plan scope), least-privilege MCP tool allowlists, and handoff contracts
- **`nexus agent`** command: `list · new · install · remove · status · sync`
- **Client outputs:** `.claude/agents/<name>.md` (Claude Code subagents) +
  fenced "Agent Roles" blocks in AGENTS.md/CLAUDE.md/instructions (degrades
  gracefully for non-subagent clients); regenerate with `nexus agent sync`
- **3 new MCP tools** (16 total): `nexus_list_agents`, `nexus_get_agent`, and
  **`nexus_get_context`** — composes ONE scoped context pack per task (plan
  slice + matching knowledge + trigger-matched skills + vitals digest + recipe
  docs), deterministic, with a payload budget
- `nexus_wake` accepts an `agent` identity, recorded in session.json

### ✅ Verification gate

- **Doctor D11 — Unverified Done:** plans marked `done` whose Evidence section
  has neither test results nor an explicit waiver are flagged (11 checks total)
- `nexus plan done` warns when completing with an empty Evidence section
- Registry v0.3.0 (`@nexus-framework/skills`): `agents/` content area + the
  `nexus-agent-authoring` meta-skill

### 🛡 Fixed: upgrade data loss (critical)

Found dogfooding v1.0 on 2026-06-11: `nexus upgrade` destroyed hand-written,
frontmatter-less brain docs. Two compounding flaws — `isCorrupted()` treated
missing frontmatter as corruption (force-replaced in both modes), and the
smart check replaced anything not explicitly `status: populated`. Now:

- Missing frontmatter is **never** corruption (only empty files, invalid JSON,
  or an unclosed frontmatter block)
- The replace gate is `isTemplate()`: only explicit `status: template` files
  are replaceable — **preserve-by-default**
- Every reconcile overwrite is first backed up to
  `.nexus/state/upgrade-backup/<stamp>/` — always recoverable, even without git

### Migration

`nexus upgrade` (now safe for hand-written brains) adds `.nexus/agents/`,
`.claude/agents/`, and the Agent Roles sections. Additive — nothing existing
changes behavior. Agents are skippable via `enableAgents: false` in the manifest.

## [1.0.0] — 2026-06-10

> The 2026-06-09 publish run failed in CI (expired npm token) before reaching
> the registry, so v1.0.0 was re-cut on 2026-06-10 with the MCP server included.

### 🔌 `nexus mcp` — the brain becomes a tool server (HEADLINE)

NEXUS now ships an MCP (Model Context Protocol) server. Run `nexus mcp` — or
let the generated `.mcp.json` register it automatically — and any MCP client
(Claude Code, Claude Cowork, OpenAI Codex, Cursor, …) gets the project brain
as 13 schema-validated tools:

- **Read:** `nexus_wake`, `nexus_get_vital_signs`, `nexus_query_knowledge`,
  `nexus_get_active_plan`, `nexus_list_plans`, `nexus_get_plan`,
  `nexus_brief`, `nexus_doctor`, `nexus_list_skills`, `nexus_get_skill`
- **Write:** `nexus_plan_tick`, `nexus_plan_note`, `nexus_add_knowledge_entry`

Why this matters:

- **Accuracy** — targeted retrieval (`nexus_query_knowledge`) instead of whole-file
  reads; schema-validated writes make malformed plan frontmatter impossible
- **Speed** — `nexus_wake` returns the handshake token, active plan, next step,
  and doctor counts in one call; no more re-deriving plans each session
- **Compliance becomes structural** — tools agents naturally call replace
  "READ index.md EVERY TIME" rules they might skip

Markdown stays the source of truth — no database, no daemon. The server is
stdio-spawned per client and exits when the client disconnects.

### 🧠 Brain-aware CI (deterministic tier)

- Generated `.github/workflows/ci.yml` gains a `brain` job: on every PR it runs
  `nexus sync` + `nexus brief --md` and upserts the digest as a sticky PR
  comment (`<!-- nexus-brain-brief -->`), so reviewers see brain state next to
  the diff. The existing `nexus doctor` gate remains the only blocking check.
- Zero LLM dependency — pure deterministic markdown.

### 🤝 Multi-agent serving

- New generated `.mcp.json` registers the `nexus-brain` server for Claude Code,
  Codex, and Cursor
- All generated instruction files (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`,
  `.windsurfrules`, `.clinerules`, copilot-instructions) gain an
  **MCP Server (PREFERRED INTERFACE)** section documenting the tool surface
- Session Handshake section now offers the `nexus_wake` tool as the MCP-native
  handshake path

### Alive Brain — complete (M4)

v1.0.0 closes the Alive Brain initiative: the brain now senses (`sync`), tracks
(`plan`), audits (`doctor`), speaks (`brief`), remembers cleanly (`consolidate`),
and proves itself read (`wake`).

#### `nexus consolidate`
- Rolls `knowledge.md` up into a generated `knowledge-summary.md`, grouped by category
- Append-only stays append-only — consolidation adds a summary layer, never deletes
- `--check` — CI gate: exits non-zero when the summary is out of date with the raw file
- `--archive` — moves entries older than one year to `knowledge-archive.md` (still readable, off the hot path)
- TTL hints: entries can declare `expires_after_version: "X.Y.Z"`; expired entries are struck through in the summary
- Deterministic Markdown processing — no LLM calls

#### `nexus wake`
- Session handshake: issues a deterministic token (`NX-WAKE-XXXX-YYYY-MM-DD`) derived from brain content + date
- Records the handshake in `.nexus/state/session.json`; `nexus doctor` (D09) flags commits made without one
- `--quiet` prints only the token (for shell rc scripting); `--no-active-plan` for CI
- Enforcement is downstream and advisory — skipping is visible, not impossible

#### Scaffolding & upgrade
- `nexus init` / `nexus adopt` scaffold the full v1.0 layout, including `.nexus/state/`
- Generated AI instruction files gain a **Session Handshake (REQUIRED)** section referencing `nexus wake`
- New generated `CLAUDE.md` at project root (alongside `AGENTS.md`, `.cursorrules`, etc.)
- `nexus upgrade` lifts v0.3.x/v0.4.x projects to v1.0 **without data loss** — existing
  plans (`.nexus/plans/`) and session state (`.nexus/state/`) are now always preserved
  (previously `_active.json` and the starter plan could be clobbered on upgrade)

#### Fixes
- **Upgrade data loss (critical, found dogfooding 2026-06-11):** `nexus upgrade`
  destroyed hand-written brain docs. `isCorrupted()` treated missing YAML
  frontmatter as corruption (force-replaced in both upgrade and repair), and
  the smart check replaced anything not explicitly `status: populated`. Now:
  missing frontmatter is never corruption; only explicit `status: template`
  files are replaceable (preserve-by-default); and every file reconcile
  overwrites is first backed up to `.nexus/state/upgrade-backup/<stamp>/`.
- `src/version.ts` drift: CLI reported 0.4.0 while package.json said 0.4.1
- End-to-end release-gate test: scaffold → wake → plan lifecycle → sync → consolidate → doctor

### Migration from v0.3.x / v0.4.x

Run `nexus upgrade` in your project. It adds `.nexus/state/`, refreshes AI
instruction files (now with the handshake protocol), and preserves all populated
docs, knowledge, plans, and session state. Nothing is removed. New commands are
no-ops until you use them.

## [0.4.0] — 2026-05-02

### Alive Brain

The project brain stops being a journal and becomes a runtime. Four new command families
capture repo state, track work, audit for drift, and surface their own needs.

#### `nexus sync`
- Reads git, tests, files, and packages via five sensor modules (`src/utils/sensors/`)
- Writes a `<!-- NEXUS:VITAL_SIGNS -->` block into `.nexus/docs/index.md`
- Idempotent — runs in under two seconds, safe at any frequency
- `nexus init` and `nexus adopt` now scaffold Vital Signs fences in new projects
- `nexus upgrade` injects fences into existing `index.md` if missing

#### `nexus plan`
- Persisted work tracking across sessions: plans live in `.nexus/plans/` as human-readable markdown
- Lifecycle state machine: `draft → approved → in_progress → blocked | done | abandoned`
- Subcommands: `new`, `list`, `show`, `start`, `tick`, `note`, `done`
- Templates: `feature`, `bug`, `refactor`, `spike`, `chore`
- `nexus plan done` appends to the progress log and prompts for a knowledge entry
- Plans index auto-rebuilds after every command
- `nexus init`, `nexus adopt`, and `nexus upgrade` scaffold `.nexus/plans/`

#### `nexus doctor`
- Ten modular drift checks (D01–D10): frontmatter status, stale phases, progress log gaps,
  knowledge bloat, stale knowledge references, plan staleness, plan evidence, Vital Signs age,
  handshake tracking, and skills drift
- CI-friendly: exit code equals highest finding severity
- `--fix` flag auto-resolves safe issues (e.g. removes stale knowledge references)
- `--json`, `--severity`, and `--scope` flags for targeted use
- Per-project configuration via `.nexus/doctor.config.json`

#### `nexus brief`
- Human-readable digest: what shipped, what is active, what is drifting, what to do next
- Sources: `nexus sync --json`, `nexus doctor --json`, plan state, last 7 days of git log
- `--since`, `--md`, and `--write` flags

#### `nexus brain` (auto-invoke layer)
- Detects when the brain needs updating: stale sync, unresolved doctor findings, stale plans, missing Vital Signs
- Surfaces the right action at the right moment — after commands, never blocking
- Subcommands: `status`, `check`, `config`
- Configurable via `.nexus/auto-invoke.config.json`: mode (`silent` | `interactive`), interval, per-command overrides

### Tests
- 347 unit and integration tests (up from 306 in v0.3.2)

---

## [0.3.2] — 2026-03-07

`nexus skill registry` now fetches the `@nexus-framework/skills` tarball directly from npm at
runtime. New skills are visible immediately without republishing the CLI.

## [0.3.1] — 2026-03-07

Production fix: `dirExists` for skill directory checks. Comprehensive test coverage for all
v0.3.x modules (295 tests). Homepage set to nexus.glenhalton.com.

## [0.3.0] — 2026-03-06

Skills System: `nexus skill` with six subcommands including a live registry, skills generator
sourced from `@nexus-framework/skills`, `nexus pack` / `nexus unpack`, `nexus update`, and
startup update notifications. 225 unit tests.

## [0.2.0] — 2026-02-09

Agent Persona system. Knowledge Base Protocol in all shipped AI instructions. README rewritten.
NEXUS is now an AI-native development framework, not a scaffolding tool.

## [0.1.3] — 2026-02-08

Knowledge system, `nexus upgrade`, `nexus repair`, token-optimized templates, 179 tests.

## [0.1.0] — 2026-02-07

Initial release: `nexus init`, `nexus adopt`, five frameworks, AI config generation, 73 tests.

