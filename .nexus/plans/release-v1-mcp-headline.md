---
nexus_plan: true
id: "release-v1-mcp-headline"
title: "v1.0.0 reboot — MCP server as the headline feature"
status: "done"
created: "2026-06-10"
updated: "2026-06-10"
owner: "nexus-agent"
source: "session:2026-06-10 brain-aware-ci + mcp discussion"
parent: null
estimate: "2d"
phase: "v1.0-mcp"
tags: ["v1.0.0", "mcp", "ci", "skills", "release"]
---

## Goal
Re-cut v1.0.0 with `nexus mcp` — a stdio MCP server exposing the brain as read + write tools — as the headline feature, plus deterministic brain-aware CI snippets, MCP-served skills, and multi-agent pointer files. Fix the publish pipeline that failed on 2026-06-09 (expired NPM_TOKEN).

## Why
The 2026-06-09 v1.0.0 publish failed in CI (expired npm token), so v1.0.0 never reached npm — we have a free window to make v1.0 a bigger release. The MCP server converts the brain from "files agents are told to read" into "tools agents naturally call": targeted retrieval (accuracy), one-call wake (speed), and schema-validated writes (no more hand-edited frontmatter bugs like the `status: backlog` TypeError).

## Acceptance Criteria
### MCP server (headline)
- [ ] `nexus mcp` command starts a stdio MCP server using `@modelcontextprotocol/sdk`
- [ ] Read tools: `nexus_wake`, `nexus_get_vital_signs`, `nexus_query_knowledge`, `nexus_get_active_plan`, `nexus_list_plans`, `nexus_get_plan`, `nexus_brief`, `nexus_doctor`, `nexus_list_skills`, `nexus_get_skill`
- [ ] Write tools: `nexus_plan_tick`, `nexus_plan_note`, `nexus_add_knowledge_entry` — all schema-validated, reuse existing parser/lifecycle utils
- [ ] MCP command bypasses auto-invoke hooks and update banner (stdout must stay protocol-clean)
- [ ] Unit tests for every tool handler

### Brain-aware CI (deterministic tier only)
- [ ] Generated CI workflow gains a PR job: `nexus sync --dry-run` + `nexus brief --md` posted as PR comment, `nexus doctor` as non-blocking gate
- [ ] No LLM dependency anywhere in v1.0 CI

### Multi-agent serving + MCP config
- [ ] Generated projects include `.mcp.json` (Claude Code / Codex compatible) registering the nexus MCP server
- [ ] Pointer files (CLAUDE.md, AGENTS.md, copilot-instructions) document the MCP tool surface

### nexus-skills
- [ ] New shared core skills: `nexus-mcp-usage`, `nexus-plans-workflow`, `brain-aware-ci`
- [ ] Outstanding core skill content completed; v0.1.0 publish-ready
- [ ] Stale brain docs in nexus-skills/.nexus fixed (index.md is a copy of nexus-cli's)

### Release
- [ ] ci.yml publish gate compares package.json against the npm registry (not HEAD~1) so failed publishes can re-run
- [ ] CHANGELOG + README updated with MCP headline
- [ ] Publish runbook documents NPM_TOKEN renewal steps
- [ ] `npx tsc --noEmit && npm run test && npm run lint` all green

## Steps
- [x] 1. Install @modelcontextprotocol/sdk + zod; scaffold src/mcp/
- [x] 2. Implement read tools wrapping brief/doctor/sensors/plans/knowledge utils
- [x] 3. Implement write tools (plan_tick, plan_note, add_knowledge_entry)
- [x] 4. Implement skills tools (list/get with custom > core > community precedence)
- [x] 5. Wire `nexus mcp` into cli.ts with hook bypass
- [x] 6. Unit tests for MCP tool handlers
- [x] 7. Update ci-cd generator (brief PR comment + doctor gate) + own ci.yml publish gate
- [x] 8. Update ai-config generator (.mcp.json + pointer file MCP sections)
- [x] 9. nexus-skills: new skills + finish core content + fix stale brain
- [x] 10. Validation (tsc/test/lint), CHANGELOG, README, runbook, brain updates

## Files Touched
- nexus-cli: package.json, src/mcp/* (new), src/cli.ts, src/generators/ci-cd.ts, src/generators/ai-config.ts, .github/workflows/ci.yml, tests/unit/mcp*.test.ts (new), CHANGELOG.md, README.md
- nexus-skills: src/skills/shared/* (new skills), .nexus/docs/*

## Risks
- stdio purity: any console.log in wrapped utils corrupts MCP framing → route all server logging to stderr, suppress logger in tool handlers
- @modelcontextprotocol/sdk ESM/TS compatibility with strict NodeNext — verify at install
- Re-using v1.0.0 version number: npm never received it, so it is still publishable; registry-based publish gate makes this safe

## Notes
- 2026-06-10 — Plan opened. Scope confirmed with Halton: read+write MCP, deterministic CI only, skills repo updated + multi-agent serving.
- 2026-06-10 — Sandbox gotcha: npm cannot reify node_modules on the mounted FS (ENOTEMPTY on rename); used a /tmp build mirror for installs/tests, mount stays source of truth.
- 2026-06-10 — Framework-parity skill content (sveltekit/nuxt/astro/remix ≥5 skills each) intentionally NOT written this session — left as nexus-skills backlog #2 rather than rushing low-quality content.

## Evidence
- 2026-06-10 — 419/419 unit tests pass (32 files; 18 new MCP tests incl. InMemoryTransport e2e), `tsc --noEmit` clean, eslint clean, `npm run build` clean.
- 2026-06-10 — Real stdio smoke test: initialize → serverInfo `nexus-brain v1.0.0`; tools/call nexus_wake → `NX-WAKE-RX75-2026-06-10`. No stdout pollution (auto-invoke + update banner bypassed for `mcp`).
- 2026-06-10 — Remaining human steps: renew NPM_TOKEN, re-run publish (see docs/publish-runbook.md), publish @nexus-framework/skills 0.2.0.
