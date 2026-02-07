/**
 * NEXUS CLI - Structure Generator Unit Tests
 */

import { describe, it, expect } from 'vitest';

import { generateDirectories, generatePackageJson, generateGitignore, generateReadme } from '../../src/generators/structure.js';
import { generateLandingPage } from '../../src/generators/landing-page.js';
import { generateAiConfig } from '../../src/generators/ai-config.js';
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
    expect(paths).toContain('.nexus/docs');
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

describe('generateLandingPage', () => {
  it('should always include nexus-logo.svg and favicon.svg', () => {
    const files = generateLandingPage(baseConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('public/nexus-logo.svg');
    expect(paths).toContain('public/favicon.svg');
  });

  it('should include SVG content in the logo file', () => {
    const files = generateLandingPage(baseConfig);
    const logo = files.find((f) => f.path === 'public/nexus-logo.svg');
    expect(logo).toBeDefined();
    expect(logo!.content).toContain('<svg');
    expect(logo!.content).toContain('#00D9FF');
  });

  it('should generate Next.js landing page for nextjs framework', () => {
    const files = generateLandingPage(baseConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('src/app/page.tsx');
    expect(paths).toContain('src/app/layout.tsx');
    expect(paths).toContain('src/app/globals.css');
  });

  it('should include project name in Next.js page content', () => {
    const files = generateLandingPage(baseConfig);
    const page = files.find((f) => f.path === 'src/app/page.tsx');
    expect(page).toBeDefined();
    expect(page!.content).toContain('test-app');
    expect(page!.content).toContain('NEXUS CLI');
  });

  it('should set favicon in Next.js layout metadata', () => {
    const files = generateLandingPage(baseConfig);
    const layout = files.find((f) => f.path === 'src/app/layout.tsx');
    expect(layout).toBeDefined();
    expect(layout!.content).toContain('/favicon.svg');
  });

  it('should generate React+Vite landing page for react-vite framework', () => {
    const config = { ...baseConfig, frontendFramework: 'react-vite' as const };
    const files = generateLandingPage(config);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('src/App.tsx');
    expect(paths).toContain('src/main.tsx');
    expect(paths).toContain('index.html');
    expect(paths).toContain('src/index.css');
  });

  it('should generate SvelteKit landing page for sveltekit framework', () => {
    const config = { ...baseConfig, frontendFramework: 'sveltekit' as const };
    const files = generateLandingPage(config);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('src/routes/+page.svelte');
    expect(paths).toContain('src/routes/+layout.svelte');
    expect(paths).toContain('src/app.html');
    expect(paths).toContain('src/app.css');
  });

  it('should generate Nuxt landing page for nuxt framework', () => {
    const config = { ...baseConfig, frontendFramework: 'nuxt' as const };
    const files = generateLandingPage(config);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('app.vue');
    expect(paths).toContain('pages/index.vue');
    expect(paths).toContain('assets/css/main.css');
    expect(paths).toContain('nuxt.config.ts');
  });

  it('should generate Astro landing page for astro framework', () => {
    const config = { ...baseConfig, frontendFramework: 'astro' as const };
    const files = generateLandingPage(config);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('src/pages/index.astro');
    expect(paths).toContain('src/layouts/Layout.astro');
    expect(paths).toContain('src/styles/global.css');
  });

  it('should only include logo/favicon for API projects (no landing page)', () => {
    const config = { ...baseConfig, projectType: 'api' as const };
    const files = generateLandingPage(config);
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.path)).toEqual(['public/nexus-logo.svg', 'public/favicon.svg']);
  });

  it('should include Nuxt useHead with favicon in nuxt index page', () => {
    const config = { ...baseConfig, frontendFramework: 'nuxt' as const };
    const files = generateLandingPage(config);
    const page = files.find((f) => f.path === 'pages/index.vue');
    expect(page).toBeDefined();
    expect(page!.content).toContain('favicon.svg');
    expect(page!.content).toContain('useHead');
  });

  it('should include framework-specific directory structures', () => {
    // Nuxt has specific dirs
    const nuxtDirs = generateDirectories({ ...baseConfig, frontendFramework: 'nuxt' as const });
    const nuxtPaths = nuxtDirs.map((d) => d.path);
    expect(nuxtPaths).toContain('pages');
    expect(nuxtPaths).toContain('assets/css');

    // Astro has specific dirs
    const astroDirs = generateDirectories({ ...baseConfig, frontendFramework: 'astro' as const });
    const astroPaths = astroDirs.map((d) => d.path);
    expect(astroPaths).toContain('src/pages');
    expect(astroPaths).toContain('src/layouts');
    expect(astroPaths).toContain('src/styles');
  });
});

describe('generateAiConfig', () => {
  it('should generate the master instructions file in .nexus/ai/', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md');
    expect(instructions).toBeDefined();
    expect(instructions!.content).toContain('test-app');
  });

  it('should include framework and tech stack in instructions', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md');
    expect(instructions!.content).toContain('Next.js');
    expect(instructions!.content).toContain('vitest');
    expect(instructions!.content).toContain('npm');
  });

  it('should generate all pointer files', () => {
    const files = generateAiConfig(baseConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.cursorrules');
    expect(paths).toContain('.windsurfrules');
    expect(paths).toContain('.clinerules');
    expect(paths).toContain('AGENTS.md');
    expect(paths).toContain('.github/copilot-instructions.md');
  });

  it('should have pointer files reference .nexus/ai/instructions.md', () => {
    const files = generateAiConfig(baseConfig);
    const cursor = files.find((f) => f.path === '.cursorrules');
    expect(cursor).toBeDefined();
    expect(cursor!.content).toContain('.nexus/ai/instructions.md');

    const windsurf = files.find((f) => f.path === '.windsurfrules');
    expect(windsurf!.content).toContain('.nexus/ai/instructions.md');

    const cline = files.find((f) => f.path === '.clinerules');
    expect(cline!.content).toContain('.nexus/ai/instructions.md');

    const agents = files.find((f) => f.path === 'AGENTS.md');
    expect(agents!.content).toContain('.nexus/ai/instructions.md');
  });

  it('should embed full content in copilot instructions (not a pointer)', () => {
    const files = generateAiConfig(baseConfig);
    const copilot = files.find((f) => f.path === '.github/copilot-instructions.md');
    expect(copilot).toBeDefined();
    expect(copilot!.content).toContain('test-app');
    expect(copilot!.content).toContain('Next.js');
    // Copilot file should have full content, not just a pointer
    expect(copilot!.content.length).toBeGreaterThan(200);
  });

  it('should include .nexus/ai directory in generated directories', () => {
    const dirs = generateDirectories(baseConfig);
    const dirPaths = dirs.map((d) => d.path);
    expect(dirPaths).toContain('.nexus/ai');
  });

  it('should adapt to different frameworks', () => {
    const viteConfig = { ...baseConfig, frontendFramework: 'react-vite' as const };
    const files = generateAiConfig(viteConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md');
    expect(instructions!.content).toContain('React + Vite');
  });

  it('should adapt validation commands to package manager', () => {
    const yarnConfig = { ...baseConfig, packageManager: 'yarn' as const };
    const files = generateAiConfig(yarnConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md');
    expect(instructions!.content).toContain('yarn test');
  });
});
