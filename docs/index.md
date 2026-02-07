# NEXUS CLI - Project Index

**Project:** NEXUS CLI (Free Tier)  
**Status:** 🟢 DOCUMENTED → READY TO BUILD  
**Last Updated:** February 7, 2025 22:45 UTC  
**Version:** 0.0.1 (Pre-release)  
**Coverage:** Unit: 0% | Integration: 0% | E2E: 0%

---

## 🎯 Current Objective

**Phase 1, Week 1:** Build core infrastructure  
**Next Task:** Create project structure and setup TypeScript configuration  
**Blocked:** None  
**Ready to Start:** ✅ Yes

---

## 📊 Project Status Matrix

| Phase | Status | Timeline | Completion | Next Action |
|-------|--------|----------|------------|-------------|
| 📝 Documentation | ✅ Complete | Week 0 | 100% | - |
| 🏗️ Phase 1: Core Infrastructure | 🟢 Ready | Week 1 | 0% | Initialize npm package |
| 🎨 Phase 2: Prompts & Templates | ⚪ Pending | Week 2 | 0% | Blocked by Phase 1 |
| 📚 Phase 3: Documentation System | ⚪ Pending | Week 3 | 0% | Blocked by Phase 2 |
| 🧪 Phase 4: Testing & CI/CD | ⚪ Pending | Week 4 | 0% | Blocked by Phase 3 |
| ✨ Phase 5: Polish & Distribution | ⚪ Pending | Week 5-6 | 0% | Blocked by Phase 4 |

---

## 🗺️ Document Map (Where to Find What)

### 📋 Product & Requirements
**What are we building?** → `docs/01_vision.md`  
**Who are the users?** → `docs/01_vision.md` (Personas section)  
**What features do we need?** → `docs/01_vision.md` (Core Features section)  
**What's out of scope?** → `docs/01_vision.md` (Out of Scope section)  
**How do we measure success?** → `docs/01_vision.md` (Success Metrics section)

### 🏗️ Technical Architecture
**What's the tech stack?** → `docs/07_implementation.md` (Tech Stack section)  
**What's the folder structure?** → `docs/07_implementation.md` (Project Structure section)  
**How do we build it?** → `docs/07_implementation.md` (Build Phases section)  
**What are the priorities?** → `docs/07_implementation.md` (Implementation Priorities section)

### 🧪 Testing & Quality
**What's the test strategy?** → `docs/07_implementation.md` (Testing Strategy section)  
**What tests do we need?** → Not yet documented (create in Phase 4)  
**What's our coverage target?** → 80%+ unit test coverage

### 🚀 Deployment & Operations
**How do we publish?** → `docs/07_implementation.md` (Deployment Strategy section)  
**What's the release process?** → `docs/07_implementation.md` (Release Process section)  
**How do we distribute?** → npm package + GitHub releases

---

## 🎬 Current Build Plan

### Phase 1: Core Infrastructure (THIS WEEK)

**Goal:** Get basic CLI working with one template

#### Task 1: Project Setup
```bash
# Commands to run:
mkdir nexus-cli
cd nexus-cli
npm init -y
npm install -D typescript @types/node
npx tsc --init
```

**Files to create:**
- [ ] `package.json` - Base package configuration
- [ ] `tsconfig.json` - TypeScript strict mode config
- [ ] `.gitignore` - Node modules, dist, etc.
- [ ] `README.md` - Initial project readme
- [ ] `.eslintrc.js` - Linting rules
- [ ] `.prettierrc` - Code formatting
- [ ] `vitest.config.ts` - Test configuration

**Dependencies to install:**
```json
{
  "dependencies": {
    "commander": "^11.1.0",
    "inquirer": "^9.2.12",
    "chalk": "^5.3.0",
    "ora": "^7.0.1",
    "fs-extra": "^11.2.0",
    "execa": "^8.0.1",
    "mustache": "^4.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.6",
    "vitest": "^1.1.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  }
}
```

#### Task 2: CLI Foundation
**Files to create:**
- [ ] `src/cli.ts` - Main CLI entry point
- [ ] `src/commands/init.ts` - Init command
- [ ] `bin/nexus.js` - Executable shebang file
- [ ] `src/utils/logger.ts` - Colored logging

**Implementation:**
```typescript
// src/cli.ts
import { Command } from 'commander';
import { initCommand } from './commands/init';

const program = new Command();

program
  .name('nexus')
  .description('NEXUS - Next-gen Engineering eXecution Unified System')
  .version('0.0.1');

program
  .command('init [project-name]')
  .description('Initialize a new NEXUS project')
  .action(initCommand);

program.parse();
```

#### Task 3: Basic Prompt System
**Files to create:**
- [ ] `src/prompts/index.ts` - Main prompt orchestrator
- [ ] `src/utils/validator.ts` - Input validation

**Test with:**
```typescript
// Just project name prompt for now
const answers = await inquirer.prompt([
  {
    type: 'input',
    name: 'projectName',
    message: 'Project name:',
    default: 'my-app',
    validate: (input) => validateProjectName(input)
  }
]);
```

#### Task 4: Template Engine
**Files to create:**
- [ ] `src/generators/index.ts` - Main generator
- [ ] `templates/nextjs-basic/` - Simple Next.js template
- [ ] `src/utils/file-system.ts` - File operations

**Test with:**
```typescript
// Copy templates/nextjs-basic to target directory
// Replace {{projectName}} with actual name
```

#### Task 5: File Generation
**Files to create:**
- [ ] `src/generators/structure.ts` - Folder generator
- [ ] `src/generators/config.ts` - Config file generator
- [ ] `src/utils/package-manager.ts` - npm/yarn/pnpm detection

**Test with:**
```bash
# Should work end-to-end:
nexus init test-app
cd test-app
npm install
npm run dev
```

---

## 🧭 Navigation Shortcuts

### For Project Setup Work
**Docs:** `docs/07_implementation.md#phase-1-core-infrastructure`  
**Templates:** `templates/` (create this directory)  
**Entry Point:** `src/cli.ts`  
**Tests:** `tests/unit/` (create after basic structure works)

### For Prompt System Work
**Docs:** `docs/01_vision.md#feature-1-interactive-project-setup`  
**Code:** `src/prompts/`  
**Reference:** Check Inquirer.js examples

### For Template Work
**Docs:** `docs/01_vision.md#feature-2-strategy-based-templates`  
**Templates:** `templates/frontend/nextjs/`  
**Generator:** `src/generators/index.ts`

### For Testing Work
**Docs:** `docs/07_implementation.md#testing-strategy`  
**Tests:** `tests/unit/`, `tests/integration/`, `tests/e2e/`  
**Config:** `vitest.config.ts`

---

## 🔄 Recent Progress

### February 7, 2025
- ✅ Created comprehensive product vision document
- ✅ Created detailed implementation plan
- ✅ Created this index document
- 🟢 Ready to start Phase 1 development

---

## ⚠️ Known Issues & Decisions Needed

### Open Questions
- [ ] **Mustache vs Handlebars?** → Decision: Start with Mustache (simpler)
- [ ] **TypeScript strict mode?** → Decision: Yes, always strict
- [ ] **Test framework?** → Decision: Vitest (faster, better DX)
- [ ] **Monorepo for templates?** → Decision: Single repo for MVP, split later if needed

### Technical Decisions Made
- ✅ Node.js 18+ as minimum version
- ✅ Commander.js for CLI framework
- ✅ Inquirer.js for prompts
- ✅ npm as primary package manager (detect others)
- ✅ TypeScript strict mode enabled

### Blocked Items
- None currently

---

## 📞 Human Intervention Points

### Now (Week 1)
- ⏳ **Review technical architecture** - Is the tech stack right?
- ⏳ **Approve project structure** - Does the file organization make sense?
- ⏳ **Validate first template** - Should we start with Next.js?

### Later (Week 2+)
- ⏳ **Review prompt UX** - Are questions clear and helpful?
- ⏳ **Test generated projects** - Do they actually work?
- ⏳ **Approve documentation templates** - Are the 8 docs helpful?

---

## 🎯 Definition of Done (Phase 1)

Phase 1 is complete when:
- [ ] `nexus init my-app` command works
- [ ] Generates a working Next.js 15 project
- [ ] Runs `npm install` automatically
- [ ] Includes basic README with next steps
- [ ] All files are properly formatted
- [ ] Can run `npm run dev` in generated project
- [ ] At least one test passes
- [ ] Code is pushed to GitHub

---

## 🚀 Quick Start (For Developer)
```bash
# 1. Clone and setup
git clone <repo-url>
cd nexus-cli
npm install

# 2. Start development
npm run dev

# 3. Test locally
npm link
nexus init test-project

# 4. Run tests
npm test

# 5. Build for production
npm run build
```

---

## 📚 Key Resources

### Documentation
- Vision: `docs/01_vision.md`
- Implementation: `docs/07_implementation.md`
- This Index: `.nexus/index.md`

### External References
- Commander.js: https://github.com/tj/commander.js
- Inquirer.js: https://github.com/SBoudrias/Inquirer.js
- TypeScript: https://www.typescriptlang.org/docs
- Vitest: https://vitest.dev

### Inspiration
- Create React App: Structure and UX patterns
- Vite: Modern build tool approach
- T3 Stack: Interactive CLI experience

---

## 💡 Next Actions (Prioritized)

### 🔴 Critical (Do First)
1. **Initialize project structure**
   - Command: `mkdir -p src/{commands,prompts,generators,utils,types} templates tests`
   - Time: 5 minutes
   
2. **Setup package.json and TypeScript**
   - Files: `package.json`, `tsconfig.json`
   - Time: 15 minutes

3. **Install dependencies**
   - Command: `npm install commander inquirer chalk ora fs-extra execa mustache`
   - Time: 2 minutes

4. **Create basic CLI structure**
   - Files: `src/cli.ts`, `bin/nexus.js`
   - Time: 30 minutes

5. **Test CLI runs**
   - Command: `npm link && nexus --help`
   - Time: 5 minutes

### 🟡 Important (Do This Week)
6. **Build init command**
7. **Create first template**
8. **Test end-to-end flow**
9. **Add error handling**
10. **Write first tests**

### 🟢 Nice to Have (If Time)
11. **Add colors and branding**
12. **Add progress indicators**
13. **Create more templates**

---

## 🎨 Brand Assets (To Create)
```
╔══════════════════════════════════════════╗
║  NEXUS                                   ║
║  Next-gen Engineering eXecution          ║
║  Unified System                          ║
╚══════════════════════════════════════════╝
```

**Colors:**
- Primary: Cyan (`#00D9FF`)
- Success: Green (`#00FF87`)
- Warning: Yellow (`#FFD700`)
- Error: Red (`#FF4757`)
- Info: Blue (`#5352ED`)

---

## 📝 Notes for AI Agent

**If you're an AI reading this:**

1. **Start with Phase 1, Task 1** - Create the project structure
2. **Follow the implementation plan** in `docs/07_implementation.md`
3. **Use the tech stack specified** - Don't substitute without reason
4. **Test after each task** - Make sure it works before moving on
5. **Update this index** when you complete tasks
6. **Ask for human review** at intervention points

**Current focus:** Get a basic CLI working that can generate ONE template. Don't try to do everything at once. Iterate.

---

## 🏁 Success Criteria (Overall)

**Week 1:** Basic CLI generates one working Next.js project  
**Week 2:** Full prompt system with 3 templates  
**Week 3:** Documentation system integrated  
**Week 4:** Testing and CI/CD added  
**Week 6:** Published to npm, 100+ installs  

---

**Version:** 1.0.0  
**Last Updated By:** Human + Claude (Initial Documentation)  
**Next Review:** After Phase 1 completion