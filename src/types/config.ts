/**
 * NEXUS CLI - Type Definitions: Configuration
 *
 * Core configuration types used throughout the CLI.
 */

/** Supported project types */
export type ProjectType = 'web' | 'api' | 'monorepo' | 'mobile' | 'desktop' | 'ui-library';

/** Data strategy options */
export type DataStrategy = 'local-only' | 'local-first' | 'cloud-first' | 'hybrid';

/** Application pattern flags */
export type AppPattern = 'pwa' | 'offline-first' | 'theming' | 'white-label' | 'i18n' | 'real-time';

/** Supported frontend frameworks */
export type FrontendFramework = 'nextjs' | 'react-vite' | 'sveltekit' | 'nuxt' | 'remix' | 'astro';

/** Supported backend frameworks */
export type BackendFramework = 'express' | 'fastify' | 'nestjs' | 'spring-boot' | 'none';

/** Backend strategy options */
export type BackendStrategy = 'integrated' | 'separate' | 'serverless' | 'baas';

/** Supported test frameworks */
export type TestFramework = 'vitest' | 'jest' | 'none';

/** Supported package managers */
export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/** Agent communication tone */
export type AgentTone = 'professional' | 'friendly' | 'witty' | 'zen' | 'pirate';

/** Agent communication style */
export type AgentVerbosity = 'concise' | 'balanced' | 'detailed';

/**
 * NEXUS Persona — configures how AI agents communicate with the user.
 *
 * When an AI agent reads the NEXUS instructions, it adopts this persona
 * so the user knows the agent is "synced with the NEXUS brain."
 * The agent refers to itself by the chosen identity name and speaks in the chosen tone.
 */
export interface NexusPersona {
  /** How the agent speaks — sets the overall vibe */
  tone: AgentTone;
  /** How much detail the agent provides in responses */
  verbosity: AgentVerbosity;
  /** The name the agent uses to refer to itself. Default: "Nexus". Empty string = no custom name. */
  identity: string;
  /** Optional custom directive — freeform personality instruction */
  customDirective: string;
}

/** Default persona — friendly, balanced, identifies as Nexus */
export const DEFAULT_PERSONA: NexusPersona = {
  tone: 'friendly',
  verbosity: 'balanced',
  identity: 'Nexus',
  customDirective: '',
};

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
  /** AI agent personality — how agents communicate when synced with the NEXUS brain */
  persona: NexusPersona;
  /** Whether .nexus/ should be gitignored (local-only mode) */
  localOnly?: boolean;
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
  /** Whether .nexus/ is gitignored (local-only mode) */
  localOnly?: boolean;
}
