# NEXUS CLI — Project Index

**Project:** NEXUS CLI (`@nexus-framework/cli`)  
**Published Version:** v1.4.0 (per `package.json` / npm dist-tag — see note below; Release History table below is stale, last logged at v1.1.3)  
**Working Branch:** `main`  
**Active Initiative:** 🚀 **v1.0 "Alive Brain"** + **Auto-Invoke Layer** — see [`../../../.nexus/docs/v1_alive_brain.md`](../../../.nexus/docs/v1_alive_brain.md)  
**Brain Layout:** v1.0 (hand-bootstrapped 2026-05-02 — `.nexus/plans/`, `.nexus/state/`, Vital Signs block)  
**Coverage:** 762/762 tests passing across 57 files (unit + integration + e2e), measured 2026-08-24 via `npm test`

---

<!-- NEXUS:VITAL_SIGNS:START — managed by `nexus sync` -->
## 🩺 Vital Signs (auto)

_Last sync: 2026-08-31T12:09:04.054Z · branch `main` · 0 commits ahead of main · working tree dirty_

| Sensor | Reading |
|--------|---------|
| Last commit | 5c29700 — feat(skill): implement real `nexus skill install` from any npm package · Glenhalton · 5 days ago |
| Tests | not yet measured |
| Coverage | not collected · M1 sensor adds `vitest --coverage` parsing |
| Stale folders | src/commands 0 days · src/utils 0 days · src/generators 6 days · tests/e2e 6 days · tests/unit 0 days · tests/integration 120 days |
| Packages | not yet measured |
<!-- NEXUS:VITAL_SIGNS:END -->

---

## 🎯 Current Objective

**Current phase:** 🟢 Context Economics & Harness Profiles ("Track A" of
`release-v1-2`, plus doctor hardening) — landed on `main` 2026-08-24, **not
yet released to npm** (still v1.4.0; the version bump is a deliberate,
separate step this project holds back on purpose).

**What landed today (13 commits):** `nexus_get_context` moved from an
unguarded char budget to a token budget with `admit()`-gated sections, a
`ContextFloorOverflow` throw instead of a silently gutted pack, and
`evicted[]`/`budget{}`/`contract_version` reporting; the generated protocol
now tells agents to call `nexus_get_context` first instead of contradicting
itself and sending them to read `index.md` + `knowledge.md` in full; a new
optional `.nexus/harnesses.yml` lets a project declare each harness's
context window and `orientation_budget`, and `toolInstructionContent`
generates a structurally different (not just shorter) instruction file per
profile — native-pointer, static-fallback, or the unchanged standard variant;
`nexus context "<task>" --json --max-tokens=N` exposes the same composer
with no MCP server required. Alongside that, 7 shipped bugs were fixed
(`nexus doctor` could never exit 0 on a real project — D08/D02 were
unreachable because nothing wrote `.nexus/state/last-sync.json`; `--severity
error` silently zeroed the exit code; `doctor --fix` still exited 1 after a
successful fix; D07/D11 double-reported one fault; D04 only counted entries,
missing that `knowledge.md` is unusable by byte size long before it hits the
entry threshold; D14 charged the brain-file fallback path even when MCP made
it unreachable), and two new doctor checks shipped: **D15** (manifest
declarations vs. observable repo facts — test framework, package manager,
frameworks) and **D16** (artifact drift — plans dashboard / `_active.json`
vs. plan files on disk). Doctor is now **16 checks, D01–D16**.

**State:** No active plan is running this work — it landed directly.
`.nexus/plans/` does hold open plans on disk (`release-v1-2`,
`implement-v1-2-provable-done`, `bootstrap-nexus-cli-roadmap`) that the
auto-generated `plans/index.md` dashboard does not list; that drift is
exactly what the new D16 check exists to catch (see `knowledge.md`), and is
left as-is here rather than hand-patched.

**Next queued initiative — unchanged by today's work:** 🟣 v1.2 "Provable
Done" (Track B of `release-v1-2`) — verify manifest, D11 v2, `doctor
--strict` — design drafted, plan
([`implement-v1-2-provable-done`](../plans/implement-v1-2-provable-done.md))
still `status: draft`, awaiting Halton approval. **Why:** review session
2026-07-05 found D11 v1 is a gameable keyword regex ("tests skipped"
passes), D09/D11 severities never gate CI, and evidence is unverifiable
prose. v1.2 Provable Done = machine evidence + `doctor --strict`.

---

### What v0.4.0 adds (M1+M2+M3)

The **complete alive brain perception layer**:
- **`nexus sync`** (M1) — sensors capture real repo state → Vital Signs block
- **`nexus plan`** (M2) — persisted multi-step work tracking in `.nexus/plans/`
- **`nexus doctor` + `nexus brief`** (M3) — drift detection + human-readable digest
- **Auto-invoke layer** — brain detects its own needs and prompts user

Result: a project brain that not only records state but detects drift, tracks work, and surfaces its own needs. Users don't have to remember when to update — the brain tells them.

### Brain layout (v1.0 shape — hand-bootstrapped)

```
.nexus/
├── docs/
│   ├── index.md                ← THIS FILE (Vital Signs block injected above)
│   ├── knowledge.md             append-only learning log
│   ├── knowledge-summary.md    ← NEW — auto-generated consolidation (M4 will rebuild)
│   ├── 01_vision.md
│   └── 07_implementation.md
├── plans/                      ← NEW (v1.0 headline)
│   ├── index.md                 dashboard, hand-maintained until M2 ships
│   ├── _active.json             pointer to active plan(s)
│   ├── bootstrap-v1-brain-by-hand.md  ✅ done
│   ├── implement-v1-m1-sensors-sync.md  🟢 in_progress (active)
│   ├── implement-v1-m2-plans-mvp.md     📋 approved
│   ├── implement-v1-m3-doctor-brief.md  📋 approved
│   └── implement-v1-m4-consolidate-wake-polish.md  📋 approved
├── state/                      ← NEW, gitignored
│   ├── session.json             last handshake token
│   ├── last-sync.json           last Vital Signs snapshot
│   └── doctor.json              last drift report
├── ai/instructions.md           AI agent protocol (handshake section added)
├── skills/
└── manifest.json                ⚠ stale (reports v0.1.3 vs npm v0.3.2)
```

---

## 📊 Project Status Matrix

| Phase | Status | Notes |
|-------|--------|-------|
| 📝 Documentation | ✅ Complete | Vision, implementation, README, contributing guide |
| 🏗️ Phase 1: Core Infrastructure | ✅ Complete | CLI entry point, Commander.js, bin executable |
| 🎨 Phase 2: Prompts & Templates | ✅ Complete | 7 interactive prompt modules (including persona) |
| 📚 Phase 3: Documentation System | ✅ Complete | 8-file doc generator + brain + knowledge system |
| 🧪 Phase 4: Testing & CI/CD | ✅ Complete | 190 unit tests, GitHub Actions CI/CD on Node 20/22, auto-publish to npm |
| 🔮 Phase 5: Landing Pages | ✅ Complete | Branded pages for all 6 frameworks + favicon |
| 🛡️ Phase 6: Repo Governance | ✅ Complete | CODEOWNERS, PR template, issue templates, commitlint |
| ✨ Phase 7: Polish & Distribution | 🟡 80% | Published to npm, upgrade/repair built, persona system shipped, pack/unpack/update shipped, E2E tests remaining |
| 🧠 Phase 8: Skills System | ✅ Complete | `nexus skill` command (6 subcommands inc. registry), skills generator sourced from `@nexus-framework/skills`, skills protocol in all AI files, 36 unit tests — shipped as v0.3.0 |

---

## 📁 What Has Been Built

### CLI Commands

| Command | File | Description |
|---------|------|-------------|
| `nexus init [name]` | `src/commands/init.ts` | Scaffold a new project from scratch with interactive prompts |
| `nexus adopt [path]` | `src/commands/adopt.ts` | Add `.nexus/` docs + AI config to an existing project |
| `nexus upgrade [path]` | `src/commands/upgrade.ts` | Regenerate `.nexus/` with latest templates (smart file strategy) |
| `nexus repair [path]` | `src/commands/repair.ts` | Fix missing/corrupted `.nexus/` files without replacing valid ones |
| `nexus skill new [name]` | `src/commands/skill.ts` | Scaffold a new custom skill interactively |
| `nexus skill list` | `src/commands/skill.ts` | List all installed skills (core / custom / community) with status |
| `nexus skill registry` | `src/commands/skill.ts` | Browse all skills available in `@nexus-framework/skills` (--framework filter) |
| `nexus skill install <pkg>` | `src/commands/skill.ts` | Install a community skill pack from the registry |
| `nexus skill remove <name>` | `src/commands/skill.ts` | Remove a community skill (refuses core/custom) |
| `nexus skill status` | `src/commands/skill.ts` | Health-check all skills — flags deprecated or invalid frontmatter |
| `nexus pack [path]` | `src/commands/pack.ts` | Zip `.nexus/` into a portable `nexus-backup-<timestamp>.zip` |
| `nexus unpack [path]` | `src/commands/pack.ts` | Extract a backup zip and verify the restored `.nexus/` structure |
| `nexus update` | `src/commands/update.ts` | Check npm registry and auto-install the latest NEXUS CLI version |
| `nexus mcp [path]` ⬅ **NEW v1.0.0** | `src/commands/mcp.ts` | Stdio MCP server — 17 schema-validated brain tools (`src/mcp/{context,tools,server}.ts`) for Claude Code, Codex, Cursor & any MCP client |
| `nexus context "<task>"` ⬅ **NEW 2026-08-24** | `src/commands/context.ts` | Same bounded context-pack composer as `nexus_get_context` (MCP), callable as a plain process — `--json`, `--max-tokens=N`, `--agent=<name>`; no MCP server required |

### Source Modules (src/)

| Module | Files | Description |
|--------|-------|-------------|
| **Entry Points** | `cli.ts`, `index.ts`, `version.ts` | Commander.js CLI, public API, version 0.4.0 |
| **Commands** | `commands/init.ts`, `adopt.ts`, `upgrade.ts`, `repair.ts`, `skill.ts`, `pack.ts`, `update.ts` | 7 CLI commands (+ 6 skill subcommands) |
| **Prompts** | `prompts/index.ts` + 7 modules | Project type, data strategy, patterns, frameworks, features, persona, skill-config |
| **Generators** | `generators/index.ts` + 8 modules | Structure, docs, config, tests, CI/CD, landing page, AI config, skills |
| **Types** | `types/config.ts` + 3 modules | NexusConfig (+ enableSkills), NexusManifest, NexusPersona, GeneratedFile, TemplateContext |
| **Utils** | `utils/index.ts` + 7 modules | Logger, validator, package-manager, git, file-system, project-detector, update-check |

### Generator Modules (src/generators/)

| File | What It Generates |
|------|-------------------|
| `structure.ts` | Directories, package.json, .gitignore, README |
| `docs.ts` | 8 NEXUS docs + index.md brain + knowledge.md + .nexus/index.md + manifest.json |
| `config.ts` | tsconfig.json, .eslintrc.cjs, .prettierrc, .editorconfig |
| `tests.ts` | vitest.config.ts, example unit test, test helpers |
| `ci-cd.ts` | .github/workflows/ci.yml |
| `landing-page.ts` | Framework-specific homepage + nexus-logo.svg + favicon.svg |
| `ai-config.ts` | `.nexus/ai/instructions.md` + root pointer files + onboarding protocol |
| `index.ts` | Orchestrator: generateProject(), adoptProject(), upgradeProject(), repairProject() |
| `skills.ts` ⬅ **NEW v0.3.0** | `.nexus/skills/` — core + custom dirs, README index, framework-matched skill files |

### Prompt Modules (src/prompts/)

| File | What It Asks |
|------|--------------|
| `index.ts` | Orchestrates full prompt flow |
| `project-type.ts` | Project type selection |
| `frameworks.ts` | Framework selection |
| `features.ts` | Feature selection |
| `patterns.ts` | App pattern selection |
| `data-strategy.ts` | Data strategy selection |
| `persona.ts` | Agent persona configuration (tone, verbosity, identity) |
| `skill-config.ts` ⬅ **NEW v0.3.0** | Enable skills? Install framework skills? |

### CLI Commands

| Command | File | Description |
|---------|------|-------------|
| `nexus init [name]` | `src/commands/init.ts` | Scaffold a new project from scratch with interactive prompts |
| `nexus adopt [path]` | `src/commands/adopt.ts` | Add `.nexus/` docs + AI config to an existing project |
| `nexus upgrade [path]` | `src/commands/upgrade.ts` | Regenerate `.nexus/` with latest templates (smart file strategy) |
| `nexus repair [path]` | `src/commands/repair.ts` | Fix missing/corrupted .nexus/ files without replacing valid ones |
| `nexus skill new [name]` | `src/commands/skill.ts` | Scaffold a new custom skill interactively |
| `nexus skill list` | `src/commands/skill.ts` | List all installed skills (core / custom / community) with status |
| `nexus skill install <pkg>` | `src/commands/skill.ts` | Install a community skill pack from the registry |
| `nexus skill remove <name>` | `src/commands/skill.ts` | Remove a community skill (refuses core/custom) |
| `nexus skill status` | `src/commands/skill.ts` | Health-check all skills — flags deprecated or invalid frontmatter |
| `nexus pack [path]` | `src/commands/pack.ts` | Zip `.nexus/` into a portable `nexus-backup-<timestamp>.zip` |
| `nexus unpack [path]` | `src/commands/pack.ts` | Extract a backup zip and verify the restored `.nexus/` structure |
| `nexus update` | `src/commands/update.ts` | Check npm registry and auto-install the latest NEXUS CLI version |

| System | Description |
|--------|-------------|
| **Smart File Strategy** | Upgrade/repair reads YAML frontmatter (`status: template` vs `populated`) to decide replace vs preserve |
| **Corruption Detection** | `isCorrupted()` detects empty files, missing frontmatter, invalid JSON |
| **Progressive Knowledge** | `knowledge.md` — append-only log AI agents scan before tasks and write to after |
| **Token-Efficient Templates** | Doc templates slimmed ~40%, tool files ~60 lines (not 150) |
| **Pattern-Aware Docs** | Business logic doc includes conditional sections based on selected app patterns |
| **Agent Persona** | Configurable AI agent personality (tone, verbosity, identity, custom directive) — embedded in all instruction files |
| **Skills System** ⬅ **NEW v0.3.0** | `.nexus/skills/` — pre-read instruction files sourced from `@nexus-framework/skills`. Three dirs: `core/` (framework-matched, regenerated on upgrade), `custom/` (user-created, **sacred — never touched**), `community/` (registry-installed). Skills Protocol in all AI files. Precedence: custom > core > community. |
| **Pack / Unpack** ⬅ **NEW v0.3.0** | `nexus pack` zips `.nexus/` to a portable `nexus-backup-<timestamp>.zip`. `nexus unpack` restores and verifies. |
| **Auto Update Notifications** ⬅ **NEW v0.3.0** | Every command silently checks the npm registry; prints an update banner if a newer version is available. `nexus update` installs it. |

### Skills System — `.nexus/skills/` Directory Layout

```
.nexus/skills/
  README.md            ← agent-readable index of all installed skills (auto-generated)
  core/                ← generated at init, regenerated on upgrade — framework-matched
  custom/              ← user-created via `nexus skill new`, NEVER touched by NEXUS
    README.md          ← placeholder with instructions on creating custom skills
  community/           ← installed via `nexus skill install <pkg>`, reinstallable
```

### Tests

| File | Count | Covers |
|------|-------|--------|
| `tests/unit/validator.test.ts` | 29 | Name validation, sanitization, empty input |
| `tests/unit/generators.test.ts` | 95 | Structure, packages, landing pages, AI config, docs, knowledge, patterns, persona |
| `tests/unit/adopt.test.ts` | 28 | Project detection, frontmatter, AI onboarding |
| `tests/unit/upgrade.test.ts` | 38 | isPopulated, isCorrupted, upgrade strategy, repair mode |
| `tests/unit/skills.test.ts` ⬅ **NEW v0.3.0** | 36 | skills generator (all 6 frameworks), getCoreSkillSlugs, content/frontmatter validation, README index, custom/README, upgrade count tests |
| `tests/unit/file-system.test.ts` ⬅ **NEW v0.3.1** | 17 | fileExists (file vs dir regression), dirExists, ensureDirectory, writeFile, readFile |
| `tests/unit/skill-commands.test.ts` ⬅ **NEW v0.3.1** | 26 | All 6 skill subcommands with real temp dirs + cwd mock, dirExists regression |
| `tests/unit/update-check.test.ts` ⬅ **NEW v0.3.1** | 16 | checkForUpdate mock fetch, semver table, offline/timeout/404 fallback |
| `tests/unit/pack.test.ts` ⬅ **NEW v0.3.1** | 11 | packCommand guard, zip naming, non-zero size, round-trip pack→unpack, findLatestBackup |
| **Total** | **364** | **All passing ✅** |

---

## 🗺️ Document Map

| Document | Purpose |
|----------|---------|
| `.nexus/docs/index.md` | **THIS FILE** — project brain, status, module map |
| `.nexus/docs/01_vision.md` | Product vision, user stories, success metrics |
| `.nexus/docs/07_implementation.md` | Technical architecture, build phases, file-by-file plan |
| `.nexus/docs/knowledge.md` | Progressive knowledge base — decisions, gotchas, patterns |
| `.nexus/ai/instructions.md` | Master AI agent instructions |
| `.github/copilot-instructions.md` | GitHub Copilot-specific pointer (embeds key rules) |
| `AGENTS.md` | Claude/Codex pointer to `.nexus/ai/instructions.md` |
| `CONTRIBUTING.md` | Contributor standards, PR process |
| `README.md` | Public-facing project overview |
| `SKILL_SYSTEM.md` ⬅ **NEW** | Full Skills System feature spec — read before implementing Phase 8 |
| `SKILLS_CHAT.md` ⬅ **NEW** | Architecture chat — delivery map, phased plan, key insights |

---

## 🔄 Release History

| Version | Date | Highlights |
|---------|------|------------|
| 0.1.0 | Feb 7, 2026 | Initial release: init, adopt, 5 frameworks, AI config, 73 tests |
| 0.1.1 | Feb 8, 2026 | Bug fixes, test improvements |
| 0.1.2 | Feb 8, 2026 | Sample project generation, README updates |
| 0.1.3 | Feb 8, 2026 | Knowledge system, upgrade/repair commands, token optimization, 179 tests |
| 0.1.4 | Feb 9, 2026 | Full AI instructions in all tool files, CD pipeline with auto-publish |
| 0.2.0 | Feb 9, 2026 | Agent Persona system, Knowledge Base Protocol in shipped instructions, README rewrite — NEXUS is now an AI-native development framework |
| 0.2.1 | Feb 2026 | Bug fixes: backend-only scaffolding, local-only mode, skip empty files |
| **0.3.0** | **Mar 6, 2026** | **Skills System — `nexus skill` (6 subcommands inc. registry), skills generator sourced from `@nexus-framework/skills` live npm package, `nexus pack`/`unpack`, `nexus update` + startup notifications, 225 unit tests** |
| **0.3.1** | **Mar 7, 2026** | **Production bug fix: `dirExists` for skill directory checks. Comprehensive test coverage for all v0.3.x modules (295 tests). Homepage set to [nexus.glenhalton.com](https://nexus.glenhalton.com)** |
| **0.3.2** | **Mar 7, 2026** | **Live skill registry — `nexus skill registry` now fetches the `@nexus-framework/skills` tarball directly from npm at runtime. New skills visible immediately without republishing nexus-cli. 306 unit tests.** |
| **0.4.0** | **May 3, 2026** | **Auto-invoke layer — Brain detection & self-update. Alive Brain complete with sync, plan, doctor, brief, and brain commands. 364 unit tests.** |
| **1.0.0** | **Jun 10, 2026** | **`nexus mcp` — the brain as an MCP server (13 schema-validated tools), brain-aware CI, generated `.mcp.json` + MCP sections in all AI instruction files, `wake` + `consolidate`. 419 unit tests.** |
| **1.1.0** | **Jun 11, 2026** | **Contextualized Agents — `.nexus/agents/` core four, `nexus agent` (6 subcommands), `.claude/agents/` generation, 3 new MCP tools (16 total) inc. `nexus_get_context`, doctor D11 verification gate. Ships with the upgrade data-loss fix. 438 unit tests.** |
| 1.1.1 | Jun 17, 2026 | Orchestration bug fixes: non-interactive-safe CLI, subagents given real execution tools, runnable agent handoff chain (`nexus_get_handoff` — 17 tools) |
| 1.1.2 | Jun 17, 2026 | Follow-up orchestration fixes |
| **1.1.3** | **Aug 4, 2026** | **Manifest normalization — `upgrade`/`repair` normalize partial manifests before generation, so older/backend-only manifests no longer render literal `undefined` into generated docs and AI config. Docs + homepage accuracy pass (17 tools, 11 doctor checks, 456 tests). 456 unit tests.** |
| **1.2.0** | **Aug 10, 2026** | **Chameleon UI delegation (opt-in) — `nexus use chameleon` resolves what you want into an AppSpec, hands it to Chameleon, and overlays the brain, tooling, and tests around what it produces. Capability-gated, never a hard dependency. Fixed: `upgrade` was silently deleting Chameleon's agent block; new D12 check catches it.** |
| **1.3.0** | **Aug 21, 2026** | **Skills II — skills gain a second kind, procedure the agent runs, not just reference it reads. New alignment gate (D13) makes a recorded `## Grilling` interview a precondition for feature work. D14 measures the instruction bytes every agent carries per turn. Fixed a shipped data-loss bug in the upgrade path.** |
| **1.4.0** | **Aug 22, 2026** | **A public MCP surface — the 17 brain tools behind `nexus mcp` are now importable directly from `@nexus-framework/cli`'s new `./mcp` subpath as native TypeScript, no server process required. Additive only, no behavior changed.** |
| **1.5.0** | **Aug 24, 2026** | **Reliability and local-model support — three new doctor checks (D14 context load, D15 manifest invariants, D16 artifact drift), harness profiles so instruction files are sized to what a local AI model can actually handle, and the new `nexus harness verify` command. `contract_version` finally documented. 807 unit tests.** |

---

## ✅ Progress Log

- 2026-08-26 — ✅ Implemented `nexus skill install <pkg>` for real — it was a stub that rejected every package with "not yet supported" (found because a user hit it trying to install a community skill named "grilling"). Generalized the tar-walking fetcher already used by `nexus skill registry` (`fetchLiveSkillRegistry`) into `fetchNpmTarball(pkgName)`, which now also decodes `.md` file *content* (previously path-only) and distinguishes a 404 ("package not found") from a network failure. `skillInstallCommand` fetches the named package straight from the npm registry (no local install, no project dependency), validates every `.md` file's SKILL_SPEC frontmatter via the existing `validateSkillFrontmatter`, and writes the valid ones into `.nexus/skills/community/`; invalid files are skipped with a reason, already-installed slugs are skipped unless `--force`. `@nexus-framework/skills` (the official multi-framework registry) is special-cased to require `--skill <slug>` (+ optional `--framework` to disambiguate a slug that exists in more than one framework) since a bare install would otherwise dump 40+ core-owned skills into `community/`; any other package name installs every valid skill file it contains. Audited the rest of the CLI for similar "looks done but isn't" stubs (grepped for "not yet supported" / "coming soon" / "TODO" / "stub" across `src/`) — this was the only one. 816/816 tests, tsc + lint clean.

- 2026-08-24 — ✅ **Released v1.5.0** (the 13 commits from today's brain sync, packaged and versioned). Bumped `package.json` + `src/version.ts`, added the CHANGELOG entry, backfilled the Release History table gap flagged twice today (v1.2.0, v1.3.0, v1.4.0 never had rows here — added all three plus v1.5.0). Fixed the stale `target_version: "1.1.2"` in `.nexus/plans/_active.json` (`nexus plan done` set it in June and nothing updated it since). Fixed a real gap in `RELEASE_HEADLINES` (`src/utils/update-check.ts`): it had no entries between 0.4.0 and 0.4.0's neighbors, meaning anyone updating through 1.0.0–1.4.0 saw a stale "what's new" banner; backfilled all of them. README badge/doctor-count text brought in line with measured reality (807 tests, sixteen doctor checks) via `npm run release:check`, plus new blurb lines for what v1.4 and v1.5 actually shipped. Also fixed the CHANGELOG's header dashes to match the Keep a Changelog format it claims to follow, and removed the em dashes from `RELEASE_HEADLINES` (new project-wide rule: no em dashes in anything user-facing).

- 2026-08-24 — ✅ Brain sync for 13 commits landed on `main` today (`053988e..2908abe`):
  **Context economics** — `nexus_get_context` reworked to a token budget with
  `admit()`-gated sections, `ContextFloorOverflow` on the floor, `evicted[]` /
  `budget{}` / `contract_version` in the response, volatile `durationMs`
  stripped and vitals moved last for cache-friendly ordering; generated
  instruction files no longer tell agents to read `index.md` +
  `knowledge.md` in full, `nexus_get_context(task)` is now the unambiguous
  first step. **Harness profiles** — new optional `.nexus/harnesses.yml`
  (window, `orientation_budget`, `tool_calling` per harness); `nexus upgrade`
  now generates a structurally different instruction file per profile
  (native-pointer / static-fallback / unchanged standard) instead of a
  truncated one; new `nexus context "<task>" --json` composes the same pack
  outside MCP. **7 bugs fixed**: `nexus doctor` could never exit 0 on a real
  project (`last-sync.json` was never written — D08/D02 unreachable);
  `--severity error` zeroed the exit code by filtering before the summary;
  `doctor --fix` still exited 1 after a clean fix; D07/D11 double-reported
  one Evidence fault; D04 only measured entry/line count, missing byte-size
  blowup; D14 charged the brain-file fallback path even when MCP made it
  unreachable; context assembly no longer shells out to run the test suite
  on every call. **2 new doctor checks**: D15 (manifest declarations vs.
  observable repo facts) and D16 (artifact drift — dashboards/pointers vs.
  the files they roll up). Doctor is now 16 checks, D01–D16. 762/762 tests
  passing across 57 files, `tsc --noEmit` clean. Updated this file's
  Coverage line, Current Objective, and the `nexus mcp`/`nexus context` CLI
  rows; appended knowledge.md entries for the non-obvious parts (below).
  **Left alone, out of scope for this sync**: the `.nexus/plans/index.md`
  dashboard drift and the manifest `packageManager: yarn` vs. `package-lock.json`
  mismatch that a live `nexus doctor` run shows D16/D15 now catching —
  neither was introduced by today's commits, and fixing the underlying data
  wasn't part of this task. The Release History table's v1.2.0/v1.3.0/v1.4.0
  gap (flagged by an earlier session today, see the knowledge entry below)
  is likewise untouched — no version shipped in today's 13 commits, so
  there was nothing new to log there.

- 2026-08-24 — ✅ Populated the six template spec docs (`02_architecture`, `03_data_contracts`, `04_api_contracts`, `05_business_logic`, `06_test_strategy`, `08_deployment`) from live codebase inspection — all now `status: populated`, `confidence: high`. Measured current reality directly rather than trusting stale index numbers: 663/663 tests across 51 files (index previously said 334, release history said 456), 17 MCP tools (unchanged), 14 doctor checks D01–D14 (index/release-notes text still says "11"). Ran `nexus sync` to refresh the Vital Signs block. Found and logged to `knowledge.md`: (1) generated `CLAUDE.md` claims `yarn` as package manager but the repo actually uses `npm` throughout scripts/CI, (2) D01's placeholder-detection regex false-positives on any `[...]` in prose (markdown links, TS array types), (3) this index's Release History table is 3 versions behind — v1.2.0, v1.3.0, v1.4.0 shipped (per git tags) but were never logged here.

- 2026-08-04 — ✅ **Released v1.1.3** (patch — manifest normalization fix, the only code change since v1.1.2). Bumped `package.json` + `src/version.ts`, added the CHANGELOG entry. **CLI README accuracy pass:** 16→17 MCP tools (badge, `nexus mcp` row, tool list now includes `get_context`/`list_agents`/`get_agent`/`get_handoff`), 438→456 tests, ten→eleven doctor checks (+D11 in the example), added `.nexus/agents/` + `.mcp.json` + `.claude/agents/` to the generated tree, new **`nexus agent`** section with the core four and the verification gate. **Homepage:** version strings → 1.1.3 (index/agents/mcp JSON-LD, hero tag, docs breadcrumb v1.1.0→v1.1.3), docs.html meta 16→17 tools, v1.1.3 note in the Upgrading section, llms.txt + llms-full.txt version/release-history, sitemap lastmod → 2026-08-04, refreshed the stale `NEXUS_CLI_README.md` mirror (v0.x → current). 456/456 tests, tsc + lint clean.

- 2026-07-05 — ✅ Review + housekeeping session: fixed **"framework displays as undefined"** bug (manifest normalization + tests, 456/456), synced homepage/llms drift (17 tools / 450→456 tests / v1.1.2 / added `nexus_get_handoff` to docs+llms), drafted **v1.2 "Provable Done"** design + plan (draft, awaiting approval), populated root monorepo brain index. Found: D11 keyword-regex bypass, advisory-only D09/D11 severities, `nexus_get_context` budget only constrains docs section.

- 2026-06-11 — ✅ Completed plan `implement-v1-1-contextualized-agents`: **v1.1.0 — Contextualized Agents.** `.nexus/agents/` primitive (core four: implementer / test-writer / reviewer / doc-keeper; custom sacred), `nexus agent` CLI (6 subcommands), `.claude/agents/` + fenced Agent Roles generation, 3 new MCP tools (16 total) incl. `nexus_get_context` composition, doctor **D11 unverified-done** gate + plan-done evidence warning, registry v0.3.0 (agents/ area + nexus-agent-authoring). Ships WITH the upgrade data-loss fix. 438/438 tests. **Human step: push → publish v1.1.0 + tag skills v0.3.0.**
- 2026-06-10 — ✅ Completed plan `release-v1-mcp-headline`: v1.0.0 reboot — **`nexus mcp` server (13 read/write brain tools, @modelcontextprotocol/sdk + zod)**, brain-aware CI (PR brief comment job in generated workflows), `.mcp.json` + MCP sections in all generated AI instruction files, registry-based publish gate in own ci.yml (fixes 2026-06-09 failed-publish retry), publish runbook (`docs/publish-runbook.md`), nexus-skills v0.2.0 prepped (3 new shared skills). 419/419 tests. **Remaining human step: renew NPM_TOKEN + re-run publish.**
- 2026-06-09 — ✅ Completed plan `implement-v1-m4-consolidate-wake-polish`: Implement v1.0 M4 — Consolidate, Wake, Polish → v1.0.0
- 2026-06-09 — ❌ v1.0.0 npm publish FAILED in CI: expired NPM_TOKEN. Never reached the registry → window used to fold the MCP server into v1.0.0.
- 2026-05-03 — ✅ Completed plan `implement-auto-invoke-layer`: auto-invoke middleware in `cli.ts` (silent + interactive + disabled modes), command-aware pre-sync triggers (`plan new/start/done`, `skill install`), status badge output, persisted config at `.nexus/auto-invoke.config.json`. 23 tests passing.
- 2026-05-02 — ✅ Completed plan `implement-v1-m3-doctor-brief`: shipped `nexus doctor` (checks D01–D10) and `nexus brief` (`--md`, `--since`, `--write`), doctor config support (`.nexus/doctor.config.json`), severity-based exit codes, D08 auto-fix via `nexus sync`. 18 tests + 2 snapshots passing.
- 2026-05-02 — ✅ Completed plan `implement-v1-m2-plans-mvp`: shipped the persisted-plans subsystem — `.nexus/plans/<id>.md` files, lifecycle state machine, plan templates, `nexus plan` MVP subcommands. Full suite 341 tests passing.
- 2026-05-02 — ✅ Completed plan `implement-v1-m1-sensors-sync`: shipped `nexus sync` — git/files/tests/packages sensors aggregated into a typed `VitalSigns` object, rendered into the fenced Vital Signs block in `index.md`. Full suite 334 tests passing.

## ✅ Progress Log

- 2026-06-17 — ✅ Completed plan `fix-auto-invoke-noninteractive-crash`: Fix: auto-invoke Brain Check crashes / hijacks non-interactive sessions

## ✅ Progress Log

- 2026-06-17 — ✅ Completed plan `fix-subagent-exec-tools`: Fix: generated subagents have no execution tools (can't edit files)

## ✅ Progress Log

- 2026-06-17 — ✅ Completed plan `fix-agent-handoff-orchestration`: Fix: agent handoff chain is prose, not a runnable orchestration
- 2026-05-02 — ✅ Completed plan `bootstrap-v1-brain-by-hand`: hand-crafted `.nexus/plans/`, `.nexus/state/`, the Vital Signs block, and the knowledge summary shape for this repo before the v1.0 generator existed — the reference artifact M1–M4 built toward. No test suite applies (see the plan's Evidence section for the waiver).

## ⏭️ What's Next

### 🟣 NEXT INITIATIVE: v1.2 — Provable Done (awaiting approval)

- **Design:** root `.nexus/docs/v1_2_provable_done.md` (2026-07-05)
- **Plan:** [`implement-v1-2-provable-done`](../plans/implement-v1-2-provable-done.md) — status `draft`, run `nexus plan start` after Halton approves
- **Scope:** `.nexus/verify.json` manifest + `nexus plan verify` machine evidence + **D11 v2** (parseable evidence or waiver — keyword regex dropped) + `doctor --strict` / `--verify` + configurable `wake.hashInputs` (protocol-extraction groundwork)
- **Open questions:** 3 for Halton in design doc §5 (strict plan-done, evidence location, CI re-run default)
- **Follow-on (v1.3):** standalone wake+verify spec repo + zero-dep reference implementation

### ✅ SHIPPED: v1.1 — Contextualized Agents (v1.1.3 on npm)

### 🐛 Bugs found dogfooding v1.0 (2026-06-11 incident)

- [x] **`nexus upgrade` destroyed populated brain docs** — FIXED 2026-06-11 (pre-publish). Root cause was twofold: `isCorrupted()` classified frontmatter-less docs as corrupted (auto-replaced in BOTH modes), and the smart check replaced anything not explicitly `status: populated`. Now: missing frontmatter ≠ corruption; replace gate is explicit `status: template` only (preserve-by-default via new `isTemplate()`); every overwrite is backed up to `.nexus/state/upgrade-backup/<stamp>/` first. 4 regression tests.
- [x] **Framework displays as "undefined"** — FIXED 2026-07-05. Root cause: `upgrade`/`repair` blind-cast `manifest.config`; partial manifests reached generators with `frontendFramework: undefined`. Now normalized at the boundary (`utils/manifest.ts` `normalizeManifestConfig`, explicit defaults, persona merge) + display guard in both `getFrameworkDisplay` copies. 6 regression tests (456 total).

### 🎯 SHIPPED (history): v0.4.0 plan (M1+M2+M3 + Auto-Invoke)

**Full spec:** See root `.nexus/docs/v1_alive_brain.md` — implementation-ready design document.

#### M1 ✅ **DONE** (staged, ready to commit)
**Sensors & `nexus sync`**
- `src/utils/brain.ts` — locate `.nexus/`, compute brain hash ✅
- `src/utils/sensors/{git,files,tests,packages}.ts` — repo reality sensors ✅
- `src/commands/sync.ts` — Vital Signs block writer ✅
- Generators updated to scaffold fences ✅
- 28 tests passing ✅

#### M2 📋 **READY** (scoped, ready to start)
**Plans MVP — the headline feature**
- `.nexus/plans/` scaffold + lifecycle state machine
- `nexus plan {new,list,show,start,tick,note,done}` (7 MVP subcommands)
- Plan templates (feature, bug, refactor, spike, chore)
- Plans index auto-builder
- On `plan done`: auto-append to progress log + knowledge prompt
- Spec: §5.6 of `v1_alive_brain.md`
- **Est: 7 days**

#### M3 📋 **READY** (scoped, ready to start)
**Doctor & Brief — project reflexes & voice**
- `nexus doctor` — 10 drift checks (D01–D10), modular, configurable
- `nexus brief` — human-readable status digest (pretty + `--md`)
- Both consume sensor output from M1 + plan state from M2
- Spec: §5.2 + §5.3 of `v1_alive_brain.md`
- **Est: 5 days**

#### Auto-Invoke Layer 🆕 **APPROVED** (UX glue)
**Brain self-awareness: detect its own needs, surface at right moment**
- Brain detector: recognizes when sync/doctor/consolidate should run
- Interactive + silent modes, respects config
- `nexus brain status` — health dashboard
- Prevents user confusion ("when do I run this?")
- Spec: new plan [`implement-auto-invoke-layer.md`](../plans/implement-auto-invoke-layer.md)
- **Est: 3 days, can overlap with M2/M3**

**Combined Target:** v0.4.0 stable shipped this week (M1 commit + M2/M3/auto-invoke parallel dev)

---

### 🔮 LATER: v0.5.0+ and v1.0.0 (M4 + polish)

**M4 (deferred to next iteration) — Consolidate, Wake, Polish**
- `nexus consolidate` + auto-generated `knowledge-summary.md`
- `nexus wake` — session handshake tokens (or replaced by auto-invoke tokens)
- Update all generators for v1.0 scaffolding
- Migration guide + CHANGELOG
- Spec: §5.4 + §5.5 + §13 of `v1_alive_brain.md`
- **Est: 5 days post-v0.4.0**

**v1.0.0 release:** Celebrate when M4 ships. Six top-level commands, all integrated, AI-native development framework complete.

---

### Immediate (v0.3.x — parallel to v1.0 work)
- [ ] E2E tests — generate a project, run its build, verify all files
- [ ] `nexus skill status` — live check of core/community skills against `@nexus-framework/skills` package versions
- [ ] Framework-specific template content (not just landing pages)

### Near-term (v0.4.x carry-over, post-v1.0)
- [ ] `nexus skill generate` — scan codebase, auto-draft custom skills from patterns
- [ ] `nexus add <feature>` command for incremental additions
- [ ] Plugin system for custom generators
- [ ] Persona presets — share your persona config as a shareable JSON
- [ ] Web-based project configurator

### Backlog
- [ ] `nexus eject` — remove NEXUS, keep code
- [ ] `nexus validate` — check project against NEXUS standards
- [ ] `nexus migrate` — migrate from CRA, etc.
- [ ] Template marketplace / community templates
- [ ] Pro tier features (paid AI-powered code generation)