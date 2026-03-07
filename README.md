<div align="center">

# 🔮 NEXUS CLI

### The AI-Native Development Framework

**The open-source CLI by [GDA Africa](https://github.com/GDA-Africa) that turns every project into an AI-powered workspace — where coding agents understand your architecture, remember your decisions, and code with knowledge.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/Vitest-295_Passing-green?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![npm](https://img.shields.io/npm/v/@nexus-framework/cli?style=for-the-badge&logo=npm&logoColor=white&label=npm)](https://www.npmjs.com/package/@nexus-framework/cli)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](https://github.com/GDA-Africa/nexus-cli/pulls)
[![Website](https://img.shields.io/badge/Website-nexus.glenhalton.com-8A2BE2?style=for-the-badge&logo=googlechrome&logoColor=white)](https://nexus.glenhalton.com)

---

*Where AI agents don't just write code — they understand why.*

</div>

---

## 🌍 About GDA Africa

**GDA (Glenhalton Digital Agency)** is building the digital infrastructure for Africa's next generation of products and services. NEXUS CLI is GDA's open-source developer framework — the bridge between human intent and AI execution, giving every project a brain that coding agents can link to, learn from, and build upon.

---

## 🎯 Why NEXUS?

Scaffolding tools generate files. NEXUS generates **understanding**.

Every project gets a documentation system AI agents can parse, a knowledge base they learn from, a project brain they check before every task, and a persona that makes them feel like a real teammate — not a generic autocomplete.

| Problem | NEXUS Solution |
|---|---|
| 🤖 AI tools (Cursor, Copilot, Windsurf) have no project-wide context | **NEXUS Knowledge System** — AI first structured files AI agents read automatically, covering vision → architecture → implementation |
| � AI agents forget everything between sessions | **Progressive Knowledge Base** — append-only memory AI agents scan before tasks and write to after discoveries |
| 🔄 AI agents don't know what to work on next | **Project Brain** (`index.md`) — status matrix, feature backlog, progress log, and "What's Next" priority queue |
| 😐 AI assistants feel generic and disconnected | **Agent Persona** — configurable tone, verbosity, identity. Your AI calls itself "Nexus" and speaks with intent |
| � Hours of setup and config guesswork | **2-minute interactive setup** — strategy-first questions, 6 frameworks, full toolchain, tests from day one |
| 📚 Docs and tests are always afterthoughts | **Generated from day one** — tests, CI/CD, ESLint, Prettier, and 8 AI-readable doc files included |

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🧠 AI-Native Intelligence
- **NEXUS Doc System** — 8 structured AI-readable docs per project
- **Project Brain** — `index.md` drives what AI agents work on next
- **Knowledge Base** — append-only memory that persists across sessions
- **Agent Persona** — tone, verbosity, identity, custom directives
- **Onboarding Protocol** — AI agents auto-populate docs on first run
- **Multi-Tool Support** — Cursor, Copilot, Windsurf, Cline, Claude Code

</td>
<td width="50%">

### ⚡ Production-Ready Scaffolding
- **6 Frameworks** — Next.js, React+Vite, SvelteKit, Nuxt, Astro, Remix
- **Strategy-First Setup** — asks about goals, not just tech preferences
- **Full Toolchain** — TypeScript, ESLint, Prettier pre-configured
- **Test Infrastructure** — Vitest/Jest config, example tests, helpers
- **CI/CD Templates** — GitHub Actions workflows out of the box
- **Pattern Support** — PWA, Offline-First, i18n, Theming, Real-time

</td>
</tr>
<tr>
<td width="50%">

### 🔧 Lifecycle Commands
- **`nexus init`** — scaffold a new project with full AI integration
- **`nexus adopt`** — add NEXUS to any existing codebase
- **`nexus upgrade`** — regenerate templates, preserve user work
- **`nexus repair`** — fix missing or corrupted NEXUS files
- **`nexus pack`** — zip `.nexus/` into a portable backup
- **`nexus unpack`** — restore from a backup zip with verification
- **`nexus update`** — self-update the CLI to the latest version

</td>
<td width="50%">

### 🧠 Skills System
- **`nexus skill list`** — see all skills installed in your project
- **`nexus skill registry`** — browse all available skills in the registry
- **`nexus skill new`** — scaffold a custom skill interactively
- **`nexus skill status`** — health-check all installed skills
- Pre-read instruction files so AI agents know *how* to do tasks
- Sourced from `@nexus-framework/skills` — updated independently

</td>
<td width="50%">

### 🛡️ Smart File Management
- **YAML Frontmatter Tracking** — knows which docs you've edited
- **Corruption Detection** — finds empty files, broken JSON, missing metadata
- **Preserve-or-Replace Logic** — never overwrites your populated docs
- **Manifest Recovery** — upgrades without re-prompting

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Install

```bash
npm install -g @nexus-framework/cli
```

### Create a Project

```bash
nexus init my-app
```

You'll be guided through an interactive setup:

```
🔮 NEXUS CLI v0.3.1 — AI-Native Development Framework

? What are you building?                › Web Application
? How will your app handle data?        › Cloud First
? Which application patterns?           › PWA, Theming
? Which frontend framework?             › Next.js 15 (App Router)
? Testing framework?                    › Vitest
? Package manager?                      › npm
? Initialize a git repository?          › Yes
? Install dependencies now?             › Yes
? 🎭 What vibe should your AI have?    › 😊 Friendly
? 📏 How detailed should responses be? › ⚖️ Balanced
? 🤖 I'm Nexus! What should I call myself? › Nexus
? ✨ Custom personality note?           › (skip)

✔ Project created successfully!

  cd my-app
  npm run dev
```

### Run It

```bash
cd my-app
npm run dev
# → Your app is running at http://localhost:3000
```

### What Happens Next

Open the project in your AI coding tool (Cursor, Copilot, Windsurf, Cline). The AI agent will:
1. **Detect the NEXUS instructions** automatically (`.cursorrules`, `.github/copilot-instructions.md`, etc.)
2. **Read `index.md`** — your project brain — to understand status and priorities
3. **Scan `knowledge.md`** — the progressive memory — for past decisions and gotchas
4. **Check for template docs** — if any have `status: template`, it will auto-populate them by scanning your codebase
5. **Start working** from the "What's Next" section — no more "what should I build?"

---

## 📦 What You Get

Every generated project includes:

| Output | What's Inside |
|---|---|
| `src/` | Framework-specific source code and branded landing page |
| `.nexus/docs/` | **The NEXUS Doc System** — 8 AI-readable files + project brain + knowledge base |
| `.nexus/ai/` | Master AI instructions — the single source of truth for agent behavior |
| `.nexus/skills/` | **Skills System** — `core/` (framework skills), `custom/` (yours), `community/` (registry) |
| Tool configs | `.cursorrules`, `.windsurfrules`, `.clinerules`, `AGENTS.md`, `.github/copilot-instructions.md` — each embeds full instructions |
| `tests/` | Vitest/Jest config, example tests, and test helpers |
| `package.json` | Real dependencies, real scripts — `npm run dev` works immediately |
| CI/CD | GitHub Actions workflow for lint, test, and build |
| Config | TypeScript, ESLint, Prettier, EditorConfig — all pre-configured |

### The NEXUS Doc System

| # | File | Purpose |
|---|------|---------|
| 🧠 | `index.md` | **Project Brain** — status, backlog, progress, what's next |
| 📚 | `knowledge.md` | **Knowledge Base** — append-only memory of decisions, gotchas, patterns |
| 1 | `01_vision.md` | Product requirements, user stories, success metrics |
| 2 | `02_architecture.md` | System design, tech stack, data flow |
| 3 | `03_data_contracts.md` | Database schemas, validation, relationships |
| 4 | `04_api_contracts.md` | Endpoints, interfaces, status codes |
| 5 | `05_business_logic.md` | Rules, algorithms, state machines |
| 6 | `06_test_strategy.md` | Coverage targets, test types, philosophy |
| 7 | `07_implementation.md` | Build order, file-by-file plan |
| 8 | `08_deployment.md` | Infrastructure, CI/CD, environment config |

---

## 🧠 Skills System

Skills are pre-read instruction files that tell AI agents *how* to execute tasks in your specific project — not just what to do, but the exact patterns, conventions, and anti-patterns your codebase follows.

Every project gets a `.nexus/skills/` directory with three zones:

```
.nexus/skills/
  README.md          ← auto-generated index agents read first
  core/              ← framework-matched skills from @nexus-framework/skills
  custom/            ← your own skills (created with nexus skill new, never touched by NEXUS)
  community/         ← skills installed from the registry
```

### Managing Skills

```bash
nexus skill list                         # what's installed in this project
nexus skill registry                     # browse everything in the registry
nexus skill registry --framework nextjs  # filter to one framework
nexus skill new                          # scaffold a custom skill interactively
nexus skill status                       # health-check: deprecated, invalid frontmatter
nexus skill install <pkg>                # install a community skill pack
nexus skill remove <name>                # remove a community skill
```

### Custom Skills

```bash
nexus skill new my-service-pattern
```

Guides you through setting a category, trigger phrases, and scaffolds a full markdown template. The AI agent reads this file before any task matching the triggers.

**Precedence:** `custom/` > `core/` > `community/` — your skills always win.

---

## 🎭 Agent Persona

NEXUS lets you configure how AI agents communicate when they're synced with your project.

| Option | Choices | Default |
|--------|---------|---------|
| **Tone** | 👔 Professional · 😊 Friendly · 🧠 Witty · 🧘 Zen · 🏴‍☠️ Pirate | Friendly |
| **Verbosity** | ⚡ Concise · ⚖️ Balanced · 📖 Detailed | Balanced |
| **Identity** | Name the AI uses for itself (persists across upgrades) | Nexus |
| **Custom directive** | Any freeform personality instruction | — |

When an AI agent reads the NEXUS instructions and sees the persona config, it adopts that personality. The user sees "Nexus" in responses — their signal that the agent has read the docs, scanned the knowledge base, and is synced with the project brain.

---

## 🏗️ Adopt an Existing Project

Already have a project? Add the NEXUS AI layer without touching your source code.

```bash
cd my-existing-app
nexus adopt
```

This adds `.nexus/docs/`, `.nexus/ai/`, and AI tool config files. It does **not** modify your source code, configs, or dependencies.

After adopting, your AI coding tool will auto-detect the NEXUS docs, scan your codebase to populate them, and ask you about anything it can't infer — giving the AI full project context from that point forward.

---

## 📖 Supported Frameworks

| Framework | Version | Notes |
|---|---|---|
| **Next.js** | 15 (App Router) | React Server Components, Turbopack |
| **React + Vite** | React 19 + Vite 6 | SWC, fast HMR |
| **SvelteKit** | 2.x | Svelte 5, file-based routing |
| **Nuxt** | 3.x | Vue 3, auto-imports |
| **Astro** | 5.x | Content-first, island architecture |
| **Remix** | 2.x | Nested routing, loaders/actions |

---

## 🗺️ Roadmap

### ✅ Shipped
- [x] Core CLI with `nexus init`, `nexus adopt`, `nexus upgrade`, `nexus repair`
- [x] Interactive prompt system (7 modules including persona)
- [x] Generator engine (8 modules: structure, docs, config, tests, CI/CD, landing page, AI config, skills)
- [x] AI-native documentation system (8 structured files + project brain + knowledge base + onboarding protocol)
- [x] Agent Persona system (tone, verbosity, identity, custom directives)
- [x] Multi-tool AI support (Cursor, Copilot, Windsurf, Cline, Claude Code)
- [x] 6 frontend frameworks supported
- [x] Smart file strategy (upgrade preserves user work, repair fixes corruption)
- [x] Progressive knowledge base (append-only, category-tagged, AI-scannable)
- [x] **Skills System** — `nexus skill` (6 subcommands), `.nexus/skills/`, sourced from `@nexus-framework/skills`
- [x] **`nexus pack` / `nexus unpack`** — portable `.nexus/` migration with zip + verification
- [x] **`nexus update`** — self-updating CLI + startup update notifications
- [x] 295 unit tests passing
- [x] Published to npm as `@nexus-framework/cli`
- [x] CI/CD with auto-publish to npm on version bump

### 🔜 Next Up (v0.3.x)
- [ ] E2E tests — generate a project, run its build, verify all files
- [ ] Framework-specific template content (not just landing pages)
- [ ] `nexus add <feature>` — add capabilities to existing NEXUS projects
- [ ] Improve error messages and edge case handling

### 🗓️ Near-term
- [ ] Plugin system for custom generators
- [ ] Template marketplace / community templates
- [ ] Web-based project configurator
- [ ] Docker template support
- [ ] Strategy pattern generators (PWA service workers, i18n setup, theming engine)

### 📋 Backlog
- [ ] `nexus eject` — remove NEXUS, keep code
- [ ] `nexus validate` — check project against NEXUS standards
- [ ] `nexus migrate` — migrate from CRA, etc.
- [ ] GitLab CI, Bitbucket Pipelines templates
- [ ] Pro tier features (paid AI-powered code generation)

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
git clone https://github.com/GDA-Africa/nexus-cli.git
cd nexus-cli && yarn install
yarn lint && yarn test    # 295 tests, zero lint errors
```

---

<div align="center">

---

**Built with ❤️ by [GDA Africa](https://github.com/GDA-Africa)** — Powering Africa's Digital Future

*NEXUS CLI is the open-source foundation of the NEXUS framework — where AI agents don't just write code, they understand your project. For questions, ideas, or collaboration, visit [nexus.glenhalton.com](https://nexus.glenhalton.com) or reach out to the GDA engineering team.*

---

</div>
