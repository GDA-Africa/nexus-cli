---
nexus_plan: true
id: "implement-v1-m3-doctor-brief"
title: "Implement v1.0 M3 — `nexus doctor` & `nexus brief`"
status: done
created: "2026-05-02"
updated: "2026-05-02"
owner: "unassigned"
source: "design:v1_alive_brain.md#5.2,#5.3"
parent: null
estimate: "5d"
phase: "alive-brain-m3"
tags: ["v0.4.0", "doctor", "brief", "drift-detection"]
---

## Goal
Ship the *reflexes* (`nexus doctor` — drift detection, 10 checks D01–D10) and the *voice* (`nexus brief` — human-readable digest). Both consume sensor output from M1 and plan state from M2.

## Why
Without these the brain still cannot react to or speak about reality — it can only record it. Doctor closes the discipline gap (catches when docs drift from code). Brief closes the human-attention gap (gives the user a useful daily/on-demand summary without opening five files). See [`v1_alive_brain.md` §5.2 + §5.3](../../../.nexus/docs/v1_alive_brain.md).

## Acceptance Criteria

### Doctor (§5.2)
- [x] `src/utils/doctor/checks/` directory — one file per check, each exports `run(ctx): Promise<DoctorFinding[]>`
- [x] Checks D01–D10 implemented per design:
  - [x] D01 frontmatter-status drift
  - [x] D02 stale phase
  - [x] D03 progress-log gap
  - [x] D04 knowledge bloat (>200 entries / >800 lines)
  - [x] D05 stale knowledge (references missing files)
  - [x] D06 plan stale (in_progress > 14d untouched)
  - [x] D07 plan orphan (done with no Evidence)
  - [x] D08 vital signs missing or >24h old
  - [x] D09 handshake missed (commits with no wake token logged)
  - [x] D10 skills drift (core skill older than framework version)
- [x] `src/utils/doctor/index.ts` — registry & runner
- [x] `src/commands/doctor.ts` — `--severity={info|warn|error}`, `--fix`, `--json`
- [x] Exit code = highest severity (CI-friendly)
- [x] Per-project config: `.nexus/doctor.config.json` (disable specific checks)
- [x] `--fix` for safe auto-fixes (e.g. D08 runs `nexus sync`)

### Brief (§5.3)
- [x] `src/commands/brief.ts` — pretty-print + `--md` mode
- [x] Sourced from: `nexus sync --json`, `nexus doctor --json`, `plans/index.md`, last 7 days of git log
- [x] `--since=<ref|date>` flag (default: last brief or 7 days)
- [x] `--write=<path>` flag — append timestamped entry to a brief log file
- [x] Layout matches design §5.3 (Shipped / Active plans / Drift / Suggested next)

### Common
- [x] Unit tests for every doctor check (with fixture repos)
- [x] Snapshot tests for `brief` output
- [x] Integration test: run doctor + brief against `nexus-sample/` after a known sequence of changes
- [x] Generator update: `nexus init` adds CI snippet calling `nexus doctor --severity=error`
- [x] CHANGELOG entry for `v0.4.0-beta.1`

## Steps
- [x] 1. Define `DoctorCheck` interface and `DoctorFinding` type
- [x] 2. Implement check registry/runner in `src/utils/doctor/index.ts`
- [x] 3. Implement D01-D10 (one PR per 2-3 checks to keep reviews tight)
- [x] 4. Implement `src/commands/doctor.ts`
- [x] 5. Implement `src/commands/brief.ts`
- [x] 6. Wire both into `cli.ts`
- [x] 7. Generator update (CI snippet)
- [x] 8. CHANGELOG + version bump

## Files Touched
- `nexus-cli/src/utils/doctor/{index,types}.ts` (new)
- `nexus-cli/src/utils/doctor/checks/D01-D10/*.ts` (new — 10 files)
- `nexus-cli/src/commands/doctor.ts` (new)
- `nexus-cli/src/commands/brief.ts` (new)
- `nexus-cli/src/cli.ts` (modify)
- `nexus-cli/src/generators/ci.ts` (modify — add doctor step)
- `nexus-cli/tests/unit/utils/doctor/*.test.ts` (new)
- `nexus-cli/tests/unit/commands/doctor.test.ts` (new)
- `nexus-cli/tests/unit/commands/brief.test.ts` (new)
- `nexus-cli/CHANGELOG.md`

## Risks
- False positives drown the user. Mitigation: each check has tunable severity; project-level config disables noisy ones; default `--severity=warn`.
- Doctor becomes slow on large repos. Mitigation: checks run in parallel with per-check timeout; `--json` output is cached for 60s.

## Notes
- 2026-05-02 (claude): plan approved during bootstrap surgery. Depends on M1 (for `nexus sync --json`) and M2 (for plan parsing).
- 2026-05-02 (copilot): verification pass shows M3 is **not done** yet. Current implementation includes `src/commands/doctor.ts` + checks `D04/D06/D07/D08` only; `src/commands/brief.ts`, checks `D01–D03/D05/D09/D10`, and M3 acceptance test suite are still pending.
- 2026-05-02 (copilot): completed M3 implementation scope on this branch — added checks D01–D10, implemented `nexus brief` (`--md`, `--since`, `--write`), wired CLI command, added doctor config support (`.nexus/doctor.config.json`), severity-based exit codes, and D08 auto-fix via `nexus sync`.

## Evidence
- `yarn type-check` ✅
- `yarn lint` ✅
- `yarn test tests/unit/doctor.test.ts tests/unit/doctor-checks.test.ts tests/unit/brief-command.test.ts tests/unit/brain-detector.test.ts tests/integration/doctor-brief.integration.test.ts` ✅ (18 tests, 2 snapshots)
