/**
 * NEXUS CLI - Config Generator
 *
 * Generates configuration files (tsconfig, eslint, prettier, etc.) for the new project.
 */

import type { NexusConfig } from '../types/config.js';
import type { GeneratedFile } from '../types/templates.js';

/**
 * Generate all configuration files for a project.
 */
export function generateConfigs(config: NexusConfig): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push(generateTsConfig(config));
  files.push(generateEslintConfig());
  files.push(generatePrettierConfig());
  files.push(generateEditorConfig());

  // Framework-specific config files
  const frameworkConfigs = generateFrameworkConfigs(config);
  files.push(...frameworkConfigs);

  return files;
}

function generateTsConfig(config: NexusConfig): GeneratedFile {
  // Base compiler options shared by all frameworks
  const compilerOptions: Record<string, unknown> = {
    target: 'ES2022',
    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
  };

  const include: string[] = ['src/**/*.ts', 'src/**/*.tsx'];
  const exclude: string[] = ['node_modules', 'dist'];

  // Framework-specific overrides
  switch (config.frontendFramework) {
    case 'nextjs':
      compilerOptions.module = 'ESNext';
      compilerOptions.moduleResolution = 'Bundler';
      compilerOptions.jsx = 'preserve';
      compilerOptions.incremental = true;
      compilerOptions.plugins = [{ name: 'next' }];
      include.push('next-env.d.ts', '.next/types/**/*.ts');
      break;
    case 'react-vite':
    case 'remix':
      compilerOptions.module = 'ESNext';
      compilerOptions.moduleResolution = 'Bundler';
      compilerOptions.jsx = 'react-jsx';
      break;
    case 'sveltekit':
      compilerOptions.module = 'ESNext';
      compilerOptions.moduleResolution = 'Bundler';
      include.length = 0;
      include.push('src/**/*.ts', 'src/**/*.svelte');
      break;
    case 'nuxt':
      // Nuxt auto-generates its own tsconfig; provide a minimal one
      compilerOptions.module = 'ESNext';
      compilerOptions.moduleResolution = 'Bundler';
      compilerOptions.jsx = 'preserve';
      break;
    case 'astro':
      compilerOptions.module = 'ESNext';
      compilerOptions.moduleResolution = 'Bundler';
      compilerOptions.jsx = 'react-jsx';
      include.push('src/**/*.astro');
      break;
    default:
      compilerOptions.module = 'NodeNext';
      compilerOptions.moduleResolution = 'NodeNext';
      compilerOptions.jsx = 'preserve';
      compilerOptions.incremental = true;
      break;
  }

  const tsconfig: Record<string, unknown> = { compilerOptions, include, exclude };

  return {
    path: 'tsconfig.json',
    content: JSON.stringify(tsconfig, null, 2) + '\n',
  };
}

function generateEslintConfig(): GeneratedFile {
  const content = `/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { browser: true, node: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
`;

  return { path: '.eslintrc.cjs', content };
}

function generatePrettierConfig(): GeneratedFile {
  const config = {
    semi: true,
    trailingComma: 'all',
    singleQuote: true,
    printWidth: 100,
    tabWidth: 2,
  };

  return {
    path: '.prettierrc',
    content: JSON.stringify(config, null, 2) + '\n',
  };
}

function generateEditorConfig(): GeneratedFile {
  return {
    path: '.editorconfig',
    content: `root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
`,
  };
}

/* ──────────────────────────────────────────────────────────────
 * Framework-specific config files (vite.config.ts, svelte.config.js, etc.)
 * ────────────────────────────────────────────────────────────── */

function generateFrameworkConfigs(config: NexusConfig): GeneratedFile[] {
  switch (config.frontendFramework) {
    case 'react-vite':
      return [generateViteConfigReact()];
    case 'sveltekit':
      return [generateSvelteConfig(), generateViteConfigSvelte()];
    case 'astro':
      return [generateAstroConfig()];
    default:
      return [];
  }
}

function generateViteConfigReact(): GeneratedFile {
  return {
    path: 'vite.config.ts',
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
});
`,
  };
}

function generateViteConfigSvelte(): GeneratedFile {
  return {
    path: 'vite.config.ts',
    content: `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
});
`,
  };
}

function generateSvelteConfig(): GeneratedFile {
  return {
    path: 'svelte.config.js',
    content: `import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  },
};

export default config;
`,
  };
}

function generateAstroConfig(): GeneratedFile {
  return {
    path: 'astro.config.mjs',
    content: `import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({});
`,
  };
}
