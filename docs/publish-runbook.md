# Publish Runbook — @nexus-framework/cli

## The ritual

**One command, before every release:**

```bash
npm run release:check          # from nexus-cli/, inside the monorepo
```

It measures what is true — tests passing, top-level commands, MCP tools,
doctor checks — and compares that against every place we assert it: the npm
README, the site's README mirror, `llms.txt`, `llms-full.txt`, and the
homepage stat counters. It also checks release state (version vs npm, git tag,
unpushed commits, CHANGELOG heading) and the SEO/AI surface (sitemap coverage,
`robots.txt` crawler rules, JSON-LD `softwareVersion`). Non-zero exit on drift.

Run it **from the monorepo** — site files live in `homepage/nexus-homepage/`,
which is not part of the `nexus-cli` repo. Those checks skip silently when the
directory is absent, so the same command works in CI, where a `release-check`
job runs it and **gates the publish job**.

Why a script and not a checklist: the site advertised "456 tests" across two
releases while the suite grew to 546, and the progress log already records one
hand-run "homepage drift sync" — which guarantees a next one. Anything a
machine can derive should never be hand-maintained.

### What it will not catch

Positioning, not counts. If the site's meta descriptions, OG titles, and hero
copy still say "v1.1" after v1.2 ships, that reads as stale to a human and to
a crawler, and no amount of counting finds it. Re-read `index.html`'s `<head>`
and hero on any minor-version release.

### Release order

1. `npm run release:check` — fix any drift
2. Decide the version: **features are a minor bump**, not a patch. The check
   warns when the CHANGELOG has an `[Unreleased]` section, because its contents
   ship under whatever `package.json` currently says.
3. Push `main`. CI publishes to npm, creates the `v<version>` git tag, and
   creates the GitHub release — all gated on the version not already being on
   npm, so re-runs are safe.
4. **Deploy the site after the npm publish, not before.** The JSON-LD
   `softwareVersion` should never advertise a version nobody can install.
5. `npm run release:check` again — it should be clean, with the tag present
   and npm level with `package.json`.

## Why the token section exists
The v1.0.0 publish on **2026-06-09 failed in CI** because the `NPM_TOKEN`
repository secret had expired. The rest of this runbook covers token renewal
and the re-publish flow.

## 1. Renew the npm token

1. Log in at https://www.npmjs.com → avatar → **Access Tokens**
2. Delete the expired token
3. **Generate New Token → Granular Access Token**
   - Packages & scopes: `@nexus-framework` (read & write)
   - Expiration: 90 days (set a calendar reminder) — or longer if you accept the risk
4. Copy the token (shown once)

## 2. Update the GitHub secret

GitHub repo → **Settings → Secrets and variables → Actions → NPM_TOKEN → Update**

(Repeat for the `nexus-skills` repo if it publishes from its own workflow.)

## 3. Publish

The publish job runs on every push to `main` and now gates on the **npm
registry** (not the previous commit): it publishes whenever
`package.json`'s version is not yet live on npm. So after a failed run you can
simply:

- **Re-run the failed workflow** (Actions → failed run → Re-run jobs), or
- Push the next commit to `main`

No empty version-bump commits needed.

### Manual fallback

```bash
cd nexus-cli
npm run pre-commit          # lint + type-check + test
npm publish --access public # uses your local npm login
git tag -a v1.0.0 -m "Release v1.0.0" && git push origin v1.0.0
```

## 4. Companion package

`@nexus-framework/skills` v0.2.0 (MCP-era skills) publishes from
`nexus-skills/packages/core/`:

```bash
cd nexus-skills/packages/core && npm publish --access public
```

Publish the skills package **before or together with** the CLI so
`nexus skill registry` sees the new `nexus-mcp-usage`, `nexus-plans-workflow`,
and `brain-aware-ci` skills.

## 5. Post-publish checklist

- [ ] `npm run release:check` is clean — this covers the version, tag, and every advertised count
- [ ] `npx -y @nexus-framework/cli@latest --version` matches `package.json`
- [ ] `npx -y @nexus-framework/cli mcp` connects from Claude Code (`.mcp.json` in any generated project)
- [ ] GitHub release created by the workflow (`gh release list`)
- [ ] Site deployed *after* the npm publish (`homepage/nexus-homepage/deploy.sh`)
- [ ] Tick the release steps in the active plan and run `nexus plan done`
