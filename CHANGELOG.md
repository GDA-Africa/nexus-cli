# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-06-09

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

