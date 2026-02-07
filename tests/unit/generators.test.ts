/**
 * NEXUS CLI - Structure Generator Unit Tests
 */

import { describe, it, expect } from 'vitest';

import { generateDirectories, generatePackageJson, generateGitignore, generateReadme } from '../../src/generators/structure.js';
import type { NexusConfig } from '../../src/types/config.js';

const baseConfig: NexusConfig = {
  projectName: 'test-app',
  projectType: 'web',
  dataStrategy: 'cloud-first',
  appPatterns: [],
  frontendFramework: 'nextjs',
  backendStrategy: 'integrated',
  backendFramework: 'none',
  testFramework: 'vitest',
  packageManager: 'npm',
  git: true,
  installDeps: false,
};

describe('generateDirectories', () => {
  it('should include core directories', () => {
    const dirs = generateDirectories(baseConfig);
    const paths = dirs.map((d) => d.path);
    expect(paths).toContain('src');
    expect(paths).toContain('public');
    expect(paths).toContain('docs');
    expect(paths).toContain('.nexus');
  });

  it('should include test directories when test framework is set', () => {
    const dirs = generateDirectories(baseConfig);
    const paths = dirs.map((d) => d.path);
    expect(paths).toContain('tests');
    expect(paths).toContain('tests/unit');
  });

  it('should skip test directories when test framework is none', () => {
    const dirs = generateDirectories({ ...baseConfig, testFramework: 'none' });
    const paths = dirs.map((d) => d.path);
    expect(paths).not.toContain('tests');
  });

  it('should include Next.js dirs for nextjs framework', () => {
    const dirs = generateDirectories(baseConfig);
    const paths = dirs.map((d) => d.path);
    expect(paths).toContain('src/app');
    expect(paths).toContain('src/components');
  });

  it('should include SvelteKit dirs for sveltekit framework', () => {
    const dirs = generateDirectories({ ...baseConfig, frontendFramework: 'sveltekit' });
    const paths = dirs.map((d) => d.path);
    expect(paths).toContain('src/routes');
    expect(paths).toContain('src/lib');
  });
});

describe('generatePackageJson', () => {
  it('should return a valid JSON file at package.json', () => {
    const file = generatePackageJson(baseConfig);
    expect(file.path).toBe('package.json');
    const parsed = JSON.parse(file.content);
    expect(parsed.name).toBe('test-app');
    expect(parsed.version).toBe('0.1.0');
  });

  it('should include vitest when testFramework is vitest', () => {
    const file = generatePackageJson(baseConfig);
    const parsed = JSON.parse(file.content);
    expect(parsed.devDependencies.vitest).toBeDefined();
    expect(parsed.scripts.test).toContain('vitest');
  });
});

describe('generateGitignore', () => {
  it('should include node_modules', () => {
    const file = generateGitignore();
    expect(file.content).toContain('node_modules');
  });
});

describe('generateReadme', () => {
  it('should include the project name', () => {
    const file = generateReadme(baseConfig);
    expect(file.content).toContain('test-app');
  });

  it('should include the NEXUS doc system table', () => {
    const file = generateReadme(baseConfig);
    expect(file.content).toContain('01_vision.md');
    expect(file.content).toContain('08_deployment.md');
  });
});
