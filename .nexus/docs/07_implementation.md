# NEXUS CLI - Implementation Plan

**Project:** NEXUS CLI (`@nexus-framework/cli`)  
**Tech Stack:** Node.js 20+ / TypeScript 5.7 (strict, ESM)  
**Target:** Cross-platform CLI (Mac, Windows, Linux)  
**Status:** 🟢 Published on npm — v0.1.3  
**Last Updated:** February 8, 2026  

---

## 🏗️ Technical Architecture

### Tech Stack

**Core:**
- **Runtime:** Node.js 20+ (LTS)
- **Language:** TypeScript 5.7 (strict mode, ESM with NodeNext)
- **Package Manager:** yarn (dev), npm (distribution)

**CLI Framework:**
- **Commander.js 12.x** — Command parsing and routing
- **@inquirer/prompts 7.x** — Interactive prompts (functional API, not legacy inquirer)

**Template Engine:**
- **Mustache 4.x** — Template rendering for generated files

**Testing:**
- **Vitest 3.x** — Unit tests (179 passing)
- **In-memory testing** — generators return `GeneratedFile[]`, no disk I/O in tests

**Linting & Formatting:**
- **ESLint 8.x** — Code linting
- **Prettier 3.x** — Code formatting

---

## 📁 Project Structure
```
@nexus-framework/cli/
├── src/
│   ├── commands/
│   │   ├── init.ts           # nexus init — scaffold new project
│   │   ├── adopt.ts          # nexus adopt — add NEXUS to existing project
│   │   ├── upgrade.ts        # nexus upgrade — regenerate with latest templates
│   │   └── repair.ts         # nexus repair — fix missing/corrupted files
│   ├── prompts/
│   │   ├── index.ts          # Main prompt orchestration
│   │   ├── project-type.ts   # Project type questions
│   │   ├── data-strategy.ts  # Data handling questions
│   │   ├── patterns.ts       # PWA, offline, etc.
│   │   ├── frameworks.ts     # Tech stack questions
│   │   └── features.ts       # Additional features
│   ├── generators/
│   │   ├── index.ts          # Orchestrator + reconcile system
│   │   ├── structure.ts      # Folder structure generator
│   │   ├── docs.ts           # Documentation + knowledge generator
│   │   ├── config.ts         # Config files generator
│   │   ├── tests.ts          # Test structure generator
│   │   ├── ci-cd.ts          # CI/CD templates generator
│   │   ├── landing-page.ts   # Framework-specific landing pages
│   │   └── ai-config.ts      # AI agent instruction generator
│   ├── utils/
│   │   ├── index.ts          # Barrel exports
│   │   ├── logger.ts         # Pretty logging
│   │   ├── validator.ts      # Input validation
│   │   ├── package-manager.ts # Detect & use npm/yarn/pnpm
│   │   ├── git.ts            # Git operations
│   │   ├── file-system.ts    # File operations (readFile, writeFile, fileExists)
│   │   └── project-detector.ts # Detect existing project frameworks
│   ├── types/
│   │   ├── index.ts          # Barrel exports
│   │   ├── config.ts         # NexusConfig, NexusManifest, union types
│   │   ├── prompts.ts        # Prompt answer types
│   │   └── templates.ts      # Template types (GeneratedFile, etc.)
│   ├── cli.ts                # CLI entry point (Commander.js, 4 commands)
│   ├── index.ts              # Public API exports
│   └── version.ts            # Version constant (single source of truth)
├── tests/
│   └── unit/
│       ├── validator.test.ts   # 15 tests
│       ├── generators.test.ts  # 84 tests
│       ├── adopt.test.ts       # 42 tests
│       └── upgrade.test.ts     # 38 tests (upgrade + repair)
├── bin/
│   └── nexus.js              # Executable entry point
├── .nexus/                   # NEXUS docs for this project
│   ├── docs/
│   │   ├── index.md          # Project brain
│   │   ├── 01_vision.md      # Vision & requirements
│   │   └── 07_implementation.md  # This file
│   ├── ai/
│   │   └── instructions.md   # Master AI instructions
│   └── knowledge.md          # Progressive knowledge base
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── AGENTS.md                 # Claude/Codex pointer
├── CONTRIBUTING.md
└── README.md
```

---

## 🔨 Build Phases

### Phase 1: Core Infrastructure (Week 1)
**Goal:** Get basic CLI working with one template

**Tasks:**
1. **Setup Project**
   - [ ] Initialize npm package
   - [ ] Configure TypeScript
   - [ ] Setup Vitest
   - [ ] Configure ESLint & Prettier
   - [ ] Setup git & GitHub repo

2. **CLI Foundation**
   - [ ] Setup Commander.js
   - [ ] Create `nexus init` command
   - [ ] Add version flag (`-v`, `--version`)
   - [ ] Add help flag (`-h`, `--help`)
   - [ ] Add update notifier

3. **Basic Prompt System**
   - [ ] Setup Inquirer.js
   - [ ] Create project name prompt
   - [ ] Add validation (valid folder name, doesn't exist)
   - [ ] Test user flow

4. **Template Engine**
   - [ ] Choose templating engine (Mustache/Handlebars)
   - [ ] Create template loader
   - [ ] Create file copier
   - [ ] Test with one simple template

5. **File Generation**
   - [ ] Create folder structure generator
   - [ ] Generate package.json from template
   - [ ] Copy static files
   - [ ] Run `npm install` or equivalent

**Deliverable:** CLI that can generate one basic Next.js project

---

### Phase 2: Prompt System & Templates (Week 2)
**Goal:** Full interactive experience with 3 complete templates

**Tasks:**
1. **Complete Prompt Flow**
   - [ ] Project type prompt (Web/Mobile/Desktop/API/Monorepo)
   - [ ] Data strategy prompt (Local Only/Local First/Cloud/Hybrid)
   - [ ] Application patterns prompt (PWA/Offline/Theme/i18n)
   - [ ] Framework prompt (based on project type)
   - [ ] Backend strategy prompt (if applicable)
   - [ ] Testing strategy prompt
   - [ ] Additional features prompt

2. **Smart Recommendations**
   - [ ] Add descriptions to each option
   - [ ] Show trade-offs
   - [ ] Highlight recommended choices
   - [ ] Provide "Learn more" links (optional)

3. **Template Library**
   - [ ] Next.js 15 (App Router + Server Actions)
   - [ ] React + Vite + Express (Monorepo)
   - [ ] SvelteKit

4. **Strategy Implementation**
   - [ ] PWA service worker generator
   - [ ] Theme system generator (CSS variables)
   - [ ] i18n setup (3 languages)
   - [ ] Offline-first database (SQLite + sync)

**Deliverable:** CLI with full prompt experience and 3 working templates

---

### Phase 3: NEXUS Documentation System (Week 3)
**Goal:** Generate all documentation templates

**Tasks:**
1. **Documentation Generator**
   - [ ] Create 8 markdown template files
   - [ ] Add mustache variables for project-specific info
   - [ ] Generate `.nexus/index.md`
   - [ ] Generate `.nexus/manifest.json`
   - [ ] Generate `.nexus/state.json`

2. **Template Content**
   - [ ] Write `01_vision.md` template with examples
   - [ ] Write `02_architecture.md` (pre-filled based on choices)
   - [ ] Write `03_data_contracts.md` template
   - [ ] Write `04_api_contracts.md` template
   - [ ] Write `05_business_logic.md` template
   - [ ] Write `06_test_strategy.md` (pre-filled based on choices)
   - [ ] Write `07_implementation.md` (pre-filled with structure)
   - [ ] Write `08_deployment.md` (pre-filled based on choices)

3. **Index Generation**
   - [ ] Create dynamic index based on project structure
   - [ ] Add document map
   - [ ] Add navigation shortcuts
   - [ ] Add current status tracker

**Deliverable:** Complete documentation system that guides users and AI

---

### Phase 4: Testing & CI/CD (Week 4)
**Goal:** Add test infrastructure and CI/CD templates

**Tasks:**
1. **Test Infrastructure**
   - [ ] Vitest configuration generator
   - [ ] Playwright configuration generator
   - [ ] Test folder structure
   - [ ] Example unit test
   - [ ] Example integration test
   - [ ] Example e2e test
   - [ ] Test utilities/helpers

2. **CI/CD Templates**
   - [ ] GitHub Actions workflow
   - [ ] GitLab CI template (future)
   - [ ] Environment variable validation
   - [ ] Deploy step templates (Vercel, Netlify, Railway)

3. **Git Integration**
   - [ ] Run `git init`
   - [ ] Generate `.gitignore`
   - [ ] Create initial commit
   - [ ] Add pre-commit hooks (Husky)
   - [ ] Add lint-staged

**Deliverable:** Full test setup and CI/CD ready to use

---

### Phase 5: Polish & Distribution (Week 5-6)
**Goal:** Make it production-ready and publish

**Tasks:**
1. **Error Handling**
   - [ ] Graceful error messages
   - [ ] Network failure handling
   - [ ] Disk space checks
   - [ ] Permission issues handling
   - [ ] Rollback on failure

2. **User Experience**
   - [ ] Progress indicators
   - [ ] Success messages with next steps
   - [ ] ASCII art branding
   - [ ] Colors and formatting
   - [ ] Estimated time indicators

3. **Documentation**
   - [ ] README with installation
   - [ ] Usage examples
   - [ ] Template documentation
   - [ ] Contribution guide
   - [ ] License

4. **Testing**
   - [ ] Unit test coverage > 80%
   - [ ] Integration tests for all templates
   - [ ] E2E test of full flow
   - [ ] Test on Mac, Windows (WSL), Linux

5. **Distribution**
   - [ ] Publish to npm
   - [ ] Setup GitHub releases
   - [ ] Create changelog
   - [ ] Setup semantic versioning

**Deliverable:** Published CLI ready for public use

---

## 🎯 Implementation Priorities

### Must Have (P0)
- Interactive prompts
- 3 complete templates (Next.js, React+Express, SvelteKit)
- Documentation generation
- Basic error handling
- npm publish

### Should Have (P1)
- 5+ templates total
- CI/CD templates
- Test infrastructure
- Update notifier
- Comprehensive error handling

### Nice to Have (P2)
- Custom template support
- Project validation command
- More framework options
- Docker templates
- Migration helpers

---

## 🔄 Development Workflow

### Daily Development
```bash
# Development
npm run dev              # Watch mode with auto-reload
npm run build           # Build TypeScript
npm run test            # Run tests
npm run lint            # Check linting
npm run type-check      # TypeScript validation

# Testing CLI locally
npm link                # Link for local testing
nexus init test-app     # Test the CLI

# Before commit
npm run pre-commit      # Lint, type-check, test
```

### Release Process

Every release follows this ritual in order — no steps skipped:

```bash
# 1. Bump src/version.ts  (single source of truth for the CLI banner)
#    export const version = 'X.Y.Z';

# 2. Bump package.json version field to match

# 3. Add headline to RELEASE_HEADLINES in src/utils/update-check.ts
#    '0.X.Y': '🔖 One-line summary of the most notable change',

# 4. Update README.md
#    - Vitest badge count  (Vitest-NNN_Passing)
#    - Quick Start prompt snippet version string
#    - Skills System bullet if nexus skill registry changed
#    - Roadmap ✅ Shipped list — add new items
#    - Contributing clone command test count comment

# 5. Update .nexus/docs/index.md
#    - Status line (version + headline)
#    - Last Updated date
#    - Version field
#    - Coverage test count
#    - Entry Points table row (version)
#    - Tests table Total row count
#    - Release History table — add new row

# 6. Final validation
npx tsc --noEmit   # zero type errors
yarn test           # all tests passing
yarn build          # clean dist/

# 7. Commit + tag
git add -A
git commit -m "feat: release vX.Y.Z — <headline>"
git tag vX.Y.Z
git push && git push --tags
```

---

## 🧪 Testing Strategy

### Unit Tests
- Test individual functions (validators, generators, utilities)
- Mock file system operations
- Coverage target: 80%+

### Integration Tests
- Test prompt flows end-to-end
- Test template generation
- Test package installation (with timeout)

### E2E Tests
- Generate real project
- Run `npm install`
- Run `npm run build`
- Run tests in generated project
- Verify all files exist

### Snapshot Tests
- Generated file structures
- Configuration files
- Documentation templates

---

## 🚀 Deployment Strategy

### npm Package
```json
{
  "name": "@nexus-framework/cli",
  "version": "1.0.0",
  "bin": {
    "nexus": "./bin/nexus.js"
  },
  "files": [
    "dist",
    "templates",
    "bin"
  ]
}
```

### GitHub Releases
- Semantic versioning (1.0.0)
- Changelog in every release
- Binary for direct download (optional)

### Documentation
- README on npm
- Full docs at nexus-framework.dev
- Video tutorials on YouTube

---

## ⚠️ Known Challenges

### Challenge 1: Cross-Platform Compatibility
**Issue:** Windows uses different path separators, line endings  
**Solution:** Use `path.join()`, normalize line endings, test on all platforms

### Challenge 2: Package Manager Detection
**Issue:** Users might have npm, yarn, or pnpm  
**Solution:** Detect lockfile, ask user if ambiguous, default to npm

### Challenge 3: Template Updates
**Issue:** Templates get outdated quickly  
**Solution:** Version templates separately, allow updates without CLI update

### Challenge 4: Large Bundle Size
**Issue:** Including many templates increases package size  
**Solution:** Download templates on-demand (future optimization)

### Challenge 5: Network Failures
**Issue:** npm install might fail  
**Solution:** Catch errors, provide manual steps, allow retry

---

## 📊 Success Criteria

**Week 4 (Before Launch):**
- [ ] CLI generates 3 working templates
- [ ] All tests pass on Mac/Windows/Linux
- [ ] Documentation is complete
- [ ] Zero critical bugs
- [ ] Published to npm

**Month 1 (Post-Launch):**
- [ ] 1,000+ installs
- [ ] < 5% error rate
- [ ] 10+ GitHub stars per day
- [ ] Positive feedback on Product Hunt

**Month 3:**
- [ ] 5,000+ installs
- [ ] Active community (Discord/GitHub)
- [ ] Template contributions from users
- [ ] 500+ GitHub stars

---

## 🎨 Code Style Guidelines

### TypeScript
- Use strict mode
- Prefer interfaces over types
- Use async/await, not callbacks
- Export named exports, not default

### File Naming
- kebab-case for files (`data-strategy.ts`)
- PascalCase for classes (`TemplateGenerator.ts`)
- camelCase for functions (`generateDocs()`)

### Comments
- TSDoc for public functions
- Inline comments for complex logic
- TODO comments with issue numbers

### Testing
- Describe blocks for grouping
- Clear test names: "should generate package.json with correct dependencies"
- AAA pattern: Arrange, Act, Assert

---

## 🎯 v1.0 Alive Brain Implementation (M1–M4)

> **Reference:** See root `../.../v1_alive_brain.md` for full design spec.
> This section breaks down the nexus-cli implementation tasks for each milestone.
> Agents should read `.nexus/docs/knowledge.md` for v1.0-specific patterns and gotchas before starting.

### M1 — Sensors & `nexus sync` (v0.4.0-alpha.1) — ~5 days

**Objective:** Give the brain eyes. Sensors read repo reality; `nexus sync` writes a Vital Signs block into `.nexus/docs/index.md`.

**Implementation Order (sequential):**

1. **`src/utils/brain.ts` (NEW — foundation)**
   - Exports: `locateBrainRoot(cwd?: string): string` — find .nexus/ directory
   - Exports: `computeBrainHash(brainRoot: string): string` — SHA256(index.md + knowledge.md + plans/_active.json) + date
   - Tests: `tests/unit/brain.test.ts` — locate .nexus from cwd, from parent, returns null if not found; hash is deterministic
   - This is the foundation for all v1.0 features

2. **`src/utils/sensors/git.ts` (NEW)**
   - Exports: `captureGit(repoRoot: string): Promise<VitalSigns['git']>` 
   - Reads: branch name, commits ahead of main, last commit (sha, subject, author, date), dirty status
   - Uses: `git rev-parse --abbrev-ref HEAD`, `git rev-list main.. --count`, `git log -1 --format=...`, `git status --porcelain`
   - Timeout: 2s, graceful degradation (null on timeout)
   - Tests: fixture repos in `tests/__fixtures__/{repo-basic,repo-monorepo,repo-detached}`, unit + integration tests

3. **`src/utils/sensors/files.ts` (NEW)**
   - Exports: `captureFiles(brainRoot: string): Promise<VitalSigns['files']>`
   - Reads: phase folders (look for `01_`, `02_`, etc. in .nexus/docs/), last touch date, staleness in days
   - Timeout: 2s
   - Tests: mock filesystem with in-memory vol, snapshot test for output format

4. **`src/utils/sensors/tests.ts` (NEW)**
   - Exports: `captureTests(projectRoot: string): Promise<VitalSigns['tests']>`
   - Tries: `npm test` (JSON output parse), `npx vitest run --reporter=json`, `npx jest --json`, with fallback
   - Parses: passed, failed, skipped counts + last run timestamp
   - Timeout: 2s per attempt, returns null if all fail
   - Tests: mock npm scripts, parse real test output samples

5. **`src/utils/sensors/packages.ts` (NEW)**
   - Exports: `capturePackages(projectRoot: string): Promise<VitalSigns['packages']>`
   - Runs: `npm outdated --json`, `npm audit --json` (or graceful null)
   - Counts: outdated + vulnerable packages
   - Timeout: 2s per command
   - Tests: mock npm output, snapshot test

6. **`src/utils/sensors/index.ts` (NEW — orchestrator)**
   - Exports: `VitalSigns` interface (typed, matches spec §5.1)
   - Exports: `captureVitalSigns(opts: SensorOpts): Promise<VitalSigns>`
   - Calls: all 4 sensors in parallel with Promise.all, then builds aggregate object
   - Tests: unit test for aggregation, snapshot test of raw JSON output
   - Add to `src/utils/index.ts` barrel exports

7. **`src/commands/sync.ts` (NEW)**
   - Exports: `syncCommand(options: CliOptions): Promise<void>`
   - CLI entry: parses --dry-run, --write (default), --json, --scope
   - Logic: locates brain, calls `captureVitalSigns()`, renders markdown block, writes to index.md between fences
   - Rendering: format as markdown table (see spec §5.1 for layout)
   - Idempotence: on re-run with no changes, block is byte-for-byte identical
   - Tests: snapshot test of rendered block, integration test (real .nexus/ fixture), dry-run test

8. **Update `src/cli.ts`**
   - Register: `program.command('sync').description(...).action(syncCommand)`
   - Add flags: --dry-run, --write, --json, --scope, --cwd
   - Tests: command routing test

9. **Update generators: `src/generators/docs.ts`**
   - When generating new projects, scaffold the Vital Signs fences in generated `index.md`:
     ```markdown
     <!-- NEXUS:VITAL_SIGNS:START — managed by `nexus sync`, do not edit -->
     ## 🩺 Vital Signs (auto)
     (empty on init; user runs `nexus sync` to populate)
     <!-- NEXUS:VITAL_SIGNS:END -->
     ```
   - Tests: snapshot test of generated scaffold

10. **Test Summary**
    - Unit: brain (3), git (4), files (3), tests (4), packages (3), sensors (2), sync (3) = ~22 tests
    - Integration: fixture repo sync + idempotence (2)
    - Snapshot: rendered block (1), raw VitalSigns JSON (1)
    - Total M1 tests: ~26 new tests (targets 306 → 332 total)

**Files Touched:**
- NEW: `src/utils/brain.ts`, `src/utils/sensors/{git,files,tests,packages,index}.ts`, `src/commands/sync.ts`
- NEW: `tests/unit/brain.test.ts`, `tests/unit/sensors.test.ts`, `tests/unit/sync.test.ts`
- NEW: `tests/__fixtures__/{repo-basic,repo-monorepo,repo-detached}` (minimal .git dirs)
- MODIFIED: `src/cli.ts` (register sync command), `src/utils/index.ts` (barrel), `src/generators/docs.ts` (scaffold fences)
- MODIFIED: `.gitignore` (add .nexus/state/)

**Acceptance Criteria:**
- [ ] `nexus sync --dry-run` outputs rendered Vital Signs block
- [ ] `nexus sync --write` updates index.md between fences
- [ ] Running sync twice yields identical block (idempotence)
- [ ] All sensors have 2s timeout + graceful degradation
- [ ] 26+ new tests all pass
- [ ] CI green (tsc + eslint + vitest)

---

### M2 — Plans MVP (v0.4.0-alpha.2) — ~7 days *(unblock after M1)*

See spec §5.6 for full plan format. Implementation builds on M1's brain.ts foundation.

**Key Files:**
- NEW: `src/utils/plans/{parser,lifecycle,active,index-builder}.ts`
- NEW: `src/commands/plan.ts` (12 subcommands)
- NEW: `src/generators/plan-templates/{feature,bug,refactor,spike,chore}.md.mustache`
- NEW: `tests/unit/plans.test.ts` (30+ tests)
- MODIFIED: `src/cli.ts` (register `nexus plan` command)

**Acceptance Criteria:**
- [ ] Plan file format matches spec (frontmatter + sections)
- [ ] All 12 subcommands implemented
- [ ] `.nexus/plans/index.md` auto-rebuilds
- [ ] `.nexus/plans/_active.json` tracks active plan(s)
- [ ] Checkpoint tests (draft → approved → in_progress → done workflow)
- [ ] Template tests (feature, bug, etc. all scaffold correctly)

---

### M3 — Doctor & Brief (v0.4.0-beta.1) — ~5 days *(unblock after M1)*

Spec §5.2 + §5.3. Doctor reads sensor data + docs, detects drift. Brief is human digest.

**Key Files:**
- NEW: `src/utils/doctor/checks/{d01..d10}.ts` (one check per file)
- NEW: `src/utils/doctor/index.ts` (registry + orchestrator)
- NEW: `src/commands/doctor.ts`
- NEW: `src/commands/brief.ts`
- NEW: `tests/unit/doctor.test.ts`, `tests/unit/brief.test.ts`

**Acceptance Criteria:**
- [ ] All 10 doctor checks (D01–D10) implemented
- [ ] Checks are modular (add/remove per project via config)
- [ ] `nexus doctor --severity=warn` filters correctly
- [ ] `nexus brief` outputs <30 lines, reads in <20s
- [ ] Brief shows shipped commits, active plans, drift, next steps

---

### M4 — Consolidate, Wake, Polish → v1.0.0 (~5 days) *(unblock after M1–M3)*

Spec §5.4 + §5.5 + §13. Memory hygiene + handshake + polish for release.

**Key Files:**
- NEW: `src/utils/consolidate.ts` (knowledge clustering)
- NEW: `src/commands/consolidate.ts`, `src/commands/wake.ts`
- NEW: `tests/unit/consolidate.test.ts`, `tests/unit/wake.test.ts`
- MODIFIED: `.nexus/ai/instructions.md` (add wake handshake section)
- MODIFIED: Generators for v1.0 scaffolding (plans/, state/, welcome)

**Acceptance Criteria:**
- [ ] `nexus consolidate` generates `knowledge-summary.md`
- [ ] Summary clusters by category, preserves append-only property
- [ ] `nexus wake` issues deterministic token, prompts agent to echo
- [ ] `nexus doctor D09` flags missed handshakes
- [ ] All generators scaffold for v1.0 by default
- [ ] `nexus upgrade` lifts v0.3.x projects to v1.0 without data loss
- [ ] E2E test: new project → plan → sync → doctor clean
- [ ] README + CHANGELOG + migration guide
- [ ] v1.0.0 published to npm

**Target Total Tests:** 380+ (26 M1 + 35 M2 + 25 M3 + 20 M4)

---

## 📝 Next Steps (v0.3.x Carry-over)

**Immediate (parallel to M1):**
1. E2E test suite — generate project, run build
2. `nexus skill status` command

**After v1.0.0 ships (v1.x backlog):**
1. `nexus skill generate` — auto-draft skills from code
2. `nexus add <feature>` command
3. Web-based project configurator

---

## 🔗 Resources

- **Commander.js:** https://github.com/tj/commander.js
- **Inquirer.js:** https://github.com/SBoudrias/Inquirer.js
- **Plop.js:** (inspiration for generators) https://plopjs.com
- **Create React App:** (reference implementation) https://github.com/facebook/create-react-app
- **Vite:** (modern approach) https://github.com/vitejs/vite

---

## 💡 Future Enhancements (Post-MVP)

- [ ] `nexus add <feature>` - Add features to existing project
- [ ] `nexus eject` - Remove NEXUS, keep code
- [ ] `nexus update` - Update templates in existing project
- [ ] `nexus validate` - Check project against NEXUS standards
- [ ] `nexus migrate` - Migrate from other tools (CRA, etc.)
- [ ] Plugin system for custom generators
- [ ] Template marketplace
- [ ] Web-based project configurator