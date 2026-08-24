---
nexus_plan: true
id: "bootstrap-v1-brain-by-hand"
title: "Bootstrap the v1.0 brain shape by hand (the meta-plan)"
status: done
created: "2026-05-02"
updated: "2026-05-02"
owner: "claude (cowork)"
source: "human:halton"
parent: null
estimate: "1d"
phase: "alive-brain-m0"
tags: ["bootstrap", "dogfooding", "meta"]
---

## Goal
Hand-craft the `.nexus/plans/`, `.nexus/state/`, Vital Signs block, and consolidated knowledge summary for `nexus-cli` so the sub-project brain *looks like* v1.0 generator output before the v1.0 generator exists. Then use this brain to track building the generator.

## Why
v1.0 needs a reference artifact — the canonical "what should `nexus init` v1.0 produce?" target. Hand-building that artifact serves three purposes simultaneously: (1) it pins down the format with examples instead of words, (2) it gives the v1.0 implementation a real test fixture (`nexus-cli/.nexus/` itself), and (3) it lets us *use* plans, Vital Signs, and the handshake while we build the commands that produce them. The brain is the test harness for the system that creates brains.

## Acceptance Criteria
- [x] `.nexus/plans/` populated with 5 plan files: this one + M1 + M2 + M3 + M4
- [x] `.nexus/plans/index.md` dashboard rendered
- [x] `.nexus/plans/_active.json` points at the M1 plan
- [x] `.nexus/state/` seeded with `session.json`, `last-sync.json`, `doctor.json`
- [x] `.nexus/state/` added to `nexus-cli/.gitignore`
- [x] Vital Signs block injected into `.nexus/docs/index.md` between fences
- [x] `.nexus/docs/knowledge-summary.md` generated from `.nexus/docs/knowledge.md` (and legacy `.nexus/knowledge.md` referenced)
- [x] `.nexus/ai/instructions.md` updated with v1.0 Session Handshake protocol
- [x] All files reference [`../../.nexus/docs/v1_alive_brain.md`](../../../.nexus/docs/v1_alive_brain.md) as the design source

## Steps
- [x] Inspect current `.nexus/` layout and pull real git stats
- [x] Author 5 plan files (this + 4 milestone plans)
- [x] Author `plans/index.md` dashboard
- [x] Author `plans/_active.json`
- [x] Seed `state/` files
- [x] Patch `.gitignore`
- [x] Inject Vital Signs into `index.md`
- [x] Author `knowledge-summary.md`
- [x] Patch AI instructions with handshake protocol
- [x] Verify: tree-list `.nexus/`, read back active plan + Vital Signs

## Files Touched
- `nexus-cli/.nexus/plans/bootstrap-v1-brain-by-hand.md` (new — this file)
- `nexus-cli/.nexus/plans/implement-v1-m1-sensors-sync.md` (new)
- `nexus-cli/.nexus/plans/implement-v1-m2-plans-mvp.md` (new)
- `nexus-cli/.nexus/plans/implement-v1-m3-doctor-brief.md` (new)
- `nexus-cli/.nexus/plans/implement-v1-m4-consolidate-wake-polish.md` (new)
- `nexus-cli/.nexus/plans/index.md` (new)
- `nexus-cli/.nexus/plans/_active.json` (new)
- `nexus-cli/.nexus/state/session.json` (new, gitignored)
- `nexus-cli/.nexus/state/last-sync.json` (new, gitignored)
- `nexus-cli/.nexus/state/doctor.json` (new, gitignored)
- `nexus-cli/.gitignore` (append)
- `nexus-cli/.nexus/docs/index.md` (modify — inject Vital Signs)
- `nexus-cli/.nexus/docs/knowledge-summary.md` (new)
- `nexus-cli/.nexus/ai/instructions.md` (modify — add Handshake section)

## Risks
- Two `knowledge.md` files exist (`.nexus/knowledge.md` legacy 27KB, `.nexus/docs/knowledge.md` current 7KB). Surgery does NOT delete or merge — preserved as-is, summary references both.
- `manifest.json` reports v0.1.3 but the published version is v0.3.2 — out of scope here, will surface as a `nexus doctor` finding (D-stale-manifest) once doctor lands.
- Six numbered docs (02–06, 08) are missing — also out of scope; flagged in Vital Signs and in the M3 doctor checks list.

## Notes
- 2026-05-02 (claude): scaffolded the meta-plan and the four milestone plans; wired everything to the design doc.
- 2026-05-02 (claude): closed as `done` immediately on completion of the surgery — this plan exists more as historical evidence than as ongoing work.

## Evidence
- Design doc: [`../../../.nexus/docs/v1_alive_brain.md`](../../../.nexus/docs/v1_alive_brain.md)
- Prior commit history: branch `fix-backend-scaffolding`, last commit `092d7e7` (2026-03-07)
- This bootstrap surgery is uncommitted at the time of writing — user controls the commit.
- WAIVER (added 2026-08-24): tests skipped because this plan hand-authors brain scaffolding (`.nexus/plans/`, `.nexus/state/`, doc/knowledge shape) as a reference artifact, not source code — there is no behavior for a test suite to exercise. D11 postdates this plan (v1.1); retroactively waived rather than backfilled with fabricated evidence.
