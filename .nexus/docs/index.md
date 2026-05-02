# NEXUS CLI — Project Index

**Project:** NEXUS CLI (`@nexus-framework/cli`)  
**Published Version:** v0.3.2 (Mar 7, 2026)  
**Working Branch:** `fix-backend-scaffolding` · target: `v0.4.0-alpha.1`  
**Active Initiative:** 🚀 **v1.0 "Alive Brain"** — see [`../../../.nexus/docs/v1_alive_brain.md`](../../../.nexus/docs/v1_alive_brain.md)  
**Brain Layout:** v1.0 (hand-bootstrapped 2026-05-02 — `.nexus/plans/`, `.nexus/state/`, Vital Signs block)  
**Coverage:** Unit: 306/306 passing | Integration: Pending | E2E: Pending

---

<!-- NEXUS:VITAL_SIGNS:START — managed by `nexus sync` (currently hand-maintained, see plan implement-v1-m1-sensors-sync) -->
## 🩺 Vital Signs (auto)

_Last sync: 2026-05-02 15:30 UTC · branch `fix-backend-scaffolding` · 8 commits ahead of `main` · working tree dirty (3 files)_

| Sensor | Reading |
|--------|---------|
| Last commit | `092d7e7` — feat: release v0.3.2 — live skill registry... · Glenhalton · **8 weeks ago** |
| Tests | 306 passed · 0 failed · 0 skipped (claimed by index — not verified, M1 will run live) |
| Coverage | not collected · M1 sensor adds `vitest --coverage` parsing |
| Stale folders | ⚠ `src/commands` 56 days · `src/utils` 56 days · `src/generators` 56 days · `tests/e2e` never created |
| Packages | not yet measured · M1 `packages.ts` adds `npm outdated` summary |
| Plans | 1 active · 3 approved · 1 done · 0 blocked · 0 stale |
| Manifest | ⚠ `manifest.json` reports v0.1.3 vs published v0.3.2 — proposed doctor check `D-stale-manifest` |
| Missing docs | ⚠ 02_architecture, 03_data_contracts, 04_api_contracts, 05_business_logic, 06_test_strategy, 08_deployment (6 of 8) |

> **Active plan:** [`implement-v1-m1-sensors-sync`](../plans/implement-v1-m1-sensors-sync.md) (step 1/13) — wake token: `NX-WAKE-BOOT-2026-05-02`
<!-- NEXUS:VITAL_SIGNS:END -->

---

## 🎯 Current Objective

**Active phase:** 🚀 **v1.0 — Alive Brain · M1 Sensors & Sync**  
**Active plan:** [`implement-v1-m1-sensors-sync`](../plans/implement-v1-m1-sensors-sync.md) (in_progress · step 1/13)  
**Carry-over:** Phase 7 (E2E tests) still pending; can ship before or after M1 lands.  
**Design source:** [`../../../.nexus/docs/v1_alive_brain.md`](../../../.nexus/docs/v1_alive_brain.md) — implementation-ready PRD for the six v1.0 commands and the Plans subsystem.

### What v1.0 adds

Six new top-level CLI commands, four shippable milestones (M1 → M4), target release v1.0.0 within ~6 weeks of M1 start. The brain stops being a journal and becomes a runtime: `nexus sync` (sensors → Vital Signs block above), `nexus doctor` (drift detection), `nexus brief` (human-readable digest), `nexus consolidate` (`knowledge.md` hygiene), `nexus wake` (session handshake token), and the headline feature — `nexus plan ...` (persisted per-task plans living in `.nexus/plans/`, see [plans dashboard](../plans/index.md)).

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

### Source Modules (src/)

| Module | Files | Description |
|--------|-------|-------------|
| **Entry Points** | `cli.ts`, `index.ts`, `version.ts` | Commander.js CLI, public API, version 0.3.2 |
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
| **Total** | **306** | **All passing ✅** |

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

---

## ⏭️ What's Next

### 🔴 CRITICAL PATH: v1.0 Alive Brain (M1–M4)

**Full spec:** See root `.nexus/docs/v1_alive_brain.md` — implementation-ready design document.  
**Start here:** Open plan `nexus plan new "Implement v1.0 M1 — Sensors & Sync"`

**M1 (v0.4.0-alpha.1) — Sensors & `nexus sync`** — **5 days** ← **START HERE**
- Build `src/utils/brain.ts` — locate `.nexus/`, compute brain hash (foundation for all v1.0 features)
- Build `src/utils/sensors/{git,files,tests,packages}.ts` — pure functions reading repo reality
- Build `src/commands/sync.ts` — write Vital Signs block into `index.md`
- Update generators: scaffold Vital Signs fences in new projects
- Tests: unit per sensor, snapshot test for block, integration test against `nexus-sample/`
- Spec: §5.1 + §10 of `v1_alive_brain.md`
- **Blocker for M2–M4.** All later capabilities read sensor output.

**M2 (v0.4.0-alpha.2) — Plans MVP** — **7 days**
- `.nexus/plans/` scaffold + `_active.json` index
- `nexus plan {new,list,show,approve,start,tick,note,done,block,unblock,link,abandon}` (12 commands)
- Plan file format + templates (feature, bug, refactor, spike, chore)
- Plans index dashboard auto-builder
- Spec: §5.6 of `v1_alive_brain.md`

**M3 (v0.4.0-beta.1) — Doctor & Brief** — **5 days**
- 10 doctor checks (D01–D10) + modular check architecture
- `nexus brief` — human-readable digest (pretty + `--md` modes)
- CI/CD snippets in generators
- Spec: §5.2 + §5.3 of `v1_alive_brain.md`

**M4 (v1.0.0) — Consolidate, Wake, Polish** — **5 days**
- `nexus consolidate` + auto-generated `knowledge-summary.md`
- `nexus wake` — session handshake tokens
- Update all generators for v1.0 scaffolding
- Update AI instruction generators (CLAUDE.md/AGENTS.md reference `nexus wake`)
- Migration guide + CHANGELOG
- Spec: §5.4 + §5.5 + §13 of `v1_alive_brain.md`

**Target Release:** v1.0.0 within 6 weeks of M1 start. Backwards-compatible with v0.3.x via `nexus upgrade`.

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