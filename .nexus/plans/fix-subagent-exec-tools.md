---
nexus_plan: true
id: "fix-subagent-exec-tools"
title: "Fix: generated subagents have no execution tools (can't edit files)"
status: "done"
created: "2026-06-17"
updated: "2026-06-17"
owner: "unassigned"
source: "bug:session-2026-06-17 — subagents can't edit files; permission model is MCP-only"
parent: null
estimate: "2d"
phase: "v1.1-fixes"
tags: ["bug","agents","subagents","permissions","generator","claude-code"]
---
## Goal
Generated Claude Code subagents must declare the real execution tools each role
needs (Read/Edit/Write/Bash/Grep/Glob for builders; read-only for the reviewer),
plus the correctly-namespaced nexus-brain MCP tools — so the implementer can
actually edit files and the reviewer is genuinely read-only.

## Why
The NEXUS agent model (`src/utils/agents/types.ts:17`, `AgentToolAllowlist`) only
tracks `read`/`write` MCP tools (`nexus_*`). It has no concept of the execution
tools a Claude Code subagent needs to do work. `renderClaudeSubagent()`
(`src/generators/agents.ts:198`) therefore emits frontmatter with only `name` +
`description`, and the description literally says the agent "Uses the nexus-brain
MCP tools (…)" — framing the implementer (whose entire job is writing code) as if
it has no file tools. As soon as a `tools:` allowlist is derived from the NEXUS
model it lists only `nexus_*`, so Edit/Write are excluded and the subagent cannot
edit. Two further correctness gaps:
- Claude Code expects MCP tools in `tools:` as `mcp__nexus-brain__<tool>` (or the
  whole server `mcp__nexus-brain`), not the bare `nexus_wake` we reference.
- Least privilege is currently inverted: the reviewer (must be read-only) and the
  implementer (must write) are treated identically.

## Acceptance Criteria
- [ ] Each `CoreAgentSpec` declares an `exec` tool set (Claude Code native tools) per role:
      implementer → Read, Edit, Write, Bash, Grep, Glob; test-writer → Read, Edit, Write, Bash, Grep, Glob; reviewer → Read, Grep, Glob, Bash (NO Edit/Write); doc-keeper → Read, Edit, Write, Grep, Glob
- [ ] `renderClaudeSubagent()` emits a real `tools:` frontmatter line = exec tools + namespaced MCP tools (`mcp__nexus-brain__<read/write tool>`)
- [ ] The subagent `description` no longer implies MCP-only capability; it states the real capability set
- [ ] `.nexus/agents/` source format gains an optional `tools.exec` field (parser tolerant, defaults per role); `AgentToolAllowlist` extended or a sibling field added
- [ ] Reviewer subagent has no Edit/Write in its `tools:` (verifiable assertion in tests)
- [ ] Implementer subagent has Edit + Write in its `tools:` (verifiable assertion in tests)
- [ ] `nexus agent sync` regenerates existing projects' `.claude/agents/` with the corrected tools
- [ ] Snapshot/unit tests for rendered frontmatter of all four core agents
- [ ] `npx tsc --noEmit && npm run test && npm run lint` clean

## Steps
- [x] 1. Extend `AgentToolAllowlist` (or add `exec: string[]`) in types.ts + parser default-per-role
- [x] 2. Add per-role `exec` sets to `CORE_AGENTS` in generators/agents.ts
- [x] 3. Rewrite `renderClaudeSubagent()` to emit `tools:` (exec + `mcp__nexus-brain__*`) and fix the description
- [x] 4. Update `renderAgentFile()` to persist `tools.exec` in the .nexus source frontmatter
- [x] 5. Mirror the fix in the nexus-skills registry agent packs (packages/core/agents/*)
- [x] 6. Tests: assert reviewer is read-only, implementer can edit, MCP names namespaced
- [x] 7. Knowledge entry: "[bug-fix] subagent tool allowlist must include native exec tools + namespaced MCP"

## Files Touched
- src/utils/agents/types.ts, src/utils/agents/parser.ts
- src/generators/agents.ts (CORE_AGENTS, renderClaudeSubagent, renderAgentFile)
- nexus-skills/packages/core/agents/*.md
- tests/unit/agent*.test.ts

## Risks
- Over-granting tools to the reviewer breaks separation of duties → assert read-only in tests
- MCP namespace prefix differs by client → document the Claude Code form; keep `.nexus` source client-neutral and translate at render time
- Existing user projects need `nexus agent sync` to pick up the fix → note in CHANGELOG/migration

## Notes
- 2026-06-17 — Found while diagnosing "subagents can't edit files." Root issue is the agent tool model conflating MCP tools with execution tools. Pairs with `fix-agent-handoff-orchestration` (the other half of the agent complaint).
- 2026-06-17T14:51:25.658Z — Added tools.exec to AgentToolAllowlist+parser; per-role exec in CORE_AGENTS (reviewer read-only); renderClaudeSubagent emits tools: exec + mcp__nexus-brain__*; shared claudeSubagentTools/subagentDescription used by both generator and agent sync (fixed duplicate inline renderer); mirrored exec into nexus-skills registry packs; agent new template gains exec.

## Evidence
- 2026-06-17 — `renderClaudeSubagent()` emits only name/description; `AgentToolAllowlist` has read/write (MCP) only; packaged `nexus-skills/packages/core/agents/nexus-implementer.md` shows `tools.read/write` = nexus_* exclusively.
- 2026-06-17T14:51:30.366Z — 447/447 tests pass, tsc+lint clean. Dogfooded built generateAgents: implementer tools include Edit/Write/Bash + mcp__nexus-brain__*; reviewer read-only (no Edit/Write).
