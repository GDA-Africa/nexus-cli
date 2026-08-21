# NEXUS — The Complete Reference

> Everything about NEXUS in one file: what it is, what it ships, the contracts
> that must not break, and where the bodies are buried.
>
> **Version at time of writing:** `@nexus-framework/cli` **v1.3.0** ·
> `@nexus-framework/skills` **v0.4.0** · 2026-08-21
> **Audience:** anyone — human or agent — about to design or build the next
> major version. Written to be read start to finish once, then grepped.
>
> **Scope note.** This file lives in `nexus-cli/` but describes the whole
> NEXUS ecosystem, including the skills registry and the site. Paths in
> [§21](#21-codebase-map) are relative to `nexus-cli/`; paths naming another
> package are relative to the monorepo root. It is not in the npm `files`
> list, so it ships on GitHub, not to package consumers.

---

## Table of contents

1. [The thesis](#1-the-thesis)
2. [What NEXUS is not](#2-what-nexus-is-not)
3. [The three packages](#3-the-three-packages)
4. [Anatomy of a brain](#4-anatomy-of-a-brain)
5. [Commands](#5-commands)
6. [The MCP server](#6-the-mcp-server)
7. [Doctor](#7-doctor)
8. [Plans](#8-plans)
9. [Knowledge](#9-knowledge)
10. [Skills and SKILL_SPEC v2](#10-skills-and-skill_spec-v2)
11. [Agents](#11-agents)
12. [The alignment gate](#12-the-alignment-gate)
13. [Context load](#13-context-load)
14. [Generated files and the smart file strategy](#14-generated-files-and-the-smart-file-strategy)
15. [Chameleon UI delegation](#15-chameleon-ui-delegation)
16. [Brain-aware CI](#16-brain-aware-ci)
17. [Release history](#17-release-history)
18. [Invariants — do not break these](#18-invariants--do-not-break-these)
19. [Recurring failure patterns](#19-recurring-failure-patterns)
20. [Known gaps and open work](#20-known-gaps-and-open-work)
21. [Codebase map](#21-codebase-map)
22. [Release procedure](#22-release-procedure)

---

## 1. The thesis

Scaffolding tools generate files. NEXUS generates **understanding**.

Every AI coding agent starts each session knowing nothing about your project.
It re-derives your conventions, forgets the decision it made yesterday, and
asks what to build next when the answer is already written down. The usual
response is to tell the agent to "read the docs" — but reading the docs is
unverifiable, unbounded, and gets more expensive as the project grows.

NEXUS gives every project a **brain**: a `.nexus/` directory of plain markdown
that is simultaneously human-readable, git-diffable, and machine-callable. Then
it makes the brain *addressable* — the `nexus-brain` MCP server exposes it as
17 schema-validated tools, so an agent asks a question and gets a bounded,
task-scoped answer instead of a pile of files.

Four capabilities, in the order they were added:

| | Capability | Released |
|---|---|---|
| **Memory** | Structured docs + append-only knowledge base | v0.2 |
| **Runtime** | Sensors, drift detection, durable plans, handshake | v0.4 / v1.0 |
| **Interface** | The brain as MCP tools | v1.0 |
| **Staffing** | Brain-grounded agent roles with context recipes | v1.1 |
| **Alignment** | A recorded interview as a precondition for feature work | v1.3 |

The through-line, and the sentence to keep if you keep only one:

> **Markdown is the source of truth. The MCP server is an interface, not a
> database.** No daemon, no service, no lock-in. Delete `.nexus/` and you have
> lost a brain, not a build.

---

## 2. What NEXUS is not

Knowing the boundaries matters more than the features when you are designing
the next version.

- **Not a database.** Nothing is stored anywhere but files in your repo. The
  MCP server is spawned per client over stdio and exits with it.
- **Not a runtime dependency.** Generated projects do not `import` NEXUS. You
  can eject at any time; the markdown stays and keeps working.
- **Not an agent framework.** NEXUS does not run agents or orchestrate them.
  It defines roles and hands off *advice about who should go next*; the main
  thread does the dispatching. (Subagents cannot spawn subagents — this is
  why `nexus orchestrate` stays deferred.)
- **Not a code generator, after v1.2.** UI generation is delegated to
  Chameleon, opt-in. NEXUS overlays the brain, tooling, CI, and tests around
  whatever produced the code.
- **Not a process police.** Every gate is *visible, not impossible*. NEXUS
  reports and records; it does not refuse. See [§18](#18-invariants--do-not-break-these).

---

## 3. The three packages

The monorepo holds three independently-versioned things.

| Package | Path | Published as | Purpose |
|---------|------|--------------|---------|
| **CLI** | `nexus-cli/` | `@nexus-framework/cli` v1.3.0 | The tool. 18 commands, the MCP server, all generators. |
| **Skills registry** | `nexus-skills/` | `@nexus-framework/skills` v0.4.0 | Content only. 49 skills across 10 framework sets + `SKILL_SPEC.md`. |
| **Homepage** | `homepage/nexus-homepage/` | nexus.glenhalton.com | Static HTML + `llms.txt` for agent consumers. |

Three deliberate consequences:

- **The registry publishes independently.** `nexus skill registry` fetches the
  npm tarball live, so new skills reach existing installs without a CLI
  release.
- **The registry's `package.json` lives at `packages/core/package.json`**, not
  the repo root. This trips up tooling; it tripped up `build-stats.mjs`.
- **Each sub-project has its own brain.** `nexus-cli/.nexus/` is the deep
  working brain for CLI implementation; the monorepo root `.nexus/` maps the
  whole ecosystem. For CLI work, read the CLI's.

**License:** Apache 2.0. **Runtime:** Node.js 20+. **Author:** GDA Africa.

---

## 4. Anatomy of a brain

```
.nexus/
├─ docs/
│  ├─ index.md            ← THE PROJECT BRAIN: objective, backlog, vital signs, progress log
│  ├─ knowledge.md        ← append-only long-term memory
│  ├─ knowledge-summary.md   ← generated by `nexus consolidate` (optional)
│  ├─ 01_vision.md        ← product requirements, users, success metrics
│  ├─ 02_architecture.md  ← system design, stack, data flow
│  ├─ 03_data_contracts.md   ← schemas, validation, relationships
│  ├─ 04_api_contracts.md    ← endpoints, interfaces, status codes
│  ├─ 05_business_logic.md   ← rules, algorithms, state machines
│  ├─ 06_test_strategy.md    ← coverage targets, test types, philosophy
│  ├─ 07_implementation.md   ← build order, file-by-file plan
│  └─ 08_deployment.md       ← infrastructure, CI/CD, env config
├─ plans/                 ← durable multi-step work
│  ├─ _active.json        ← which plan is active
│  └─ index.md            ← generated status board
├─ skills/                ← how THIS project does things
│  ├─ core/               ← framework-matched, regenerated on upgrade
│  ├─ custom/             ← yours. SACRED. never touched.
│  └─ community/          ← installed packs, reinstallable
├─ agents/                ← role definitions (same core/custom/community model)
├─ state/                 ← gitignored: session tokens, sensor cache, backups
│  ├─ session.json        ← wake handshake record
│  ├─ doctor.json         ← last doctor report
│  ├─ chameleon.json      ← UI generation evidence (v1.2)
│  └─ upgrade-backup/     ← pre-overwrite snapshots
├─ config.json            ← project UI generator preference (v1.2)
└─ ai/instructions.md     ← the master instruction file every tool file points at

.mcp.json                 ← registers the nexus-brain MCP server
CLAUDE.md · AGENTS.md · .cursorrules · .windsurfrules · .clinerules
.github/copilot-instructions.md      ← per-harness instruction files
```

**The two hot files.** `index.md` is the brain — what we are doing, what is
next, what just happened. `knowledge.md` is memory — why things are the way
they are. An agent that reads only these two is oriented.

**Frontmatter drives upgrades.** Every numbered doc carries
`status: template | populated`. `nexus upgrade` refreshes template-state files
and preserves everything else. See [§14](#14-generated-files-and-the-smart-file-strategy).

---

## 5. Commands

18 top-level commands.

### Project setup

| Command | What it does |
|---------|--------------|
| `nexus init [name]` | Scaffold a new project: interview, framework templates, full brain, skills, `.mcp.json`, CI, instruction files. `--local` keeps `.nexus/` out of git. `--ui chameleon\|none` picks the UI generator. |
| `nexus adopt [path]` | Add the brain + AI config + skills to an **existing** project. No scaffolding. Same generators as `init`. |
| `nexus upgrade [path]` | Refresh NEXUS-owned files to the current templates. Preserves populated docs, custom skills, and knowledge. Backs up before every overwrite. |
| `nexus repair [path]` | Restore missing or structurally corrupted `.nexus/` files. Preserves everything valid. |

### The alive brain

| Command | What it does |
|---------|--------------|
| `nexus wake` | Session handshake. Prints a deterministic token to echo, plus the active plan and the alignment gate. |
| `nexus sync` | Run sensors, write the Vital Signs block into `index.md`. |
| `nexus doctor` | 14 drift checks. `--severity`, `--fix`, `--json`, `--strict`. |
| `nexus brief` | Human-readable status digest. `--md` for the CI comment format. |
| `nexus consolidate` | Roll `knowledge.md` up into a generated summary. `--check`, `--archive`. |
| `nexus brain status` | Live brain health dashboard. |
| `nexus brain check` | On-demand drift detection. |

### Plans — `nexus plan <sub>`

`new · list · show · start · tick · note · done`

```bash
nexus plan new "Add user authentication" --type=feature   # also: --major, --owner, --phase, --estimate
nexus plan start add-user-authentication
nexus plan tick add-user-authentication 3
nexus plan note add-user-authentication "Chose lucia over next-auth: we own the session table"
nexus plan done add-user-authentication --summary "Auth shipped; 24 new tests"
```

### Skills — `nexus skill <sub>`

`new · list · registry · install · remove · status`

`status` validates every installed skill against `SKILL_SPEC` v2 — category,
framework, version, author, invocation, gate, and required body sections.

### Agents — `nexus agent <sub>`

`list · new · install · remove · status · sync`

### Other

| Command | What it does |
|---------|--------------|
| `nexus mcp` | Start the brain MCP server on stdio. |
| `nexus use [chameleon\|none]` | Set the UI generator. `--global`, `--explain`, `--json`. |
| `nexus pack` / `nexus unpack` | Zip / restore `.nexus/` for migration. |
| `nexus update` | Self-update check. |

---

## 6. The MCP server

`nexus mcp` starts a stdio server named `nexus-brain`. Generated projects
register it automatically:

```json
{ "mcpServers": { "nexus-brain": {
    "command": "npx", "args": ["-y", "@nexus-framework/cli", "mcp"] } } }
```

Claude Code, Claude Cowork, and OpenAI Codex read `.mcp.json` automatically;
Cursor users copy the entry into `.cursor/mcp.json`. The server is spawned per
client and exits with it. **stdout carries protocol only** — handlers never
`console.log` and never `process.exit()`; they throw `McpToolError`, which the
server layer converts into a tool error.

### 17 tools — 14 read, 3 write

**Read**

| Tool | Returns |
|------|---------|
| `nexus_wake` | Handshake token, active plan, next step, doctor counts |
| `nexus_get_context` | **The keystone.** One composed pack for a task |
| `nexus_get_active_plan` | Active plan + first unchecked step |
| `nexus_list_plans` / `nexus_get_plan` | Plan orientation |
| `nexus_query_knowledge` | Targeted lookup by keywords + category |
| `nexus_get_vital_signs` | Live sensors: git, tests, files, packages |
| `nexus_brief` | Status digest |
| `nexus_doctor` | Findings + summary counts |
| `nexus_list_skills` / `nexus_get_skill` | Skill discovery and retrieval |
| `nexus_list_agents` / `nexus_get_agent` | Role discovery |
| `nexus_get_handoff` | Which agent the **main thread** should dispatch next |

**Write** — schema-validated, so malformed brain state is impossible rather
than merely detectable.

| Tool | Does |
|------|------|
| `nexus_plan_tick` | Toggle a checklist step by 1-based index |
| `nexus_plan_note` | Append a timestamped note |
| `nexus_add_knowledge_entry` | Append a formatted entry; rejects duplicate category+title |

### `nexus_get_context` — how the pack is composed

This is the most important function in the codebase. It is **deterministic —
keyword and token matching, no LLM** — and `maxChars` is a hard cap, not a
suggestion.

Sections are composed in priority order and charged against the budget as they
are admitted:

1. **Plan slice** — bounded by construction (three short fields), charged but never rejected
2. **Alignment gate** — bounded by construction (four short fields), charged but never rejected
3. **Skills** — ranked by trigger relevance, admitted until the budget runs out
4. **Knowledge** — each entry capped at 1200 chars, then admitted
5. **Docs** — whatever budget survives

`truncated: true` whenever anything was cut or dropped.

> **The ordering is load-bearing.** The gate is composed before every
> budget-consuming section specifically so it can never be crowded out. A gate
> that can be starved by a long knowledge entry is not a gate.

---

## 7. Doctor

14 checks. Exit codes: `0` clean, `1` warnings, `2` errors — so CI can gate.

| ID | Name | Default | Flags |
|----|------|---------|-------|
| D01 | Frontmatter Status Drift | warn | Docs whose status no longer matches their content |
| D02 | Stale Phase | warn | A phase that has not moved |
| D03 | Progress Log Gap | info | No progress entries recently |
| D04 | Knowledge Bloat | warn | Time to `nexus consolidate` |
| D05 | Stale Knowledge References | warn | Entries citing deleted files |
| D06 | Stale Plan | warn | In-progress plan with no movement |
| D07 | Orphan Plan | warn | Plan with no owner or no path forward |
| D08 | Vital Signs Health | warn | Sensors never run or stale (**auto-fixable**) |
| D09 | Handshake Missed | info | Commits with no registered wake |
| D10 | Skills Drift | warn | Core skills missing or outdated |
| D11 | Unverified Done | warn | Plan marked done with no evidence |
| D12 | Chameleon Agent Block | warn | A NEXUS regeneration dropped Chameleon's block |
| D13 | Alignment Gate | warn → **error under `--strict`** | Gated plan with no `## Grilling` record |
| D14 | Context Load | warn (error >16 KB or `--strict`) | Instruction file over the always-loaded budget |

`--strict` escalates advisory findings to errors. It is a **single flag on
`DoctorContext`**, not per-check config — any check that should be advisory
locally and blocking in CI reads `ctx.strict`.

Disable checks per project in `.nexus/doctor.config.json`:
```json
{ "disabledChecks": ["D03"] }
```

---

## 8. Plans

A plan is the unit of multi-step work: a markdown file in `.nexus/plans/<id>.md`
with frontmatter and fixed sections (Goal, Why, Acceptance Criteria, Steps,
Notes, Evidence — plus `## Grilling` on gated types).

**Types:** `feature` · `bug` · `refactor` · `spike` · `chore`
**Lifecycle:** `draft → approved → in_progress → (blocked | done | abandoned)`

Frontmatter carries `id`, `title`, `status`, `created`, `updated`, `owner`,
`source`, `type`, `major`, `parent`, `estimate`, `phase`, `tags`.

- **`type` is explicit since v1.3.** Plans created earlier are classified from
  their `source: "template:feature"` convention, so the gate applies to them too.
- **`major: true`** marks a bug plan a major fix, opting it into the gate.
- **`parent`** enables sub-plans when several agents work in parallel; one
  agent owns the top-level plan.

`nexus plan done` appends to the `index.md` progress log and prompts for a
knowledge entry.

---

## 9. Knowledge

`.nexus/docs/knowledge.md` is **append-only**. Entries are never deleted, only
added. It is the answer to "why is it like this?" three months later.

**The format is load-bearing:**

```markdown
### [category] Short Title In Title Case
**2026-08-21** — What was discovered, in one or two sentences.
**Why:** the reason it happened, not just the symptom.
**How to apply:** what a future agent should do differently.
```

The `###` heading level and the `[category]` brackets are both parsed. An entry
in any other shape is invisible to `nexus_query_knowledge`, to the knowledge
section of `nexus_get_context`, and to `nexus consolidate`. Prefer
`nexus_add_knowledge_entry`, which produces the right shape for you.

**Categories:** `architecture` · `bug-fix` · `pattern` · `package` ·
`performance` · `convention` · `gotcha` · `integration`

**When to write:** after discovering something non-obvious, or making a
decision future agents should know about. **Not** for routine task
completion — that goes in the `index.md` progress log.

`nexus consolidate` generates a categorized summary layer past ~200 entries.
The raw log is never edited.

---

## 10. Skills and SKILL_SPEC v2

A skill is a markdown file that answers **"how do we do this *here*?"** — the
question every agent gets wrong on its own. They install as plain files, so any
tool can read them.

### Two kinds

| Kind | Answers | Categories | Output |
|------|---------|-----------|--------|
| **Reference** | "How do we do this here?" | `ui` `routing` `data` `testing` `api` `config` `workflow` `integration` | a file, written the project's way |
| **Procedure** | "What discipline do I run now?" | `procedure` | a changed state of understanding |

A reference skill can be skimmed and partially applied with no harm. **A
procedure skill that is half-run has not been run.** Procedure skills take
`## Completion Criteria` in place of `## Example`.

### Frontmatter

```yaml
---
skill: grilling               # kebab-case, required
version: 1.0.0                # semver, required
framework: shared             # required — or next.js, react-vite, sveltekit,
                              #   nuxt, astro, remix, go, python, rust
category: procedure           # required — one of the 9 above
invocation: model             # v2 — model | user. Defaults to model.
gate:                         # v2, optional — only on model skills
  plan_types: [feature, refactor, spike]
  record: "## Grilling"
triggers:                     # required, min 2, 2–4 words each
  - "new feature"
  - "major fix"
author: "@nexus-framework/skills"
status: draft                 # active | draft | deprecated
---
```

### The invocation axis and its invariant

| Value | Reachable by | Role |
|-------|--------------|------|
| `model` | the agent **or** the human | reusable discipline |
| `user` | the human only | orchestration |

> A `user` skill may invoke `model` skills. A `model` skill may invoke `model`
> skills. **Nothing may invoke a `user` skill except the human.**

The call graph is a DAG rooted at the human. Without this, orchestrators
recurse into each other and one task drags three disciplines into one context.
It is also why only `model` skills may declare a `gate` — a gate is injected by
the brain, and the brain is not the human.

Express a dependency as an instruction naming the skill
(`Invoke the \`grilling\` skill before drafting the plan`), never as a file
path (breaks across harnesses) and never as `/skill` (assumes one harness's
syntax).

### Trigger matching

Deterministic token-overlap scoring with **ranked** admission — best match
first, so budget pressure drops the least relevant skill rather than an
arbitrary one. A verbatim hit on word boundaries scores 1.

Write triggers **2–4 words, task-level, one per distinct case**. A long
descriptive phrase like `"creating a reusable React component"` is valid but
will not match a real task string.

### Precedence

```
custom/  >  core/  >  community/
```

**Custom skills are sacred** — never overwritten, regenerated, or deleted by
any NEXUS command. To override a core skill, create a custom one with the same
slug.

### The registry

49 skills across 10 framework sets, 22 of them shared. `shared/` installs into
every project; framework directories install on detection. Browse at
[nexus.glenhalton.com/skills](https://nexus.glenhalton.com/skills).

---

## 11. Agents

`.nexus/agents/` holds brain-grounded role definitions — same ownership model
as skills (core regenerated, **custom sacred**, community installable, same
precedence).

Each agent carries a **context recipe** (which docs, which knowledge
categories, which skills, what plan scope), a **least-privilege MCP tool
allowlist**, and a **handoff contract**.

| Agent | Role | Mission |
|-------|------|---------|
| `nexus-implementer` | build | Works the active plan's next step. Never re-derives an existing plan. |
| `nexus-test-writer` | verification | The keystone. Detects test setup via sensors, writes tests matching `06_test_strategy.md`, **asks before scaffolding test infra**, records waivers visibly. Verifies others' work, never its own. |
| `nexus-reviewer` | review | Reviews against recorded conventions, citing knowledge entries. Read-only allowlist. |
| `nexus-doc-keeper` | hygiene | Progress log, knowledge entries, doctor triage. |

Generated as Claude Code subagents in `.claude/agents/`; everywhere else, a
fenced "Agent Roles" table inside the instruction files. Regenerate with
`nexus agent sync`.

**Orchestration is main-thread.** `nexus_get_handoff` returns who should go
next; the main thread dispatches. Subagents cannot spawn subagents — this is
the constraint that keeps `nexus orchestrate` deferred.

---

## 12. The alignment gate

*New in v1.3. The design doc is `.nexus/docs/v1_3_skills_ii.md`.*

The most expensive failure in a project is not bad code. It is well-built code
that answered the wrong question, because the agent inferred an ask instead of
resolving it. The gate makes alignment a **precondition** for feature work
rather than a line in a rules file.

### What gates

| Plan type | Gated? | Why |
|-----------|--------|-----|
| `feature` | always | New behaviour has branches to resolve |
| `refactor` | always | Scope and the out-of-scope list *are* the decision |
| `spike` | always | An unaligned spike answers a question nobody asked |
| `bug` | only with `--major` | A data-loss regression and a typo fix are both bug plans; only the human knows which |
| `chore` | never | No branches |

### It keys off structural facts, never prose

The gate reads the plan's `type` field and whether its `## Grilling` section is
filled. **It never classifies the wording of your task.**

This was the design's load-bearing decision. D11 v1 already shipped a keyword
sniff over agent-written Evidence prose and it was gameable by exactly the
agent it targeted — `"tests skipped, didn't run them"` passed a `/\btests?\b/`
gate. A prose classifier for "is this complex?" repeats that defect one layer
up: the agent that would skip alignment is the agent that rephrases the task to
dodge the gate.

### The record

A `## Grilling` section **inside the plan**, not a separate state file. It
diffs in git beside the work it aligned, the reviewer sees the questions that
shaped the plan, and it travels across sessions with nothing to keep in sync.

A gated plan is scaffolded with the section pre-seeded and marked pending, so
**an untouched template never satisfies the gate**.

```markdown
## Grilling

**Ask:** Add per-project skill overrides so a team can shadow a core skill.

**Resolved**
- Precedence — `custom/` wins outright; no section merging. A half-overridden
  skill is harder to reason about than a replaced one.
- Upstream drift — `nexus skill status` reports it; it does not auto-update.

**Out of scope**
- Section-level overrides — revisit only if whole-file proves too blunt
```

The out-of-scope list is the half that pays off later: it is the record of a
decision that would otherwise be re-litigated every session.

### Where it surfaces

- `nexus plan new` — warns and scaffolds the pending record
- `nexus plan start` — warns, then proceeds. **It never refuses.**
- `nexus wake` — the handshake prints the gate
- `nexus_get_context` — returns a `gate` section, and injects the gated skill
  into `skills` with `matchedTrigger: "<gate>"` regardless of trigger match
- `nexus doctor` — **D13** flags a started plan with no record

### Nothing hard-blocks, deliberately

An MCP tool cannot compel an agent, and refusing to start a plan would push the
work outside the plan, where nothing can see it at all. D13 makes a skipped
gate visible after the fact. Same posture as the wake handshake: **visible, not
impossible.** Teams that want a wall get it in CI with `doctor --strict`.

---

## 13. Context load

Every generated instruction file is **context load**: bytes in the agent's
window on *every* turn, spent whether or not they turn out to be relevant.
Unlike a doc reached through a pointer, nothing about the task makes that cost
go away.

**D14 measures per file, not per project.** Six harnesses load six different
files — Cursor reads `.cursorrules`, Claude reads `CLAUDE.md` — so a session
pays for one of them, not their sum. Reporting the ~48 KB total would be a
number no agent ever pays. Duplication across those files is a *maintenance*
problem and is reported separately as `info`.

**Two budgets, on purpose:**

| Budget | Where | Why |
|--------|-------|-----|
| 8 KB | `tests/unit/ai-config-budget.test.ts` | NEXUS's own generator. A failing test is a better place to catch our growth than a warning in someone else's project. |
| 10 KB warn / 16 KB error | D14 | User projects, with room to add house rules |

**Applied to ourselves first.** The generated `CLAUDE.md` was 13.4 KB, with the
docs table stated twice, "orient first" stated in three places, and a Workflow
section telling the agent to read four files by hand immediately after telling
it to prefer one `nexus_get_context` call. It is **7.9 KB** in v1.3.

What moved behind a pointer into `.nexus/ai/instructions.md`: the knowledge
entry format, the category table, the docs listing, long-form workflow prose.

What stayed inline: the onboarding protocol, the `STOP` gate on
`status: template` docs, project identity, code rules, workflow rules —
**because agents ignore cross-file pointers.** Disclosure is right for
*reference* and wrong for a *gate*.

---

## 14. Generated files and the smart file strategy

### The three buckets

| Bucket | Files | On upgrade |
|--------|-------|-----------|
| **ALWAYS_REPLACE** | `.nexus/ai/instructions.md`, `.nexus/index.md`, `.nexus/manifest.json`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md` | overwritten |
| **ALWAYS_PRESERVE** | `.nexus/docs/knowledge.md` | never touched |
| **Everything else** | the numbered docs, plans | replaced **only** if frontmatter says `status: template` |

Skills and agents: `core/` and READMEs are replaced on upgrade, preserved on
repair. `community/` is preserved (reinstallable). `custom/` is never touched.

### Preserve-by-default

> `status: populated`, frontmatter with no status, and **no frontmatter at
> all** are all user content. Only an explicit `status: template` in the
> **leading** frontmatter authorises a replace.

This contract has been broken twice, both times destroying real work. See
[§19](#19-recurring-failure-patterns). Before every overwrite, the old content
is mirrored to `.nexus/state/upgrade-backup/<stamp>/<path>` — gitignored, so a
bad upgrade is recoverable even without version control.

### The six instruction files

All six come from one `toolInstructionContent(config, toolName)` call and
differ only in their H1. `.nexus/ai/instructions.md` is the larger master copy
they point at.

---

## 15. Chameleon UI delegation

*Opt-in, added in v1.2.*

`nexus init` is the interview; [Chameleon](https://chameleon.glenhalton.com)
(`@chameleon-ui-lib/react`, also GDA Africa) is the UI generator. NEXUS
resolves your answers into an **AppSpec**, hands it over, then overlays the
brain, tooling, CI, and tests around what Chameleon writes.

```bash
nexus use chameleon            # this project
nexus use chameleon --global   # every project
nexus use none                 # opt back out
nexus use --explain            # what's active, and which file said so
nexus init my-app --ui none    # override for one run
```

**Resolution order:** `--ui` flag → project `.nexus/config.json` → global
`~/.config/nexus/config.json` → `none`.

Key properties:

- **Never a hard dependency.** Every project must still build with `--ui none`.
- **Resolved from your environment, not bundled:** `NEXUS_CHAMELEON_BIN` →
  project `node_modules/.bin` → `npx --no-install`. Absent or broken →
  fall back to NEXUS and print the reason.
- **Capability-gated, not version-gated.** NEXUS asks Chameleon what it
  supports (`appspec-v2`, `init-framework-aware`, …) and disables unavailable
  paths, so new Chameleon releases light up new paths with no NEXUS release.
  **Never branch on `cliVersion`.**
- **Validated before it runs**, then recorded to `.nexus/state/chameleon.json`
  as generation evidence.
- **Native targets skip it deliberately.** Chameleon's component tree is
  DOM-bound, so an Expo target opts out and says why, regardless of a saved
  preference. A remembered choice must never produce a project that cannot boot.

---

## 16. Brain-aware CI

Generated workflows include a deterministic brain layer — **no LLM anywhere**.

- **Brief PR comments.** On every PR, CI runs `nexus sync` + `nexus brief --md`
  and upserts one sticky comment (marker `<!-- nexus-brain-brief -->`), so
  reviewers see brain state next to the diff.
- **Doctor gate.** CI gates on doctor **errors**. Add `--strict` to gate on
  advisory findings too.

---

## 17. Release history

| Version | Date | Headline |
|---------|------|----------|
| v0.1 | Feb 2026 | **Genesis** — `init`/`adopt`, 6 frameworks, toolchain, CI templates |
| v0.2 | Feb 2026 | **Intelligence** — 8-doc system, project brain, knowledge base, personas |
| v0.3 | Mar 2026 | **Skills** — live registry, `nexus skill` |
| v0.4 | May 2026 | **Alive Brain** — `sync`, `plan`, `doctor`, `brief`, auto-invoke |
| v1.0 | Jun 2026 | **MCP** — `nexus mcp`, `wake`, `consolidate`, brain-aware CI |
| v1.1 | Jun 2026 | **Contextualized Agents** — the core four, `nexus_get_context`, D11 |
| v1.1.3 | Aug 2026 | Patch — manifest normalization (see the note below) |
| v1.2.0 | Aug 2026 | **Delegation** — Chameleon UI delegation, `nexus use`, D12 |
| **v1.3.0** | **Aug 2026** | **Skills II** — SKILL_SPEC v2, the alignment gate, D13, D14 |

> **The 1.1.3 / 1.2.0 note.** The published 1.1.3 tarball already contained the
> Chameleon work — it was cut while that work sat under an `[Unreleased]`
> heading, so 1.1.3 shipped a feature set its own changelog did not describe.
> 1.2.0 is the same code under the version it should have carried. Upgrading
> 1.1.3 → 1.2.0 changes only the version number.

---

## 18. Invariants — do not break these

Each of these was learned the expensive way. If the next major version needs to
break one, that is a decision to make deliberately and write down, not a
detail to refactor past.

1. **Markdown is the source of truth.** The MCP server is an interface. If a
   feature only works through MCP, it is not a NEXUS feature yet.

2. **Preserve-by-default.** Only an explicit `status: template` in the leading
   frontmatter authorises overwriting a file. No frontmatter means user
   content. When in doubt, do not overwrite.

3. **`custom/` is sacred.** Custom skills and agents are never overwritten,
   regenerated, or deleted by any command, including `repair`.

4. **Visible, not impossible.** Gates report and record; they do not refuse.
   A wall pushes work outside the system where nothing can see it. `--strict`
   is how a team opts into hard enforcement, in CI.

5. **Gates key off structural facts, never agent prose.** A classifier reading
   agent-written text is gameable by exactly the agent it is meant to catch.

6. **Determinism in the context pack.** `nexus_get_context` uses keyword and
   token matching, no LLM. `maxChars` is a hard cap on every unbounded section.

7. **Bounded sections are composed before unbounded ones.** Anything that must
   always be seen (the plan slice, the gate) is charged against the budget but
   never rejected.

8. **Append-only knowledge.** Entries are never deleted. `consolidate`
   generates a summary layer; it does not edit the log.

9. **Capability-gate integrations, never version-gate them.** Branching on a
   partner's version number makes every one of their releases into one of ours.

10. **Orchestration is main-thread.** Subagents cannot spawn subagents. NEXUS
    advises on handoff; it does not dispatch.

11. **Never a hard dependency.** Every optional integration must degrade to a
    project that still builds.

12. **stdout is protocol.** MCP handlers never log to stdout and never
    `process.exit()`.

13. **Counts are derived, never copied forward.** Every number in prose comes
    from `scripts/build-stats.mjs` reading source, or it rots. See
    [§22](#22-release-procedure).

---

## 19. Recurring failure patterns

Three of these are the same defect wearing different clothes. Worth internalising
before writing the next version.

### A document describing a format the code does not accept

Found **three times** in one release cycle, each invisible because the failure
mode is *silence*, not an error:

| What | Consequence |
|------|-------------|
| MCP skill parser read only inline `triggers: [a, b]` | All 22 shared skills parsed to zero triggers. `nexus_get_context` **never returned a single skill** since it shipped. |
| `mapbox-integration` carried `category: maps` | Never a valid value. Category was unvalidated at read time — the enum lived only in the `nexus skill new` prompt, which hand-authored files bypass. |
| Generated instructions taught `## [YYYY-MM-DD] category — title` | `parseKnowledge` requires `### [category] Title`. Hand-written entries were invisible to `query_knowledge`, `get_context`, and `consolidate`. |

> **The rule:** any parser for a format the project also *authors* must be
> tested against a file the project actually shipped, not a fixture written
> from the spec. Any generated instruction that describes a file format must be
> round-tripped through the parser that reads it, in a test. Validate on read,
> not only at the creation prompt.

### Regex search-space bugs

`isTemplate()` used `/^---[\s\S]*?status:\s*"?template"?[\s\S]*?---/m`. The `m`
flag makes `^---` match the start of *any* line, so a markdown horizontal rule
opened what the regex treated as frontmatter and the scan covered the whole
document. Any doc containing a `---` rule plus the words `status: template`
anywhere in its prose was overwritten by `nexus upgrade`.

The original diagnosis focused on the reported symptom — a frontmatter-less
hand-written doc. Reproducing it first showed the bug also fires on documents
whose *own frontmatter says `populated`*.

> **The rule:** when a regex bug is reported for one input shape, reproduce it
> for the shapes nobody reported. A wrong search space affects every input, not
> just the noticed one. And never use bare `String.includes` for user-authored
> keywords — it fired `"api"` on *rapid* and `"test"` on *latest*.

### Overwriting user data

Two incidents against the preserve-by-default contract: the pre-v1.0.0 inverted
gate (`!isPopulated`), and the v1.2.0 regex above.

> **The procedure** for any fix to a predicate that decides whether user data
> is overwritten: reproduce first as a failing test → audit old vs new over the
> **real** corpus → confirm both directions (what is now saved *and* what is
> still correctly replaced) → rebuild before importing from `dist/` → add an
> end-to-end test over a temp directory, not only a unit test.
>
> An audit that reports "no change" deserves suspicion before relief. The first
> run of exactly this audit was empty because `tsc --noEmit` does not emit, so
> both columns were running the old code.

### Counts in prose rot

The README claimed 16 MCP tools / 438 tests / ten doctor checks when reality
was 17 / 456 / 11. Marketing and LLM-facing copy was duplicated across six
files with no single source. Hence `stats.json` and `build-stats.mjs`.

---

## 20. Known gaps and open work

Honest state as of v1.3.0. **Read this before designing the next version.**

### Open design tracks

| # | Item | Status |
|---|------|--------|
| 1 | **v1.2 Provable Done** — verify manifest, D11 v2, machine evidence | 📋 Draft, 3 open questions. `--strict` already landed in v1.3 as the shared mechanism this track should build on. |
| 2–4 | **v1.2 Scaffolding II** — identity model, scored detection, blueprints (Expo/Capacitor/FastAPI), per-platform validation gate | 📋 Draft. Would drop SvelteKit/Nuxt/Astro/Remix from `init`. |
| 6 | MCP composition | 📋 Draft |
| 7 | **Protocol extraction** — standalone wake+verify spec + zero-dep reference impl | 💡 Scoped. Adoption strategy: protocol, not product. |
| 16 | **Anthropic Skill-format compat shim** | 💡 Scoped. See below. |

### Deferred with a reason

- **`nexus orchestrate`** (agent pipeline) — deferred because handoffs are
  main-thread; subagents cannot dispatch subagents.
- **`@chameleon-ui-lib/native`** adapter — Chameleon-side, not NEXUS.

### Unresolved questions from v1.3

- **Does a grilling record go stale?** If a plan's scope materially changes
  after grilling, the record is evidence for work nobody agreed to. No
  staleness signal exists. A cheap first move: a check comparing the record's
  position in git history against later edits to Acceptance Criteria.
- **Is a user-invoked `grill-me` wrapper needed?** None was built; `grilling`
  is `model`-invoked, so a human can invoke it directly. Revisit if it proves
  undiscoverable in slash-command lists.

### The strategic gap

**NEXUS skills are not loadable as Claude Code skills.** Our frontmatter is
custom (`skill:` + `triggers:`); Anthropic's Skill format uses
`name:` + `description:`. A compat shim would make every NEXUS skill *also* a
valid Anthropic skill, opening the plugin-marketplace distribution channel that
NEXUS is currently not in. This pairs naturally with #7 (protocol, not
product) and is probably the highest-leverage adoption move available.

### Smaller known issues

- The Vital Signs block in the monorepo root `index.md` says "not yet
  synced" — `nexus sync` has never been run there.
- Coverage is not collected; the M1 sensor would add `vitest --coverage`
  parsing.
- `nexus repair` is documented as validating skills against `SKILL_SPEC` and
  does not. `nexus skill status` now does.
- `.nexus/plans/parser.ts` and `D01.ts` match frontmatter with `\n` rather than
  `\r?\n`, so a CRLF plan file will not parse. Latent, Windows-only.

---

## 21. Codebase map

`nexus-cli/src/`:

```
cli.ts                      ← commander wiring, every flag
version.ts                  ← single source of truth for the version
commands/                   ← one file per top-level command
  init · adopt · upgrade · repair · skill · agent · plan · pack
  use · doctor · brief · consolidate · wake · brain · mcp · update · sync
generators/
  index.ts                  ← reconcileNexusFiles, isTemplate/isPopulated,
                              ALWAYS_REPLACE / ALWAYS_PRESERVE  ⚠ data-loss surface
  ai-config.ts              ← the six instruction files + .mcp.json  ⚠ context load
  docs.ts · structure.ts · agents.ts · skills.ts · ci-cd.ts
  ui-delegation.ts          ← the Chameleon handoff
  plan-templates/*.mustache
mcp/
  server.ts                 ← tool registration, schemas
  tools.ts                  ← every handler, incl. getContextTool  ⚠ the keystone
  context.ts                ← BrainContext, McpToolError
utils/
  skills/                   ← v1.3: types, frontmatter, matching, gate
  doctor/checks/D01–D14.ts
  plans/                    ← parser, lifecycle, active, index-builder
  agents/                   ← parser, handoff, types
  chameleon/                ← appspec, runner, delegate, agent-block
  sensors/                  ← git, tests, files, packages
  knowledge.ts              ← parseKnowledge  ⚠ format contract
```

**The four files to read first**, in order: `mcp/tools.ts` (what agents
actually touch), `generators/index.ts` (what can destroy user data),
`generators/ai-config.ts` (what every agent reads on every turn), and
`utils/skills/gate.ts` (the newest concept).

**Tests:** `nexus-cli/tests/unit/` + `tests/integration/`. 659 tests. Run
`npx vitest run`. In a sandbox, `npm i -D @rollup/rollup-linux-x64-gnu
--no-save` first — a known npm optional-deps bug.

---

## 22. Release procedure

A release touches **six surfaces**. Counts drift fastest; never copy one
forward from the previous release.

1. `nexus-cli/package.json` — `version`
2. `nexus-cli/src/version.ts` — `export const version`
3. `nexus-cli/CHANGELOG.md` — a new dated section
4. `nexus-cli/README.md` — badges and any count stated in prose
5. **Homepage** — JSON-LD `softwareVersion` (in `index`, `docs`, `mcp`,
   `skills`), the hero tag, `docs.html` breadcrumb + `<h1>`, meta/OG/Twitter
   titles, the timeline `now` marker
6. `llms.txt` + `llms-full.txt` + `sitemap.xml`

Then, from `homepage/nexus-homepage/`:

```bash
node scripts/build-stats.mjs --cli ../../nexus-cli --skills ../../nexus-skills
```

This regenerates `stats.json` — the single source every page fetches at
runtime for tests / commands / tools / checks / skill counts. **It refuses to
publish a count from a non-green test run**, so it doubles as a release gate.
Never hand-edit `stats.json`.

If the skills registry changed, bump `nexus-skills/packages/core/package.json`
too.

Finally: `npm publish` both packages, `git tag`, and run the homepage
`deploy.sh`.

---

*Maintained alongside the brains: `nexus-cli/.nexus/docs/index.md` for CLI
implementation, and the monorepo root `.nexus/docs/index.md` for ecosystem
state. If this file and a brain disagree, the brain is newer — and this file
needs updating.*
