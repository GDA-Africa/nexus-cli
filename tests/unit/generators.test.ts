/**
 * NEXUS CLI - Structure Generator Unit Tests
 */

import { describe, it, expect } from 'vitest';

import { generateDirectories, generatePackageJson, generateGitignore, generateReadme } from '../../src/generators/structure.js';
import { generateLandingPage } from '../../src/generators/landing-page.js';
import { generateConfigs } from '../../src/generators/config.js';
import { generateAiConfig } from '../../src/generators/ai-config.js';
import { generateDocs } from '../../src/generators/docs.js';
import type { NexusConfig } from '../../src/types/config.js';

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

  it('should include Next.js dependencies for nextjs framework', () => {
    const file = generatePackageJson(baseConfig);
    const parsed = JSON.parse(file.content);
    expect(parsed.dependencies.next).toBeDefined();
    expect(parsed.dependencies.react).toBeDefined();
    expect(parsed.dependencies['react-dom']).toBeDefined();
    expect(parsed.devDependencies['@types/react']).toBeDefined();
    expect(parsed.devDependencies['@types/react-dom']).toBeDefined();
  });

  it('should include React + Vite dependencies for react-vite framework', () => {
    const config = { ...baseConfig, frontendFramework: 'react-vite' as const };
    const file = generatePackageJson(config);
    const parsed = JSON.parse(file.content);
    expect(parsed.dependencies.react).toBeDefined();
    expect(parsed.dependencies['react-dom']).toBeDefined();
    expect(parsed.devDependencies.vite).toBeDefined();
    expect(parsed.devDependencies['@vitejs/plugin-react']).toBeDefined();
  });

  it('should include SvelteKit dependencies for sveltekit framework', () => {
    const config = { ...baseConfig, frontendFramework: 'sveltekit' as const };
    const file = generatePackageJson(config);
    const parsed = JSON.parse(file.content);
    expect(parsed.devDependencies['@sveltejs/kit']).toBeDefined();
    expect(parsed.devDependencies.svelte).toBeDefined();
    expect(parsed.devDependencies.vite).toBeDefined();
  });

  it('should include Nuxt dependencies for nuxt framework', () => {
    const config = { ...baseConfig, frontendFramework: 'nuxt' as const };
    const file = generatePackageJson(config);
    const parsed = JSON.parse(file.content);
    expect(parsed.devDependencies.nuxt).toBeDefined();
    expect(parsed.devDependencies.vue).toBeDefined();
  });

  it('should include Astro dependencies for astro framework', () => {
    const config = { ...baseConfig, frontendFramework: 'astro' as const };
    const file = generatePackageJson(config);
    const parsed = JSON.parse(file.content);
    expect(parsed.dependencies.astro).toBeDefined();
  });

  it('should have real framework scripts (not TODO placeholders)', () => {
    const file = generatePackageJson(baseConfig);
    const parsed = JSON.parse(file.content);
    expect(parsed.scripts.dev).not.toContain('TODO');
    expect(parsed.scripts.build).not.toContain('TODO');
  });

  it('should set correct scripts for nextjs', () => {
    const file = generatePackageJson(baseConfig);
    const parsed = JSON.parse(file.content);
    expect(parsed.scripts.dev).toBe('next dev');
    expect(parsed.scripts.build).toBe('next build');
    expect(parsed.scripts.start).toBe('next start');
  });

  it('should set correct scripts for react-vite', () => {
    const config = { ...baseConfig, frontendFramework: 'react-vite' as const };
    const file = generatePackageJson(config);
    const parsed = JSON.parse(file.content);
    expect(parsed.scripts.dev).toBe('vite');
    expect(parsed.scripts.build).toBe('tsc -b && vite build');
    expect(parsed.scripts.preview).toBe('vite preview');
  });

  it('should always include base tooling devDependencies', () => {
    const file = generatePackageJson(baseConfig);
    const parsed = JSON.parse(file.content);
    expect(parsed.devDependencies.typescript).toBeDefined();
    expect(parsed.devDependencies.eslint).toBeDefined();
    expect(parsed.devDependencies.prettier).toBeDefined();
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
    expect(file.content).toContain('Test App');
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
    expect(page!.content).toContain('Test App');
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

  it('should include brand explorer content (size variations + brand colors) in all frameworks', () => {
    const frameworks = ['nextjs', 'react-vite', 'sveltekit', 'nuxt', 'astro'] as const;
    const mainFiles: Record<string, string> = {
      nextjs: 'src/app/page.tsx',
      'react-vite': 'src/App.tsx',
      sveltekit: 'src/routes/+page.svelte',
      nuxt: 'pages/index.vue',
      astro: 'src/pages/index.astro',
    };

    for (const fw of frameworks) {
      const config = { ...baseConfig, frontendFramework: fw };
      const files = generateLandingPage(config);
      const mainFile = files.find((f) => f.path === mainFiles[fw]);
      expect(mainFile, `main file for ${fw}`).toBeDefined();
      // Brand colors card
      expect(mainFile!.content).toContain('#00D9FF');
      expect(mainFile!.content).toContain('#00FF87');
      expect(mainFile!.content).toContain('#FF4757');
      expect(mainFile!.content).toContain('Brand Colors');
      // Size variations card
      expect(mainFile!.content).toContain('Size Variations');
    }
  });

  it('should use nexus-page layout class (not nexus-landing)', () => {
    const config = { ...baseConfig, frontendFramework: 'react-vite' as const };
    const files = generateLandingPage(config);
    const app = files.find((f) => f.path === 'src/App.tsx');
    expect(app!.content).toContain('nexus-page');
    expect(app!.content).not.toContain('nexus-landing');
  });
});

describe('generateAiConfig', () => {
  it('should generate the master instructions file in .nexus/ai/', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md');
    expect(instructions).toBeDefined();
    expect(instructions!.content).toContain('Test App');
  });

  it('should include framework and tech stack in instructions', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md');
    expect(instructions!.content).toContain('Next.js');
    expect(instructions!.content).toContain('vitest');
    expect(instructions!.content).toContain('npm');
  });

  it('should generate all AI tool config files', () => {
    const files = generateAiConfig(baseConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.cursorrules');
    expect(paths).toContain('.windsurfrules');
    expect(paths).toContain('.clinerules');
    expect(paths).toContain('AGENTS.md');
    expect(paths).toContain('.github/copilot-instructions.md');
  });

  it('should embed project-aware content in ALL tool files', () => {
    const files = generateAiConfig(baseConfig);
    const toolFiles = ['.cursorrules', '.windsurfrules', '.clinerules', 'AGENTS.md', '.github/copilot-instructions.md'];

    for (const toolPath of toolFiles) {
      const file = files.find((f) => f.path === toolPath);
      expect(file).toBeDefined();
      // Every file should have the onboarding trigger
      expect(file!.content).toContain('status: template');
      expect(file!.content).toContain('.nexus/ai/instructions.md');
      // Every file should have project identity
      expect(file!.content).toContain('Test App');
      expect(file!.content).toContain('Next.js');
      // Every file should have code rules
      expect(file!.content).toContain('TypeScript strict mode');
      // Every file should be substantial (not a thin pointer)
      expect(file!.content.length).toBeGreaterThan(500);
    }
  });

  it('should keep tool files lean — shorter than master instructions', () => {
    const files = generateAiConfig(baseConfig);
    const master = files.find((f) => f.path === '.nexus/ai/instructions.md')!;
    const cursor = files.find((f) => f.path === '.cursorrules')!;
    // Tool files should be significantly shorter than master
    expect(cursor.content.length).toBeLessThan(master.content.length);
  });

  it('should still reference .nexus/ai/instructions.md for full details', () => {
    const files = generateAiConfig(baseConfig);
    const cursor = files.find((f) => f.path === '.cursorrules');
    expect(cursor!.content).toContain('.nexus/ai/instructions.md');
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

describe('generateConfigs — framework config files', () => {
  it('should generate vite.config.ts for react-vite framework', () => {
    const config = { ...baseConfig, frontendFramework: 'react-vite' as const };
    const files = generateConfigs(config);
    const viteConfig = files.find((f) => f.path === 'vite.config.ts');
    expect(viteConfig).toBeDefined();
    expect(viteConfig!.content).toContain('@vitejs/plugin-react');
    expect(viteConfig!.content).toContain('react()');
  });

  it('should generate svelte.config.js and vite.config.ts for sveltekit', () => {
    const config = { ...baseConfig, frontendFramework: 'sveltekit' as const };
    const files = generateConfigs(config);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('svelte.config.js');
    expect(paths).toContain('vite.config.ts');
    const svelteConfig = files.find((f) => f.path === 'svelte.config.js');
    expect(svelteConfig!.content).toContain('adapter-auto');
  });

  it('should generate astro.config.mjs for astro framework', () => {
    const config = { ...baseConfig, frontendFramework: 'astro' as const };
    const files = generateConfigs(config);
    const astroConfig = files.find((f) => f.path === 'astro.config.mjs');
    expect(astroConfig).toBeDefined();
    expect(astroConfig!.content).toContain("from 'astro/config'");
  });

  it('should NOT generate extra framework config for nextjs (next.config is convention)', () => {
    const files = generateConfigs(baseConfig);
    const paths = files.map((f) => f.path);
    expect(paths).not.toContain('vite.config.ts');
    expect(paths).not.toContain('next.config.ts');
  });

  it('should use react-jsx for react-vite tsconfig', () => {
    const config = { ...baseConfig, frontendFramework: 'react-vite' as const };
    const files = generateConfigs(config);
    const tsconfig = files.find((f) => f.path === 'tsconfig.json');
    const parsed = JSON.parse(tsconfig!.content);
    expect(parsed.compilerOptions.jsx).toBe('react-jsx');
    expect(parsed.compilerOptions.moduleResolution).toBe('Bundler');
  });

  it('should use preserve jsx and next plugin for nextjs tsconfig', () => {
    const files = generateConfigs(baseConfig);
    const tsconfig = files.find((f) => f.path === 'tsconfig.json');
    const parsed = JSON.parse(tsconfig!.content);
    expect(parsed.compilerOptions.jsx).toBe('preserve');
    expect(parsed.compilerOptions.plugins).toEqual([{ name: 'next' }]);
  });

  it('should use Bundler module resolution for modern frameworks', () => {
    const frameworks = ['react-vite', 'sveltekit', 'nuxt', 'astro'] as const;
    for (const fw of frameworks) {
      const config = { ...baseConfig, frontendFramework: fw };
      const files = generateConfigs(config);
      const tsconfig = files.find((f) => f.path === 'tsconfig.json');
      const parsed = JSON.parse(tsconfig!.content);
      expect(parsed.compilerOptions.moduleResolution).toBe('Bundler');
    }
  });
});

/* ══════════════════════════════════════════════════════════════
 * Pattern-Aware Business Logic
 * ══════════════════════════════════════════════════════════════ */

describe('generateDocs — pattern-aware business logic', () => {
  it('should generate base business logic doc without pattern sections when no patterns', () => {
    const files = generateDocs(baseConfig); // appPatterns: []
    const biz = files.find((f) => f.path === '.nexus/docs/05_business_logic.md')!;
    expect(biz).toBeDefined();
    expect(biz.content).toContain('Business Logic');
    // Should NOT have any pattern-specific sections
    expect(biz.content).not.toContain('Sync & Conflict Resolution');
    expect(biz.content).not.toContain('Real-Time System');
    expect(biz.content).not.toContain('PWA');
    expect(biz.content).not.toContain('Theming System');
    expect(biz.content).not.toContain('Internationalization');
    expect(biz.content).not.toContain('White Label');
  });

  it('should add offline-first section when pattern is selected', () => {
    const config = { ...baseConfig, appPatterns: ['offline-first' as const] };
    const files = generateDocs(config);
    const biz = files.find((f) => f.path === '.nexus/docs/05_business_logic.md')!;
    expect(biz.content).toContain('Sync & Conflict Resolution');
  });

  it('should add real-time section when pattern is selected', () => {
    const config = { ...baseConfig, appPatterns: ['real-time' as const] };
    const files = generateDocs(config);
    const biz = files.find((f) => f.path === '.nexus/docs/05_business_logic.md')!;
    expect(biz.content).toContain('Real-Time System');
  });

  it('should add PWA section when pattern is selected', () => {
    const config = { ...baseConfig, appPatterns: ['pwa' as const] };
    const files = generateDocs(config);
    const biz = files.find((f) => f.path === '.nexus/docs/05_business_logic.md')!;
    expect(biz.content).toContain('PWA');
    expect(biz.content).toContain('Service Worker');
  });

  it('should add theming section when pattern is selected', () => {
    const config = { ...baseConfig, appPatterns: ['theming' as const] };
    const files = generateDocs(config);
    const biz = files.find((f) => f.path === '.nexus/docs/05_business_logic.md')!;
    expect(biz.content).toContain('Theming System');
  });

  it('should add i18n section when pattern is selected', () => {
    const config = { ...baseConfig, appPatterns: ['i18n' as const] };
    const files = generateDocs(config);
    const biz = files.find((f) => f.path === '.nexus/docs/05_business_logic.md')!;
    expect(biz.content).toContain('Internationalization');
  });

  it('should add white-label section when pattern is selected', () => {
    const config = { ...baseConfig, appPatterns: ['white-label' as const] };
    const files = generateDocs(config);
    const biz = files.find((f) => f.path === '.nexus/docs/05_business_logic.md')!;
    expect(biz.content).toContain('White Label');
    expect(biz.content).toContain('Multi-Tenant');
  });

  it('should add multiple pattern sections when multiple patterns selected', () => {
    const config = { ...baseConfig, appPatterns: ['offline-first' as const, 'real-time' as const, 'pwa' as const] };
    const files = generateDocs(config);
    const biz = files.find((f) => f.path === '.nexus/docs/05_business_logic.md')!;
    expect(biz.content).toContain('Sync & Conflict Resolution');
    expect(biz.content).toContain('Real-Time System');
    expect(biz.content).toContain('PWA');
    // Should NOT have unselected patterns
    expect(biz.content).not.toContain('Theming System');
    expect(biz.content).not.toContain('Internationalization');
  });
});

/* ══════════════════════════════════════════════════════════════
 * Project Index — The AI Agent's Brain
 * ══════════════════════════════════════════════════════════════ */

describe('generateDocs — project index (AI brain)', () => {
  it('should generate .nexus/docs/index.md', () => {
    const files = generateDocs(baseConfig);
    const index = files.find((f) => f.path === '.nexus/docs/index.md');
    expect(index).toBeDefined();
  });

  it('should have frontmatter with status: template', () => {
    const files = generateDocs(baseConfig);
    const index = files.find((f) => f.path === '.nexus/docs/index.md')!;
    expect(index.content).toContain('nexus_doc: true');
    expect(index.content).toContain('status: template');
  });

  it('should contain the project brain header', () => {
    const files = generateDocs(baseConfig);
    const index = files.find((f) => f.path === '.nexus/docs/index.md')!;
    expect(index.content).toContain('THIS IS THE AI AGENT');
    expect(index.content).toContain('BRAIN');
  });

  it('should contain the project name and framework', () => {
    const files = generateDocs(baseConfig);
    const index = files.find((f) => f.path === '.nexus/docs/index.md')!;
    expect(index.content).toContain('Test App');
    expect(index.content).toContain('Next.js');
  });

  it('should contain all required brain sections', () => {
    const files = generateDocs(baseConfig);
    const index = files.find((f) => f.path === '.nexus/docs/index.md')!;
    expect(index.content).toContain('Current Objective');
    expect(index.content).toContain('Project Status Matrix');
    expect(index.content).toContain('Feature Backlog');
    expect(index.content).toContain('What Has Been Built');
    expect(index.content).toContain('Progress Log');
    expect(index.content).toContain("What's Next");
    expect(index.content).toContain('AI Agent Operating Rules');
  });

  it('should contain operating rules that prevent aimless behavior', () => {
    const files = generateDocs(baseConfig);
    const index = files.find((f) => f.path === '.nexus/docs/index.md')!;
    expect(index.content).toContain('READ this file before EVERY task');
    expect(index.content).toContain('UPDATE this file after EVERY task');
    expect(index.content).toContain('DON\'T ask "what enhancements would you like?"');
    expect(index.content).toContain('feature backlog is your roadmap');
  });

  it('should contain the data strategy in prioritized next steps', () => {
    const files = generateDocs(baseConfig);
    const index = files.find((f) => f.path === '.nexus/docs/index.md')!;
    expect(index.content).toContain('cloud-first');
  });

  it('should include a Progress Log section with initial entry', () => {
    const files = generateDocs(baseConfig);
    const index = files.find((f) => f.path === '.nexus/docs/index.md')!;
    expect(index.content).toContain('Project Created');
    expect(index.content).toContain('Scaffolded with NEXUS CLI');
  });
});

/* ══════════════════════════════════════════════════════════════
 * AI Instructions — index.md as brain
 * ══════════════════════════════════════════════════════════════ */

describe('generateAiConfig — index.md brain references', () => {
  it('should reference .nexus/docs/index.md as brain in master instructions', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md')!;
    expect(instructions.content).toContain('.nexus/docs/index.md');
    expect(instructions.content).toContain('BRAIN');
  });

  it('should reference .nexus/docs/index.md as brain in ALL tool files', () => {
    const files = generateAiConfig(baseConfig);
    const toolFiles = ['.cursorrules', '.windsurfrules', '.clinerules', 'AGENTS.md', '.github/copilot-instructions.md'];

    for (const toolPath of toolFiles) {
      const file = files.find((f) => f.path === toolPath)!;
      expect(file.content, `${toolPath} should reference index.md`).toContain('.nexus/docs/index.md');
      expect(file.content, `${toolPath} should mention BRAIN`).toContain('BRAIN');
    }
  });

  it('should include "read before every task" rule in tool files', () => {
    const files = generateAiConfig(baseConfig);
    const toolFiles = ['.cursorrules', '.windsurfrules', '.clinerules', 'AGENTS.md', '.github/copilot-instructions.md'];

    for (const toolPath of toolFiles) {
      const file = files.find((f) => f.path === toolPath)!;
      expect(file.content).toContain('Before EVERY task');
      expect(file.content).toContain('After EVERY task');
    }
  });

  it('should include "never ask for enhancements" rule in tool files', () => {
    const files = generateAiConfig(baseConfig);
    const cursor = files.find((f) => f.path === '.cursorrules')!;
    expect(cursor.content).toContain('NEVER ask');
    expect(cursor.content).toContain('enhancements');
  });

  it('should include Step 6 (build the project brain) in master instructions only', () => {
    const files = generateAiConfig(baseConfig);
    // Master file keeps the full onboarding with Step 6
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md')!;
    expect(instructions.content).toContain('Build the project brain');

    // Tool files have a lean onboarding trigger instead
    const cursor = files.find((f) => f.path === '.cursorrules')!;
    expect(cursor.content).toContain('Populate the docs BEFORE doing anything else');
    expect(cursor.content).toContain('.nexus/ai/instructions.md');
  });

  it('should instruct agents to build implementation plan from vision', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md')!;
    expect(instructions.content).toContain('Build the implementation plan');
    expect(instructions.content).toContain('01_vision.md');
  });

  it('should include after-task workflow (update index, suggest next)', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md')!;
    expect(instructions.content).toContain('Update `.nexus/docs/index.md`');
    expect(instructions.content).toContain('Progress Log');
    expect(instructions.content).toContain('Suggest the next task');
  });
});

/* ══════════════════════════════════════════════════════════════
 * Progressive Knowledge Base
 * ══════════════════════════════════════════════════════════════ */

describe('generateDocs — progressive knowledge base', () => {
  it('should generate .nexus/docs/knowledge.md', () => {
    const files = generateDocs(baseConfig);
    const knowledge = files.find((f) => f.path === '.nexus/docs/knowledge.md');
    expect(knowledge).toBeDefined();
  });

  it('should contain project name and Knowledge Base title', () => {
    const files = generateDocs(baseConfig);
    const knowledge = files.find((f) => f.path === '.nexus/docs/knowledge.md')!;
    expect(knowledge.content).toContain('Test App');
    expect(knowledge.content).toContain('Knowledge Base');
  });

  it('should contain category reference table', () => {
    const files = generateDocs(baseConfig);
    const knowledge = files.find((f) => f.path === '.nexus/docs/knowledge.md')!;
    expect(knowledge.content).toContain('architecture');
    expect(knowledge.content).toContain('bug-fix');
    expect(knowledge.content).toContain('pattern');
    expect(knowledge.content).toContain('package');
    expect(knowledge.content).toContain('performance');
    expect(knowledge.content).toContain('convention');
    expect(knowledge.content).toContain('gotcha');
  });

  it('should have an initial seed entry', () => {
    const files = generateDocs(baseConfig);
    const knowledge = files.find((f) => f.path === '.nexus/docs/knowledge.md')!;
    expect(knowledge.content).toContain('[convention]');
    expect(knowledge.content).toContain('NEXUS CLI');
  });

  it('should explain when to add vs when NOT to add entries', () => {
    const files = generateDocs(baseConfig);
    const knowledge = files.find((f) => f.path === '.nexus/docs/knowledge.md')!;
    expect(knowledge.content).toContain('When to add');
    expect(knowledge.content).toContain('When NOT to add');
  });

  it('should describe progressive/append-only nature', () => {
    const files = generateDocs(baseConfig);
    const knowledge = files.find((f) => f.path === '.nexus/docs/knowledge.md')!;
    expect(knowledge.content).toContain('never delete entries');
  });
});

describe('knowledge base — brain and instruction references', () => {
  it('should reference knowledge.md in index.md operating rules', () => {
    const files = generateDocs(baseConfig);
    const index = files.find((f) => f.path === '.nexus/docs/index.md')!;
    expect(index.content).toContain('knowledge.md');
    expect(index.content).toContain('Learn as you go');
  });

  it('should reference knowledge.md in .nexus/index.md doc map', () => {
    const files = generateDocs(baseConfig);
    const nexusIndex = files.find((f) => f.path === '.nexus/index.md')!;
    expect(nexusIndex.content).toContain('knowledge.md');
    expect(nexusIndex.content).toContain('Knowledge Base');
  });

  it('should reference knowledge.md in master AI instructions', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md')!;
    expect(instructions.content).toContain('knowledge.md');
    expect(instructions.content).toContain('KNOWLEDGE BASE');
  });

  it('should include knowledge.md scanning in master before-task workflow', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md')!;
    expect(instructions.content).toContain('Scan `.nexus/docs/knowledge.md`');
  });

  it('should include knowledge.md appending in master after-task workflow', () => {
    const files = generateAiConfig(baseConfig);
    const instructions = files.find((f) => f.path === '.nexus/ai/instructions.md')!;
    expect(instructions.content).toContain('Learn');
    expect(instructions.content).toContain('append an entry to `.nexus/docs/knowledge.md`');
  });

  it('should reference knowledge.md in tool files', () => {
    const files = generateAiConfig(baseConfig);
    const toolFiles = ['.cursorrules', '.windsurfrules', '.clinerules', 'AGENTS.md', '.github/copilot-instructions.md'];

    for (const toolPath of toolFiles) {
      const file = files.find((f) => f.path === toolPath)!;
      expect(file.content, `${toolPath} should reference knowledge.md`).toContain('knowledge.md');
    }
  });
});
