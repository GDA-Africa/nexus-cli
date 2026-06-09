# NEXUS CLI — Project Index

**Project:** NEXUS CLI (`@nexus-framework/cli`)  
**Published Version:** v0.4.0 (May 3, 2026)  
**Working Branch:** `main` · target: **v0.4.0** (M1+M2+M3 shipped together TODAY) · M4 deferred  
**Active Initiative:** 🚀 **v1.0 "Alive Brain"** + **Auto-Invoke Layer** — see [`../../../.nexus/docs/v1_alive_brain.md`](../../../.nexus/docs/v1_alive_brain.md)  
**Brain Layout:** v1.0 (hand-bootstrapped 2026-05-02 — `.nexus/plans/`, `.nexus/state/`, Vital Signs block)  
**Coverage:** Unit: 334/334 passing | Integration: sync test live | E2E: Next phase

---

<!-- NEXUS:VITAL_SIGNS:START — managed by `nexus sync` -->
## 🩺 Vital Signs (auto)

_Last sync: 2026-06-09T21:43:21.189Z · branch `main` · 0 commits ahead of main · working tree dirty_

| Sensor | Reading |
|--------|---------|
| Last commit | adc2934 — chore: bump version to 0.4.1 in package.json · Glenhalton · 5 weeks ago |
| Tests | not yet measured |
| Coverage | not collected · M1 sensor adds `vitest --coverage` parsing |
| Stale folders | src/commands 0 days · src/utils 0 days · src/generators 0 days · tests/e2e 0 days · tests/unit 0 days · tests/integration 37 days |
| Packages | not yet measured |
<!-- NEXUS:VITAL_SIGNS:END -->

---

## 🎯 Current Objective

**🔴 STRATEGY SHIFT (2026-05-02):** Fast-track milestone delivery. Ship M1 + M2 + M3 together as **v0.4.0 stable** today (not alpha). Add **Auto-Invoke Layer** to close UX gap. Defer M4 to later iteration.

**Why:** 
- M1 (sensors) is complete and tested
- M2 (plans) and M3 (doctor/brief) are scoped and ready
- Users won't know when to run commands — auto-invoke solves this
- Better to ship three cohesive features (sync → plan → audit) than one in isolation
- M4 (consolidate/wake) can iterate post-release

**Active phase:** 🚀 **v0.4.0 — Multi-Milestone Release**  
**Active plans:** 
  - [`implement-v1-m1-sensors-sync`](../plans/implement-v1-m1-sensors-sync.md) — ✅ DONE (staged to commit)
  - [`implement-v1-m2-plans-mvp`](../plans/implement-v1-m2-plans-mvp.md) — 📋 Ready to start
  - [`implement-v1-m3-doctor-brief`](../plans/implement-v1-m3-doctor-brief.md) — 📋 Ready to start
  - [`implement-auto-invoke-layer`](../plans/implement-auto-invoke-layer.md) — 📋 NEW (brain self-awareness)

**Design source:** [`../../../.nexus/docs/v1_alive_brain.md`](../../../.nexus/docs/v1_alive_brain.md) — implementation-ready PRD for the six v1.0 commands and the Plans subsystem.

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

---

## ✅ Progress Log

- 2026-06-09 — ✅ Completed plan `implement-v1-m4-consolidate-wake-polish`: Implement v1.0 M4 — Consolidate, Wake, Polish → v1.0.0

## ⏭️ What's Next

### 🎯 TODAY: Ship v0.4.0 (M1+M2+M3 + Auto-Invoke)

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