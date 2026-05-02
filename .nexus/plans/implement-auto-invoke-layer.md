---
nexus_plan: true
id: "implement-auto-invoke-layer"
title: "Auto-Invoke Layer — Brain Detection & Self-Update"
status: approved
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
- [ ] `src/utils/brain-detector.ts` — checks if brain needs updating:
  - [ ] Last sync is >1 hour old OR repo has new commits since last sync
  - [ ] Doctor findings exist at `warn` or higher severity
  - [ ] Knowledge base has >150 entries OR >700 lines
  - [ ] Any plan is `in_progress` and untouched for >14 days
  - [ ] Vital Signs block is missing or malformed
- [ ] Detection is **non-blocking** (fast, ~100ms max)
- [ ] Dry-run mode: check without making changes

### Invoke Modes
- [ ] **Silent mode** (default): run checks, cache results, surface via status badge in next command output
- [ ] **Interactive mode** (`--brain-check`): prompt before running, show what's about to happen
- [ ] **Scheduled mode** (future): if run in CI, auto-fix and commit
- [ ] **Disabled mode** (`--no-brain-check`): skip all auto-invoke (for scripting)

### Integration Points
Auto-check before/after these commands:
- [ ] Every command entry (`cli.ts` middleware or each command `exec` hook)
- [ ] On `nexus init` — skip (it scaffolds fresh)
- [ ] On `nexus adopt` — skip (it's a one-time operation)
- [ ] On `nexus upgrade` — run after to catch new template issues
- [ ] On `nexus plan new|start|done` — run sync first (capture latest state)
- [ ] On `nexus skill install` — run sync to update skill listing
- [ ] On any user command — check if brain needs updating

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
- [ ] `.nexus/auto-invoke.config.json` — per-project settings:
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
- [ ] Respect user choice (remember "always skip" → update config)

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
- [ ] Unit: brain-detector against fixture states (no sync, stale sync, doctor warnings, old plans)
- [ ] Unit: config loading and respected choices
- [ ] Integration: real repo, run command, verify auto-check fires appropriately
- [ ] UX: test interactive prompt (mocked inquirer)

## Steps
1. [ ] Design brain-detector heuristics (what counts as "needs updating"?)
2. [ ] Implement `brain-detector.ts` — pure functions, testable
3. [ ] Implement `brain-status.ts` — renders human-readable status
4. [ ] Implement `src/commands/brain.ts` — `status`, `check`, `config` subcommands
5. [ ] Add CLI middleware in `cli.ts` to hook auto-check
6. [ ] Add config file generator
7. [ ] Test detection against all state combinations
8. [ ] Test prompts (mocked inquirer, verify UX flow)
9. [ ] Integration test: seed a repo, run commands, verify auto-invoke fires
10. [ ] Documentation: explain detection heuristics, config options, disable patterns

## Risks
- Prompt fatigue — users disable it. Mitigation: smart defaults (silent mode, long intervals), only prompt when >12h stale or high-severity issues.
- Performance — detection adds latency to every command. Mitigation: <100ms, cache for 60s, async checks in background.
- False positives — "knowledge bloat" threshold too low. Mitigation: tunable thresholds in config, sensible defaults (>150 entries = bloat).

## Notes
- 2026-05-02 (user): "nexus should utilize some of these commands when it sees fit... because users won't know when they need to do this... the brain that identifies those discrepancies"
- This is the UX layer that makes v1.0 "alive" — the brain proactively surfaces its own needs instead of being a passive tool.
- Can be shipped in v0.4.0 or iterated post-release; core M1/M2/M3 work unblocked.

## Evidence
_(to be filled as work happens)_
