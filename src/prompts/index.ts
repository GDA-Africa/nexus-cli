/**
 * NEXUS CLI - Prompt Orchestrator
 *
 * Runs all prompts in order and assembles the final NexusConfig.
 */

import { input } from '@inquirer/prompts';

import type { NexusConfig } from '../types/config.js';
import { detectPackageManager } from '../utils/package-manager.js';
import { validateProjectName, toSlug, toDisplayName } from '../utils/validator.js';

import { promptDataStrategy } from './data-strategy.js';
import { promptFeatures } from './features.js';
import { promptFramework } from './frameworks.js';
import { promptPatterns } from './patterns.js';
import { promptProjectType } from './project-type.js';

/**
 * Run the full interactive prompt flow and return a complete NexusConfig.
 *
 * Users can enter free-text names like "Todo List App" — we derive the
 * slug ("todo-list-app") automatically for the folder & package.json name.
 *
 * @param initialName - Optional project name passed via CLI argument
 */
export async function runPrompts(initialName?: string): Promise<NexusConfig> {
  // 1. Project name (free-text)
  let rawName: string;
  if (!initialName) {
    rawName = await input({
      message: 'Project name:',
      default: 'My Nexus App',
      validate: (val: string) => {
        const result = validateProjectName(val);
        return result.valid ? true : (result.message ?? 'Invalid name');
      },
    });
  } else {
    const validation = validateProjectName(initialName);
    if (!validation.valid) {
      throw new Error(validation.message ?? 'Invalid project name.');
    }
    rawName = initialName;
  }

  const projectName = toSlug(rawName);
  const displayName = toDisplayName(rawName);

  // 2. Project type
  const projectType = await promptProjectType();

  // 3. Data strategy
  const dataStrategy = await promptDataStrategy();

  // 4. Application patterns
  const appPatterns = await promptPatterns();

  // 5. Framework
  const frontendFramework = await promptFramework(projectType);

  // 6. Features & extras
  const { testFramework, packageManager, git, installDeps } = await promptFeatures();

  // Assemble config
  const config: NexusConfig = {
    projectName,
    displayName,
    projectType,
    dataStrategy,
    appPatterns,
    frontendFramework,
    backendStrategy: projectType === 'api' ? 'separate' : 'integrated',
    backendFramework: projectType === 'api' ? 'express' : 'none',
    testFramework,
    packageManager: packageManager ?? detectPackageManager(),
    git,
    installDeps,
  };

  return config;
}
