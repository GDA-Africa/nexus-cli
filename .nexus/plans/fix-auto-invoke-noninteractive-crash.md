---
nexus_plan: true
id: "fix-auto-invoke-noninteractive-crash"
title: "Fix: auto-invoke Brain Check crashes / hijacks non-interactive sessions"
status: "done"
created: "2026-06-17"
updated: "2026-06-17"
owner: "unassigned"
source: "bug:session-2026-06-17 — nexus wake crashed with ExitPromptError under an agent"
parent: null
estimate: "1d"
phase: "v1.1-fixes"
tags: ["bug","auto-invoke","cli","non-interactive","regression"]
---
## Goal
Make every NEXUS command safe to run in a non-interactive context (AI agents,
CI, pipes, `npx`). The auto-invoke "Brain Check" must never crash and must never
block a command behind an interactive prompt unless a TTY is present AND the user
opted into interactive mode.

## Why
In a non-TTY session, running `nexus wake` (and any non-skipped command on a
stale repo) drops into inquirer's `select()` prompt, which immediately throws
`ExitPromptError` — an unhandled rejection that prints a Node stack trace and
prevents the actual command from running. This is the first thing an agent hits
at session start, so the handshake the whole NEXUS protocol depends on is broken
in exactly the environment NEXUS is built for. Proven this session:
`nexus wake` crashes, `nexus wake --no-brain-check` returns the token cleanly.

Two root causes, both in the auto-invoke layer:
1. `shouldPromptInteractively()` (`src/utils/auto-invoke-config.ts:100`) returns
   `true` even when `mode === 'silent'`, as long as sync is >12h stale or the
   command is in `always_prompt_for`. "Silent" mode is therefore not silent.
2. `runAutoInvokePre()` (`src/cli.ts:374`) calls `select()` with no TTY guard and
   no error handling, so a non-interactive caller crashes instead of degrading.

## Acceptance Criteria
- [ ] `nexus wake` (no flags) in a non-TTY context prints the handshake and exits 0 — no prompt, no stack trace
- [ ] `shouldPromptInteractively()` returns `false` whenever `mode !== 'interactive'` (silent/disabled never prompt); only `interactive` mode or `--brain-check` prompts
- [ ] A non-interactive guard short-circuits the prompt when `!process.stdin.isTTY || !process.stdout.isTTY || process.env.CI || process.env.NEXUS_NONINTERACTIVE === '1'`
- [ ] The `select()` call is wrapped so `ExitPromptError` (and any throw) degrades to "skip" instead of crashing the process
- [ ] Silent mode still does its safe job: when stale and `auto_fix_doctor`/sync is appropriate, it runs sync silently rather than prompting (no behavior loss for interactive users)
- [ ] `--brain-check` in a TTY still shows the interactive menu (no regression)
- [ ] Unit tests: silent mode never prompts; non-TTY guard returns false; ExitPromptError is swallowed
- [ ] `npx tsc --noEmit && npm run test && npm run lint` clean

## Steps
- [x] 1. Add an `isInteractiveEnvironment()` helper (TTY + CI + NEXUS_NONINTERACTIVE checks) in a shared util
- [x] 2. Fix `shouldPromptInteractively()` so non-`interactive` modes always return false; move staleness into a separate "should run silent auto-action" signal
- [x] 3. In `runAutoInvokePre()`, gate the `select()` behind both `mode === 'interactive'`/`--brain-check` and `isInteractiveEnvironment()`; wrap in try/catch degrading to 'skip'
- [x] 4. Ensure silent mode performs the safe auto-sync path when stale (preserve intended behavior)
- [x] 5. Tests for all branches; dogfood `nexus wake` in this repo with no flags
- [x] 6. Knowledge entry: "[bug-fix] auto-invoke must be non-interactive-safe"

## Files Touched
- src/utils/auto-invoke-config.ts (shouldPromptInteractively + new helper)
- src/cli.ts (runAutoInvokePre guard + try/catch)
- tests/unit/auto-invoke*.test.ts

## Risks
- Silent auto-sync writing files unexpectedly in CI → keep silent mode to read-only detection unless `auto_fix_doctor`/explicit config opts in
- Over-suppressing the prompt for real interactive users → only suppress when the environment is genuinely non-interactive or mode is silent/disabled

## Notes
- 2026-06-17 — Drafted from live repro this session. Workaround until fixed: pass `--no-brain-check` to any command, or `nexus brain config --mode disabled`.
- 2026-06-17T13:35:18.785Z — Implemented: shouldPromptInteractively now mode-only (interactive only); added isInteractiveEnvironment() TTY/CI guard; select() wrapped in try/catch degrading to runSilentAutoActions; silent mode does opt-in auto_fix_doctor actions, never prompts.

## Evidence
- 2026-06-17 — Repro: `nexus wake` → `ExitPromptError: User force closed the prompt`; `nexus wake --no-brain-check` → `NX-WAKE-3ZEU-2026-06-17` (exit 0).
- 2026-06-17T13:35:47.407Z — 442/442 tests pass, tsc+lint clean. Dogfooded: built 'nexus wake' (no flags) prints handshake in non-TTY instead of ExitPromptError crash.
