# 🤝 Contributing to NEXUS CLI

Thank you for your interest in contributing to **NEXUS CLI** — the AI-native project scaffolding tool by [GDA Africa](https://github.com/GDA-Africa).

This document provides guidelines and standards for contributing to the project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Standards](#commit-standards)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing Requirements](#testing-requirements)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful, inclusive, and professional environment. Harassment, discrimination, or disrespectful behavior will not be tolerated.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **Yarn** 1.x+
- **Git** 2.x+

### Setup

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/<your-username>/nexus-cli.git
cd nexus-cli
yarn install
yarn build
yarn test
```

Verify everything works before making changes:

```bash
yarn lint       # Zero errors expected
yarn test       # 45/45 tests passing
npx tsc --noEmit  # Zero type errors
```

---

## Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or: fix/description, docs/description, chore/description
   ```

2. **Make your changes** — write code, add tests, update docs.

3. **Validate locally:**
   ```bash
   yarn lint       # Must pass with zero errors
   yarn test       # Must pass with zero failures
   yarn build      # Must compile without errors
   ```

4. **Commit using Conventional Commits** (see below).

5. **Push and open a Pull Request** against `main`.

---

## Commit Standards

We use [Conventional Commits](https://www.conventionalcommits.org/) strictly. Every commit message must follow this format:

```
<type>: <subject>
```

### Allowed Types

| Type | Description |
|---|---|
| `feat` | New feature (non-breaking) |
| `fix` | Bug fix |
| `docs` | Documentation only changes |
| `chore` | Build process, tooling, or dependency changes |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `style` | Formatting, whitespace (no logic change) |
| `perf` | Performance improvement |
| `ci` | CI/CD configuration changes |
| `revert` | Revert a previous commit |

### Rules

- **Subject** must be lowercase, present tense, and not end with a period
- **Header** must be 100 characters or less
- **Breaking changes** must include `BREAKING CHANGE:` in the commit body
- Commit messages are **linted in CI** via [commitlint](https://commitlint.js.org/)

### Examples

```bash
# ✅ Good
feat: add sveltekit template generator
fix: handle empty project name in validator
docs: update roadmap with completed items
chore: bump typescript to 5.8
test: add integration tests for init command

# ❌ Bad
Added new feature              # No type prefix
feat: Add new feature.         # Capitalized, period at end
update stuff                   # Vague, no type
feat: added the new sveltekit template generator for web projects  # Too long
```

---

## Pull Request Process

1. **Fill out the PR template completely** — it's there for a reason.
2. **Link an issue** — every PR should reference an issue (`Closes #123`).
3. **One feature per PR** — keep changes focused and reviewable.
4. **Ensure CI passes** — lint, tests, type check, and build must all be green.
5. **Request review** — CODEOWNERS are automatically assigned.
6. **Address feedback** — push fixup commits, then squash before merge.

### PR Title Format

PR titles must also follow Conventional Commits:

```
feat: add sveltekit template generator
fix: handle empty project name edge case
```

---

## Code Style

- **TypeScript strict mode** — no `any`, no implicit returns
- **ESM modules** — use `import`/`export`, no `require()`
- **ESLint + Prettier** — pre-configured, run `yarn lint` to check
- **Meaningful names** — descriptive variable and function names
- **Small functions** — each function does one thing well
- **Document public APIs** — JSDoc comments for exported functions

---

## Testing Requirements

- **Every new feature** must include tests
- **Every bug fix** must include a regression test
- **Run the full suite** before pushing:
  ```bash
  yarn test
  ```
- **Coverage target:** 80%+ across all suites
- **Test framework:** Vitest

### Test File Naming

```
tests/unit/<module>.test.ts       # Unit tests
tests/integration/<feature>.test.ts  # Integration tests (future)
tests/e2e/<flow>.test.ts          # End-to-end tests (future)
```

---

## 🙏 Thank You

Every contribution makes NEXUS CLI better. Whether it's a bug report, a feature suggestion, a typo fix, or a major feature — **it matters**. Thank you for helping build the tools that power Africa's digital future.

---

<div align="center">

**Built with ❤️ by [GDA Africa](https://github.com/GDA-Africa)**

</div>
