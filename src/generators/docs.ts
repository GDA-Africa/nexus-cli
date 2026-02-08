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
 */
export function generateDocs(config: NexusConfig): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push(generateVision(config));
  files.push(generateArchitecture(config));
  files.push(generateDataContracts(config));
  files.push(generateApiContracts(config));
  files.push(generateBusinessLogic(config));
  files.push(generateTestStrategy(config));
  files.push(generateImplementation(config));
  files.push(generateDeployment(config));
  files.push(generateNexusIndex(config));
  files.push(generateNexusManifest(config));

  return files;
}

function generateVision(config: NexusConfig): GeneratedFile {
  return {
    path: '.nexus/docs/01_vision.md',
    content: `${frontmatter('01_vision', 'Product Vision & Requirements')}# Product Vision & Requirements

**Project:** ${config.displayName}
**Created:** ${new Date().toISOString().split('T')[0]}
**Status:** 🟡 In Development

---

## 🎯 Product Vision

<!-- Describe what you're building and why. Be specific about the problem you're solving. -->

TODO: Write your product vision here.

---

## 👥 Target Users

<!-- Who are your users? What are their pain points? Create 2-3 personas. -->

TODO: Define your user personas.

---

## ✨ Core Features (MVP)

<!-- List your must-have features with acceptance criteria. -->

### Feature 1: [Feature Name]
**User Story:** As a [user], I want to [action] so that [benefit].

**Acceptance Criteria:**
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

---

## 🚫 Out of Scope (V1)

<!-- What are you explicitly NOT building? This is just as important. -->

- ❌ Item 1
- ❌ Item 2

---

## 📊 Success Metrics

<!-- How will you know if this project is successful? -->

| Metric | Target | Timeframe |
|--------|--------|-----------|
| TODO   | TODO   | TODO      |
`,
  };
}

function generateArchitecture(config: NexusConfig): GeneratedFile {
  return {
    path: '.nexus/docs/02_architecture.md',
    content: `${frontmatter('02_architecture', 'System Architecture')}# System Architecture

**Project:** ${config.displayName}
**Framework:** ${config.frontendFramework}
**Data Strategy:** ${config.dataStrategy}

---

## 🏗️ Architecture Overview

<!-- High-level diagram of your system. ASCII art or link to a diagram tool. -->

\`\`\`
TODO: Draw your architecture diagram here.
\`\`\`

---

## 🛠️ Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend  | ${config.frontendFramework} | Selected during project setup |
| Data      | ${config.dataStrategy} | ${config.dataStrategy} strategy |
| Testing   | ${config.testFramework} | Selected during project setup |

---

## 📁 Directory Structure

<!-- Document your folder conventions and where things go. -->

TODO: Document your project's directory conventions.

---

## 🔄 Data Flow

<!-- How does data move through your system? -->

TODO: Describe your data flow.
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

<!-- Define your data models, tables, relationships. -->

TODO: Define your data models.

---

## ✅ Validation Rules

<!-- What validation rules apply to your data? -->

TODO: Document validation rules.

---

## 🔗 Relationships

<!-- How do your data models relate to each other? -->

TODO: Document data relationships.
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

<!-- Define your API endpoints with request/response shapes. -->

### \`GET /api/example\`

**Description:** TODO

**Response:**
\`\`\`json
{
  "data": []
}
\`\`\`

---

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
  return {
    path: '.nexus/docs/05_business_logic.md',
    content: `${frontmatter('05_business_logic', 'Business Logic')}# Business Logic

**Project:** ${config.displayName}

---

## 📐 Business Rules

<!-- Document the core rules and logic of your application. -->

TODO: Define your business rules.

---

## 🔄 State Machines

<!-- If your app has complex state, document it here. -->

TODO: Document state machines and flows.

---

## 🧮 Algorithms

<!-- Any non-trivial algorithms or calculations. -->

TODO: Document algorithms.
`,
  };
}

function generateTestStrategy(config: NexusConfig): GeneratedFile {
  return {
    path: '.nexus/docs/06_test_strategy.md',
    content: `${frontmatter('06_test_strategy', 'Test Strategy')}# Test Strategy

**Project:** ${config.displayName}
**Framework:** ${config.testFramework}

---

## 🧪 Testing Philosophy

<!-- What's your approach to testing? What's the coverage target? -->

**Coverage Target:** 80%+

---

## 📋 Test Types

| Type | Tool | Coverage |
|------|------|----------|
| Unit | ${config.testFramework} | Core logic, utilities, validators |
| Integration | ${config.testFramework} | API routes, data flows |
| E2E | Playwright | Critical user journeys |

---

## 🏃 Running Tests

\`\`\`bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
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

## 🔨 Build Order

<!-- What order should features be built in? -->

### Phase 1: Foundation
- [ ] Project setup ✅ (done by NEXUS CLI)
- [ ] Core data models
- [ ] Basic UI layout

### Phase 2: Core Features
- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

### Phase 3: Polish
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design

---

## 📁 File-by-File Plan

<!-- For AI agents: list each file that needs to be created and what it should contain. -->

TODO: Create a file-by-file implementation plan.
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

<!-- Where and how will this be deployed? -->

TODO: Define your deployment strategy.

---

## 🔧 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| \`NODE_ENV\` | Environment | Yes | \`development\` |

---

## 📦 CI/CD

A GitHub Actions workflow has been generated at \`.github/workflows/ci.yml\`.

It runs on every push and PR to \`main\`:
1. ✅ Lint
2. ✅ Type check
3. ✅ Tests
4. ✅ Build
`,
  };
}

function generateNexusIndex(config: NexusConfig): GeneratedFile {
  return {
    path: '.nexus/index.md',
    content: `# NEXUS Project Index

**Project:** ${config.displayName}
**Generated:** ${new Date().toISOString().split('T')[0]}
**CLI Version:** ${version}

---

## 📚 Document Map

| Doc | Path | Purpose |
|-----|------|---------|
| Vision | \`.nexus/docs/01_vision.md\` | Product requirements & user stories |
| Architecture | \`.nexus/docs/02_architecture.md\` | System design & tech stack |
| Data Contracts | \`.nexus/docs/03_data_contracts.md\` | Database schemas & validation |
| API Contracts | \`.nexus/docs/04_api_contracts.md\` | Endpoints & interfaces |
| Business Logic | \`.nexus/docs/05_business_logic.md\` | Rules, algorithms & flows |
| Test Strategy | \`.nexus/docs/06_test_strategy.md\` | Testing philosophy & coverage |
| Implementation | \`.nexus/docs/07_implementation.md\` | Build order & file structure |
| Deployment | \`.nexus/docs/08_deployment.md\` | Infrastructure & CI/CD |

---

## 🤖 AI Agent Instructions

If you are an AI reading this project:

1. **Start with** \`.nexus/docs/01_vision.md\` to understand what this project does
2. **Read** \`.nexus/docs/02_architecture.md\` to understand the tech decisions
3. **Reference** \`.nexus/docs/03_data_contracts.md\` and \`.nexus/docs/04_api_contracts.md\` for exact schemas
4. **Follow** \`.nexus/docs/07_implementation.md\` for build order
5. **Run tests** after every change using the commands in \`.nexus/docs/06_test_strategy.md\`
`,
  };
}

function generateNexusManifest(config: NexusConfig): GeneratedFile {
  const manifest: NexusManifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    config,
    cli: {
      version,
      name: '@nexus-framework/cli',
    },
  };

  return {
    path: '.nexus/manifest.json',
    content: JSON.stringify(manifest, null, 2) + '\n',
  };
}
