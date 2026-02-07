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
    { path: 'docs' },
    { path: '.nexus' },
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
  const pkg: Record<string, unknown> = {
    name: config.projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'echo "TODO: configure dev script"',
      build: 'echo "TODO: configure build script"',
      start: 'echo "TODO: configure start script"',
      lint: 'eslint . --ext .ts,.tsx',
      format: 'prettier --write .',
      'type-check': 'tsc --noEmit',
    },
    dependencies: {},
    devDependencies: {
      typescript: '^5.7.0',
      '@types/node': '^22.0.0',
      eslint: '^8.57.0',
      prettier: '^3.4.0',
    },
  };

  // Add test scripts
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
  const content = `# ${config.projectName}

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
| \`docs/01_vision.md\` | Product requirements & user stories |
| \`docs/02_architecture.md\` | System design & tech stack |
| \`docs/03_data_contracts.md\` | Database schemas & validation |
| \`docs/04_api_contracts.md\` | Endpoints & interfaces |
| \`docs/05_business_logic.md\` | Rules, algorithms & flows |
| \`docs/06_test_strategy.md\` | Testing philosophy & coverage |
| \`docs/07_implementation.md\` | Build order & file structure |
| \`docs/08_deployment.md\` | Infrastructure & CI/CD |

**Start here:** Open \`docs/01_vision.md\` and describe what you're building.

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
