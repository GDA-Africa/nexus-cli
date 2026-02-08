/**
 * NEXUS CLI - Type Definitions: Configuration
 *
 * Core configuration types used throughout the CLI.
 */

/** Supported project types */
export type ProjectType = 'web' | 'api' | 'monorepo' | 'mobile' | 'desktop';

/** Data strategy options */
export type DataStrategy = 'local-only' | 'local-first' | 'cloud-first' | 'hybrid';

/** Application pattern flags */
export type AppPattern = 'pwa' | 'offline-first' | 'theming' | 'white-label' | 'i18n' | 'real-time';

/** Supported frontend frameworks */
export type FrontendFramework = 'nextjs' | 'react-vite' | 'sveltekit' | 'nuxt' | 'remix' | 'astro';

/** Supported backend frameworks */
export type BackendFramework = 'express' | 'fastify' | 'nestjs' | 'none';

/** Backend strategy options */
export type BackendStrategy = 'integrated' | 'separate' | 'serverless' | 'baas';

/** Supported test frameworks */
export type TestFramework = 'vitest' | 'jest' | 'none';

/** Supported package managers */
export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/** Full project configuration resolved from user prompts */
export interface NexusConfig {
  /** Slug used for folder name & package.json name (e.g. "todo-list-app") */
  projectName: string;
  /** Human-readable project name for titles & headings (e.g. "Todo List App") */
  displayName: string;
  projectType: ProjectType;
  dataStrategy: DataStrategy;
  appPatterns: AppPattern[];
  frontendFramework: FrontendFramework;
  backendStrategy: BackendStrategy;
  backendFramework: BackendFramework;
  testFramework: TestFramework;
  packageManager: PackageManager;
  git: boolean;
  installDeps: boolean;
}

/** Partial config for incremental prompt building */
export type PartialNexusConfig = Partial<NexusConfig> & { projectName: string };

/** NEXUS manifest.json shape (written into generated projects) */
export interface NexusManifest {
  version: string;
  generatedAt: string;
  config: NexusConfig;
  cli: {
    version: string;
    name: string;
  };
}
