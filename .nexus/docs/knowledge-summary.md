---
nexus_doc: true
id: "knowledge_summary"
title: "NEXUS CLI — Knowledge (Consolidated View)"
status: auto
generated_from:
  - ".nexus/docs/knowledge.md (current — v1.0 era, 11 entries)"
  - ".nexus/knowledge.md (legacy — original build, 61 entries, kept verbatim)"
generated_at: "2026-05-02"
generator: "hand-bootstrapped (M4 `nexus consolidate` will rebuild this deterministically)"
last_updated: "2026-05-02"
---

# NEXUS CLI — Knowledge (Consolidated View)

> **What this is.** A scannable rollup of every knowledge entry across both
> `knowledge.md` files, grouped by category tag. Read this first. The raw entries
> are the archaeology — open them when you need the original wording or full
> context.
>
> **Sources.**
> - **Current:** [`./knowledge.md`](./knowledge.md) — 11 entries, all 2026-05-02, v1.0 design era.
> - **Legacy:** [`../knowledge.md`](../knowledge.md) — 61 entries, Feb 2026, original CLI build. Preserved verbatim, never rewritten.
>
> **Generated.** This file is auto-rebuilt by `nexus consolidate` once M4 ships.
> Until then it's hand-maintained alongside `knowledge.md` edits.

---

## At-a-glance — entries by tag

| Tag | Current | Legacy | Total | What's here |
|-----|--------:|-------:|------:|-------------|
| `architecture` | 1 | 26 | 27 | Generator pattern, type unions, manifest recovery, command roles, agent persona |
| `pattern` | 3 | 11 | 14 | Template fences, snapshots, progressive knowledge, token-efficient docs |
| `gotcha` | 2 | 11 | 13 | git platform diffs, ESM mocking, knowledge path, yarn↔npm, instruction drift |
| `convention` | 3 | 9 | 12 | Async-first, ESM imports, release ritual, test floor, identity evolution |
| `v1.0-design` | 2 | 0 | 2 | Sensors-as-pure-functions, Vital Signs HTML fences |
| `package` | 0 | 1 | 1 | Commander action-handler types |
| `performance` | 0 | 1 | 1 | Generated arrays are cheap |
| `bug-fix` | 0 | 1 | 1 | (legacy) |
| `feature` | 0 | 1 | 1 | (legacy) |
| **Total** | **11** | **61** | **72** | |

---

## architecture (27 entries)

The deepest cluster. Five durable insights worth knowing before you touch core code:

- **Generator pattern: never write to disk inside generators.** Generators return file arrays; commands write. Decouples logic from I/O and makes generators trivially testable. *(legacy 2026-02-07)*
- **Type unions as source of truth.** Every framework, data strategy, and pattern is a TypeScript union, not a string. The compiler enforces exhaustive switches everywhere. *(legacy 2026-02-07)*
- **Reconcile pattern for upgrade/repair.** `upgrade`, `repair`, `adopt` all reduce to one reconcile primitive that takes a desired state + actual state and emits a diff plan. Adding a new "fix" command is mostly configuration. *(legacy 2026-02-08)*
- **Smart-file-strategy via YAML frontmatter `status:`.** `template` → safe to overwrite on upgrade; `populated` → preserve. The single mechanism that lets users customize without losing work. *(legacy 2026-02-08)*
- **Commands are thin wrappers around utils.** `src/commands/*.ts` parse args, call `src/utils/*.ts`, format errors. Business logic lives in utils; commands are easy to test, reuse, and pipe. **This pattern is load-bearing for v1.0** — every new command (sync, doctor, brief, wake, plan, consolidate) follows it. *(current 2026-05-02)*

Other notable architecture entries:
- File strategy categories · isCorrupted() heuristics · Manifest recovery for upgrade · adopt vs init vs upgrade vs repair · Pre-adoption interview · Project detector signals · Cognitive scaffolding for older LLMs · Agent Persona system design · Required field cascade on NexusConfig · Persona identity: string name not boolean

> **Full entries:** [legacy `knowledge.md`](../knowledge.md) (search `architecture`), [current `knowledge.md`](./knowledge.md#architecture-commands-are-thin-wrappers-around-utils)

---

## pattern (14 entries)

How code in this repo is *shaped*:

- **Template fences = safe file mutation.** `<!-- NEXUS:<SECTION>:START/END -->` HTML-comment fences delimit any auto-managed region (Vital Signs in `index.md`, knowledge-summary, plans/index.md). Outside fences = user territory. Inside = NEXUS-managed, idempotently rewritten. *(current 2026-05-02 — extends legacy "Token-efficient doc templates")*
- **Vitest snapshots for sensor output.** Two snapshots per sensor: raw `VitalSigns` JSON + rendered Markdown block. Catches both data and formatting regressions. *(current 2026-05-02)*
- **Progressive knowledge system.** Append-only `knowledge.md` + auto-generated summary; the v1.0 plan generalises this with `nexus consolidate`. *(legacy 2026-02-08)*
- **Token-efficient doc templates.** Templates are minimal scaffolds; substance comes from generators populating them. Keeps token cost low for AI agents reading the brain. *(legacy 2026-02-08)*
- **Pattern-aware business logic generation.** Generators inspect the user's choice (PWA, offline-first, etc.) and emit only the relevant business logic. *(legacy 2026-02-08)*

Other notable pattern entries:
- Test fixtures in `tests/__fixtures__/` (current) · Logging via `@/utils/logger` (current) · Knowledge Base Protocol must be explicit (legacy) · Adopt command is the upgrade path (legacy) · Generated projects mirror NEXUS structure (legacy) · Progress indicators / delightful CLI UX (legacy)

> **Full entries:** [legacy](../knowledge.md), [current](./knowledge.md)

---

## gotcha (13 entries)

The traps that wasted time. Read this list before debugging anything:

- **`git` command output is platform-dependent.** Sensor regex must tolerate CRLF vs LF, multiple Git versions. Always `trim().split('\n')`. *(current 2026-05-02 — relevant for M1 sensor work)*
- **`npm test` varies by framework.** Generated projects use vitest, but the `tests` sensor must fall back through `npx vitest run`, `npx jest --json`, with 2s timeout each. Returns `null` on miss, never throws. *(current 2026-05-02 — relevant for M1)*
- **`knowledge.md` path is sacred.** It's `.nexus/docs/knowledge.md` everywhere — pointer files, generators, AI instructions. Mismatched paths silently bifurcate the knowledge base. *(legacy 2026-02-09 — and observe: this very repo has both `.nexus/knowledge.md` and `.nexus/docs/knowledge.md` because of an early-doc path drift. Both preserved.)*
- **Vitest mocking with ESM.** `vi.mock()` hoists; `vi.doMock()` does not. Use `vi.hoisted()` for shared mock state. *(legacy 2026-02-08)*
- **yarn vs npm for development.** Repo uses yarn for dev (lockfile), but generated projects default to npm. Don't accidentally write npm-lock-aware code in generators. *(legacy 2026-02-08)*
- **Tool instruction files vs master instructions drift.** `.cursorrules`, `.windsurfrules`, etc., must be regenerated from `instructions.md`, never edited in place — drift is invisible until an AI does the wrong thing. *(legacy 2026-02-08)*

Other gotchas: isCorrupted() heuristics edge cases · Dev instructions vs shipped instructions drift · `npm install` is the bottleneck during generation · Persona embedded in generated AI files

> **Full entries:** [legacy](../knowledge.md), [current](./knowledge.md)

---

## convention (12 entries)

Rules that bind future work:

- **Async all the way — no sync file I/O.** All v1.0 code is `fs/promises` + async/await. Sensors run in parallel; no callback hell. *(current 2026-05-02)*
- **ESM only with explicit `.js` extensions in imports.** TypeScript NodeNext module resolution requires `import { foo } from './bar.js'`. Source files are `.ts`; imports are `.js`. *(legacy 2026-02-07)*
- **`@inquirer/prompts` (functional API), not legacy `inquirer`.** All prompts are typed; no callbacks. *(legacy 2026-02-07)*
- **Release ritual.** Bump `package.json` → update CHANGELOG → run all tests → tag → publish. Manifest version in generated `.nexus/manifest.json` should match published CLI version (currently drifted: manifest says 0.1.3, npm says 0.3.2 — pickup as `D-stale-manifest` doctor check during M3). *(legacy 2026-02-08; flagged in this repo 2026-05-02)*
- **306 tests is the floor.** v1.0 should not drop confidence. Rough M1–M4 targets: +15, +25, +20, +15 = ~380 tests at v1.0.0. *(current 2026-05-02)*

Other conventions: Feature→backlog pipeline · NEXUS identity evolution (scaffolding → framework) · Testing is non-negotiable

> **Full entries:** [legacy](../knowledge.md), [current](./knowledge.md)

---

## v1.0-design (2 entries)

A new tag introduced 2026-05-02 for entries specific to the Alive Brain initiative:

- **Sensors are pure functions in `src/utils/sensors/`.** `git.ts`, `files.ts`, `tests.ts`, `packages.ts` each export an async function with a 2s timeout and graceful degradation (returns `null`, not error). `index.ts` exports `captureVitalSigns()` calling all in parallel. *(current 2026-05-02)*
- **Vital Signs uses HTML-comment fences.** `<!-- NEXUS:VITAL_SIGNS:START/END -->` delimits the machine-managed region in `index.md`. Markdown-renderer-invisible, CLI-readable. The pattern generalises (see `pattern` cluster). *(current 2026-05-02)*

> **Full entries:** [current `knowledge.md`](./knowledge.md)

---

## package · performance · bug-fix · feature (4 entries combined)

- **package — Commander.js action handler types.** Action handlers are typed by Commander v12; option objects are inferred. Type errors here usually mean a missing `.option()` declaration. *(legacy 2026-02-08)*
- **performance — Generated file arrays are cheap.** Holding all generator output in memory before write is fine; arrays of file objects don't blow the heap even on full project scaffolds. *(legacy 2026-02-08)*
- **bug-fix · feature — Single legacy entries each.** See raw file.

> **Full entries:** [legacy `knowledge.md`](../knowledge.md)

---

## How to use this summary

1. **Before a task** — scan the cluster headers above for relevance. If a tag matches, skim its entry list.
2. **For full context** — click through to `knowledge.md` (current) or `../knowledge.md` (legacy).
3. **Adding a new entry** — append to **current** [`./knowledge.md`](./knowledge.md) only. Never edit legacy. After commit, this summary regenerates (manually for now; via `nexus consolidate` post-M4).
4. **TTL hint (v1.0 feature)** — if an entry will become obsolete after a specific version, add `expires_after_version: "X.Y.Z"` to its frontmatter. `nexus consolidate` will strikethrough expired entries here.

---

## What this summary does NOT contain

- Routine task completion notes (those go in [`index.md`](./index.md) Progress Log).
- Open work (that's in [`../plans/`](../plans/index.md)).
- Spec or roadmap material (see numbered docs and [`v1_alive_brain.md`](../../../.nexus/docs/v1_alive_brain.md)).

---

*Hand-bootstrapped 2026-05-02 to match the format `nexus consolidate` (M4) will produce. If you regenerate by hand, keep the section structure stable so the M4 generator's output diffs cleanly against this baseline.*
