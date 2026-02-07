/**
 * NEXUS CLI - Type Definitions: Prompts
 *
 * Types for the interactive prompt system.
 */

import type {
  AppPattern,
  BackendFramework,
  BackendStrategy,
  DataStrategy,
  FrontendFramework,
  PackageManager,
  ProjectType,
  TestFramework,
} from './config.js';

/** Answers from project-type prompt */
export interface ProjectTypeAnswers {
  projectType: ProjectType;
}

/** Answers from data-strategy prompt */
export interface DataStrategyAnswers {
  dataStrategy: DataStrategy;
}

/** Answers from patterns prompt */
export interface PatternsAnswers {
  appPatterns: AppPattern[];
}

/** Answers from framework prompt */
export interface FrameworkAnswers {
  frontendFramework: FrontendFramework;
}

/** Answers from backend prompt */
export interface BackendAnswers {
  backendStrategy: BackendStrategy;
  backendFramework: BackendFramework;
}

/** Answers from features/extras prompt */
export interface FeaturesAnswers {
  testFramework: TestFramework;
  packageManager: PackageManager;
  git: boolean;
  installDeps: boolean;
}

/** All prompt answers combined */
export type AllPromptAnswers = ProjectTypeAnswers &
  DataStrategyAnswers &
  PatternsAnswers &
  FrameworkAnswers &
  BackendAnswers &
  FeaturesAnswers & {
    projectName: string;
  };
