/**
 * NEXUS CLI - CI/CD Generator
 *
 * Generates GitHub Actions workflow templates.
 */

import type { NexusConfig } from '../types/config.js';
import type { GeneratedFile } from '../types/templates.js';

/**
 * Generate CI/CD configuration files.
 */
export function generateCiCd(config: NexusConfig): GeneratedFile[] {
  return [generateGitHubActionsCI(config)];
}

function generateGitHubActionsCI(config: NexusConfig): GeneratedFile {
  const testStep =
    config.testFramework !== 'none'
      ? `
      - name: Run tests
        run: npm test
`
      : '';

  return {
    path: '.github/workflows/ci.yml',
    content: `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Nexus doctor
        run: npx @nexus-framework/cli doctor --severity=error

      - name: Build
        run: npm run build
${testStep}
  # ── Brain-aware CI (deterministic) ─────────────────────────
  # Posts the NEXUS brief as a sticky PR comment so reviewers see
  # brain state (vital signs, drift, plans, recent shipped work)
  # next to the diff. No LLM involved — pure \`nexus brief --md\`.
  brain:
    name: NEXUS Brain Brief
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Use Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Sync brain sensors
        run: npx @nexus-framework/cli sync || true

      - name: Render brief
        id: brief
        run: |
          npx @nexus-framework/cli brief --md > nexus-brief.md || echo "_Brief unavailable — is .nexus/ committed?_" > nexus-brief.md
          echo "Generated brief:" && cat nexus-brief.md

      - name: Post brief as sticky PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const marker = '<!-- nexus-brain-brief -->';
            const body = marker + '\\n## 🧠 NEXUS Brain Brief\\n\\n' + fs.readFileSync('nexus-brief.md', 'utf8');
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            const existing = comments.find(c => c.body && c.body.startsWith(marker));
            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body,
              });
            }
`,
  };
}
