<div align="center">

# 🔮 NEXUS CLI

### AI-Native Project Scaffolding

**The open-source CLI by [GDA Africa](https://github.com/GDA-Africa) that generates production-ready, AI-optimized project structures — so you ship faster and smarter.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/Vitest-105_Passing-green?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](https://github.com/GDA-Africa/nexus-cli/pulls)

---

*Where documentation drives development and AI agents are first-class citizens.*

</div>

---

## 🌍 About GDA Africa

**GDA (Glenhalton Digital Agency)** is building the digital infrastructure for Africa's next generation of products and services. NEXUS CLI is GDA's open-source developer tool — a scaffolding engine that generates intelligent project structures where AI and humans collaborate from day one.

---

## 🎯 Why NEXUS?

Every new project starts with the same ritual: hours of boilerplate, fragmented configs, and zero documentation. NEXUS eliminates all of that.

| Problem | NEXUS Solution |
|---|---|
| 🕐 Hours of setup and config guesswork to start a project | **2-minute interactive setup** with strategy-first questions and smart defaults |
| 🤖 AI tools (Cursor, Copilot) have no project-wide context | **8 structured doc files** AI agents can parse, execute, and auto-populate |
| 🧪 Tests and docs are always afterthoughts | **Generated from day one** — test infrastructure, CI/CD, and documentation included |
| 🔄 No conventions exist for AI-native development | **The first framework built for the AI era** — bridging requirements and code generation |

---

## ✨ Features

<table>
<tr>
<td width="50%">

### Core Capabilities
- 🧠 **Strategy-First Setup** — Asks about your goals, not just tech preferences
- 📐 **Complete Scaffolding** — Production-ready structure, not hello world
- 📚 **NEXUS Doc System** — 8 AI-optimized markdown files per project
- 🎯 **Smart Defaults** — Best practices baked in based on your choices
- 🧪 **Test Infrastructure** — Vitest config, example tests, and helpers included

</td>
<td width="50%">

### Production Ready
- ⚡ **5 Frameworks** — Next.js, React+Vite, SvelteKit, Nuxt, Astro
- 🔧 **Full Toolchain** — TypeScript, ESLint, Prettier pre-configured
- 🚀 **CI/CD Templates** — GitHub Actions workflows out of the box
- 🏗️ **Adopt Existing Projects** — Add NEXUS to any codebase with `nexus adopt`
- 📦 **Strategy Patterns** — PWA, Offline-First, i18n, Theming, Real-time

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
🔮 NEXUS CLI v0.1.2 — AI-Native Project Scaffolding

? What are you building?                › Web Application
? How will your app handle data?        › Cloud First
? Which application patterns?           › PWA, Theming
? Which frontend framework?             › Next.js 15 (App Router)
? Testing framework?                    › Vitest
? Package manager?                      › npm
? Initialize a git repository?          › Yes
? Install dependencies now?             › Yes

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

---

## 📦 What You Get

Every generated project includes:

| Output | What's Inside |
|---|---|
| `src/` | Framework-specific source code and landing page |
| `.nexus/docs/` | 8 AI-optimized documentation files (vision, architecture, API contracts, test strategy, etc.) |
| `.nexus/ai/` | AI agent instructions — Copilot, Cursor, Windsurf, Cline all auto-detect these |
| `tests/` | Vitest config, example tests, and test helpers |
| `package.json` | Real dependencies, real scripts — `npm run dev` works immediately |
| CI/CD | GitHub Actions workflow for lint, test, and build |
| Config | TypeScript, ESLint, Prettier, EditorConfig — all pre-configured |

---

## 🏗️ Adopt an Existing Project

Already have a project? Add the NEXUS documentation system and AI config without touching your source code.

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

---

## 🗺️ Roadmap

- [x] Core CLI with `nexus init` and `nexus adopt`
- [x] Interactive prompt system (project type, data strategy, patterns, frameworks)
- [x] Generator engine (structure, docs, config, tests, CI/CD, landing page, AI config)
- [x] AI-native documentation system (8 structured files + onboarding protocol)
- [x] 5 frontend frameworks supported
- [x] 105 unit tests passing
- [x] Published to npm as `@nexus-framework/cli`
- [ ] End-to-end testing of full `nexus init` flow
- [ ] Strategy pattern generators (PWA service workers, i18n setup, theming engine)
- [ ] `nexus add <feature>` — add capabilities to existing projects
- [ ] `nexus validate` — check projects against NEXUS standards
- [ ] Community templates and plugin system

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
git clone https://github.com/GDA-Africa/nexus-cli.git
cd nexus-cli && yarn install
yarn lint && yarn test
```

---

<div align="center">

---

**Built with ❤️ by [GDA Africa](https://github.com/GDA-Africa)** — Powering Africa's Digital Future

*NEXUS CLI is the open-source foundation of the NEXUS framework. For questions, ideas, or collaboration, reach out to the GDA engineering team.*

---

</div>
