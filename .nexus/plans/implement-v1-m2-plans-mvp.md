---
nexus_plan: true
id: "implement-v1-m2-plans-mvp"
title: "Implement v1.0 M2 — Plans MVP (the headline feature)"
status: approved
created: "2026-05-02"
updated: "2026-05-02"
owner: "unassigned"
source: "design:v1_alive_brain.md#5.6"
parent: null
estimate: "7d"
phase: "alive-brain-m2"
tags: ["v1.0", "plans", "headline-feature"]
---

## Goal
Ship the persisted-plans subsystem: `.nexus/plans/<id>.md` files, lifecycle state machine, plan templates, and the MVP set of `nexus plan` subcommands. Plans become the durable unit of multi-step work across sessions and agents.

## Why
The single biggest gap in v0.x is that multi-step work has nowhere to live between sessions — agents re-derive plans every time and contradict each other. Plans solve this. They are the v1.0 *headline feature*; the other commands give plans a useful environment. See [`v1_alive_brain.md` §5.6](../../../.nexus/docs/v1_alive_brain.md).

## Acceptance Criteria
- [ ] `src/utils/plans/parser.ts` — read/write plan files (frontmatter + sections), tolerant of human edits
- [ ] `src/utils/plans/lifecycle.ts` — state transitions: draft → approved → in_progress → (blocked | done | abandoned)
- [ ] `src/utils/plans/active.ts` — `_active.json` read/write
- [ ] `src/utils/plans/index-builder.ts` — auto-rebuilds `plans/index.md` after every command
- [ ] `src/commands/plan.ts` — Commander subcommands: `new`, `list`, `show`, `start`, `tick`, `note`, `done` (MVP)
- [ ] Plan templates in `src/generators/plan-templates/`: `feature`, `bug`, `refactor`, `spike`, `chore`
- [ ] On `plan done`: auto-append entry to `index.md` Progress Log, prompt for `knowledge.md` insight
- [ ] Unit tests for parser, lifecycle, active-pointer, index-builder
- [ ] Integration test: lifecycle round-trip (`new → start → tick → done`) leaves `plans/`, `index.md`, and `knowledge.md` in expected state
- [ ] Generator update: `nexus init` scaffolds empty `.nexus/plans/` with a starter plan
- [ ] CHANGELOG entry for `v0.4.0-alpha.2`

## Steps
- [ ] 1. Define `Plan` and `PlanStatus` TypeScript types
- [ ] 2. Implement `parser.ts` (gray-matter for frontmatter, regex for checkbox steps)
- [ ] 3. Implement `lifecycle.ts` — pure functions, no I/O
- [ ] 4. Implement `active.ts` (read/write `_active.json`)
- [ ] 5. Implement `index-builder.ts` (renders `plans/index.md` table)
- [ ] 6. Implement `src/commands/plan.ts` — subcommand router
- [ ] 7. Implement `plan new` (with template selection)
- [ ] 8. Implement `plan list` (filter flags)
- [ ] 9. Implement `plan show`
- [ ] 10. Implement `plan start` (sets active)
- [ ] 11. Implement `plan tick` (toggles checkbox)
- [ ] 12. Implement `plan note` (appends timestamped Notes entry)
- [ ] 13. Implement `plan done` (transition + index.md + knowledge.md prompt)
- [ ] 14. Author plan templates (feature/bug/refactor/spike/chore)
- [ ] 15. Wire into `cli.ts`
- [ ] 16. Generator update for `nexus init` / `adopt` / `upgrade`
- [ ] 17. CHANGELOG + version bump

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

## Evidence
_(to be filled)_
