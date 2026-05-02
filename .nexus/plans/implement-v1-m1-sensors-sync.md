---
nexus_plan: true
id: "implement-v1-m1-sensors-sync"
title: "Implement v1.0 M1 — Sensors & `nexus sync`"
status: in_progress
created: "2026-05-02"
updated: "2026-05-02"
owner: "unassigned"
source: "design:v1_alive_brain.md#5.1"
parent: null
estimate: "5d"
phase: "alive-brain-m1"
tags: ["v1.0", "sensors", "cli-command", "first-milestone"]
---

## Goal
Ship `nexus sync` — a command that captures real repo signals (git, tests, files, packages, plans) into a typed `VitalSigns` object and writes a Markdown block into `index.md` between auto-managed fences. Idempotent; runs in <2s on this repo.

## Why
M1 is the foundation for every other v1.0 capability. `nexus doctor` reads sensor output to detect drift. `nexus brief` formats it for humans. `nexus wake` includes a sensor-based brain hash. Without M1 there is no "alive" in alive brain — everything else is downstream. See [`v1_alive_brain.md` §5.1 and §10](../../../.nexus/docs/v1_alive_brain.md) for the full spec.

## Acceptance Criteria
- [ ] `src/utils/brain.ts` — locates `.nexus/`, computes brain hash, single-source for `.nexus/` paths
- [ ] `src/utils/sensors/git.ts` — branch, ahead-of-main count, last commit, dirty flag
- [ ] `src/utils/sensors/files.ts` — phase-folder mtimes, stale-day computation
- [ ] `src/utils/sensors/tests.ts` — last vitest run summary (passed/failed/skipped/duration)
- [ ] `src/utils/sensors/packages.ts` — outdated count, vulnerable count (npm audit summary)
- [ ] `src/utils/sensors/index.ts` — `captureVitalSigns(opts): Promise<VitalSigns>` aggregating all sub-sensors with 2s timeout & graceful degradation
- [ ] `src/commands/sync.ts` — wires `--write | --dry-run | --json | --scope`, atomic write of block via tmp-then-rename
- [ ] Snapshot test for the rendered Vital Signs block
- [ ] Integration test against `nexus-sample/` fixture: run sync twice, assert idempotent
- [ ] Generator update — `nexus init` and `nexus adopt` scaffold the `<!-- NEXUS:VITAL_SIGNS:START/END -->` fences in fresh `index.md`
- [ ] `nexus upgrade` smart-file-strategy: inserts fences if missing, preserves user content above/below
- [ ] CHANGELOG entry for `v0.4.0-alpha.1`

## Steps
- [ ] 1. Implement `src/utils/brain.ts` (foundation — every later command imports it)
- [ ] 2. Implement `src/utils/sensors/git.ts` + unit tests (fixture repo)
- [ ] 3. Implement `src/utils/sensors/files.ts` + unit tests
- [ ] 4. Implement `src/utils/sensors/tests.ts` + unit tests (mocked vitest output)
- [ ] 5. Implement `src/utils/sensors/packages.ts` + unit tests (mocked `npm outdated --json`)
- [ ] 6. Implement `src/utils/sensors/index.ts` aggregator + unit test
- [ ] 7. Implement `src/commands/sync.ts` + unit tests for each flag
- [ ] 8. Snapshot test: rendered block stable across runs given fixed input
- [ ] 9. Integration test: real run against `nexus-sample/`
- [ ] 10. Update `src/cli.ts` to register `sync` command
- [ ] 11. Update `src/generators/docs.ts` (or equivalent) to scaffold fences
- [ ] 12. Update `src/commands/upgrade.ts` to inject fences into existing `index.md`
- [ ] 13. Add CHANGELOG entry, bump version to `0.4.0-alpha.1`

## Files Touched
- `nexus-cli/src/utils/brain.ts` (new)
- `nexus-cli/src/utils/sensors/{git,files,tests,packages,index}.ts` (new)
- `nexus-cli/src/commands/sync.ts` (new)
- `nexus-cli/src/cli.ts` (modify — register command)
- `nexus-cli/src/generators/docs.ts` (modify — scaffold fences)
- `nexus-cli/src/commands/upgrade.ts` (modify — inject fences)
- `nexus-cli/tests/unit/utils/brain.test.ts` (new)
- `nexus-cli/tests/unit/utils/sensors/*.test.ts` (new — one per sensor + index)
- `nexus-cli/tests/unit/commands/sync.test.ts` (new)
- `nexus-cli/tests/integration/sync.test.ts` (new)
- `nexus-cli/CHANGELOG.md` (append)

## Risks
- `git log` output can be huge → cap at last 50 commits in sensor.
- `index.md` may be open in user's editor during write → atomic write (tmp + rename).
- `npm outdated`/`npm audit` are slow on cold cache → 2s timeout, return `null` on timeout (NOT an error).
- The hand-written Vital Signs block in this repo may not exactly match generator output — write the snapshot test first, then make the implementation match it.

## Notes
- 2026-05-02 (claude): plan created during bootstrap surgery. Marked `in_progress` and set as the active plan since it's the next concrete work.
- The hand-injected Vital Signs block in `nexus-cli/.nexus/docs/index.md` is the *target output* — when this milestone is done, `nexus sync` should produce a block functionally identical to it.

## Evidence
_(to be filled as work happens)_
- Commits: —
- PRs: —
- Test runs: —
