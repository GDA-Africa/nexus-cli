# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-08-24

**Reliability and local-model support.** This release is mostly the project
checking its own work: three new doctor checks catch the brain's docs
drifting out of sync with what the code actually does, and NEXUS can now
size and verify what it hands to a small, locally-run AI model instead of
assuming a one-size packet works for every model.

### 🩺 Doctor gets three new checks

- **D14** flags a project whose total context load (docs, knowledge, skills,
  agent instructions) is unaccounted for, not just any single file.
- **D15** flags a manifest that declares something (a framework, a package
  manager) the project no longer actually uses.
- **D16** flags docs and code that have drifted apart, such as a status page
  still saying "in progress" on something the code shows as finished.

Sixteen checks total now. Two smaller doctor fixes shipped alongside them:
D04's knowledge-health check now measures actual file size instead of entry
count, and D07/D11 no longer double-report the same finding.

### 🖥 Local AI models get a real seat at the table

Before this release, every AI assistant got the same context packet from
NEXUS, sized for a capable, well-resourced model. A small model running for
free on someone's own machine could get cut off partway through and never
notice.

- `.nexus/harnesses.yml` lets a project describe the AI setup it's actually
  running against.
- Instruction files are now generated at the size that setup can handle,
  instead of being truncated after the fact.
- **`nexus harness verify`** is new: it checks, for real, whether a given
  local setup is receiving what NEXUS sent it, rather than assuming it works.
- `nexus context` is a new command that prints the same composed context pack
  the MCP server would return, without needing an MCP server running at all.
- The MCP context pack itself is now token-budgeted, with clear reporting
  when something had to be trimmed to fit.

### 📚 Docs

- `contract_version` on the composed context pack existed in code but was
  never written down anywhere a consumer would find it. It's now documented
  in `NEXUS.md` and `04_api_contracts.md`, with a test that fails if the two
  ever drift apart again.
- The project's own brain (`index.md`, `knowledge.md`) is caught up with
  everything that shipped since 1.4.0.

## [1.4.0] - 2026-08-22

**A public MCP surface.** The 17 brain tools behind `nexus mcp` were only
reachable over stdio. They're now importable directly: `src/mcp/index.ts`
re-exports `resolveBrainContext`, `BrainContext`, `McpToolError`, every tool
handler, and `buildMcpServer` as native TypeScript, and `package.json` gains
an `exports` map with a `./mcp` subpath. Any embedding host can call
`wakeTool(ctx, input)` directly and get a real object back instead of the
MCP text-content envelope — the first seam toward running the brain as a
Cordis-registered tool set inside DeepSeek Harness.

No behavior changed; this is additive surface only.

## [1.3.0] - 2026-08-21

**Skills II.** Skills stop being only *reference the agent reads* and gain a
second kind — *procedure the agent runs*. On top of that: a gate that makes
alignment a precondition for feature work, a budget for the instructions every
agent carries on every turn, and the fix for a shipped data-loss bug.

### 🎯 The alignment gate

The most expensive failure in a project is not bad code. It is well-built code
that answered the wrong question, because the agent inferred an ask instead of
resolving it. The gate makes alignment a **precondition**, not a suggestion in a
rules file.

```bash
nexus plan new "Add user authentication" --type=feature
#   ⚠ This is a feature plan — it needs a "## Grilling" record before implementation.

nexus wake
#   ⚠ ALIGNMENT GATE — plan is type=feature with no ## Grilling record

nexus doctor
#   ⚠ [D13] Plan "add-user-authentication" has no ## Grilling record
```

- **`grilling` skill** (`@nexus-framework/skills`) — the interview discipline:
  one question at a time, depth-first, until every branch of the design is
  decided or explicitly recorded out of scope.
- **The record lives in the plan**, as a `## Grilling` section. It diffs in git
  beside the work it aligned, and a gated plan is scaffolded with the section
  pre-seeded and marked pending — so an untouched template never satisfies the
  gate.
- **`feature`, `refactor` and `spike` gate on type.** A `bug` plan opts in with
  `nexus plan new --major`, because plan type alone cannot tell a data-loss
  regression from a typo, and the person creating the plan already knows which.
  `chore` is never gated.
- **The gate keys off structural facts, never your prose** — the plan's `type`
  field and whether the record is filled. A classifier reading agent-written
  text is gameable by exactly the agent it is meant to catch; `D11` v1 already
  shipped that mistake once.
- **Nothing hard-blocks.** `nexus_get_context` returns the gate, `nexus wake`
  prints it, `D13` records a miss, and `nexus doctor --strict` turns it into a
  CI error. Refusing to start a plan would push the work outside the plan, where
  nothing can see it at all.

### 📏 Context load (`D14`)

Every generated instruction file is **context load**: bytes in the agent's
window on every turn, spent whether or not they turn out to be relevant.

`D14` measures it **per file, not per project** — six harnesses load six
different files (Cursor reads `.cursorrules`, Claude reads `CLAUDE.md`), so a
session pays for one of them, not their sum. Warns above 10 KB, errors above
16 KB or under `--strict`, and reports near-identical files as info.

**Applied to ourselves first:** the generated `CLAUDE.md` was 13.4 KB — the docs
table stated twice, "orient first" stated in three places, and a Workflow
section telling the agent to read four files by hand immediately after telling
it to prefer one `nexus_get_context` call. It is now **7.9 KB (−41%)**.
Reference material moved behind a pointer into `.nexus/ai/instructions.md`;
the onboarding protocol, the `STOP` gate on `status: template` docs, and the
workflow rules stay inline, because agents ignore cross-file pointers.

### 🚨 Fixed — `nexus upgrade` no longer destroys hand-written docs

`isTemplate()` / `isPopulated()` used
`/^---[\s\S]*?status:\s*"?template"?[\s\S]*?---/m`. The `m` flag makes `^---`
match the start of **any** line, so a markdown horizontal rule opened what the
regex treated as frontmatter and the scan then ran over the entire document
body. **Any document containing a `---` rule plus the words `status: template`
somewhere in its prose was classified as a template and overwritten.**

Worse than first diagnosed: a document whose *own frontmatter said
`status: populated`* was also affected, since the real frontmatter fence
supplies the opening `---`. Both predicates could return `true` for one file,
and the replace gate only asks `isTemplate`.

Both predicates now read a single `status` value from the leading frontmatter
block only — anchored to the start of the string, no `m` flag. Verified by
running old and new predicates over every brain doc in the NEXUS monorepo: two
files flip from *replace* to *preserve*, and zero genuine templates are
misclassified. **Preserve-by-default is the contract; when in doubt, do not
overwrite.**

### 🔴 Fixed — `nexus_get_context` never returned a skill

The MCP server's frontmatter parser read only the inline form
`triggers: [a, b]`. Every skill in the registry uses a YAML block list, so
**all 22 shared skills parsed to zero triggers** — the skills section of the
context pack had returned an empty array for every task since it shipped, and
`nexus_list_skills` only ever exposed names (`title` and `description` were
`null` for every skill, because the parser looked for `title:`/`name:` and NEXUS
skills carry neither).

Two frontmatter parsers existed with different bugs. There is now one,
`utils/skills/frontmatter.ts`, shared by the CLI and the MCP server.

### 🔍 Trigger matching

Substring containment is replaced by token-overlap scoring with **ranked**
admission, so budget pressure drops the least relevant skill rather than an
arbitrary one. The verbatim path is preserved as the strongest signal but now
requires word boundaries — plain `includes` fired `"api"` on *rapid* and
`"test"` on *latest*.

`SKILL_SPEC` v1 §6 claimed matching was semantic; it was not. §7 now documents
what the code actually does.

### 📐 SKILL_SPEC v2.0.0

Additive — `invocation` defaults to `model`, so **every existing skill stays
valid** and no coordinated CLI + registry release is needed.

- **`invocation: model | user`** — who may invoke a skill. The invariant: a
  `user` skill may invoke `model` skills, a `model` skill may invoke `model`
  skills, and **nothing may invoke a `user` skill except the human**. The call
  graph is a DAG rooted at you.
- **`category: procedure`** — a discipline the agent runs to completion. Takes
  `## Completion Criteria` in place of `## Example`, because its output is a
  changed state of understanding, not a file.
- **`category: integration`** — wiring a named third-party service.
- **`gate`** — declares a skill a precondition for a class of work.

### Added

- `nexus doctor --strict` — escalate advisory findings to errors, for CI
- `nexus plan new --major` — mark a bug plan a major fix
- Explicit `type:` field in plan frontmatter (pre-1.3 plans are classified from
  `source:`, so the gate applies to them too)
- `nexus skill status` validates every skill against `SKILL_SPEC` v2 — category,
  framework, version, author, invocation, gate, and required body sections. It
  previously checked only slug and triggers, and only at creation time via the
  `nexus skill new` prompt, so hand-authored skills went unvalidated
- `nexus skill list` shows `[procedure]`, `[user-invoked]` and `[gates …]`

### Fixed

- Generated instructions documented the knowledge entry format as
  `## [YYYY-MM-DD] category — title`, which `parseKnowledge` cannot parse. Any
  entry written by hand to the documented format was invisible to
  `nexus_query_knowledge`, to the knowledge section of `nexus_get_context`, and
  to `nexus consolidate`. Now documents the real format, `### [category] Title`
- `mapbox-integration` shipped `category: maps`, never a valid value

### Upgrading

Nothing activates on its own. Run `nexus upgrade` to regenerate the instruction
files at the new size — your `custom/` skills, populated docs, and knowledge
base are untouched, and a backup is written to
`.nexus/state/upgrade-backup/<stamp>/` before anything is replaced.

**659 tests** (was 546).

## [1.2.0] - 2026-08-10

> **Note on 1.1.3.** Everything below was already inside the published 1.1.3
> tarball — it was cut while this work sat under an `[Unreleased]` heading, so
> 1.1.3 shipped a feature set its own changelog entry did not describe. 1.2.0
> is the same code under the version it should have carried. Nothing is
> removed from 1.1.3; if you installed it, upgrading to 1.2.0 changes only the
> version number.

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

## [1.1.3] - 2026-08-10

> Published from a branch that also carried the v1.2 Chameleon work, so this
> release contains more than the fix described below. See [1.2.0] for what was
> actually in it. Prefer 1.2.0.


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

## [1.1.2] - 2026-06-11

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

## [1.0.0] - 2026-06-10

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

## [0.4.0] - 2026-05-02

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

## [0.3.2] - 2026-03-07

`nexus skill registry` now fetches the `@nexus-framework/skills` tarball directly from npm at
runtime. New skills are visible immediately without republishing the CLI.

## [0.3.1] - 2026-03-07

Production fix: `dirExists` for skill directory checks. Comprehensive test coverage for all
v0.3.x modules (295 tests). Homepage set to nexus.glenhalton.com.

## [0.3.0] - 2026-03-06

Skills System: `nexus skill` with six subcommands including a live registry, skills generator
sourced from `@nexus-framework/skills`, `nexus pack` / `nexus unpack`, `nexus update`, and
startup update notifications. 225 unit tests.

## [0.2.0] - 2026-02-09

Agent Persona system. Knowledge Base Protocol in all shipped AI instructions. README rewritten.
NEXUS is now an AI-native development framework, not a scaffolding tool.

## [0.1.3] - 2026-02-08

Knowledge system, `nexus upgrade`, `nexus repair`, token-optimized templates, 179 tests.

## [0.1.0] - 2026-02-07

Initial release: `nexus init`, `nexus adopt`, five frameworks, AI config generation, 73 tests.

