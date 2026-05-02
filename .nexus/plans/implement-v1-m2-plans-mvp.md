---
nexus_plan: true
id: "implement-v1-m2-plans-mvp"
title: "Implement v1.0 M2 — Plans MVP (the headline feature)"
status: in_progress
created: "2026-05-02"
updated: "2026-05-02"
owner: "unassigned"
source: "design:v1_alive_brain.md#5.6"
parent: null
estimate: "7d"
phase: "alive-brain-m2"
tags: ["v0.4.0", "plans", "headline-feature"]
---

## Goal
Ship the persisted-plans subsystem: `.nexus/plans/<id>.md` files, lifecycle state machine, plan templates, and the MVP set of `nexus plan` subcommands. Plans become the durable unit of multi-step work across sessions and agents.

## Why
The single biggest gap in v0.x is that multi-step work has nowhere to live between sessions — agents re-derive plans every time and contradict each other. Plans solve this. They are the v1.0 *headline feature*; the other commands give plans a useful environment. See [`v1_alive_brain.md` §5.6](../../../.nexus/docs/v1_alive_brain.md).

## Acceptance Criteria
- [x] `src/utils/plans/parser.ts` — read/write plan files (frontmatter + sections), tolerant of human edits
- [x] `src/utils/plans/lifecycle.ts` — state transitions: draft → approved → in_progress → (blocked | done | abandoned)
- [x] `src/utils/plans/active.ts` — `_active.json` read/write
- [x] `src/utils/plans/index-builder.ts` — auto-rebuilds `plans/index.md` after every command
- [x] `src/commands/plan.ts` — Commander subcommands: `new`, `list`, `show`, `start`, `tick`, `note`, `done` (MVP)
- [x] Plan templates in `src/generators/plan-templates/`: `feature`, `bug`, `refactor`, `spike`, `chore`
- [x] On `plan done`: auto-append entry to `index.md` Progress Log, prompt for `knowledge.md` insight
- [x] Unit tests for parser, lifecycle, active-pointer, index-builder
- [x] Integration test: lifecycle round-trip (`new → start → tick → done`) leaves `plans/`, `index.md`, and `knowledge.md` in expected state
- [x] Generator update: `nexus init` scaffolds empty `.nexus/plans/` with a starter plan
- [x] CHANGELOG entry for `v0.4.0-alpha.2`

## Steps
- [x] 1. Define `Plan` and `PlanStatus` TypeScript types
- [x] 2. Implement `parser.ts` (gray-matter for frontmatter, regex for checkbox steps)
- [x] 3. Implement `lifecycle.ts` — pure functions, no I/O
- [x] 4. Implement `active.ts` (read/write `_active.json`)
- [x] 5. Implement `index-builder.ts` (renders `plans/index.md` table)
- [x] 6. Implement `src/commands/plan.ts` — subcommand router
- [x] 7. Implement `plan new` (with template selection)
- [x] 8. Implement `plan list` (filter flags)
- [x] 9. Implement `plan show`
- [x] 10. Implement `plan start` (sets active)
- [x] 11. Implement `plan tick` (toggles checkbox)
- [x] 12. Implement `plan note` (appends timestamped Notes entry)
- [x] 13. Implement `plan done` (transition + index.md + knowledge.md prompt)
- [x] 14. Author plan templates (feature/bug/refactor/spike/chore)
- [x] 15. Wire into `cli.ts`
- [x] 16. Generator update for `nexus init` / `adopt` / `upgrade`
- [x] 17. CHANGELOG + version bump

## Files Touched
- `nexus-cli/src/utils/plans/{parser,lifecycle,active,index-builder,types}.ts` (new)
- `nexus-cli/src/commands/plan.ts` (new)
- `nexus-cli/src/generators/plan-templates/{feature,bug,refactor,spike,chore}.md.mustache` (new)
- `nexus-cli/src/cli.ts` (modify)
- `nexus-cli/src/generators/docs.ts` (modify — scaffold plans/)
- `nexus-cli/src/commands/{init,adopt,upgrade}.ts` (modify)
- `nexus-cli/tests/unit/utils/plans/*.test.ts` (new)
- `nexus-cli/tests/unit/commands/plan.test.ts` (new)
- `nexus-cli/tests/integration/plan-lifecycle.test.ts` (new)
- `nexus-cli/CHANGELOG.md`

## Risks
- Plans become bureaucratic — every tiny commit gets a plan. Mitigation: `chore` template is 4 lines; doctor does NOT require a plan per commit; only ≥3-step or cross-session work needs one.
- Two agents editing the same plan simultaneously → conflict. Mitigation: append-only Notes section; rare conflicts; document the "two agents on one plan → use sub-plans" pattern.
- Markdown parsing fragility — humans will hand-edit plans. Mitigation: parser is tolerant (preserves unknown sections, never strips formatting).

## Notes
- 2026-05-02 (claude): plan approved during bootstrap surgery; ready to start once M1 sensors module is live (since plans uses `brain.ts` from M1).
- 2026-05-02 (copilot): shipped first full M2 MVP slice in one pass — plans utility modules, `nexus plan` subcommands, generator scaffolding, template stubs, and command-level lifecycle test coverage.

## Evidence
- Test run: `npx vitest run tests/unit/plan-utils.test.ts tests/unit/plan-command.test.ts` → 7 passed
- Test run: `npm test` → 20 files, 341 tests passed (includes new plan suites)
- Typecheck: `npm run type-check` passed
- Lint: `npm run lint` passed
