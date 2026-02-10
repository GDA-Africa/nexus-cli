/**
 * NEXUS CLI — Adopt Feature Unit Tests
 *
 * Tests for:
 *   - Project detection (project-detector.ts)
 *   - Adopt generator output (generators/index.ts → adoptProject)
 *   - Frontmatter in documentation files (generators/docs.ts)
 */

import path from 'node:path';
import os from 'node:os';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { isExistingProject, detectProject } from '../../src/utils/project-detector.js';
import type { ProjectInfo } from '../../src/utils/project-detector.js';
import { generateDocs } from '../../src/generators/docs.js';
import { generateAiConfig } from '../../src/generators/ai-config.js';
import type { NexusConfig } from '../../src/types/config.js';
import { DEFAULT_PERSONA } from '../../src/types/config.js';

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────── */

const baseConfig: NexusConfig = {
  projectName: 'test-app',
  displayName: 'Test App',
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
  persona: DEFAULT_PERSONA,
};

let tmpDir: string;

/** Create a fresh temp directory before each test */
beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `nexus-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.ensureDir(tmpDir);
});

/** Clean up after each test */
afterEach(async () => {
  await fs.remove(tmpDir);
});

/* ══════════════════════════════════════════════════════════════
 * 1. isExistingProject — fast synchronous check
 * ══════════════════════════════════════════════════════════════ */

describe('isExistingProject', () => {
  it('should return true when package.json exists', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), { name: 'existing' });
    expect(isExistingProject(tmpDir)).toBe(true);
  });

  it('should return false when package.json is absent', () => {
    expect(isExistingProject(tmpDir)).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════
 * 2. detectProject — full async detection
 * ══════════════════════════════════════════════════════════════ */

describe('detectProject', () => {
  it('should report detected=false for an empty directory', async () => {
    const info = await detectProject(tmpDir);
    expect(info.detected).toBe(false);
    expect(info.signals.hasPackageJson).toBe(false);
    expect(info.name).toBeNull();
  });

  it('should detect project name and description from package.json', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), {
      name: 'my-app',
      description: 'A cool project',
    });
    const info = await detectProject(tmpDir);
    expect(info.detected).toBe(true);
    expect(info.name).toBe('my-app');
    expect(info.description).toBe('A cool project');
  });

  it('should detect Next.js from dependencies', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), {
      name: 'next-app',
      dependencies: { next: '14.0.0', react: '18.0.0' },
    });
    const info = await detectProject(tmpDir);
    expect(info.framework).toBe('nextjs');
  });

  it('should detect SvelteKit from devDependencies', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), {
      name: 'svelte-app',
      devDependencies: { '@sveltejs/kit': '2.0.0', svelte: '4.0.0' },
    });
    const info = await detectProject(tmpDir);
    expect(info.framework).toBe('sveltekit');
  });

  it('should detect Nuxt from dependencies', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), {
      name: 'nuxt-app',
      dependencies: { nuxt: '3.0.0' },
    });
    const info = await detectProject(tmpDir);
    expect(info.framework).toBe('nuxt');
  });

  it('should detect Astro from dependencies', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), {
      name: 'astro-app',
      dependencies: { astro: '4.0.0' },
    });
    const info = await detectProject(tmpDir);
    expect(info.framework).toBe('astro');
  });

  it('should detect Remix from dependencies', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), {
      name: 'remix-app',
      dependencies: { '@remix-run/react': '2.0.0' },
    });
    const info = await detectProject(tmpDir);
    expect(info.framework).toBe('remix');
  });

  it('should detect React (without Next) as react-vite', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), {
      name: 'react-app',
      dependencies: { react: '18.0.0', 'react-dom': '18.0.0' },
    });
    const info = await detectProject(tmpDir);
    expect(info.framework).toBe('react-vite');
  });

  it('should detect vitest as test framework', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), {
      name: 'tested-app',
      devDependencies: { vitest: '3.0.0' },
    });
    const info = await detectProject(tmpDir);
    expect(info.testFramework).toBe('vitest');
  });

  it('should detect jest as test framework', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), {
      name: 'jest-app',
      devDependencies: { jest: '29.0.0' },
    });
    const info = await detectProject(tmpDir);
    expect(info.testFramework).toBe('jest');
  });

  it('should detect yarn via yarn.lock', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), { name: 'yarn-app' });
    await fs.writeFile(path.join(tmpDir, 'yarn.lock'), '');
    const info = await detectProject(tmpDir);
    expect(info.packageManager).toBe('yarn');
  });

  it('should detect pnpm via pnpm-lock.yaml', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), { name: 'pnpm-app' });
    await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    const info = await detectProject(tmpDir);
    expect(info.packageManager).toBe('pnpm');
  });

  it('should detect npm via package-lock.json', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), { name: 'npm-app' });
    await fs.writeFile(path.join(tmpDir, 'package-lock.json'), '{}');
    const info = await detectProject(tmpDir);
    expect(info.packageManager).toBe('npm');
  });

  it('should detect hasNexus when .nexus/ directory exists', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), { name: 'app' });
    await fs.ensureDir(path.join(tmpDir, '.nexus'));
    const info = await detectProject(tmpDir);
    expect(info.hasNexus).toBe(true);
  });

  it('should report hasNexus=false when .nexus/ is absent', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), { name: 'app' });
    const info = await detectProject(tmpDir);
    expect(info.hasNexus).toBe(false);
  });

  it('should detect all project signals', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), { name: 'full' });
    await fs.ensureDir(path.join(tmpDir, '.git'));
    await fs.ensureDir(path.join(tmpDir, 'src'));
    await fs.writeJSON(path.join(tmpDir, 'tsconfig.json'), {});
    await fs.ensureDir(path.join(tmpDir, 'node_modules'));

    const info = await detectProject(tmpDir);
    expect(info.signals.hasPackageJson).toBe(true);
    expect(info.signals.hasGit).toBe(true);
    expect(info.signals.hasSrc).toBe(true);
    expect(info.signals.hasTsConfig).toBe(true);
    expect(info.signals.hasNodeModules).toBe(true);
  });

  it('should collect all dependencies into a flat list', async () => {
    await fs.writeJSON(path.join(tmpDir, 'package.json'), {
      name: 'dep-app',
      dependencies: { react: '18.0.0', next: '14.0.0' },
      devDependencies: { vitest: '3.0.0', typescript: '5.0.0' },
    });
    const info = await detectProject(tmpDir);
    expect(info.dependencies).toContain('react');
    expect(info.dependencies).toContain('next');
    expect(info.dependencies).toContain('vitest');
    expect(info.dependencies).toContain('typescript');
    expect(info.dependencies).toHaveLength(4);
  });
});

/* ══════════════════════════════════════════════════════════════
 * 3. Documentation frontmatter (status: template)
 * ══════════════════════════════════════════════════════════════ */

describe('documentation frontmatter', () => {
  it('should include nexus_doc frontmatter in all 8 doc files', () => {
    const files = generateDocs(baseConfig);
    const docFiles = files.filter((f) => f.path.startsWith('.nexus/docs/0'));

    expect(docFiles).toHaveLength(8);

    for (const file of docFiles) {
      expect(file.content).toContain('---');
      expect(file.content).toContain('nexus_doc: true');
      expect(file.content).toContain('status: template');
    }
  });

  it('should include the correct doc id in frontmatter', () => {
    const files = generateDocs(baseConfig);

    const vision = files.find((f) => f.path.includes('01_vision'));
    expect(vision).toBeDefined();
    expect(vision!.content).toContain('id: "01_vision"');

    const arch = files.find((f) => f.path.includes('02_architecture'));
    expect(arch).toBeDefined();
    expect(arch!.content).toContain('id: "02_architecture"');
  });

  it('should include confidence: low in frontmatter', () => {
    const files = generateDocs(baseConfig);
    const docFiles = files.filter((f) => f.path.startsWith('.nexus/docs/0'));

    for (const file of docFiles) {
      expect(file.content).toContain('confidence: low');
    }
  });

  it('should include a last_updated date in frontmatter', () => {
    const files = generateDocs(baseConfig);
    const vision = files.find((f) => f.path.includes('01_vision'));
    expect(vision!.content).toMatch(/last_updated: "\d{4}-\d{2}-\d{2}"/);
  });

  it('should still contain the document body below frontmatter', () => {
    const files = generateDocs(baseConfig);

    const vision = files.find((f) => f.path.includes('01_vision'));
    expect(vision!.content).toContain('# Product Vision & Requirements');

    const arch = files.find((f) => f.path.includes('02_architecture'));
    expect(arch!.content).toContain('# System Architecture');
  });
});

/* ══════════════════════════════════════════════════════════════
 * 4. AI Config — Onboarding protocol
 * ══════════════════════════════════════════════════════════════ */

describe('AI config onboarding protocol', () => {
  it('should include onboarding protocol section in instructions', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md');
    expect(instructions).toBeDefined();
    expect(instructions!.content).toContain('Onboarding');
  });

  it('should reference status: template in onboarding protocol', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md');
    expect(instructions!.content).toContain('status: template');
  });

  it('should instruct agents to change status to populated', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md');
    expect(instructions!.content).toContain('populated');
  });

  it('should mention codebase analysis in onboarding instructions', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md');
    const content = instructions!.content.toLowerCase();
    expect(content).toMatch(/analy[sz]e|inspect|scan|infer/);
  });
});
