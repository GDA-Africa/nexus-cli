---
nexus_doc: true
id: "03_data_contracts"
title: "Data Contracts"
status: populated
confidence: high
last_updated: "2026-08-24"
---

# Data Contracts

**Project:** NEXUS CLI
**Data Strategy:** local-only — all "data" is markdown/JSON on disk inside a target project's `.nexus/` directory. NEXUS has no database; the shapes below are the schemas its generators write and its readers/MCP tools parse.

---

## 📊 Data Models

### `NexusConfig` / `NexusManifest` (`src/types/config.ts`)
The resolved project configuration, written to `manifest.json` in every generated/adopted project.

```ts
interface NexusConfig {
  projectName: string;          // slug, used for folder + package.json name
  displayName: string;
  projectType: 'web' | 'api' | 'monorepo' | 'mobile' | 'desktop' | 'ui-library';
  dataStrategy: 'local-only' | 'local-first' | 'cloud-first' | 'hybrid';
  appPatterns: ('pwa' | 'offline-first' | 'theming' | 'white-label' | 'i18n' | 'real-time')[];
  frontendFramework: 'nextjs' | 'react-vite' | 'sveltekit' | 'nuxt' | 'remix' | 'astro' | 'none';
  backendStrategy: 'integrated' | 'separate' | 'serverless' | 'baas';
  backendFramework: 'express' | 'fastify' | 'nestjs' | 'spring-boot' | 'none';
  testFramework: 'vitest' | 'jest' | 'none';
  packageManager: 'npm' | 'yarn' | 'pnpm';
  git: boolean;
  installDeps: boolean;
  persona: NexusPersona;
  localOnly?: boolean;           // .nexus/ gitignored
  enableSkills?: boolean;
  enableAgents?: boolean;
  uiProvider?: UiProvider;        // 'none' | delegated UI generator
}

interface NexusPersona {
  tone: 'professional' | 'friendly' | 'witty' | 'zen' | 'pirate';
  verbosity: 'concise' | 'balanced' | 'detailed';
  identity: string;               // self-referential name, default "Nexus"
  customDirective: string;
}

interface NexusManifest {
  version: string;
  generatedAt: string;
  config: NexusConfig;
  cli: { version: string; name: string };
  localOnly?: boolean;
}
```

`utils/manifest.ts` normalizes partial/older manifests at read time (defaults for missing fields) so `upgrade`/`repair` never render `undefined` into generated docs — this was a real production bug (v1.1.3), see `knowledge.md`.

### Doc frontmatter (every `.nexus/docs/NN_*.md`)
```ts
{
  nexus_doc: true;
  id: string;             // matches filename, e.g. "02_architecture"
  title: string;
  status: 'template' | 'populated';
  confidence: 'low' | 'medium' | 'high';
  last_updated: string;   // "YYYY-MM-DD"
}
```
`status` is the load-bearing field for the **Smart File Strategy**: `upgrade`/`repair` only overwrite a doc when its frontmatter is explicitly `status: template`; anything else (including missing frontmatter) is preserved. See `05_business_logic.md`.

### `PlanFrontmatter` / `PlanDocument` (`src/utils/plans/types.ts`)
```ts
type PlanStatus = 'draft' | 'approved' | 'in_progress' | 'blocked' | 'done' | 'abandoned';

interface PlanFrontmatter {
  nexus_plan?: boolean;
  id: string;
  title: string;
  status: PlanStatus;
  created?: string;
  updated?: string;
  owner?: string;
  source?: string;
  type?: string;            // feature | bug | refactor | spike | chore
  major?: boolean;          // opts a `bug` plan into the alignment gate
  parent?: string | null;
  estimate?: string;
  phase?: string;
  tags?: string[];
}

interface PlanDocument {
  frontmatter: PlanFrontmatter;
  preamble: string;
  sections: PlanSection[];  // { heading, content }
}
```
Plans live as one markdown file per plan under `.nexus/plans/`, plus `_active.json` (`ActivePlansState`) pointing at the currently active plan(s).

### `KnowledgeEntry` (`src/utils/knowledge.ts`)
Parsed from `.nexus/docs/knowledge.md`, an append-only log:
```ts
interface KnowledgeEntry {
  category: string;              // e.g. "architecture", "gotcha"
  title: string;
  date: string | null;           // YYYY-MM-DD
  summary: string;                // one-line rollup for knowledge-summary.md
  expiresAfterVersion: string | null;
  raw: string[];                  // original markdown lines
}
```
Heading format: `### [category] Title`. Entries are never deleted — `nexus consolidate` builds `knowledge-summary.md` as a derived view, not a replacement.

### Skill frontmatter (`src/utils/skills/types.ts`) — SKILL_SPEC v2.0.0
```ts
category: 'ui' | 'routing' | 'data' | 'testing' | 'api' | 'config' | 'workflow' | 'procedure' | 'integration';
invocation: 'model' | 'user';
status: 'active' | 'draft' | 'deprecated';
framework: 'next.js' | 'react-vite' | 'sveltekit' | 'nuxt' | 'astro' | 'remix' | 'go' | 'python' | 'rust' | 'shared';
gate?: SkillGate;   // only legal on invocation: 'model' skills
```

## ✅ Validation Rules

- **Project name → slug** (`src/utils/validator.ts`): must slugify to a non-empty string, pass `validate-npm-package-name`, and the target directory must not already exist.
- **Doc frontmatter**: `status` must be exactly `template` or `populated`; anything else is treated as "not corrupted, don't touch" by the smart file strategy (`isCorrupted()` no longer flags missing frontmatter as corrupt — that was the root cause of the 2026-06-11 data-loss incident, fixed and regression-tested).
- **Plan transitions**: enforced by `assertTransition()` (`src/utils/plans/lifecycle.ts`) — invalid transitions throw rather than silently writing bad state. See the state machine in `05_business_logic.md`.
- **Manifest config**: normalized via `normalizeManifestConfig()` before any generator consumes it, so partial/legacy manifests never leak `undefined` into rendered output.
- **MCP tool inputs**: every tool in `src/mcp/tools.ts` has an explicit zod schema; malformed input is rejected by the SDK before the handler runs.

## 🔗 Relationships

- `NexusManifest.config` is the single source of truth every generator and doc template renders from.
- A `PlanDocument`'s `frontmatter.type` + `major` flag determine whether `skills/gate.ts`'s alignment gate applies (`DEFAULT_GATED_PLAN_TYPES = ['feature', 'refactor', 'spike']`, plus `bug` when `major: true`).
- `index.md`'s "Vital Signs" fenced block is a rendered snapshot of `src/utils/sensors/*` output — not hand-edited; `nexus sync` is the only writer.
- `knowledge-summary.md` is derived 1:1 from `knowledge.md` entries by `nexus consolidate` — never edited directly.
