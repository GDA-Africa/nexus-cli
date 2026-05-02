---
nexus_plan: true
id: "implement-v1-m4-consolidate-wake-polish"
title: "Implement v1.0 M4 — Consolidate, Wake, Polish → v1.0.0"
status: backlog
created: "2026-05-02"
updated: "2026-05-02"
owner: "unassigned"
source: "design:v1_alive_brain.md#5.4,#5.5,#13"
parent: null
estimate: "5d"
phase: "alive-brain-m4"
tags: ["v0.5.0+", "consolidate", "wake", "deferred"]
---

## Status Update (2026-05-02)
**DEFERRED to v0.5.0+** — Shifting focus to ship v0.4.0 today with M1+M2+M3 + Auto-Invoke layer. M4 (consolidate/wake) will iterate post-release. Auto-invoke layer partially addresses the "brain awareness" problem that `wake` was solving; may refactor M4 scope based on v0.4.0 learnings.

---

## Goal
Ship the final two commands (`nexus consolidate` and `nexus wake`), update generated AI instructions to reference the handshake protocol, write the migration guide, and cut the `v1.0.0` release.

## Why
Memory hygiene and the handshake are what make the system *sustainable* over the long run. `consolidate` keeps `knowledge.md` useful past 200 entries. `wake` lets you verify (post-hoc) that an agent actually synced with the brain before working — which is the single biggest discipline gap in v0.x. M4 is also the polish & release milestone — without M4 we have a great alpha, not a v1.0. See [`v1_alive_brain.md` §5.4, §5.5, §13](../../../.nexus/docs/v1_alive_brain.md).

## Acceptance Criteria

### Consolidate (§5.4)
- [ ] `src/utils/consolidate/parser.ts` — parses `knowledge.md` entries, groups by category tag
- [ ] `src/utils/consolidate/renderer.ts` — produces `knowledge-summary.md`
- [ ] `src/commands/consolidate.ts` — `--write | --check | --archive`
- [ ] `--check` mode: exit non-zero if summary is out of date (CI-friendly)
- [ ] `--archive` mode: move entries older than 1 year to `knowledge-archive.md`
- [ ] Optional TTL frontmatter on knowledge entries: `expires_after_version: "1.0.0"` — expired entries shown with strikethrough in summary
- [ ] Deterministic output (no LLM call for v1.0)

### Wake (§5.5)
- [ ] `src/utils/brain.ts` — extend with `computeBrainHash()`
- [ ] `src/commands/wake.ts` — emits handshake token + active plan summary
- [ ] Token = sha256 of `index.md + knowledge.md + plans/_active.json` content + UTC date, truncated
- [ ] `.nexus/state/session.json` — last issued token + timestamp
- [ ] `--quiet` for shell-rc usage; `--no-active-plan` for CI
- [ ] D09 (handshake missed) check in doctor wired up

### AI Instructions Update
- [ ] Generator update: `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md` all gain a "Session Handshake (REQUIRED)" section
- [ ] `nexus upgrade` patches existing pointer files to add the section (smart-file-strategy: only if not present)

### Release
- [ ] Migration guide: `nexus-cli/docs/migrate-v0.3-to-v1.0.md`
- [ ] CHANGELOG entry for `v1.0.0`
- [ ] README updated with new command surface
- [ ] `nexus init --legacy` flag implemented (opts out of plans + state for users wanting v0.3.x feel)
- [ ] All v1.0 success criteria from [`v1_alive_brain.md` §13](../../../.nexus/docs/v1_alive_brain.md) check off
- [ ] `npm publish` v1.0.0

## Steps
- [ ] 1. Implement consolidate parser + renderer + tests
- [ ] 2. Implement `nexus consolidate` command + tests
- [ ] 3. Implement brain hash in `src/utils/brain.ts`
- [ ] 4. Implement `nexus wake` command + tests
- [ ] 5. Wire D09 doctor check
- [ ] 6. Update AI-instruction generators (all 6 pointer files + master)
- [ ] 7. Implement `nexus upgrade` patching for handshake section
- [ ] 8. Implement `nexus init --legacy` flag
- [ ] 9. Write migration guide
- [ ] 10. Update README
- [ ] 11. End-to-end test: fresh project → init → plan new → plan start → tick → done → index.md Progress Log updated
- [ ] 12. Run `nexus doctor` against this very repo, fix all `error`-severity findings
- [ ] 13. CHANGELOG, version bump to `1.0.0`, npm publish

## Files Touched
- `nexus-cli/src/utils/consolidate/{parser,renderer}.ts` (new)
- `nexus-cli/src/utils/brain.ts` (modify — add `computeBrainHash`)
- `nexus-cli/src/commands/{consolidate,wake}.ts` (new)
- `nexus-cli/src/generators/ai-instructions.ts` (modify)
- `nexus-cli/src/commands/init.ts` (modify — `--legacy` flag)
- `nexus-cli/src/commands/upgrade.ts` (modify — patch pointer files)
- `nexus-cli/docs/migrate-v0.3-to-v1.0.md` (new)
- `nexus-cli/README.md` (modify)
- `nexus-cli/CHANGELOG.md`
- `nexus-cli/package.json` (version bump)
- `nexus-cli/tests/**/*` (new tests for above)

## Risks
- Migration breaks existing user projects. Mitigation: `nexus upgrade` is non-destructive (adds, never removes); `--legacy` flag exists; migration guide is explicit.
- Handshake protocol annoys users who skip it. Mitigation: D09 is `warn`-level only; the value is forensics, not gatekeeping.
- Releasing too soon (E2E gaps from v0.3.x carry over). Mitigation: §13 success-criteria gate ALL must-haves before publish.

## Notes
- 2026-05-02 (claude): plan approved during bootstrap surgery. Depends on M1, M2, M3.

## Evidence
_(to be filled)_
