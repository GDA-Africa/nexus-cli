# NEXUS CLI — Project Index

**Project:** NEXUS CLI (`@nexus-framework/cli`)  
**Status:** 🟢 LIVE ON NPM — v0.1.3  
**Last Updated:** February 8, 2026  
**Version:** 0.1.3  
**Coverage:** Unit: 179/179 passing | Integration: Pending | E2E: Pending

---

## 🎯 Current Objective

**Phase 1–6:** ✅ COMPLETE  
**Phase 7: Polish & Distribution** — 🟡 IN PROGRESS (published, iterating)  
**Next Focus:** E2E testing, framework-specific template content, plugin system  
**Blocked:** None

---

## 📊 Project Status Matrix

| Phase | Status | Notes |
|-------|--------|-------|
| 📝 Documentation | ✅ Complete | Vision, implementation, README, contributing guide |
| 🏗️ Phase 1: Core Infrastructure | ✅ Complete | CLI entry point, Commander.js, bin executable |
| 🎨 Phase 2: Prompts & Templates | ✅ Complete | 6 interactive prompt modules |
| 📚 Phase 3: Documentation System | ✅ Complete | 8-file doc generator + manifest + knowledge system |
| 🧪 Phase 4: Testing & CI/CD | ✅ Complete | 179 unit tests, GitHub Actions CI on Node 20/22 |
| 🔮 Phase 5: Landing Pages | ✅ Complete | Branded pages for all 5 frameworks + favicon |
| 🛡️ Phase 6: Repo Governance | ✅ Complete | CODEOWNERS, PR template, issue templates, commitlint |
| ✨ Phase 7: Polish & Distribution | 🟡 70% | Published to npm, upgrade/repair built, E2E tests remaining |

---

## 📁 What Has Been Built

### CLI Commands

| Command | File | Description |
|---------|------|-------------|
| `nexus init [name]` | `src/commands/init.ts` | Scaffold a new project from scratch with interactive prompts |
| `nexus adopt [path]` | `src/commands/adopt.ts` | Add `.nexus/` docs + AI config to an existing project |
| `nexus upgrade [path]` | `src/commands/upgrade.ts` | Regenerate `.nexus/` with latest templates (smart file strategy) |
| `nexus repair [path]` | `src/commands/repair.ts` | Fix missing/corrupted `.nexus/` files without replacing valid ones |

### Source Modules (src/)

| Module | Files | Description |
|--------|-------|-------------|
| **Entry Points** | `cli.ts`, `index.ts`, `version.ts` | Commander.js CLI, public API, version 0.1.3 |
| **Commands** | `commands/init.ts`, `adopt.ts`, `upgrade.ts`, `repair.ts` | 4 CLI commands |
| **Prompts** | `prompts/index.ts` + 5 modules | Project type, data strategy, patterns, frameworks, features |
| **Generators** | `generators/index.ts` + 7 modules | Structure, docs, config, tests, CI/CD, landing page, AI config |
| **Types** | `types/config.ts` + 3 modules | NexusConfig, NexusManifest, GeneratedFile, TemplateContext |
| **Utils** | `utils/index.ts` + 6 modules | Logger, validator, package-manager, git, file-system, project-detector |

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

### Key Systems

| System | Description |
|--------|-------------|
| **Smart File Strategy** | Upgrade/repair reads YAML frontmatter (`status: template` vs `populated`) to decide replace vs preserve |
| **Corruption Detection** | `isCorrupted()` detects empty files, missing frontmatter, invalid JSON |
| **Progressive Knowledge** | `knowledge.md` — append-only log AI agents scan before tasks and write to after |
| **Token-Efficient Templates** | Doc templates slimmed ~40%, tool files ~60 lines (not 150) |
| **Pattern-Aware Docs** | Business logic doc includes conditional sections based on selected app patterns |

### Tests

| File | Count | Covers |
|------|-------|--------|
| `tests/unit/validator.test.ts` | 15 | Name validation, sanitization, empty input |
| `tests/unit/generators.test.ts` | 84 | Structure, packages, landing pages, AI config, docs, knowledge, patterns |
| `tests/unit/adopt.test.ts` | 42 | Project detection, frontmatter, AI onboarding |
| `tests/unit/upgrade.test.ts` | 38 | isPopulated, isCorrupted, upgrade strategy, repair mode |
| **Total** | **179** | **All passing ✅** |

---

## 🗺️ Document Map

| Document | Purpose |
|----------|---------|
| `.nexus/docs/index.md` | **THIS FILE** — project brain, status, module map |
| `.nexus/docs/01_vision.md` | Product vision, user stories, success metrics |
| `.nexus/docs/07_implementation.md` | Technical architecture, build phases, file-by-file plan |
| `.nexus/knowledge.md` | Progressive knowledge base — decisions, gotchas, patterns |
| `.nexus/ai/instructions.md` | Master AI agent instructions |
| `.github/copilot-instructions.md` | GitHub Copilot-specific pointer (embeds key rules) |
| `AGENTS.md` | Claude/Codex pointer to `.nexus/ai/instructions.md` |
| `CONTRIBUTING.md` | Contributor standards, PR process |
| `README.md` | Public-facing project overview |

---

## 🔄 Release History

| Version | Date | Highlights |
|---------|------|------------|
| 0.1.0 | Feb 7, 2026 | Initial release: init, adopt, 5 frameworks, AI config, 73 tests |
| 0.1.1 | Feb 8, 2026 | Bug fixes, test improvements |
| 0.1.2 | Feb 8, 2026 | Sample project generation, README updates |
| 0.1.3 | Feb 8, 2026 | Knowledge system, upgrade/repair commands, token optimization, 179 tests |

---

## ⏭️ What's Next

### Immediate (v0.2.0)
- [ ] E2E tests — generate a project, run its build, verify all files
- [ ] Framework-specific template content (not just landing pages)
- [ ] `nexus add <feature>` command for incremental additions
- [ ] Improve error messages and edge case handling

### Near-term
- [ ] Plugin system for custom generators
- [ ] Template marketplace / community templates
- [ ] Web-based project configurator
- [ ] Docker template support

### Backlog
- [ ] `nexus eject` — remove NEXUS, keep code
- [ ] `nexus validate` — check project against NEXUS standards
- [ ] `nexus migrate` — migrate from CRA, etc.
- [ ] GitLab CI, Bitbucket Pipelines templates
- [ ] Pro tier features (paid AI-powered code generation)
