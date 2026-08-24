---
nexus_doc: true
id: "04_api_contracts"
title: "API Contracts"
status: populated
confidence: high
last_updated: "2026-08-24"
---

# API Contracts

**Project:** NEXUS CLI

NEXUS has no HTTP API. Its two external contracts are the **CLI command surface** and the **MCP tool surface** (`nexus mcp`, stdio, `@modelcontextprotocol/sdk`). Both are implemented on the same underlying `src/utils/*` engine.

---

## 🖥️ CLI Commands (`src/commands/`)

| Command | Description |
|---------|-------------|
| `nexus init [name]` | Scaffold a new project from scratch via interactive prompts |
| `nexus adopt [path]` | Add `.nexus/` docs + AI config to an existing project |
| `nexus upgrade [path]` | Regenerate `.nexus/` with latest templates (smart file strategy: preserves `status: populated`) |
| `nexus repair [path]` | Fix missing/corrupted `.nexus/` files without touching valid ones |
| `nexus skill {new,list,registry,install,remove,status}` | Manage `.nexus/skills/` (core/custom/community) |
| `nexus agent {...}` | Manage `.nexus/agents/` definitions (6 subcommands) |
| `nexus pack [path]` / `nexus unpack [path]` | Zip/restore the `.nexus/` brain as a portable backup |
| `nexus update` | Check npm registry, install latest CLI version |
| `nexus sync` | Run sensors, rewrite the Vital Signs block in `index.md` |
| `nexus plan {new,list,show,start,tick,note,done}` | Plan lifecycle CLI (mirrors the plan MCP tools) |
| `nexus doctor [--strict]` | Run all D01–D14 drift checks, print findings |
| `nexus brief [--md]` | Human-readable status digest |
| `nexus consolidate` | Rebuild `knowledge-summary.md` from `knowledge.md` |
| `nexus wake` | Session handshake — issues an `NX-WAKE-*` token |
| `nexus use <provider>` | Chameleon UI-delegation: configure which UI generator a project defers to |
| `nexus mcp [path]` | Start the stdio MCP server exposing the brain as tools |

Every command is defined once in `src/commands/*.ts` and registered onto the Commander program in `src/cli.ts`.

## 🔌 MCP Tool Surface (`src/mcp/server.ts`, 17 tools)

All tools are read/compose except the four explicitly marked **write**. Every tool has a zod input schema in `src/mcp/tools.ts`; malformed input is rejected before the handler runs.

| Tool | Purpose |
|------|---------|
| `nexus_wake` | Session handshake — issues the `NX-WAKE` token, returns active plan + next step + doctor counts |
| `nexus_get_context` | **THE** composition tool — one scoped pack: plan slice, matching knowledge, triggered skills, vitals digest, agent-recipe docs |
| `nexus_get_vital_signs` | Run sensors on demand (git, files, tests, packages) — fresher than the cached block in `index.md` |
| `nexus_query_knowledge` | Targeted retrieval over `knowledge.md` (matching entries, newest first) |
| `nexus_get_active_plan` | Active plan's full markdown + next unchecked step |
| `nexus_list_plans` | List all plans with status/owner/phase |
| `nexus_get_plan` | Full markdown for one named plan |
| `nexus_brief` | Same digest as `nexus brief --md` |
| `nexus_doctor` | Run drift checks, return findings report |
| `nexus_list_skills` | List installed skills (custom/core/community precedence) |
| `nexus_get_skill` | Full markdown for one named skill |
| `nexus_list_agents` | List `.nexus/agents/` definitions with role/status/triggers |
| `nexus_get_agent` | Full definition for one named agent |
| `nexus_get_handoff` | Next agent in the pipeline (implementer → test-writer → reviewer → doc-keeper) — main-thread orchestrated |
| `nexus_plan_tick` **(write)** | Mark a checklist step done/reopened; returns the next unchecked step |
| `nexus_plan_note` **(write)** | Append a note to a plan |
| `nexus_add_knowledge_entry` **(write)** | Append a validated entry to `knowledge.md` |

Server identity: `name: 'nexus-brain'` (see `src/mcp/server.ts`). Registered for clients via the generated `.mcp.json` (`npx -y @nexus-framework/cli mcp`).

## 📋 Status / Exit Codes

NEXUS is a CLI, not an HTTP service — "status codes" are process exit codes and MCP tool-call error shapes, not HTTP codes.

| Code | Meaning |
|------|---------|
| `0` | Command succeeded |
| `1` | Command failed (validation error, invalid plan transition, missing brain, etc.) — message printed via `src/utils/logger.ts` |
| MCP tool error | SDK-level error response when zod schema validation fails or the handler throws; the client sees a structured MCP error, not a raw exception |

`nexus doctor --strict` additionally turns `warn`-severity findings into a non-zero exit, for CI gating.
