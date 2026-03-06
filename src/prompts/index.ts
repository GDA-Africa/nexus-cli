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
import { promptFramework, promptBackendFramework } from './frameworks.js';
import { promptPatterns } from './patterns.js';
import { promptPersona } from './persona.js';
import { promptProjectType } from './project-type.js';
import { promptSkillConfig } from './skill-config.js';

/**
 * Run the full interactive prompt flow and return a complete NexusConfig.
 *
 * Users can enter free-text names like "Todo List App" — we derive the
 * slug ("todo-list-app") automatically for the folder & package.json name.
 *
 * @param initialName - Optional project name passed via CLI argument
 * @param localOnly - Optional flag to set local-only mode (skip prompt)
 */
export async function runPrompts(initialName?: string, localOnly?: boolean): Promise<NexusConfig> {
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

  // 3. Data strategy (skip for ui-library)
  const dataStrategy = projectType === 'ui-library' ? 'local-only' : await promptDataStrategy();

  // 4. Application patterns (skip for ui-library and api)
  const appPatterns = (projectType === 'ui-library' || projectType === 'api') 
    ? [] 
    : await promptPatterns();

  // 5. Framework
  const frontendFramework = await promptFramework(projectType);

  // 5b. Backend framework (only for API projects)
  const backendFramework = projectType === 'api' 
    ? await promptBackendFramework() 
    : 'none';

  // 6. Features & extras
  const { testFramework, packageManager, git, installDeps } = await promptFeatures();

  // 7. AI agent persona
  const persona = await promptPersona();

  // 8. Skills system
  const frameworkLabel = getFrameworkLabel(frontendFramework);
  const { enableSkills } = await promptSkillConfig(frameworkLabel);

  // Assemble config
  const config: NexusConfig = {
    projectName,
    displayName,
    projectType,
    dataStrategy,
    appPatterns,
    frontendFramework,
    backendStrategy: projectType === 'api' ? 'separate' : 'integrated',
    backendFramework,
    testFramework,
    packageManager: packageManager ?? detectPackageManager(),
    git,
    installDeps,
    persona,
    localOnly,
    enableSkills,
  };

  return config;
}

function getFrameworkLabel(framework: NexusConfig['frontendFramework']): string {
  const labels: Record<string, string> = {
    nextjs: 'Next.js',
    'react-vite': 'React + Vite',
    sveltekit: 'SvelteKit',
    nuxt: 'Nuxt 3',
    astro: 'Astro',
    remix: 'Remix',
    none: 'shared',
  };
  return labels[framework] ?? framework;
}
