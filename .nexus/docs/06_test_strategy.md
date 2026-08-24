---
nexus_doc: true
id: "06_test_strategy"
title: "Test Strategy"
status: populated
confidence: high
last_updated: "2026-08-24"
---

# Test Strategy

**Project:** NEXUS CLI
**Framework:** vitest 3.x (`@vitest/coverage-v8` for coverage)

---

## 🧪 Testing Philosophy

Every generator, command, and utility ships with tests that exercise it against real temp directories — not mocked filesystems — because NEXUS's entire job is producing correct files on disk. As of 2026-08-24: **663 tests passing across 51 files** (unit + integration + e2e, single `vitest run`).

**Coverage Target:** 80% lines/functions/branches/statements (`vitest.config.ts` `coverage.thresholds`), measured over `src/**/*.ts` excluding `src/types/**` and `src/index.ts`.

**What gets tested:** every command (`src/commands/`), every generator (`src/generators/`), the doctor checks (D01–D14, including dedicated `doctor-d12/d13/d14.test.ts` for the newer ones), plan lifecycle + gate logic, skill matching/frontmatter/gate, sensors, MCP tool surface (`mcp-tools.test.ts`, `mcp-index.test.ts`, `mcp-context-gate.test.ts`), and the full alive-brain lifecycle end to end.

**What doesn't get dedicated tests:** the interactive prompt UI itself (Inquirer's own rendering) — prompt *modules* are tested for the config they produce, not their terminal output.

**Release-surface honesty check:** `npm run release:check` (`scripts/release-check.mjs`) independently measures test count, command count, MCP tool count, and doctor check count from the actual code/build output and fails CI if the README/site/llms.txt claim a different number. This exists because count drift is a recurring real bug (the README once said "456 tests" two releases after the suite grew past it).

## 📋 Test Types

| Type | Location | Tool | Covers |
|------|----------|------|--------|
| Unit | `tests/unit/*.test.ts` (49 files) | vitest | Commands, generators, prompts, utils, doctor checks D01–D14, MCP tools, skills, plans, sensors |
| Integration | `tests/integration/*.integration.test.ts` | vitest | `nexus sync` and `doctor`+`brief` pipelines run against a real generated temp project |
| E2E | `tests/e2e/alive-brain-lifecycle.e2e.test.ts` | vitest | Full lifecycle in one temp project: scaffold → wake → plan (new→approved→in_progress→done) → sync → consolidate → doctor clean — the v1.0 release gate |

All three run through the same `vitest run` — there is no separate Playwright/browser layer (there is no UI to drive; NEXUS is a CLI).

## 🏃 Running Tests

```bash
npm test                     # vitest run — full suite (unit + integration + e2e)
npm run test:watch           # vitest watch mode
npm run test:coverage        # vitest run --coverage, enforces the 80% thresholds
npx vitest run tests/e2e/    # just the e2e lifecycle gate
```

`npm run pre-commit` chains `lint && type-check && test` — the same sequence CI runs. CI (`.github/workflows/ci.yml`) additionally runs the built CLI's `--version`/`--help` as a smoke test and `npm run release:check` as a separate job before the publish gate.
