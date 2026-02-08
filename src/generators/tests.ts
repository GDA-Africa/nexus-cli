/**
 * NEXUS CLI - Test Generator
 *
 * Generates test infrastructure for the new project.
 */

import type { NexusConfig } from '../types/config.js';
import type { GeneratedFile } from '../types/templates.js';

/**
 * Generate test configuration and example tests.
 */
export function generateTests(config: NexusConfig): GeneratedFile[] {
  if (config.testFramework === 'none') return [];

  const files: GeneratedFile[] = [];

  if (config.testFramework === 'vitest') {
    files.push(generateVitestConfig());
    files.push(generateExampleVitestTest(config));
    files.push(generateTestSetup());
    files.push(generateTestHelpers());
  }

  return files;
}

function generateVitestConfig(): GeneratedFile {
  return {
    path: 'vitest.config.ts',
    content: `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
    },
  },
});
`,
  };
}

function generateExampleVitestTest(config: NexusConfig): GeneratedFile {
  return {
    path: 'tests/unit/example.test.ts',
    content: `import { describe, it, expect } from 'vitest';

describe('${config.displayName}', () => {
  it('should pass a basic sanity check', () => {
    expect(true).toBe(true);
  });

  it('should perform basic arithmetic', () => {
    expect(1 + 1).toBe(2);
  });
});
`,
  };
}

function generateTestSetup(): GeneratedFile {
  return {
    path: 'tests/setup.ts',
    content: `/**
 * Global test setup
 *
 * This file runs before all tests. Add global mocks, polyfills, or setup here.
 */

// Example: extend expect with custom matchers
// import '@testing-library/jest-dom';
`,
  };
}

function generateTestHelpers(): GeneratedFile {
  return {
    path: 'tests/utils/test-helpers.ts',
    content: `/**
 * Shared test utilities and helpers.
 *
 * Add reusable test factories, mock builders, and assertion helpers here.
 */

/**
 * Create a delay (useful for async testing).
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random string for test data.
 */
export function randomString(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}
`,
  };
}
