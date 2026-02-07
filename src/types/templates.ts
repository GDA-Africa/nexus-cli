/**
 * NEXUS CLI - Type Definitions: Templates
 *
 * Types for the template engine and generators.
 */

import type { NexusConfig } from './config.js';

/** A single file to write during generation */
export interface GeneratedFile {
  /** Relative path from project root (e.g. "src/app/page.tsx") */
  path: string;
  /** File content (already rendered if templated) */
  content: string;
}

/** A directory to create during generation */
export interface GeneratedDirectory {
  /** Relative path from project root */
  path: string;
}

/** Result of a generator run */
export interface GeneratorResult {
  files: GeneratedFile[];
  directories: GeneratedDirectory[];
}

/** Template context passed to Mustache templates */
export interface TemplateContext {
  projectName: string;
  config: NexusConfig;
  year: number;
  date: string;
}

/** Template metadata stored alongside template files */
export interface TemplateManifest {
  name: string;
  description: string;
  framework: string;
  files: string[];
}
