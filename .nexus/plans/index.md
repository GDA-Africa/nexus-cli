---
nexus_doc: true
id: "plans_index"
title: "NEXUS CLI — Plans Dashboard"
status: auto
generated_from: ".nexus/plans/*.md"
generated_at: "2026-05-02"
note: "This file is auto-rebuilt by `nexus plan` commands once M2 ships. Until then it's hand-maintained alongside plan files."
---

# Plans Dashboard

> One row per plan in `.nexus/plans/`. Active plan(s) are tracked in `_active.json`.
> Master design: [`../../../.nexus/docs/v1_alive_brain.md`](../../../.nexus/docs/v1_alive_brain.md)

## Active

| ID | Title | Status | Owner | Updated | Phase |
|----|-------|--------|-------|---------|-------|
| [`implement-v1-m1-sensors-sync`](./implement-v1-m1-sensors-sync.md) | Implement v1.0 M1 — Sensors & `nexus sync` | 🟢 in_progress | unassigned | 2026-05-02 | alive-brain-m1 |

## Approved (queued)

| ID | Title | Status | Owner | Updated | Phase |
|----|-------|--------|-------|---------|-------|
| [`implement-v1-m2-plans-mvp`](./implement-v1-m2-plans-mvp.md) | Implement v1.0 M2 — Plans MVP | 📋 approved | unassigned | 2026-05-02 | alive-brain-m2 |
| [`implement-v1-m3-doctor-brief`](./implement-v1-m3-doctor-brief.md) | Implement v1.0 M3 — Doctor & Brief | 📋 approved | unassigned | 2026-05-02 | alive-brain-m3 |
| [`implement-v1-m4-consolidate-wake-polish`](./implement-v1-m4-consolidate-wake-polish.md) | Implement v1.0 M4 — Consolidate, Wake, Polish → v1.0.0 | 📋 approved | unassigned | 2026-05-02 | alive-brain-m4 |

## Done

| ID | Title | Status | Owner | Updated | Phase |
|----|-------|--------|-------|---------|-------|
| [`bootstrap-v1-brain-by-hand`](./bootstrap-v1-brain-by-hand.md) | Bootstrap the v1.0 brain shape by hand | ✅ done | claude (cowork) | 2026-05-02 | alive-brain-m0 |

## Legend

| Status | Meaning |
|--------|---------|
| 📝 draft | Created, not yet reviewed/approved |
| 📋 approved | Reviewed by human, ready to start |
| 🟢 in_progress | Actively being worked |
| ⏸ blocked | Paused, waiting on something (Notes section explains) |
| ✅ done | Completed and verified (Evidence section recorded) |
| 🚫 abandoned | Dropped (kept for history; Notes explains why) |

## Lifecycle

```
draft → approved → in_progress → ┬─→ done
                                 ├─→ blocked → in_progress
                                 └─→ abandoned
```

## Conventions

- One plan per ≥3-step or cross-session task. Tiny chores don't need plans (use `chore` template if you must).
- Plan IDs are kebab-slugs derived from the title.
- The Notes section is append-only (each entry dated, agent-handle-tagged).
- The Evidence section accumulates commits, PRs, and test runs as the plan progresses.
- On `done`, an entry is appended to `.nexus/docs/index.md` Progress Log automatically (once M2 ships; manual until then).

---

*Hand-maintained until v1.0 M2 lands the auto-builder. After M2: never edit this file by hand — it's generated.*
