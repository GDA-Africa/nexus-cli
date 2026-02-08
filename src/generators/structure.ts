/**
 * NEXUS CLI - Structure Generator
 *
 * Generates the folder structure and base files for a new project.
 */

import type { NexusConfig } from '../types/config.js';
import type { GeneratedFile, GeneratedDirectory } from '../types/templates.js';

/**
 * Generate the base directory structure for any project type.
 */
export function generateDirectories(config: NexusConfig): GeneratedDirectory[] {
  const dirs: GeneratedDirectory[] = [
    { path: 'src' },
    { path: 'public' },
    { path: '.nexus' },
    { path: '.nexus/docs' },
    { path: '.nexus/ai' },
  ];

  // Test directories
  if (config.testFramework !== 'none') {
    dirs.push(
      { path: 'tests' },
      { path: 'tests/unit' },
      { path: 'tests/integration' },
      { path: 'tests/e2e' },
      { path: 'tests/utils' },
    );
  }

  // CI/CD
  dirs.push({ path: '.github' }, { path: '.github/workflows' });

  // Framework-specific
  switch (config.frontendFramework) {
    case 'nextjs':
      dirs.push({ path: 'src/app' }, { path: 'src/components' }, { path: 'src/lib' });
      break;
    case 'react-vite':
      dirs.push(
        { path: 'src/components' },
        { path: 'src/pages' },
        { path: 'src/hooks' },
        { path: 'src/lib' },
      );
      break;
    case 'sveltekit':
      dirs.push(
        { path: 'src/routes' },
        { path: 'src/lib' },
        { path: 'src/lib/components' },
        { path: 'src/styles' },
      );
      break;
    case 'nuxt':
      dirs.push(
        { path: 'src/lib' },
        { path: 'src/components' },
        { path: 'pages' },
        { path: 'assets' },
        { path: 'assets/css' },
      );
      break;
    case 'astro':
      dirs.push(
        { path: 'src/pages' },
        { path: 'src/layouts' },
        { path: 'src/components' },
        { path: 'src/styles' },
      );
      break;
    default:
      dirs.push({ path: 'src/lib' }, { path: 'src/components' });
      break;
  }

  return dirs;
}

/**
 * Generate the project's package.json content.
 */
export function generatePackageJson(config: NexusConfig): GeneratedFile {
  const scripts = getFrameworkScripts(config);
  const { dependencies, devDependencies } = getFrameworkDependencies(config);

  const pkg: Record<string, unknown> = {
    name: config.projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts,
    dependencies,
    devDependencies,
  };

  // Add test scripts & dependencies
  if (config.testFramework === 'vitest') {
    (pkg.scripts as Record<string, string>).test = 'vitest run';
    (pkg.scripts as Record<string, string>)['test:watch'] = 'vitest';
    (pkg.scripts as Record<string, string>)['test:coverage'] = 'vitest run --coverage';
    (pkg.devDependencies as Record<string, string>).vitest = '^3.0.0';
  } else if (config.testFramework === 'jest') {
    (pkg.scripts as Record<string, string>).test = 'jest';
    (pkg.devDependencies as Record<string, string>).jest = '^29.0.0';
    (pkg.devDependencies as Record<string, string>)['ts-jest'] = '^29.0.0';
    (pkg.devDependencies as Record<string, string>)['@types/jest'] = '^29.0.0';
  }

  return {
    path: 'package.json',
    content: JSON.stringify(pkg, null, 2) + '\n',
  };
}

/* ──────────────────────────────────────────────────────────────
 * Framework-specific scripts
 * ────────────────────────────────────────────────────────────── */

function getFrameworkScripts(config: NexusConfig): Record<string, string> {
  const base: Record<string, string> = {
    lint: 'eslint . --ext .ts,.tsx',
    format: 'prettier --write .',
    'type-check': 'tsc --noEmit',
  };

  switch (config.frontendFramework) {
    case 'nextjs':
      return {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        ...base,
      };
    case 'react-vite':
      return {
        dev: 'vite',
        build: 'tsc -b && vite build',
        preview: 'vite preview',
        ...base,
      };
    case 'sveltekit':
      return {
        dev: 'vite dev',
        build: 'vite build',
        preview: 'vite preview',
        ...base,
      };
    case 'nuxt':
      return {
        dev: 'nuxt dev',
        build: 'nuxt build',
        preview: 'nuxt preview',
        generate: 'nuxt generate',
        ...base,
      };
    case 'remix':
      return {
        dev: 'remix vite:dev',
        build: 'remix vite:build',
        start: 'remix-serve ./build/server/index.js',
        ...base,
      };
    case 'astro':
      return {
        dev: 'astro dev',
        build: 'astro build',
        preview: 'astro preview',
        ...base,
      };
    default:
      return {
        dev: 'echo "TODO: configure dev script"',
        build: 'tsc',
        start: 'node dist/index.js',
        ...base,
      };
  }
}

/* ──────────────────────────────────────────────────────────────
 * Framework-specific dependencies
 * ────────────────────────────────────────────────────────────── */

function getFrameworkDependencies(config: NexusConfig): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const baseDev: Record<string, string> = {
    typescript: '^5.7.0',
    '@types/node': '^22.0.0',
    eslint: '^8.57.0',
    prettier: '^3.4.0',
  };

  switch (config.frontendFramework) {
    case 'nextjs':
      return {
        dependencies: {
          next: '^15.0.0',
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
        devDependencies: {
          ...baseDev,
          '@types/react': '^19.0.0',
          '@types/react-dom': '^19.0.0',
        },
      };
    case 'react-vite':
      return {
        dependencies: {
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
        devDependencies: {
          ...baseDev,
          vite: '^6.0.0',
          '@vitejs/plugin-react': '^4.3.0',
          '@types/react': '^19.0.0',
          '@types/react-dom': '^19.0.0',
        },
      };
    case 'sveltekit':
      return {
        dependencies: {},
        devDependencies: {
          ...baseDev,
          '@sveltejs/kit': '^2.0.0',
          '@sveltejs/adapter-auto': '^3.0.0',
          '@sveltejs/vite-plugin-svelte': '^4.0.0',
          svelte: '^5.0.0',
          vite: '^6.0.0',
        },
      };
    case 'nuxt':
      return {
        dependencies: {},
        devDependencies: {
          ...baseDev,
          nuxt: '^3.14.0',
          vue: '^3.5.0',
        },
      };
    case 'remix':
      return {
        dependencies: {
          '@remix-run/node': '^2.0.0',
          '@remix-run/react': '^2.0.0',
          '@remix-run/serve': '^2.0.0',
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
        devDependencies: {
          ...baseDev,
          '@remix-run/dev': '^2.0.0',
          vite: '^6.0.0',
          '@types/react': '^19.0.0',
          '@types/react-dom': '^19.0.0',
        },
      };
    case 'astro':
      return {
        dependencies: {
          astro: '^4.0.0',
        },
        devDependencies: {
          ...baseDev,
        },
      };
    default:
      return {
        dependencies: {},
        devDependencies: baseDev,
      };
  }
}

/**
 * Generate .gitignore file.
 */
export function generateGitignore(): GeneratedFile {
  const content = `# Dependencies
node_modules/

# Build output
dist/
.next/
.svelte-kit/
.nuxt/
.output/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/settings.json
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Coverage
coverage/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
`;

  return { path: '.gitignore', content };
}

/**
 * Generate a basic README for the created project.
 */
export function generateReadme(config: NexusConfig): GeneratedFile {
  const content = `# ${config.displayName}

> Generated with [NEXUS CLI](https://github.com/GDA-Africa/nexus-cli) 🔮

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Documentation

This project uses the **NEXUS Documentation System** — 8 structured markdown files designed for both humans and AI coding tools.

| Doc | Purpose |
|-----|---------|
| \`.nexus/docs/01_vision.md\` | Product requirements & user stories |
| \`.nexus/docs/02_architecture.md\` | System design & tech stack |
| \`.nexus/docs/03_data_contracts.md\` | Database schemas & validation |
| \`.nexus/docs/04_api_contracts.md\` | Endpoints & interfaces |
| \`.nexus/docs/05_business_logic.md\` | Rules, algorithms & flows |
| \`.nexus/docs/06_test_strategy.md\` | Testing philosophy & coverage |
| \`.nexus/docs/07_implementation.md\` | Build order & file structure |
| \`.nexus/docs/08_deployment.md\` | Infrastructure & CI/CD |

**Start here:** Open \`.nexus/docs/01_vision.md\` and describe what you're building.

## Project Info

- **Type:** ${config.projectType}
- **Framework:** ${config.frontendFramework}
- **Data Strategy:** ${config.dataStrategy}
- **Testing:** ${config.testFramework}

---

*Built with ❤️ using NEXUS CLI by [GDA Africa](https://github.com/GDA-Africa)*
`;

  return { path: 'README.md', content };
}
