/**
 * NEXUS CLI - Documentation Generator
 *
 * Generates the 8-file NEXUS documentation system plus the .nexus index and manifest.
 *
 * Each document includes YAML frontmatter with a `status` field:
 *   - `template`  — doc is in its default/scaffolded state (has TODO placeholders)
 *   - `populated` — doc has been filled in (by a human or AI agent)
 *
 * AI agents are instructed (via .nexus/ai/instructions.md) to check this
 * status and auto-populate template docs from codebase analysis.
 */

import type { NexusConfig, NexusManifest } from '../types/config.js';
import type { GeneratedFile } from '../types/templates.js';
import { version } from '../version.js';

/* ──────────────────────────────────────────────────────────────
 * Display helpers
 * ────────────────────────────────────────────────────────────── */

function getFrameworkDisplay(framework: string | null | undefined): string {
  const map: Record<string, string> = {
    nextjs: 'Next.js 15 (App Router)',
    'react-vite': 'React + Vite',
    sveltekit: 'SvelteKit',
    nuxt: 'Nuxt 3',
    astro: 'Astro',
    remix: 'Remix',
    none: 'None (no frontend)',
  };
  // Guard: partial manifests can leak null/undefined this far — never
  // render the literal string "undefined" into generated docs.
  if (!framework) return 'Unspecified';
  return map[framework] ?? framework;
}

/* ──────────────────────────────────────────────────────────────
 * Frontmatter helper
 * ────────────────────────────────────────────────────────────── */

/**
 * Generate YAML frontmatter block for a NEXUS doc.
 *
 * @param docId   - e.g. "01_vision", "02_architecture"
 * @param title   - human-readable title
 */
function frontmatter(docId: string, title: string): string {
  const now = new Date().toISOString().split('T')[0];
  return `---
nexus_doc: true
id: "${docId}"
title: "${title}"
status: template
confidence: low
last_updated: "${now}"
---

`;
}

/**
 * Generate all NEXUS documentation files for a new project.
 * 
 * @param config - Project configuration
 * @param localOnly - Whether to mark as local-only in manifest
 * @param adoptionContext - Optional context from pre-adoption interview (used to pre-fill docs)
 */
export function generateDocs(
  config: NexusConfig,
  localOnly = false,
  adoptionContext?: {
    projectDescription?: string;
    architectureType?: string;
    techStack?: string;
    painPoints?: string;
  },
): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push(generateVision(config, adoptionContext));
  files.push(generateArchitecture(config, adoptionContext));
  files.push(generateDataContracts(config));
  files.push(generateApiContracts(config));
  files.push(generateBusinessLogic(config));
  files.push(generateTestStrategy(config));
  files.push(generateImplementation(config));
  files.push(generateDeployment(config));
  files.push(generateProjectIndex(config, adoptionContext));
  files.push(generateKnowledge(config));
  files.push(generateNexusManifest(config, localOnly));
  files.push(generateAutoInvokeConfig());
  files.push(...generatePlansScaffold(config));
  files.push(generateStateScaffold());

  return files;
}

function generateAutoInvokeConfig(): GeneratedFile {
  return {
    path: '.nexus/auto-invoke.config.json',
    content: `${JSON.stringify({
      enabled: true,
      mode: 'silent',
      sync_interval_minutes: 60,
      auto_fix_doctor: false,
      disabled_for_commands: ['help'],
      always_prompt_for: ['plan'],
    }, null, 2)}\n`,
  };
}

/**
 * Scaffold `.nexus/state/` — home of the session handshake file.
 * `nexus wake` overwrites session.json on every invocation (spec §5.5).
 */
function generateStateScaffold(): GeneratedFile {
  return {
    path: '.nexus/state/session.json',
    content: `${JSON.stringify(
      {
        $schema: 'https://nexus-framework.dev/schemas/session.json',
        token: null,
        issued_at: null,
        brain_hash: null,
        brain_hash_inputs: ['docs/index.md', 'docs/knowledge.md', 'plans/_active.json'],
        active_plan: null,
        issued_by: 'nexus scaffold',
        note: 'Run `nexus wake` to issue the first handshake token.',
      },
      null,
      2,
    )}\n`,
  };
}

function generatePlansScaffold(config: NexusConfig): GeneratedFile[] {
  const today = new Date().toISOString().split('T')[0] ?? '';
  const starterId = `bootstrap-${config.projectName}-roadmap`;

  return [
    {
      path: '.nexus/plans/_active.json',
      content: JSON.stringify(
        {
          active: [],
          set_at: new Date().toISOString(),
          by: 'nexus scaffold',
        },
        null,
        2,
      ) + '\n',
    },
    {
      path: '.nexus/plans/index.md',
      content: `---
nexus_doc: true
id: "plans_index"
title: "NEXUS Plans Dashboard"
status: auto
generated_at: "${today}"
---

# Plans Dashboard

> This file is auto-rebuilt by \`nexus plan\` commands.

## Active

| ID | Title | Status | Owner | Updated | Phase |
|----|-------|--------|-------|---------|-------|
| — | (none) | — | — | — | — |

## Approved

| ID | Title | Status | Owner | Updated | Phase |
|----|-------|--------|-------|---------|-------|
| — | (none) | — | — | — | — |

## Draft

| ID | Title | Status | Owner | Updated | Phase |
|----|-------|--------|-------|---------|-------|
| [\`${starterId}\`](./${starterId}.md) | Bootstrap initial roadmap | 📝 draft | unassigned | ${today} | bootstrap |
`,
    },
    {
      path: `.nexus/plans/${starterId}.md`,
      content: `---
nexus_plan: true
id: "${starterId}"
title: "Bootstrap initial roadmap"
status: "draft"
created: "${today}"
updated: "${today}"
owner: "unassigned"
source: "nexus:scaffold"
parent: null
estimate: "1d"
phase: "bootstrap"
tags: ["chore"]
---

## Goal
Capture a first, durable roadmap for this project.

## Why
Plans persist multi-step work across sessions.

## Acceptance Criteria
- [ ] Define initial milestone list
- [ ] Identify first implementation slice

## Steps
- [ ] Add a new plan with \`nexus plan new\`
- [ ] Start it with \`nexus plan start <id>\`

## Notes
- scaffolded by NEXUS

## Evidence
- (to be filled)
`,
    },
  ];
}

function generateVision(
  config: NexusConfig,
  adoptionContext?: { projectDescription?: string; painPoints?: string },
): GeneratedFile {
  const visionContent = adoptionContext?.projectDescription
    ? adoptionContext.projectDescription
    : '<!-- What are you building and why? What problem does it solve? -->';

  const painPointsContent = adoptionContext?.painPoints
    ? `\n### Known Pain Points\n${adoptionContext.painPoints}\n`
    : '';

  return {
    path: '.nexus/docs/01_vision.md',
    content: `${frontmatter('01_vision', 'Product Vision & Requirements')}# Product Vision & Requirements

**Project:** ${config.displayName}

---

## 🎯 Product Vision
${visionContent}
${painPointsContent}
## 👥 Target Users
<!-- 2-3 personas: role, goals, pain points, needs -->

## ✨ Core Features (MVP)
<!-- List each feature with a user story + acceptance criteria.
     AI: After filling this, copy each feature into .nexus/docs/index.md Feature Backlog. -->

## 🚫 Out of Scope (V1)
<!-- What you are explicitly NOT building yet -->

## 📊 Success Metrics
<!-- How you'll measure success: metric, target, timeframe -->
`,
  };
}

function generateArchitecture(
  config: NexusConfig,
  adoptionContext?: { architectureType?: string; techStack?: string },
): GeneratedFile {
  const archTypeContent = adoptionContext?.architectureType
    ? `\n**Architecture Type:** ${adoptionContext.architectureType}\n`
    : '';

  const techStackContent = adoptionContext?.techStack
    ? `\n### Additional Technologies\n${adoptionContext.techStack}\n`
    : '';

  return {
    path: '.nexus/docs/02_architecture.md',
    content: `${frontmatter('02_architecture', 'System Architecture')}# System Architecture

**Project:** ${config.displayName}
**Framework:** ${config.frontendFramework}
**Data Strategy:** ${config.dataStrategy}${archTypeContent}
---

## 🏗️ Architecture Overview
<!-- High-level system diagram (ASCII or link to diagram tool) -->

## 🛠️ Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend  | ${config.frontendFramework} | Selected during project setup |
| Data      | ${config.dataStrategy} | ${config.dataStrategy} strategy |
| Testing   | ${config.testFramework} | Selected during project setup |
${techStackContent}
## 📁 Directory Structure
<!-- Folder conventions: what goes where and why -->

## 🔄 Data Flow
<!-- How data moves through the system: user → UI → store → API → DB -->
`,
  };
}

function generateDataContracts(config: NexusConfig): GeneratedFile {
  return {
    path: '.nexus/docs/03_data_contracts.md',
    content: `${frontmatter('03_data_contracts', 'Data Contracts')}# Data Contracts

**Project:** ${config.displayName}
**Data Strategy:** ${config.dataStrategy}

---

## 📊 Database Schema
<!-- Define data models, tables/collections, and their fields with types -->

## ✅ Validation Rules
<!-- Required fields, min/max, format constraints, custom validators -->

## 🔗 Relationships
<!-- How models relate: one-to-many, many-to-many, foreign keys -->
`,
  };
}

function generateApiContracts(config: NexusConfig): GeneratedFile {
  return {
    path: '.nexus/docs/04_api_contracts.md',
    content: `${frontmatter('04_api_contracts', 'API Contracts')}# API Contracts

**Project:** ${config.displayName}

---

## 🔌 Endpoints
<!-- Define each API endpoint: method, path, description, request/response shapes -->

## 📋 Status Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 400  | Bad Request |
| 401  | Unauthorized |
| 404  | Not Found |
| 500  | Internal Server Error |
`,
  };
}

function generateBusinessLogic(config: NexusConfig): GeneratedFile {
  const patterns = config.appPatterns;

  // Build pattern-specific sections based on user's selections
  const patternSections: string[] = [];

  if (patterns.includes('offline-first') || config.dataStrategy === 'local-first') {
    patternSections.push(`## 🔄 Sync & Conflict Resolution
<!-- How do local changes sync with the server? What happens on conflict?
     Define: sync trigger, queue structure, conflict strategy (last-write-wins / merge / user-prompt) -->`);
  }

  if (patterns.includes('real-time')) {
    patternSections.push(`## ⚡ Real-Time System
<!-- WebSocket or SSE? What events are broadcast? Who receives them?
     Define: connection lifecycle, event types, reconnection strategy, presence -->`);
  }

  if (patterns.includes('pwa')) {
    patternSections.push(`## 📲 PWA / Service Worker
<!-- What is cached? Cache strategy (cache-first / network-first)?
     Define: cache manifest, update flow, install prompt timing -->`);
  }

  if (patterns.includes('theming')) {
    patternSections.push(`## 🎨 Theming System
<!-- CSS variables? Theme provider? How are themes stored and applied?
     Define: theme shape (colors, fonts, spacing), persistence, switching logic -->`);
  }

  if (patterns.includes('i18n')) {
    patternSections.push(`## 🌍 Internationalization (i18n)
<!-- Which i18n library? How are translations structured?
     Define: default locale, supported locales, namespace strategy, lazy loading -->`);
  }

  if (patterns.includes('white-label')) {
    patternSections.push(`## 🏷️ White Label / Multi-Tenant
<!-- How are tenants identified? Subdomain, path, or config?
     Define: tenant resolution, per-tenant config shape, branding override points -->`);
  }

  const patternContent = patternSections.length > 0
    ? patternSections.join('\n\n') + '\n'
    : '';

  return {
    path: '.nexus/docs/05_business_logic.md',
    content: `${frontmatter('05_business_logic', 'Business Logic')}# Business Logic

**Project:** ${config.displayName}

---

## 📐 Business Rules
<!-- Core rules of the application: what can/can't happen, constraints, permissions -->

## 🔄 State Machines
<!-- Complex state flows: e.g. task lifecycle, auth flow, checkout process -->

## 🧮 Algorithms
<!-- Non-trivial logic: scoring, sorting, filtering, calculations -->

${patternContent}`,
  };
}

function generateTestStrategy(config: NexusConfig): GeneratedFile {
  const pm = config.packageManager;
  const runCmd = pm === 'npm' ? 'npm run' : pm;

  return {
    path: '.nexus/docs/06_test_strategy.md',
    content: `${frontmatter('06_test_strategy', 'Test Strategy')}# Test Strategy

**Project:** ${config.displayName}
**Framework:** ${config.testFramework}

---

## 🧪 Testing Philosophy
<!-- Coverage target, what gets tested, what doesn't -->

**Coverage Target:** 80%+

## 📋 Test Types

| Type | Tool | Coverage |
|------|------|----------|
| Unit | ${config.testFramework} | Core logic, utilities, validators |
| Integration | ${config.testFramework} | API routes, data flows |
| E2E | Playwright | Critical user journeys |

## 🏃 Running Tests

\`\`\`bash
${runCmd} test              # Run all tests
${runCmd} test -- --watch   # Watch mode
\`\`\`
`,
  };
}

function generateImplementation(config: NexusConfig): GeneratedFile {
  return {
    path: '.nexus/docs/07_implementation.md',
    content: `${frontmatter('07_implementation', 'Implementation Plan')}# Implementation Plan

**Project:** ${config.displayName}

---

## 🎯 Current Phase

<!-- AI: After populating this doc, set the current phase based on what exists in the codebase. -->

**Active Phase:** TODO — Set this to the current build phase
**Blocked:** None

---

## 🔨 Build Phases

<!-- AI: Derive these phases from 01_vision.md features. Each phase should be a coherent milestone. -->

### Phase 1: Foundation
**Goal:** Project skeleton, core data models, basic navigation

| Task | File(s) | Status | Notes |
|------|---------|--------|-------|
| Project setup | (auto) | ✅ Done by NEXUS CLI | — |
| Core data models / types | \`src/types/\` or \`src/lib/\` | TODO | Define from 03_data_contracts.md |
| Basic layout / navigation | \`src/app/\` or \`src/routes/\` | TODO | — |
| Database / storage setup | \`src/lib/\` | TODO | Match data strategy: ${config.dataStrategy} |

### Phase 2: Core Features (MVP)
**Goal:** Implement the features from 01_vision.md that make this usable

| Task | File(s) | Status | Notes |
|------|---------|--------|-------|
| Feature 1 | TODO | TODO | — |
| Feature 2 | TODO | TODO | — |
| Feature 3 | TODO | TODO | — |

### Phase 3: Polish & Quality
**Goal:** Error handling, loading states, tests, responsive design

| Task | File(s) | Status | Notes |
|------|---------|--------|-------|
| Error boundaries / handling | TODO | TODO | — |
| Loading / skeleton states | TODO | TODO | — |
| Unit tests for core logic | \`tests/unit/\` | TODO | Match 06_test_strategy.md |
| Responsive design | TODO | TODO | — |

### Phase 4: Deployment
**Goal:** CI/CD, environment config, production deploy

| Task | File(s) | Status | Notes |
|------|---------|--------|-------|
| CI/CD pipeline | \`.github/workflows/\` | ✅ Generated | — |
| Environment variables | \`.env.example\` | TODO | See 08_deployment.md |
| Production deploy | TODO | TODO | — |

---

## 📁 File-by-File Plan

<!-- AI: After populating 01_vision.md, list every file that needs creating.
     Also copy each feature into .nexus/docs/index.md Feature Backlog table. -->

| # | File Path | Purpose | Status |
|---|-----------|---------|--------|

---

## 🧪 Testing Plan

| Test File | What It Tests | Status |
|-----------|--------------|--------|

---

## ⚠️ AI Agent: How To Use This File

1. **Derive phases from \`01_vision.md\`** — turn user stories into build phases
2. **Copy each feature into \`.nexus/docs/index.md\` Feature Backlog** — that drives all work
3. **Fill the file-by-file plan** — list every file with its purpose
4. **Update status as you work** — mark tasks ✅ when done
5. **This file answers "what code do I write next?"**
`,
  };
}

function generateDeployment(config: NexusConfig): GeneratedFile {
  return {
    path: '.nexus/docs/08_deployment.md',
    content: `${frontmatter('08_deployment', 'Deployment')}# Deployment

**Project:** ${config.displayName}

---

## 🚀 Deployment Strategy
<!-- Where and how will this be deployed? Platform, region, scaling -->

## 🔧 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| \`NODE_ENV\` | Environment | Yes | \`development\` |

## 📦 CI/CD

GitHub Actions workflow at \`.github/workflows/ci.yml\` runs on push/PR to \`main\`:
lint → typecheck → test → build
`,
  };
}

/* ──────────────────────────────────────────────────────────────
 * Project Index — THE AI AGENT'S BRAIN
 *
 * This is THE most important file in the NEXUS system.
 * It's NOT just a doc to fill in — it's the living project tracker
 * that the AI agent must use to know:
 *   - What's been built
 *   - What to build next
 *   - Current blockers
 *   - Feature backlog
 *   - Session-by-session progress
 *
 * The agent must READ this before every task and UPDATE it after.
 * ────────────────────────────────────────────────────────────── */

function generateProjectIndex(
  config: NexusConfig,
  adoptionContext?: { projectDescription?: string; painPoints?: string },
): GeneratedFile {
  const frameworkDisplay = getFrameworkDisplay(config.frontendFramework);
  const now = new Date().toISOString().split('T')[0];

  // Pre-fill the current objective if we have adoption context
  const activeTask = adoptionContext?.projectDescription
    ? 'Review and expand pre-filled vision from adoption interview'
    : "Populate NEXUS docs from user's project vision";

  const statusNote = adoptionContext?.projectDescription
    ? '🟡 Partially filled from adoption interview'
    : '🔴 Template';

  return {
    path: '.nexus/docs/index.md',
    content: `${frontmatter('project_index', 'Project Index — AI Agent Brain')}# ${config.displayName} — Project Index

> **🧠 THIS IS THE AI AGENT'S BRAIN.**
> This is NOT just another doc to fill in. This is the living project tracker.
> AI agents MUST read this file before every task and update it after every task.

**Project:** ${config.displayName}
**Framework:** ${frameworkDisplay}
**Data Strategy:** ${config.dataStrategy}
**Created:** ${now}
**Status:** 🟡 Scaffolded — Awaiting vision + first feature

---

<!-- NEXUS:VITAL_SIGNS:START — managed by \`nexus sync\` -->
## 🩺 Vital Signs (auto)

_Last sync: not yet synced_

| Sensor | Reading |
|--------|---------|
| Last commit | not available |
| Tests | not yet measured |
| Coverage | not collected · M1 sensor adds \`vitest --coverage\` parsing |
| Stale folders | not measured |
| Packages | not yet measured |
<!-- NEXUS:VITAL_SIGNS:END -->

---

## 🎯 Current Objective

<!-- AI: This section must ALWAYS reflect what you're working on RIGHT NOW.
     Update it at the start of every task. -->

**Current Phase:** Phase 1 — Foundation
**Active Task:** ${activeTask}
**Blocked:** None
**Next Up:** See "What's Next" section below

---

## 📊 Project Status Matrix

<!-- AI: Update these statuses as you complete work. This is how you track progress. -->

| Area | Status | Notes |
|------|--------|-------|
| 📋 Vision & Requirements | ${statusNote} | ${adoptionContext?.projectDescription ? 'See .nexus/docs/01_vision.md' : 'Needs user input → `.nexus/docs/01_vision.md`'} |
| 🏗️ Architecture | ${statusNote} | ${adoptionContext?.projectDescription ? 'See .nexus/docs/02_architecture.md' : 'Auto-fill from codebase → `.nexus/docs/02_architecture.md`'} |
| 📊 Data Contracts | 🔴 Template | Define from code → \`.nexus/docs/03_data_contracts.md\` |
| 🔌 API Contracts | 🔴 Template | Define from code → \`.nexus/docs/04_api_contracts.md\` |
| 📐 Business Logic | 🔴 Template | Needs user input → \`.nexus/docs/05_business_logic.md\` |
| 🧪 Test Strategy | 🔴 Template | Auto-fill from code → \`.nexus/docs/06_test_strategy.md\` |
| 🔨 Implementation Plan | 🔴 Template | Build from vision → \`.nexus/docs/07_implementation.md\` |
| 🚀 Deployment | 🔴 Template | Auto-fill from code → \`.nexus/docs/08_deployment.md\` |
| 🏠 Core Features | 🔴 Not started | See feature backlog below |
| 🧪 Tests | 🔴 Not started | — |

---

## 🗂️ Feature Backlog

<!-- AI: After populating 01_vision.md, copy EVERY Core Feature into this table.
     Assign each a priority and phase. This is the ONLY list you work from. -->

| # | Feature | Priority | Status | Phase | Notes |
|---|---------|----------|--------|-------|-------|

---

## 📁 What Has Been Built

<!-- AI: Update this as you create files. Track every module, component, and test.
     This is how you know what exists and what doesn't. -->

### Source Files

| Module | Files | Status | Description |
|--------|-------|--------|-------------|
| Project scaffold | \`package.json\`, \`tsconfig.json\`, configs | ✅ | Generated by NEXUS CLI |
| Landing page | \`src/\` (framework-specific) | ✅ | NEXUS branded starter page |
| NEXUS docs | \`.nexus/docs/\` (8 files + index) | 🟡 Template | Awaiting population |
| AI config | \`.nexus/ai/\` + root files | ✅ | AI agent instructions |
| CI/CD | \`.github/workflows/ci.yml\` | ✅ | Lint + typecheck + test + build |

### Tests

| File | Tests | Covers |
|------|-------|--------|
| TODO | TODO | TODO |

---

## 🔄 Progress Log

<!-- AI: Add an entry here every time you complete meaningful work.
     This is the project's changelog and your memory across sessions. -->

### ${now} — Project Created
- ✅ Scaffolded with NEXUS CLI (${frameworkDisplay}, ${config.dataStrategy})
- ✅ Generated project structure, configs, landing page, CI/CD
- ✅ Generated NEXUS documentation system (8 template docs)
- ⏳ Docs need to be populated with project-specific content

---

## 🎯 What's Next (Prioritized)

<!-- AI: THIS IS YOUR TODO LIST. Work through it top to bottom.
     After completing an item, move it to the Progress Log and update the status matrix.
     Add new items as they emerge. -->

### 🔴 Do First (Before Any Feature Work)
1. **Populate NEXUS docs** — Read the codebase + ask the user about their vision, then fill in all 8 docs (see onboarding protocol in AI instructions)
2. **Build the implementation plan** — Turn features from \`01_vision.md\` into concrete build phases in \`07_implementation.md\` with a file-by-file plan
3. **Update this index** — Fill in the feature backlog, status matrix, and "What Has Been Built" sections

### 🟡 Then Build (Phase 1 — Foundation)
4. **Core data models / types** — Define from \`03_data_contracts.md\`
5. **Basic layout / navigation** — Main app shell, routing
6. **Database / storage setup** — Match data strategy: ${config.dataStrategy}

### 🟢 Then Build (Phase 2 — Core Features)
7. **Feature 1** — TODO (derive from vision)
8. **Feature 2** — TODO (derive from vision)
9. **Feature 3** — TODO (derive from vision)

---

## ⚠️ AI Agent Operating Rules

**YOU MUST FOLLOW THESE RULES. They are not suggestions.**

1. **READ this file before EVERY task** — it tells you what to do next
2. **UPDATE this file after EVERY task** — move completed items to Progress Log, update status matrix
3. **DON'T ask "what enhancements would you like?"** — check the "What's Next" section instead
4. **DON'T treat docs as one-time fill-ins** — they are living documents, update them as the project evolves
5. **The feature backlog is your roadmap** — suggest the next item from it, don't invent random features
6. **The implementation plan (\`07_implementation.md\`) tells you WHAT CODE to write** — check it before every feature
7. **The progress log is your memory** — add entries so you (or the next agent) know what happened
8. **If the user asks for a feature, check if it's already in the backlog** — if yes, just build it; if no, add it first
9. **After every session, ensure this file reflects reality** — statuses, progress, blockers, next steps
10. **Learn as you go** — when you discover something non-obvious (bug pattern, architecture insight, package quirk), append it to \`.nexus/docs/knowledge.md\`. Scan that file before making big decisions.

---

*Generated by [NEXUS CLI](https://github.com/GDA-Africa/nexus-cli) v${version} — AI-native project scaffolding by [GDA Africa](https://github.com/GDA-Africa)*
`,
  };
}

/* ──────────────────────────────────────────────────────────────
 * Progressive Knowledge Base — .nexus/docs/knowledge.md
 *
 * An append-only living document. AI agents add entries as they
 * learn things about the project — architectural decisions,
 * bug patterns, package quirks, performance findings, etc.
 *
 * NOT a template doc (no status: template frontmatter).
 * Agents should NEVER delete entries — only append.
 * ────────────────────────────────────────────────────────────── */

function generateKnowledge(config: NexusConfig): GeneratedFile {
  const now = new Date().toISOString().split('T')[0];

  return {
    path: '.nexus/docs/knowledge.md',
    content: `# ${config.displayName} — Knowledge Base

> **Progressive learning file.** AI agents append entries here as they discover
> project-specific insights. This file grows organically — never delete entries.

---

## How This Works

- **When to add:** After discovering something non-obvious — a bug pattern, an architecture decision, a package quirk, a performance finding, a convention choice
- **When NOT to add:** Routine task completion (that goes in \`index.md\` Progress Log)
- **Format:** One entry = category tag + one-line insight + optional detail line
- **When to read:** Before making architectural decisions, debugging recurring issues, or choosing packages/patterns — scan for relevant categories first

---

## Categories

| Tag | Use When |
|-----|----------|
| \`architecture\` | Design decisions, structural choices, why X over Y |
| \`bug-fix\` | Recurring bugs, root causes, things to watch for |
| \`pattern\` | Code patterns that work well (or don't) in this project |
| \`package\` | Package quirks, version issues, config gotchas |
| \`performance\` | Bottlenecks found, optimizations applied |
| \`convention\` | Team/project conventions established during development |
| \`gotcha\` | Non-obvious traps, edge cases, things that wasted time |

---

## Entries

<!-- AI: Append new entries below this line. Format:

### [CATEGORY] Short title
**${now}** — One-line insight.
Optional: Brief supporting detail (1-2 sentences max).

-->

### [convention] Project scaffolded with NEXUS CLI
**${now}** — This project was generated with NEXUS CLI. Follow the doc system in \`.nexus/docs/\` and always read \`index.md\` (the brain) before each task.
`,
  };
}

 
function generateNexusManifest(config: NexusConfig, localOnly = false): GeneratedFile {
  const manifest: NexusManifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    config,
    cli: {
      version,
      name: '@nexus-framework/cli',
    },
    localOnly,
  };

  return {
    path: '.nexus/manifest.json',
    content: JSON.stringify(manifest, null, 2) + '\n',
  };
}
