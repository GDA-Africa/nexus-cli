---
nexus_doc: true
id: "08_deployment"
title: "Deployment"
status: populated
confidence: high
last_updated: "2026-08-24"
---

# Deployment

**Project:** NEXUS CLI

NEXUS "deploys" as an npm package, not a hosted service — there is no server to provision. Distribution is `npm publish`, driven entirely by GitHub Actions.

---

## 🚀 Deployment Strategy

**Target:** [`@nexus-framework/cli`](https://www.npmjs.com/package/@nexus-framework/cli) on the public npm registry. Consumers run `npx @nexus-framework/cli@latest init` / `adopt` / `mcp`, etc. — no install step required.

**Pipeline (`.github/workflows/ci.yml`, single `CI/CD` workflow):**

1. **`quality`** — on every push/PR to `main`, matrix over Node 20 & 22: `npm ci` → lint → `tsc --noEmit` → `npm test` → `npm run build` → smoke-test the built CLI (`node bin/nexus.js --version` / `--help`). Includes a defensive step that detects and heals npm's platform-native-optional-deps lockfile bug (#4828) by rebuilding `node_modules` if a native binding (rollup/esbuild/unrs-resolver) is missing.
2. **`commitlint`** — PR-only, validates Conventional Commit messages across the PR's commit range.
3. **`release-check`** — builds, then runs `npm run release:check`: every advertised number (tests, commands, MCP tools, doctor checks) is measured against the actual code/build and compared to what the README claims; drift fails the job.
4. **`publish`** — push-to-`main` only, requires `quality` and `release-check` to pass. Compares `package.json` version against what's **already live on the npm registry** (not `HEAD~1`), so a failed publish (e.g. expired token) can be retried by simply re-running the workflow — it only skips when the current version is truly published. On a version bump: `npm publish --access public --provenance`, then tags `vX.Y.Z` and creates a GitHub Release with auto-generated notes.

**Versioning:** manual — a release is "cut" by bumping `version` in `package.json` (and `src/version.ts`) in the same commit/PR that merges to `main`; the workflow does the rest.

## 🔧 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment | No | unset (CLI doesn't branch on it at runtime) |
| `NPM_TOKEN` | npm publish auth, used only by the `publish` job | Yes (CI secret) | — |
| `GITHUB_TOKEN` | Tag push + Release creation in the `publish` job | Yes (auto-provided by Actions) | — |

NEXUS itself reads no required env vars at runtime — generated projects may define their own, unrelated to the CLI's own deployment.

## 📦 CI/CD

Single workflow, `.github/workflows/ci.yml`, four jobs as above (`quality` × 2 Node versions, `commitlint`, `release-check`, `publish`). `publish` depends on `quality` and `release-check` succeeding and only runs on `push` to `main`. There is no separate staging environment — `main` is the release branch, gated by the version-not-yet-on-npm check rather than a manual approval step.

**Known incident:** 2026-06-09, v1.0.0's first publish attempt failed in CI due to an expired `NPM_TOKEN`; because the gate compares against the live registry rather than git history, the fix was simply renewing the token and re-running the workflow — no special-cased recovery logic needed.
