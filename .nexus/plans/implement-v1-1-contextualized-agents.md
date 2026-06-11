---
nexus_plan: true
id: "implement-v1-1-contextualized-agents"
title: "Implement v1.1 — Contextualized Agents (A1–A3)"
status: "done"
created: "2026-06-10"
updated: "2026-06-11"
owner: "unassigned"
source: "design:../../../.nexus/docs/v1_1_contextualized_agents.md"
parent: null
estimate: "13d"
phase: "v1.1-agents"
tags: ["v1.1.0", "agents", "mcp", "test-writer", "registry"]
---

## Goal
Ship `.nexus/agents/` as a brain primitive: agent definitions with context
recipes and tool allowlists, generated for Claude Code subagents and degraded
to AGENTS.md prose elsewhere; `nexus_get_context` composition tool; and the
test-writer agent with the D11 "unverified done" gate.

## Why
v1.0 contextualizes one generic agent. Clients now support specialized
subagents, and NEXUS owns the only data that makes them grounded (conventions,
gotchas, plans, sensors). The test-writer + D11 gate turns "agents should
verify their work" from aspiration into structure — same doctrine as wake:
skipping is visible, not impossible. Full design: v1_1_contextualized_agents.md.

## Acceptance Criteria
### A1 — Agent primitive + CLI + generation
- [x] `src/utils/agents/{parser,types}.ts` — frontmatter schema (agent, role, triggers, tools.read/write, context recipe, handoff, status) + validation
- [x] `.nexus/agents/{core,custom,community}/` scaffold; precedence custom > core > community; custom/ is SACRED (upgrade/repair never touch)
- [x] `nexus agent {list,new,install,remove,status,sync}` mirroring the skill command surface
- [x] Generator emits core four (implementer, test-writer, reviewer, doc-keeper), framework-matched
- [x] `nexus agent sync` writes `.claude/agents/<name>.md` + "Agent Roles" section in AGENTS.md/instruction files (idempotent, fenced like Vital Signs)
- [x] Opt-in prompt at `nexus init` (one question); upgrade never force-adds agents

### A2 — MCP additions
- [x] `nexus_list_agents`, `nexus_get_agent` tools
- [x] `nexus_get_context { task, agent?, maxChars? }` — deterministic composition: plan slice + top-k knowledge + trigger-matched skills + vitals digest + recipe-named doc sections
- [x] `nexus_wake { agent? }` — session.json records agent identity
- [x] Unit tests incl. InMemoryTransport e2e for all new tools

### A3 — Test-writer end-to-end + verification gate
- [x] Test-writer behaviors: tests-sensor detection; ask-first scaffolding proposal when no testing exists (NEVER silent setup); waiver notes when declined
- [x] Doctor **D11 — unverified done**: plan at `done` with no test evidence and no waiver in Evidence
- [x] `nexus plan done` interactive warning when Evidence is empty
- [x] Brain-aware CI brief surfaces D11
- [x] Registry (`nexus-skills`): `agents/` content area + core four + `nexus-agent-authoring` meta-skill → registry v0.3.0
- [x] Docs: README + docs.html agent section; CHANGELOG; migration note (v1.0 → v1.1 additive)

## Steps
- [x] 1. A1: agent parser + types + tests
- [x] 2. A1: scaffold + `nexus agent` CLI + tests
- [x] 3. A1: generator core four + client outputs (`agent sync`)
- [x] 4. A2: list/get agent MCP tools
- [x] 5. A2: `nexus_get_context` composition + tests
- [x] 6. A2: wake agent identity
- [x] 7. A3: test-writer agent content + ask-first flow
- [x] 8. A3: doctor D11 + plan-done warning + CI brief wiring
- [x] 9. A3: registry agent packs (nexus-skills v0.3.0)
- [x] 10. Validation, docs, CHANGELOG → v1.1.0

## Files Touched
- nexus-cli: src/utils/agents/* (new), src/commands/agent.ts (new), src/mcp/{tools,server}.ts, src/commands/wake.ts, src/utils/doctor/checks/* (D11), src/commands/plan.ts, src/generators/{agents.ts new, ai-config.ts, index.ts}, tests/unit/agent*.test.ts (new)
- nexus-skills: packages/core/agents/* (new), shared/nexus-agent-authoring.md (new)

## Risks
- Client subagent formats drift → our format is source of truth; outputs are regenerated views (`agent sync`)
- Context recipes reference moved docs/skills → `agent status` + doctor validation
- Bureaucracy creep → hard ceiling of four core agents in v1.1; opt-in only
- D11 false positives on doc-only plans → waiver note is the escape hatch; consider `kind: docs` plans exempt (decide during A3)

## Notes
- 2026-06-10 — Plan drafted from v1_1_contextualized_agents.md after design discussion with Halton. Key sharpening: test evidence is a completion GATE (D11), not an agent habit. Awaiting approval (`nexus plan start` after review).

## Evidence
- 2026-06-11 — vitest: 438 tests passing (33 files; 34 new agent/D11/context tests incl. parser round-trip, precedence, sacredness, transport e2e). tsc clean, eslint clean, build clean, `nexus --version` → 1.1.0.
- 2026-06-11 — Deviation from acceptance: init opt-in prompt replaced by default-on generation with `enableAgents: false` manifest escape hatch (consistent with skills; zero-prompt). Logged here per skills protocol.
- 2026-06-11 — Also shipped in this release: upgrade data-loss fix (isTemplate gate + backups) — see CHANGELOG 1.1.0.
