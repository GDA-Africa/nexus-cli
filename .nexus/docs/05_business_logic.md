---
nexus_doc: true
id: "05_business_logic"
title: "Business Logic"
status: populated
confidence: high
last_updated: "2026-08-24"
---

# Business Logic

**Project:** NEXUS CLI

The "business" NEXUS runs is brain hygiene: keep a project's `.nexus/` documentation, plans, and knowledge base honest against the real state of the repo, and make that state cheaply readable by AI agents. The rules below are the actual constraints enforced in code, not aspirational policy.

---

## 📐 Business Rules

### Smart File Strategy (`upgrade` / `repair`)
- A doc is only overwritten when its frontmatter is **explicitly** `status: template`.
- Missing frontmatter is **not** treated as corruption (this used to be the bug — see below) — it is preserved as-is.
- Every overwrite is backed up first to `.nexus/state/upgrade-backup/<timestamp>/` before being replaced.
- `repair` additionally detects corruption: empty files, missing required frontmatter fields, invalid JSON in `manifest.json`/`_active.json` — and only touches files that are actually corrupt.
- **Incident (2026-06-11, fixed pre-publish):** `isCorrupted()` originally classified any frontmatter-less doc as corrupted and replaced it in both `upgrade` and `repair`, silently destroying populated docs written before frontmatter existed. Fix: `isTemplate()` is now the explicit, narrow gate for replacement; 4 regression tests guard it.

### Skills precedence
`custom/` > `core/` > `community/`. A custom skill with the same slug always wins; `core/` is regenerated on every `upgrade` (framework-matched), `community/` is only touched by explicit `install`/`remove`. `custom/` is never written to by NEXUS itself.

### The alignment gate (`src/utils/skills/gate.ts`, v1.3)
A **gate** makes a skill a precondition for a class of work, not just something offered on trigger match.

- Keys off **structural facts only** — a plan's `type` and whether its gate-record section (default heading `## Grilling`) is filled — never off the wording of the task or agent-written prose. A v1 keyword-regex version of this check (D11) was gameable by the very agent it targeted; this is the deliberate fix.
- Gated by default: `feature`, `refactor`, `spike` plan types (`DEFAULT_GATED_PLAN_TYPES`).
- `bug` is **not** gated by type alone — a major fix and a one-line typo are both `bug` plans, and only the human creating the plan can tell them apart. Opt in explicitly: `nexus plan new --type=bug --major` sets `major: true` in frontmatter.
- A freshly scaffolded record section contains the `nexus:grilling-pending` marker; its mere presence does not satisfy the gate — the procedure must actually be run, or the marker replaced with real content.

### Plan lifecycle
See the state machine below — transitions are enforced in code (`assertTransition`), not just convention; an invalid transition throws instead of writing bad state.

### Doctor drift detection (D01–D14)
Runs read-only against current brain + repo state; nothing here mutates files.

| ID | Rule |
|----|------|
| D01 | Doc frontmatter `status: template` but body looks substantially populated → warn |
| D02 | Plans marked `in_progress` but key folders show no recent activity → warn |
| D03 | A `done` plan is missing from the `index.md` progress log → info |
| D04 | `knowledge.md` bloated (>200 entries or >800 lines) → warn (nudges `nexus consolidate`) |
| D05 | `knowledge.md` references file paths that no longer exist → warn |
| D06 | An `in_progress` plan hasn't been touched in >14 days → warn |
| D07 | A `done` plan has no Evidence section → warn |
| D08 | Vital Signs block missing or >24h stale → warn |
| D09 | Recent commits don't include the active `NX-WAKE` token → info (visible-not-impossible skip detection) |
| D10 | Generated skills metadata out of sync with the `@nexus-framework/skills` package version → warn |
| D11 | A `done` plan's Evidence section has no test results and no explicit waiver → warn |
| D12 | A regeneration dropped the Chameleon UI-delegation block from AI instruction files → warn |
| D13 | A gated plan (see above) lacks its required alignment-gate record → warn |
| D14 | Per-agent always-loaded instruction budget exceeds threshold → warn, or error under `--strict` |

`nexus doctor --strict` promotes borderline findings (e.g. D14's budget check) to hard errors for CI gating.

### Manifest normalization
`upgrade`/`repair` always pass the manifest through `normalizeManifestConfig()` before any generator reads it, so a partial or legacy `manifest.json` (missing fields from an older CLI version) never renders literal `undefined` into generated docs or AI instruction files. (Production bug, fixed v1.1.3 — see `knowledge.md`.)

## 🔄 State Machines

### Plan lifecycle (`src/utils/plans/lifecycle.ts`)

```
draft ──────► approved ──────► in_progress ──────► done
  │                │                │  ▲
  │                │                │  └── blocked (can return to in_progress)
  └────────────────┴────────────────┴──────► abandoned
```

Allowed transitions (`TRANSITIONS` map):
- `draft` → `approved`, `in_progress`, `abandoned`
- `approved` → `in_progress`, `abandoned`
- `in_progress` → `blocked`, `done`, `abandoned`
- `blocked` → `in_progress`, `abandoned`
- `done` → (terminal, no transitions)
- `abandoned` → (terminal, no transitions)

Unknown/hand-edited statuses fail closed: `canTransition()` returns `false` rather than throwing a `TypeError`, and `assertTransition()` turns that into a clean `Invalid plan transition` error.

### Session handshake
`nexus wake` / `nexus_wake` issues an `NX-WAKE-<hash>-<date>` token every call. It is not itself a state machine, but it is the input D09 checks for in commit messages — a session that skips the handshake is visible in `doctor` output, not blocked.

## 🧮 Algorithms

- **Doc maturity heuristic (D01):** a `status: template` doc is flagged "appears substantially populated" using a body-content heuristic (length / structure against the scaffolded template), not a strict diff — designed to catch obvious drift, not every edit.
- **Context pack composition (`nexus_get_context`):** deterministic keyword matching of the task string against plan content, knowledge entry titles/categories, and skill trigger lists; assembles a single pack capped at `maxChars` (default 12000) rather than doing semantic retrieval — the same manual process an agent would do by hand, just scoped and bounded.
- **Skill matching (`src/utils/skills/matching.ts`):** trigger-string matching against the task description, resolved through the custom > core > community precedence order.
- **Vital Signs sensors (`src/utils/sensors/*`):** git (branch, last commit, dirty state), files (stale-folder detection via mtimes), tests (pass/fail counts when measurable), packages — each returns a typed reading consumed by `nexus sync`, `doctor`, and `brief`.
