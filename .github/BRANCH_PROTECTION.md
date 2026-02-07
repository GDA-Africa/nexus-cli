# 🛡️ Branch Protection Setup Guide

## Why Branch Protection?

NEXUS CLI is an open-source project. Without branch protection, **anyone with write access can push directly to `main`**, bypassing code review, tests, and quality checks. This guide ensures `main` is always stable and production-ready.

---

## ⚡ Quick Setup (GitHub UI)

### 1. Navigate to Branch Protection Rules

Go to your repository:
```
https://github.com/GDA-Africa/nexus-cli/settings/rules
```

### 2. Create a New Ruleset

Click **"New ruleset"** → **"New branch ruleset"** and configure:

| Setting | Value |
|---|---|
| **Ruleset name** | `Protect main` |
| **Enforcement status** | `Active` |
| **Target branches** | `main` |

### 3. Enable These Rules

#### ✅ Restrict deletions
Prevents anyone from deleting the `main` branch.

#### ✅ Require a pull request before merging
| Sub-setting | Value |
|---|---|
| Required approvals | `1` (increase to `2` when team grows) |
| Dismiss stale reviews on new pushes | ✅ Enabled |
| Require review from CODEOWNERS | ✅ Enabled |

#### ✅ Require status checks to pass
Add these **required status checks** (from `.github/workflows/ci.yml`):

| Status Check Name | Description |
|---|---|
| `Lint & Test (20)` | Node 20 — lint, typecheck, test, build |
| `Lint & Test (22)` | Node 22 — lint, typecheck, test, build |
| `Commit Message Lint` | Enforces conventional commit messages |

> ⚠️ **Important:** Status checks only appear after the CI workflow has run at least once. Push this commit first, then configure the ruleset.

#### ✅ Require branches to be up to date before merging
Ensures PRs are rebased on the latest `main` before merge.

#### ✅ Block force pushes
Prevents rewriting `main` history.

#### ✅ Require signed commits *(optional but recommended)*
Enforces GPG-signed commits for supply chain security.

### 4. Set Bypass List (Admins Only)

Add **repository admins** or the `@GDA-Africa/nexus-maintainers` team to the bypass list so they can merge in emergencies (with audit trail).

### 5. Click "Create"

---

## 🔧 Setup via GitHub CLI (Alternative)

```bash
# Install GitHub CLI if needed
brew install gh

# Authenticate
gh auth login

# The ruleset must be created via the UI or API — 
# but you can verify protection with:
gh api repos/GDA-Africa/nexus-cli/rulesets
```

---

## 📋 What This Protects Against

| Threat | Protection |
|---|---|
| Direct pushes to `main` | ❌ Blocked — must use a PR |
| Merging without review | ❌ Blocked — requires 1+ approval from CODEOWNERS |
| Merging with failing tests | ❌ Blocked — CI must pass on Node 20, 22 |
| Merging with lint errors | ❌ Blocked — `yarn lint` runs in CI |
| Non-conventional commit messages | ❌ Blocked — commitlint validates in CI |
| Force pushing / rewriting history | ❌ Blocked — force pushes disabled |
| Deleting `main` branch | ❌ Blocked — deletion restricted |
| Stale approvals after new pushes | 🔄 Auto-dismissed — must re-review |

---

## 🔑 Repository Secrets & Permissions

### Recommended Settings (Settings → Actions → General)

| Setting | Value |
|---|---|
| Actions permissions | Allow all actions and reusable workflows |
| Workflow permissions | Read repository contents |
| Allow GitHub Actions to create PRs | ❌ Disabled |

### For Fork PRs

| Setting | Value |
|---|---|
| Run workflows from fork PRs | ✅ Enabled (for open-source contributions) |
| Require approval for first-time contributors | ✅ Enabled |
| Require approval for all outside collaborators | ✅ Enabled |

---

## ✅ Verification

After setup, verify by attempting a direct push:

```bash
# This should be REJECTED:
echo "test" >> test.txt
git add test.txt
git commit -m "test: verify branch protection"
git push origin main
# → Expected: remote rejected (protected branch)
```

Then verify the PR workflow:

```bash
git checkout -b test/branch-protection
echo "test" >> test.txt
git add test.txt
git commit -m "test: verify PR workflow"
git push origin test/branch-protection
# → Create PR via GitHub UI → CI should run automatically
```

---

*This guide is part of the NEXUS CLI repository governance. See [CONTRIBUTING.md](../CONTRIBUTING.md) for contributor guidelines.*
