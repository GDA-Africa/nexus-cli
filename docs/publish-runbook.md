# Publish Runbook — @nexus-framework/cli

## Why this exists
The v1.0.0 publish on **2026-06-09 failed in CI** because the `NPM_TOKEN`
repository secret had expired. This runbook covers token renewal and the
re-publish flow.

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

- [ ] `npm view @nexus-framework/cli version` → 1.0.0
- [ ] `npx -y @nexus-framework/cli@latest --version` → 1.0.0
- [ ] `npx -y @nexus-framework/cli mcp` connects from Claude Code (`.mcp.json` in any generated project)
- [ ] GitHub release v1.0.0 created by the workflow
- [ ] Tick the release steps in `.nexus/plans/release-v1-mcp-headline.md` and run `nexus plan done`
