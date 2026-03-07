# NEXUS CLI — Project Index

**Project:** NEXUS CLI (`@nexus-framework/cli`)  
**Status:** 🟢 LIVE ON NPM — v0.3.1 | dirExists bug fix + comprehensive test coverage  
**Last Updated:** March 7, 2026  
**Version:** 0.3.1  
**Coverage:** Unit: 295/295 passing | Integration: Pending | E2E: Pending

---

## 🎯 Current Objective

**Phase 1–8:** ✅ COMPLETE — v0.3.0 shipped  
**Phase 7: Polish & Distribution** — 🟡 IN PROGRESS (E2E tests remaining)  
**Next Focus:** E2E test suite, `nexus add <feature>` command, framework-specific template content

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
| **Entry Points** | `cli.ts`, `index.ts`, `version.ts` | Commander.js CLI, public API, version 0.3.1 |
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
| **Total** | **225** | **All passing ✅** |

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

---

## ⏭️ What's Next

### Immediate (v0.3.x)
- [ ] E2E tests — generate a project, run its build, verify all files
- [ ] `nexus skill status` — live check of core/community skills against `@nexus-framework/skills` package versions (when registry exists)
- [ ] Framework-specific template content (not just landing pages)
- [ ] `nexus add <feature>` command for incremental additions
- [ ] Strategy pattern generators (PWA service workers, i18n setup, theming engine)

### Near-term
- [ ] `nexus skill generate` (v0.4.0) — scan codebase, auto-draft custom skills from patterns
- [ ] `@nexus-framework/skills` npm package — central registry of community skill packs
- [ ] `@nexus-framework/skills-integrations` — Supabase, Stripe, Prisma skill packs
- [ ] Plugin system for custom generators
- [ ] Template marketplace / community templates
- [ ] Web-based project configurator
- [ ] Persona presets — share your persona config as a shareable JSON

### Backlog
- [ ] `nexus eject` — remove NEXUS, keep code
- [ ] `nexus validate` — check project against NEXUS standards
- [ ] `nexus migrate` — migrate from CRA, etc.
- [ ] GitLab CI, Bitbucket Pipelines templates
- [ ] Pro tier features (paid AI-powered code generation)