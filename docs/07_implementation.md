# NEXUS CLI - Implementation Plan

**Project:** NEXUS CLI  
**Tech Stack:** Node.js + TypeScript  
**Target:** Cross-platform CLI (Mac, Windows, Linux)  
**Timeline:** 4-6 weeks to MVP  
**Last Updated:** February 7, 2025  

---

## 🏗️ Technical Architecture

### Tech Stack

**Core:**
- **Runtime:** Node.js 18+ (LTS)
- **Language:** TypeScript 5.x (strict mode)
- **Package Manager:** npm (for distribution), supports yarn/pnpm

**CLI Framework:**
- **Commander.js** - Command parsing and routing
- **Inquirer.js** - Interactive prompts
- **Chalk** - Terminal colors
- **Ora** - Loading spinners
- **Boxen** - Nice boxes for messages
- **Figlet** - ASCII art for branding

**File System:**
- **fs-extra** - Enhanced file system operations
- **glob** - Pattern matching for templates
- **mustache** or **handlebars** - Template rendering

**Utilities:**
- **execa** - Running shell commands (npm install, git init)
- **validate-npm-package-name** - Package name validation
- **update-notifier** - Check for CLI updates
- **semver** - Version comparisons

**Testing:**
- **Vitest** - Unit tests
- **Mock-fs** - File system mocking
- **Snapshot testing** - For generated files

---

## 📁 Project Structure
```
@nexus-framework/cli/
├── src/
│   ├── commands/
│   │   ├── init.ts           # Main command - project initialization
│   │   ├── upgrade.ts        # Upgrade to Pro (future)
│   │   └── validate.ts       # Validate existing project (future)
│   ├── prompts/
│   │   ├── index.ts          # Main prompt orchestration
│   │   ├── project-type.ts   # Project type questions
│   │   ├── data-strategy.ts  # Data handling questions
│   │   ├── patterns.ts       # PWA, offline, etc.
│   │   ├── frameworks.ts     # Tech stack questions
│   │   └── features.ts       # Additional features
│   ├── generators/
│   │   ├── index.ts          # Main generator orchestrator
│   │   ├── structure.ts      # Folder structure generator
│   │   ├── docs.ts           # Documentation generator
│   │   ├── config.ts         # Config files generator
│   │   ├── tests.ts          # Test structure generator
│   │   └── ci-cd.ts          # CI/CD templates generator
│   ├── templates/
│   │   ├── base/             # Common files all projects need
│   │   ├── frontend/
│   │   │   ├── nextjs/
│   │   │   ├── react-vite/
│   │   │   ├── sveltekit/
│   │   │   └── ...
│   │   ├── backend/
│   │   │   ├── express/
│   │   │   ├── fastify/
│   │   │   └── ...
│   │   ├── monorepo/
│   │   │   └── turborepo/
│   │   ├── docs/             # Documentation templates
│   │   └── ci-cd/            # CI/CD templates
│   ├── utils/
│   │   ├── logger.ts         # Pretty logging
│   │   ├── validator.ts      # Input validation
│   │   ├── package-manager.ts # Detect & use npm/yarn/pnpm
│   │   ├── git.ts            # Git operations
│   │   └── file-system.ts    # File operations helpers
│   ├── types/
│   │   ├── config.ts         # Configuration types
│   │   ├── prompts.ts        # Prompt answer types
│   │   └── templates.ts      # Template types
│   ├── cli.ts                # CLI entry point
│   └── index.ts              # Main export
├── templates/                # Template files
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── bin/
│   └── nexus.js              # Executable entry point
├── package.json
├── tsconfig.json
├── vitest.config.ts
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
```bash
# 1. Update version
npm version patch|minor|major

# 2. Generate changelog
npm run changelog

# 3. Build
npm run build

# 4. Publish
npm publish --access public

# 5. Create GitHub release
gh release create v1.0.0
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

## 📝 Next Steps

**Immediate:**
1. Create GitHub repo
2. Setup project structure
3. Install dependencies
4. Write first test

**This Week:**
1. Implement basic CLI
2. Create one working template
3. Test locally
4. Iterate on UX

**Next Week:**
1. Add more templates
2. Build prompt system
3. Generate documentation
4. Add tests

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