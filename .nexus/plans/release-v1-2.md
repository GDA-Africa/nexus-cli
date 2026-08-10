---
nexus_plan: true
id: "release-v1-2"
title: "Release v1.2 — Provable Done, Scaffolding II, Context Economics, Doc Truth, Workspace"
status: "approved"
created: "2026-08-10"
updated: "2026-08-10"
owner: "Halton"
source: "design:../../../.nexus/docs/v1_2_provable_done.md + v1_2_scaffolding.md + session 2026-08-10"
parent: null
estimate: "6w"
phase: "v1.2"
tags: ["v1.2.0", "release", "umbrella", "context", "drift", "workspace"]
---

## Goal
Ship v1.2 as one release across five tracks: verifiable completion (B),
trustworthy scaffolding (C), bounded agent context (A), documentation that
cannot silently drift from code (D), and a machine-wide workspace layer that
makes multiple NEXUS projects orchestratable (E).

## Why
Three of these tracks are the same discipline pointed at different targets:
**stop asserting what has not been measured.** Provable Done measures
completion. The validation gate measures generated output. Doc extraction
measures what the code actually exposes. Context economics is the
precondition for the fifth — orchestration multiplies orientation cost, so it
cannot be built on a brain that every agent reads whole.

## Sequencing (dependency order, not preference order)

```
A (context economics) ──┬──> E (workspace + orchestrate)
                        │
D (doc truth) ──────────┘
B (provable done) ──> shares --strict CI gate with D
C (scaffolding II) ──> S8/S9 in flight
```

A gates E because orchestration cost is O(agents × projects × brain size).
D gates E because cross-project contract checks are worthless if either
side's contract doc is prose someone forgot to update.
B and D share one enforcement point (`doctor --strict` in CI) and should land
their gate wiring together rather than twice.

## Acceptance Criteria

### Track A — Context economics (blocks E)
- [ ] A1 `getContextTool` composes in priority order and subtracts as it goes;
      knowledge bodies truncated to a per-entry cap; `truncated` is true
      whenever anything was dropped, including when `recipe.docs` is empty
- [ ] A2 `generators/ai-config.ts` inverts the protocol: `nexus_get_context(task)`
      is step 1; whole-brain reading is the documented MCP-unavailable fallback
- [ ] A3 Agents read `knowledge-summary.md`, never the full append-only log;
      `index.md` sheds hand-maintained tables that code already answers
- [ ] Measured: orientation cost for a task in this repo drops below 4k tokens
      (baseline 2026-08-10: ~14.6k in `nexus-cli`)

### Track B — Provable Done
- [ ] M1/M2/M3 per `implement-v1-2-provable-done` (verify manifest, D11 v2,
      `doctor --strict`, wake hash inputs)
- [ ] Regression holds: an Evidence section reading "tests skipped" FAILS D11 v2

### Track C — Scaffolding II
- [ ] S1–S7 per `v1_2_scaffolding.md` (identity model, blueprints, per-platform
      validation gate)
- [ ] S8 Chameleon delegation — `--ui none` and `--ui chameleon` both produce
      projects that pass their gate; capability-gated, never a hard dependency
- [ ] S9 MCP composition + D12 `CLAUDE.md` collision guard

### Track D — Documentation truth (blocks E)
- [ ] D1 Extractor framework + managed-block writer, generalizing the proven
      `<!-- NEXUS:VITAL_SIGNS:START -->` mechanism in `commands/sync.ts`
- [ ] D2 API-surface extractor for shipped blueprints → managed block in
      `04_api_contracts.md`; snapshot in `.nexus/state/` for diffing
- [ ] D3 `covers: [glob]` doc frontmatter + D13 check: covered paths modified
      after the doc's `last_updated` → specific, actionable finding
- [ ] D4 Drift is a diff of two extractions, never a question about human
      diligence — verified by a test where the change is made by a commit that
      never touched `.nexus/`
- [ ] CI job reports drift on PRs from contributors who do not use NEXUS

### Track E — Workspace + orchestrate
- [ ] E1 `~/.config/nexus/projects.json` registry (pointers only); self-register
      on init/adopt; `nexus register`, `nexus projects`, opt-in `nexus scan`
- [ ] E2 Workspace definition: named group, member paths, role per member
      (`api` / `web-client` / `mobile-client`)
- [ ] E3 Cross-project contract drift: publisher role's extracted API surface
      vs each subscriber's last-synced snapshot
- [ ] E4 Cross-project plan blockers using existing `PlanFrontmatter.parent` /
      `ActivePlansState.blockers` — no new schema
- [ ] E5 MCP workspace scoping: project becomes an argument
      (`nexus_wake(project)`, `nexus_get_context(project, task)`); one server,
      one toolset — `server.ts` already accepts `rootDir`
- [ ] E6 Orchestrate: context is passed, never re-derived. The orchestrator
      composes one pack per task and hands it to each agent; handoff carries the
      delta, not a re-orientation; each agent role declares `max_chars`

### Track F — Release surface (site, READMEs, SEO, agent discovery)
Every v1.2 capability has to be discoverable by humans *and* by crawling
agents, and this surface has drifted before: the 2026-07-05 session records a
manual "homepage/llms drift sync" to catch `llms.txt` up to 17 tools / 456
tests / v1.1.2. Doing it by hand again guarantees the next drift.
- [ ] F1 `homepage/nexus-homepage/` — `index.html`, `docs.html`, `mcp.html`,
      `agents.html` updated for v1.2: verify manifest, `doctor --strict`,
      blueprints, `nexus use`, workspace commands
- [ ] F2 `llms.txt` + `llms-full.txt` — tool count, command list, version, and
      the new workspace/verify surfaces (this is the agent-facing contract)
- [ ] F3 `sitemap.xml` + `robots.txt` refreshed for any new pages; meta
      descriptions and OG tags per page
- [ ] F4 `nexus-cli/README.md` + root `README.md` + `NEXUS_CLI_README.md` on the
      site: one command table, generated from a single source, not three
      hand-maintained copies
- [ ] F5 `CHANGELOG.md` for v1.2 following the existing Keep-a-Changelog format
- [ ] F6 **Make this self-checking**: a D-series check that compares advertised
      counts (tools, commands, tests, version) against measured reality and
      fails CI on drift. Track D's extractor framework applied to our own
      marketing surface — the site is documentation, and the same rule applies:
      anything derivable must not be hand-maintained.

## Steps

- [x] Measure the orientation baseline and locate the budget defect (2026-08-10)
- [ ] A1 — fix the `get_context` budget + tests
- [ ] A2 — invert the generated protocol
- [ ] A3 — slim the brain templates
- [ ] B — Provable Done M1–M3
- [ ] D1 — extractor framework + managed-block writer
- [ ] D2 — API-surface extractor + snapshot
- [ ] D3 — `covers:` + D13
- [ ] B/D — shared `doctor --strict` CI gate wiring
- [ ] C — S1–S7 (S8/S9 in flight)
- [ ] E1–E2 — registry + workspace roles
- [ ] E3–E4 — cross-project drift + blockers
- [ ] E5–E6 — MCP workspace scoping + orchestrate
- [ ] F1–F4 — site, llms.txt, SEO, README consolidation
- [ ] F6 — self-checking release surface (drift check on advertised counts)
- [ ] Release: CHANGELOG, version bump, publish runbook

## Open Questions (answer before the track they block)

Blocking B: the 3 questions in `v1_2_provable_done.md` §5 (strict-mode
enforcement point, evidence location, `doctor --verify` in default CI).

Blocking C: the 5 questions in `v1_2_scaffolding.md` §6 — of which Q1
(who builds AppSpec `pages[]`) and Q4 (`chameleon new` as a public
interface) are the ones S8 cannot ship without.

Blocking E: does a workspace live in a file at a shared root, or purely in
global config? A file at the root is reviewable and shareable with teammates;
global config works when the projects have no common parent.

## Evidence
_Filled by `nexus plan verify release-v1-2`._

## Notes
- 2026-08-10 — Baseline measured: `nexus wake` output is 410 chars (~100
  tokens) and is NOT the orientation cost. `CLAUDE.md` (12,688 chars) +
  `nexus-cli` `index.md` (26,083) + `knowledge.md` (19,641) ≈ 14.6k tokens
  per session before any work, growing monotonically because `knowledge.md`
  is append-only by protocol and `index.md` accretes progress-log entries.
- 2026-08-10 — Budget defect located: `mcp/tools.ts:440` subtracts the budget
  *after* plan/knowledge/skills/vitals are fully built, knowledge bodies are
  untruncated (`toKnowledgeMatch`, :606), and `truncated` is only ever set
  inside the docs loop — so an over-budget pack can report `truncated: false`.
- 2026-08-10 — `src/utils/chameleon/` (S8) is being implemented in parallel;
  this plan does not touch that directory.
