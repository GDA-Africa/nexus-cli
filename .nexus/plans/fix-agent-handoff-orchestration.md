---
nexus_plan: true
id: "fix-agent-handoff-orchestration"
title: "Fix: agent handoff chain is prose, not a runnable orchestration"
status: "done"
created: "2026-06-17"
updated: "2026-06-17"
owner: "unassigned"
source: "bug:session-2026-06-17 — subagent orchestration/handoff non-functional"
parent: null
estimate: "3d"
phase: "v1.1-fixes"
tags: ["bug","agents","orchestration","handoff","d11","mcp"]
---
## Goal
Turn the implementer → test-writer → reviewer → doc-keeper handoff from prose
into a mechanism the main thread can actually execute, so the D11 "unverified
done" gate is reached on the normal path instead of by luck.

## Why
The core agents declare `handoff.after` and tell each other to "Hand finished
work to nexus-test-writer" (`src/generators/agents.ts`), but Claude Code
subagents cannot spawn other subagents and NEXUS ships no orchestrator. The chain
is documentation, not control flow — so verification (D11) and brain hygiene only
happen if the human/main agent remembers the sequence. The result is the
"serious orchestration issues" reported this session: roles exist but nothing
sequences them.

The fix is to make the **main thread the orchestrator** and give it an explicit,
machine-readable sequence to follow (rather than inventing in-subagent spawning,
which the client doesn't support).

## Acceptance Criteria
- [ ] Decision recorded: main-thread-driven orchestration (Option A) vs a `nexus orchestrate` plan generator (Option B). Default A; B as follow-up.
- [ ] CLAUDE.md / AGENTS.md generation includes an explicit "Orchestration: how to sequence the core agents" section — main thread dispatches each subagent in order via the client's Task/subagent mechanism
- [ ] A new read tool `nexus_get_handoff` (or extend `nexus_get_context`) returns the next role in the chain given the current role + plan state, so the sequence is queryable, not memorized
- [ ] `nexus agent` output and the Agent Roles block state plainly that handoffs are main-thread-driven (subagents do not call subagents)
- [ ] D11 doc/CI brief notes when a plan reached `done` without the test-writer handoff having produced Evidence
- [ ] (Option B, optional) `nexus orchestrate <task>` creates a plan with one step per agent role, so the chain is a real plan to tick through
- [ ] `npx tsc --noEmit && npm run test && npm run lint` clean

## Steps
- [x] 1. Decide A vs B (AskUserQuestion / design note) and record in knowledge.md
- [x] 2. Add `nexus_get_handoff` (or extend `nexus_get_context`) returning the next role + why
- [x] 3. Generator: add an "Orchestration" section to CLAUDE.md/AGENTS.md describing main-thread sequencing
- [x] 4. Update agent bodies/Agent Roles block to say handoffs are main-thread-driven, not subagent-to-subagent
- [ ] 5. (If B) implement `nexus orchestrate <task>` → plan with per-role steps
- [x] 6. Tests for the handoff tool + generated orchestration section
- [x] 7. Knowledge entry: "[architecture] agent handoffs are main-thread-orchestrated"

## Files Touched
- src/mcp/tools.ts, src/mcp/server.ts (new/extended handoff tool)
- src/generators/agents.ts, src/generators/ai-config.ts (orchestration section)
- src/commands/agent.ts (optional orchestrate subcommand)
- tests/unit/*

## Risks
- Scope creep into a full agent runtime → keep to "make the sequence explicit + queryable"; do not build in-process subagent spawning
- Clients without subagents → the Agent Roles prose degradation already covers them; orchestration section must say "adopt roles sequentially yourself"
- Depends on `fix-subagent-exec-tools` for the subagents to be useful once sequenced

## Notes
- 2026-06-17 — Second half of the agent complaint (first half: tool allowlist). Recommend shipping after `fix-subagent-exec-tools` since orchestration is pointless if the dispatched subagents still can't edit.
- 2026-06-17T16:24:41.000Z — Decision: Option A (main-thread orchestration). Implemented buildHandoffChain/nextInChain (handoff.ts), nexus_get_handoff MCP tool (now 17 tools), and Orchestration section in Agent Roles block stating subagents can't call subagents. Option B (nexus orchestrate command) deferred as documented follow-up.
- 2026-06-17T16:24:51.215Z — Step 5 (Option B: nexus orchestrate command) intentionally deferred — conditional on choosing Option B; not needed for the fix.

## Evidence
- 2026-06-17 — Agents declare handoff.after chain in frontmatter + "Hand finished work to nexus-test-writer" in body, but no orchestrator exists and Claude Code subagents cannot invoke other subagents.
- 2026-06-17T16:25:04.529Z — tsc+lint clean; agents (24) + mcp-tools (18) suites pass incl. handoff chain unit tests + nexus_get_handoff transport round-trip. Dogfooded: chain implementer->test-writer->reviewer->doc-keeper; Orchestration section renders. Option B (nexus orchestrate) deferred.
