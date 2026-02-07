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

  return files;
}

function generateTsConfig(_config: NexusConfig): GeneratedFile {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'preserve',
      incremental: true,
    },
    include: ['src/**/*.ts', 'src/**/*.tsx'],
    exclude: ['node_modules', 'dist'],
  };

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
