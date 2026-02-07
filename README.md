<div align="center">

# 🔮 NEXUS CLI

### AI-Native Project Scaffolding

**The open-source CLI by [GDA Africa](https://github.com/GDA-Africa) that generates production-ready, AI-optimized project structures — so you ship faster and smarter.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/Vitest-45%2F45_Passing-green?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](https://github.com/GDA-Africa/nexus-cli/pulls)
[![Status](https://img.shields.io/badge/Status-In_Development-yellow?style=for-the-badge)]()

---

*Where documentation drives development and AI agents are first-class citizens.*

</div>

---

## 🌍 About GDA Africa

**GDA (Glenhalton Digital Agency)** is building the digital infrastructure for Africa's next generation of products and services. **NEXUS CLI** is the foundational developer tool in GDA's ecosystem — a free, open-source scaffolding engine that generates intelligent project structures where AI and humans collaborate seamlessly from day one.

---

## 🎯 Why NEXUS CLI?

Every new project starts with the same painful ritual: hours of boilerplate, fragmented configs, and zero documentation. NEXUS eliminates all of that.

| Problem | NEXUS Solution |
|---|---|
| 🕐 Starting a project takes hours of setup and configuration guesswork | **2-minute interactive setup** with strategy-first questions and smart defaults |
| 🤖 AI coding tools (Cursor, Copilot) struggle with project-wide context | **AI-optimized documentation system** — 8 structured files AI agents can parse and execute |
| 🧩 Every project structure is different, making team consistency impossible | **Standardized, production-ready scaffolding** based on proven architectural patterns |
| 🧪 Tests and documentation are always afterthoughts | **Test infrastructure and docs generated from day one** — not bolted on later |
| 📚 Onboarding new developers takes weeks, knowledge silos form | **Self-documenting projects** where the codebase explains itself to humans and AI alike |
| 🔄 No established conventions exist for AI-native development | **The first framework built for the AI era** — bridging requirements and code generation |

---

## ✨ Features

<table>
<tr>
<td width="50%">

### Core Capabilities
- 🧠 **Strategy-First Setup** — Asks about your goals, not just tech preferences
- 📐 **Complete Scaffolding** — Production-ready structure, not hello world
- 📚 **NEXUS Doc System** — 8 structured markdown files AI agents understand
- 🎯 **Smart Defaults** — Best practices baked in based on your choices
- 🧪 **Test Infrastructure** — Vitest config, example tests, and helpers from the start

</td>
<td width="50%">

### Production Ready
- ⚡ **Multi-Framework Support** — Next.js, React+Vite, SvelteKit, Nuxt, Astro
- 🔧 **Full Toolchain** — TypeScript, ESLint, Prettier pre-configured
- 🚀 **CI/CD Templates** — GitHub Actions workflows generated automatically
- 🌐 **Cross-Platform** — Works on macOS, Windows (WSL), and Linux
- 📦 **Strategy Patterns** — PWA, Offline-First, i18n, Theming, White Label, Real-time

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        NEXUS CLI                             │
│              nexus init <project-name>                        │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                   INTERACTIVE PROMPTS                         │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐    │
│  │ Project Type │ │Data Strategy │ │ Application Pattern│    │
│  │ Web/API/Mono │ │Local/Cloud/  │ │ PWA/Offline/i18n/  │    │
│  │              │ │Hybrid        │ │ Theming            │    │
│  └──────┬──────┘ └──────┬───────┘ └─────────┬──────────┘    │
│         │    ┌──────────┐│┌───────────┐      │               │
│         │    │ Framework ││ Features & │      │               │
│         │    │ Selection ││  Extras    │      │               │
│         │    └─────┬────┘│└─────┬─────┘      │               │
│         └──────────┼─────┼──────┼────────────┘               │
└────────────────────┼─────┼──────┼────────────────────────────┘
                     │     │      │  NexusConfig
                     ▼     ▼      ▼
┌──────────────────────────────────────────────────────────────┐
│                   GENERATOR ENGINE                            │
│  ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ Structure  │ │   Docs    │ │  Config  │ │   Tests     │  │
│  │ Generator  │ │ Generator │ │Generator │ │  Generator  │  │
│  └─────┬─────┘ └─────┬─────┘ └────┬─────┘ └──────┬──────┘  │
│        │    ┌─────────┘            │               │         │
│        │    │    ┌─────────────────┘               │         │
│        │    │    │    ┌────────────────────────────┘         │
│        ▼    ▼    ▼    ▼                                      │
│  ┌──────────────────────────┐                                │
│  │       CI/CD Generator    │                                │
│  └──────────────────────────┘                                │
└──────────────────────┬───────────────────────────────────────┘
                       │  Write to disk
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                YOUR NEW PROJECT  ✨                           │
│                                                              │
│  📁 src/           Source code with smart boilerplate        │
│  � .nexus/        Docs, AI config, manifest — one folder   │
│  🧪 tests/         Unit, integration, and E2E scaffolding   │
│  ⚙️  configs        TS, ESLint, Prettier, CI/CD              │
│  📦 package.json   Dependencies installed & ready            │
│                                                              │
│  → npm run dev     Your app is running.                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
@nexus-framework/cli/
├── bin/
│   └── nexus.js              # Executable entry point (shebang)
├── src/
│   ├── cli.ts                # CLI entry point — Commander.js setup
│   ├── index.ts              # Public API exports for programmatic usage
│   ├── version.ts            # Single source of truth for CLI version
│   ├── commands/
│   │   └── init.ts           # `nexus init` — main scaffolding command
│   ├── prompts/
│   │   ├── index.ts          # Prompt orchestrator — assembles NexusConfig
│   │   ├── project-type.ts   # Web / API / Monorepo selection
│   │   ├── data-strategy.ts  # Local Only / Local First / Cloud / Hybrid
│   │   ├── patterns.ts       # PWA, Offline-First, i18n, Theming, Real-time
│   │   ├── frameworks.ts     # Next.js, React+Vite, SvelteKit, Nuxt, Astro
│   │   └── features.ts       # Testing, package manager, git, install prefs
│   ├── generators/
│   │   ├── index.ts          # Generator orchestrator — runs all generators
│   │   ├── structure.ts      # Folder structure, package.json, README, .gitignore
│   │   ├── docs.ts           # 8 NEXUS doc files → .nexus/docs/ + index + manifest
│   │   ├── config.ts         # tsconfig, ESLint, Prettier, EditorConfig
│   │   ├── tests.ts          # Vitest config, example tests, test helpers
│   │   ├── ci-cd.ts          # GitHub Actions CI workflow
│   │   ├── landing-page.ts   # Framework-specific homepage + SVG logo/favicon
│   │   └── ai-config.ts      # AI agent instructions → .nexus/ai/ + root pointers
│   ├── types/
│   │   ├── index.ts          # Re-exports for convenience
│   │   ├── config.ts         # NexusConfig, NexusManifest, union types
│   │   ├── prompts.ts        # Prompt answer interfaces
│   │   └── templates.ts      # GeneratedFile, GeneratorResult, TemplateContext
│   └── utils/
│       ├── index.ts          # Re-exports for convenience
│       ├── logger.ts         # Chalk-powered branded terminal output
│       ├── validator.ts      # Project name validation and sanitization
│       ├── package-manager.ts # npm / yarn / pnpm detection
│       ├── git.ts            # Git init and initial commit helpers
│       └── file-system.ts    # fs-extra wrappers and Mustache rendering
├── tests/
│   └── unit/
│       ├── validator.test.ts # 15 tests — name validation, sanitization
│       └── generators.test.ts # 30 tests — structure, package.json, gitignore, landing pages, ai-config
├── .nexus/
│   ├── docs/
│   │   ├── index.md          # Project brain — status, module map, priorities
│   │   ├── 01_vision.md      # Product vision and requirements
│   │   └── 07_implementation.md # Technical architecture and build plan
│   └── ai/
│       └── instructions.md   # AI agent master instructions (single source of truth)
├── package.json              # Dependencies, scripts, and npm metadata
├── tsconfig.json             # TypeScript strict mode, ESM (NodeNext)
├── vitest.config.ts          # Test runner with coverage thresholds
├── .eslintrc.cjs             # ESLint + TypeScript + Prettier config
├── .prettierrc               # Code formatting rules
├── .gitignore                # Node, dist, IDE, OS ignores
├── .cursorrules              # AI pointer → .nexus/ai/instructions.md (Cursor)
├── .windsurfrules            # AI pointer → .nexus/ai/instructions.md (Windsurf)
├── .clinerules               # AI pointer → .nexus/ai/instructions.md (Cline)
├── AGENTS.md                 # AI pointer → .nexus/ai/instructions.md (Claude/Codex)
├── LICENSE                   # Apache 2.0
├── README_GUIDELINES.md      # GDA README standards reference
└── README.md                 # You are here
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+ (LTS recommended)
- **npm** 9+, **yarn** 1.x+, or **pnpm** 8+
- **Git** 2.x+

### 1. Clone & Setup

```bash
git clone https://github.com/GDA-Africa/nexus-cli.git
cd nexus-cli
yarn install
```

### 2. Build

```bash
yarn build
```

### 3. Run the CLI

```bash
node bin/nexus.js init my-awesome-app
```

You'll be guided through an interactive setup:

```
  🔮 NEXUS CLI v0.1.0
  AI-Native Project Scaffolding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? What are you building? › Web Application
? How will your app handle data? › Cloud First
? Which application patterns do you need? › PWA, Theming
? Which frontend framework? › Next.js 15 (App Router)
? Testing framework? › Vitest
? Package manager? › npm
? Initialize a git repository? › Yes
? Install dependencies now? › Yes

▸ NEXUS Creating "my-awesome-app" with nextjs...

✔ Project structure generated.
✔ Dependencies installed.
✔ Git repository initialized.

  ✅ Project created successfully!

  Next steps:
    cd my-awesome-app
    npm run dev
```

### 4. Verify

```bash
cd my-awesome-app
npm run dev
# → Your app is running at http://localhost:3000
```

---

## 📡 API Reference

NEXUS CLI exposes a programmatic API for advanced usage and tooling integration.

```typescript
import { runPrompts, generateProject } from '@nexus-framework/cli';

const config = await runPrompts('my-app');
await generateProject(config);
```

### CLI Commands

| Command | Description |
|---|---|
| `nexus init [project-name]` | Initialize a new NEXUS project with interactive setup |
| `nexus --version` | Display the CLI version |
| `nexus --help` | Display available commands and options |

### NexusConfig Interface

| Field | Type | Required | Description |
|---|---|---|---|
| `projectName` | `string` | ✅ | Name of the project (valid npm package name) |
| `projectType` | `'web' \| 'api' \| 'monorepo'` | ✅ | Type of project |
| `dataStrategy` | `'local-only' \| 'local-first' \| 'cloud-first' \| 'hybrid'` | ✅ | Data handling approach |
| `appPatterns` | `AppPattern[]` | ✅ | Selected application patterns |
| `frontendFramework` | `'nextjs' \| 'react-vite' \| 'sveltekit' \| 'nuxt' \| 'astro'` | ✅ | Frontend framework |
| `testFramework` | `'vitest' \| 'jest' \| 'none'` | ✅ | Test framework choice |
| `packageManager` | `'npm' \| 'yarn' \| 'pnpm'` | ✅ | Package manager to use |
| `git` | `boolean` | ✅ | Whether to initialize git |
| `installDeps` | `boolean` | ✅ | Whether to install dependencies |

---

## 🔐 Security

| Layer | Implementation |
|---|---|
| **Input Validation** | All project names sanitized via `validate-npm-package-name` and custom validators |
| **Dependency Auditing** | Generated projects include `npm audit` in CI/CD pipelines |
| **Secret Management** | `.env` files auto-added to `.gitignore`; environment variable validation on startup |
| **Code Quality** | ESLint + TypeScript strict mode enabled by default in generated projects |
| **Supply Chain** | Lockfile pinning and minimal dependency surface in generated projects |

---

## 🧪 Testing

NEXUS CLI follows a **test-driven development** philosophy. Every generator and validator is tested.

```bash
# Run all tests
yarn test

# Run with coverage
yarn test:coverage

# Run a specific suite
npx vitest tests/unit/validator.test.ts
```

### Test Coverage

| Suite | Tests | Covers |
|---|---|---|
| `tests/unit/validator.test.ts` | 15 | Project name validation, sanitization, empty input handling |
| `tests/unit/generators.test.ts` | 30 | Directory generation, package.json, .gitignore, README, landing pages, ai-config |

**Current status:** 45/45 tests passing ✅

**Coverage Target:** 80%+ across all suites.

---

## 🚢 Deployment

### Publishing to npm

```bash
yarn build
npm version patch
npm publish --access public
```

### Installing Globally (End Users)

```bash
npm install -g @nexus-framework/cli
nexus init my-project
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NEXUS_PACKAGE_MANAGER` | Override package manager detection | Auto-detect |
| `NEXUS_SKIP_INSTALL` | Skip automatic dependency install after generation | `false` |

---

## 🔌 Integration Guide

### Using NEXUS with AI Coding Tools

NEXUS-generated projects are designed to work seamlessly with AI-powered editors:

**Cursor / Copilot / Windsurf:**
```
1. Open the generated project
2. AI tools auto-detect .nexus/ai/instructions.md and root pointer files
3. Ask your AI to implement features referencing the doc contracts
4. The AI now has full project context from day one
```

**Example AI prompt with a NEXUS project:**
```
Read .nexus/docs/01_vision.md and .nexus/docs/04_api_contracts.md.
Implement the user registration endpoint as specified
in the API contract, following the architecture in
.nexus/docs/02_architecture.md.
```

### NEXUS Documentation System

Every generated project includes **8 AI-optimized documentation files** under `.nexus/docs/`:

| # | File | Purpose |
|---|---|---|
| 1 | `.nexus/docs/01_vision.md` | Product requirements, user stories, success metrics |
| 2 | `.nexus/docs/02_architecture.md` | System design, tech stack decisions, data flow |
| 3 | `.nexus/docs/03_data_contracts.md` | Database schemas, validation rules, relationships |
| 4 | `.nexus/docs/04_api_contracts.md` | Endpoints, request/response interfaces, status codes |
| 5 | `.nexus/docs/05_business_logic.md` | Rules, algorithms, state machines, decision flows |
| 6 | `.nexus/docs/06_test_strategy.md` | Coverage targets, test types, testing philosophy |
| 7 | `.nexus/docs/07_implementation.md` | Build order, file-by-file implementation plan |
| 8 | `.nexus/docs/08_deployment.md` | Infrastructure, CI/CD, environment configuration |

Plus `.nexus/index.md` dashboard, `.nexus/manifest.json` for machine navigation, and `.nexus/ai/instructions.md` for AI agent context.

---

## 🗺️ Roadmap

- [x] Project vision and product requirements defined
- [x] Technical architecture and implementation plan documented
- [x] Documentation system designed (8-file structure)
- [x] Core CLI infrastructure (Commander.js + @inquirer/prompts)
- [x] Interactive prompt system (project type, data strategy, patterns, framework, features)
- [x] Generator engine (structure, docs, config, tests, CI/CD, landing page, ai-config)
- [x] Utility layer (logger, validator, package-manager, git, file-system)
- [x] Type system (NexusConfig, NexusManifest, prompt and template types)
- [x] Unit tests (45/45 passing — validators and generators)
- [x] ESLint + Prettier configured and passing
- [x] Centralized `.nexus/` folder (docs, AI config, manifest — one folder to opt in/out)
- [ ] End-to-end testing of full `nexus init` flow
- [ ] Framework-specific templates (Next.js 15, React+Vite, SvelteKit)
- [ ] Strategy pattern generators (PWA, Offline-First, i18n, Theming)
- [ ] Polish — progress indicators, error recovery, ASCII branding
- [ ] Cross-platform testing (macOS, Windows WSL, Linux)
- [ ] Publish to npm as `@nexus-framework/cli`
- [ ] `nexus add <feature>` — add capabilities to existing projects
- [ ] `nexus validate` — check projects against NEXUS standards
- [ ] Community templates and plugin system

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Runtime** | Node.js 20+ (LTS) |
| **Language** | TypeScript 5.7 (strict mode, ESM) |
| **CLI Framework** | Commander.js 12.x |
| **Interactive Prompts** | @inquirer/prompts 7.x |
| **Terminal Styling** | Chalk 5.x, Ora 8.x, Figlet 1.x |
| **Template Engine** | Mustache 4.x |
| **File System** | fs-extra 11.x |
| **Shell Execution** | execa 9.x |
| **Testing** | Vitest 3.x |
| **Code Quality** | ESLint 8.x, Prettier 3.x |
| **Package Distribution** | npm (public registry) |
| **License** | Apache 2.0 |

---

## 🤝 Contributing

NEXUS CLI is open source and we welcome contributions from the community!

### Getting Started

```bash
# Fork and clone
git clone https://github.com/<your-username>/nexus-cli.git
cd nexus-cli
yarn install

# Create a branch
git checkout -b feature/your-feature-name

# Make changes, lint, and test
yarn lint
yarn test

# Submit a PR
git push origin feature/your-feature-name
```

### Contribution Guidelines

- **Write tests** for every new feature or bug fix
- **Follow the code style** — ESLint and Prettier are pre-configured
- **Update documentation** if your change affects the public API or CLI behavior
- **One feature per PR** — keep pull requests focused and reviewable
- **Use conventional commits** — `feat:`, `fix:`, `docs:`, `chore:`

---

<div align="center">

---

**Built with ❤️ by [GDA Africa](https://github.com/GDA-Africa)** — Powering Africa's Digital Future

*NEXUS CLI is the open-source foundation of the NEXUS framework. For questions, ideas, or collaboration, reach out to the GDA engineering team.*

---

</div>
