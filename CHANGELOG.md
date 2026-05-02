# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0-alpha.1] - 2026-05-02
### Added
- `nexus sync` command to capture repository vital signs.
- Alive brain sensor module (git, tests, files, packages).
- Checksum caching to detect environment drift.
- Idempotent execution of repository vitals collection.

## [0.4.0-alpha.2] - 2026-05-02
### Added
- `nexus plan` MVP command suite with subcommands: `new`, `list`, `show`, `start`, `tick`, `note`, `done`.
- Plans utility layer in `src/utils/plans/` (`types`, `parser`, `lifecycle`, `active`, `index-builder`).
- Initial plan templates under `src/generators/plan-templates/` for `feature`, `bug`, `refactor`, `spike`, and `chore`.
- Plans scaffolding in generated projects: `.nexus/plans/`, `_active.json`, `index.md`, and a starter bootstrap plan.

### Changed
- CLI wiring now includes top-level `nexus plan` subcommand group.
- Plan completion now appends a progress entry to `.nexus/docs/index.md` and reminds users to log insights in `knowledge.md`.

