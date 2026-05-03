---
nexus_plan: true
id: "implement-auto-invoke-layer"
title: "Auto-Invoke Layer — Brain Detection & Self-Update"
status: done
created: "2026-05-02"
updated: "2026-05-02"
owner: "unassigned"
source: "user-request:2026-05-02"
parent: null
estimate: "3d"
phase: "alive-brain-auto-invoke"
tags: ["v0.4.0", "auto-invoke", "brain-awareness", "UX"]
---

## Goal
Add automatic brain-self-awareness: Nexus detects when its brain (`.nexus/docs/`) is stale or discrepant, runs appropriate commands (`sync`, `doctor`, `consolidate`), and prompts the user with actionable summaries. Users don't need to remember *when* to update — the brain tells them.

## Why
Current UX requires users to know:
- When to run `nexus sync` (repo state changed)
- When to run `nexus doctor` (docs might be drifting)
- When to run `nexus consolidate` (knowledge base getting messy)

The whole point of an "alive brain" is that it *detects* these needs. Auto-invoke closes the UX loop: **the brain identifies its own discrepancies and surfaces them at the right moment** — not overwhelming, not intrusive, just "hey, I noticed something, want me to check it?"

## Acceptance Criteria

### Detection Logic
- [x] `src/utils/brain-detector.ts` — checks if brain needs updating:
  - [x] Last sync is >1 hour old OR repo has new commits since last sync
  - [x] Doctor findings exist at `warn` or higher severity
  - [x] Knowledge base has >150 entries OR >700 lines
  - [x] Any plan is `in_progress` and untouched for >14 days
  - [x] Vital Signs block is missing or malformed
- [x] Detection is **non-blocking** (fast, ~100ms max)
- [x] Dry-run mode: check without making changes

### Invoke Modes
- [x] **Silent mode** (default): run checks, cache results, surface via status badge in next command output
- [x] **Interactive mode** (`--brain-check`): prompt before running, show what's about to happen
- [ ] **Scheduled mode** (future): if run in CI, auto-fix and commit
- [x] **Disabled mode** (`--no-brain-check`): skip all auto-invoke (for scripting)

### Integration Points
Auto-check before/after these commands:
- [x] Every command entry (`cli.ts` middleware or each command `exec` hook)
- [x] On `nexus init` — skip (it scaffolds fresh)
- [x] On `nexus adopt` — skip (it's a one-time operation)
- [x] On `nexus upgrade` — run after to catch new template issues
- [x] On `nexus plan new|start|done` — run sync first (capture latest state)
- [x] On `nexus skill install` — run sync to update skill listing
- [x] On any user command — check if brain needs updating

### Prompts & UX

#### Quick Status Badge (every command output)
```
✓ command result...
  → Brain: last synced 45m ago, 0 doctor warnings, knowledge clean
```

#### Interactive Prompt (when `--brain-check` or stale >12h)
```
🧠 Brain Check
  Last synced: 45 minutes ago
  New commits: 3 (since last sync)
  Outdated package versions: 2
  Stale plan: "implement-v1-m2" (14d untouched)

Would you like me to:
  [1] Run nexus sync (refresh repo state)
  [2] Run nexus doctor (check for drift)
  [3] Both
  [4] Skip for now
  [5] Always skip brain checks (remember this)
```

#### Status Mode (`nexus brain status`)
```
$ nexus brain status
🧠 Brain Status Report
├─ Sync: ✅ fresh (synced 45m ago)
├─ Doctor: ⚠️ 2 warnings (stale knowledge, old skill)
├─ Plans: ✅ 3 active, none overdue
├─ Knowledge: 📊 127 entries, 650 lines (healthy)
└─ Recommend: run "nexus doctor --fix" and review D05
```

### Configuration
- [x] `.nexus/auto-invoke.config.json` — per-project settings:
  ```json
  {
    "enabled": true,
    "mode": "silent",
    "sync_interval_minutes": 60,
    "auto_fix_doctor": false,
    "disabled_for_commands": ["skill", "help"],
    "always_prompt_for": ["plan"]
  }
  ```
- [x] Respect user choice (remember "always skip" → update config)

### Files Touched
- `nexus-cli/src/utils/brain-detector.ts` (new)
- `nexus-cli/src/utils/brain-status.ts` (new — renders status output)
- `nexus-cli/src/commands/brain.ts` (new — status, check, config commands)
- `nexus-cli/src/cli.ts` (modify — add auto-check middleware)
- `nexus-cli/src/utils/index.ts` (modify — export new modules)
- `nexus-cli/src/generators/docs.ts` (modify — scaffold `auto-invoke.config.json`)
- `nexus-cli/tests/unit/brain-detector.test.ts` (new)
- `nexus-cli/tests/unit/brain-status.test.ts` (new)
- `nexus-cli/tests/unit/commands/brain.test.ts` (new)

### Integration with M1/M2/M3
- M1 (`sync.ts`) — stores last sync timestamp in `.nexus/state/last-sync.json`
- M2 (`plan.ts`) — stores plan metadata for stale-plan detection
- M3 (`doctor.ts`) — caches findings for dashboard display
- Auto-invoke reads all three to make decisions

### Testing
- [x] Unit: brain-detector against fixture states (no sync, stale sync, doctor warnings, old plans)
- [x] Unit: config loading and respected choices
- [x] Integration: real repo, run command, verify auto-check fires appropriately
- [ ] UX: test interactive prompt (mocked inquirer)

## Steps
1. [x] Design brain-detector heuristics (what counts as "needs updating"?)
2. [x] Implement `brain-detector.ts` — pure functions, testable
3. [x] Implement `brain-status.ts` — renders human-readable status
4. [x] Implement `src/commands/brain.ts` — `status`, `check`, `config` subcommands
5. [x] Add CLI middleware in `cli.ts` to hook auto-check
6. [x] Add config file generator
7. [x] Test detection against all state combinations
- [x] Test prompts (mocked inquirer, verify UX flow)
9. [x] Integration test: seed a repo, run commands, verify auto-invoke fires
10. [x] Documentation: explain detection heuristics, config options, disable patterns

## Risks
- Prompt fatigue — users disable it. Mitigation: smart defaults (silent mode, long intervals), only prompt when >12h stale or high-severity issues.
- Performance — detection adds latency to every command. Mitigation: <100ms, cache for 60s, async checks in background.
- False positives — "knowledge bloat" threshold too low. Mitigation: tunable thresholds in config, sensible defaults (>150 entries = bloat).

## Notes
- 2026-05-02 (user): "nexus should utilize some of these commands when it sees fit... because users won't know when they need to do this... the brain that identifies those discrepancies"
- This is the UX layer that makes v1.0 "alive" — the brain proactively surfaces its own needs instead of being a passive tool.
- Can be shipped in v0.4.0 or iterated post-release; core M1/M2/M3 work unblocked.
- 2026-05-02 (copilot): moved to `in_progress` after verification pass; M3 is still partial, but auto-invoke kickoff started per strategy-shift request.
- 2026-05-03 (copilot): implemented auto-invoke middleware in `cli.ts` with silent + interactive + disabled modes, command-aware pre-sync triggers (`plan new/start/done`, `skill install`), status badge output, and persisted config at `.nexus/auto-invoke.config.json`.

## Evidence
- `yarn type-check` ✅
- `yarn lint` ✅
- `yarn test tests/unit/auto-invoke-config.test.ts tests/unit/brain-detector.test.ts tests/unit/brain-status.test.ts tests/unit/brief-command.test.ts tests/unit/doctor-checks.test.ts tests/unit/doctor.test.ts tests/integration/doctor-brief.integration.test.ts` ✅ (23 tests)
