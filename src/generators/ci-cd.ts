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
        node-version: [18, 20, 22]

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

      - name: Build
        run: npm run build
${testStep}`,
  };
}
