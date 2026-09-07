---
nexus_plan: true
id: "implement-v1-2-provable-done"
title: "Implement v1.2 — Provable Done (M1–M3)"
status: "draft"
created: "2026-07-05"
updated: "2026-07-05"
owner: "unassigned"
source: "design:../../../.nexus/docs/v1_2_provable_done.md"
parent: null
estimate: "8d"
phase: "v1.2-provable-done"
tags: ["v1.2.0","verify","doctor","d11","strict","protocol"]
---
## Goal
Make "done" checkable: a `.nexus/verify.json` manifest of check commands,
`nexus plan verify` recording machine evidence (command, exit code, output
hash, brain hash), D11 v2 that only passes parseable evidence or an explicit
waiver, and `doctor --strict` so CI can gate on D09/D11.

## Why
D11 v1 is a keyword regex — "tests skipped" passes because the word "tests"
appears. Agents lying about completion is the exact failure mode the gate
exists for, and prose can't catch prose. Machine evidence + optional re-run
makes verification provable; strict mode gives teams the CI dial. Full
design: v1_2_provable_done.md.

## Acceptance Criteria
### M1 — Verify
- [ ] `.nexus/verify.json` generated at init/adopt/upgrade from the project's
      validation command; JSON Schema published; hand-edits preserved on upgrade
- [ ] `nexus plan verify <id>` runs manifest checks via sensors' execa plumbing
      and appends a fenced JSON evidence block through the plan parser
- [ ] `nexus_plan_verify` MCP tool: same code path, protocol-clean stdout
- [ ] `nexus plan done` prompts (non-blocking) when no fresh evidence exists

### M2 — Gate
- [ ] D11 v2: pass = parseable evidence block, all checks exit 0, brain hash
      current-or-ancestor; waiver unchanged; keyword regex removed
- [ ] Staleness: evidence older than last step tick → warn
- [ ] `doctor --strict [--strict-checks D09,D11]` promotes to error
- [ ] `doctor --verify` re-runs manifest checks, compares exit codes
- [ ] Generated CI workflow gains a documented strict-mode flag
- [ ] Regression: an Evidence section saying "tests skipped" FAILS D11 v2

### M3 — Groundwork
- [ ] `wake.hashInputs` manifest field overrides BRAIN_HASH_INPUTS; default
      unchanged; wake works on a repo with no .nexus/ given explicit inputs
- [ ] Docs + homepage + llms.txt updated (counts included — we know how that goes)

## Steps
- [ ] 1. M1: verify.json schema + generator + upgrade preservation + tests
- [ ] 2. M1: `plan verify` command + evidence block writer + tests
- [ ] 3. M1: `nexus_plan_verify` MCP tool + `plan done` prompt + tests
- [ ] 4. M2: D11 v2 parser + staleness + regression tests (incl. "tests skipped" case)
- [ ] 5. M2: `doctor --strict` + `--verify` re-run + CI flag + tests
- [ ] 6. M3: configurable wake.hashInputs + tests
- [ ] 7. M3: docs/homepage/llms sync + CHANGELOG + migration note (additive)

## Evidence
```json
{
  "verified_at": "2026-09-07T09:56:15.486Z",
  "brain_hash": "cd9e558732811d1820e3350bcf0c38d314aca500fc45c452be81c759a2972a7e",
  "wake_token": "NX-WAKE-WU4N-2026-08-26",
  "checks": [
    {
      "id": "types",
      "run": "npx tsc --noEmit",
      "exit": 0,
      "duration_ms": 4111,
      "output_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "summary": "Passed cleanly"
    },
    {
      "id": "tests",
      "run": "npm run test",
      "exit": 0,
      "duration_ms": 10094,
      "output_sha256": "08c99cd32aef7ed88e62f25eb31da02086fbca962da584ed89c4272d748a6767",
      "summary": "12 passed"
    },
    {
      "id": "lint",
      "run": "npm run lint",
      "exit": 0,
      "duration_ms": 5721,
      "output_sha256": "d453163579cd68a816ea7b47d579dd7d00d0ffc45343f8fc3559a379989c04b2",
      "summary": "Passed cleanly"
    }
  ]
}
```

## Notes
- 2026-07-05 — Drafted from review session findings (D11 bypass, advisory
  severities, get_context budget overshoot noted separately). Awaiting
  Halton's call on the three open questions in the design doc before
  `nexus plan start`.
