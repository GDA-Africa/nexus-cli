/**
 * NEXUS CLI - Generator Orchestrator
 *
 * Coordinates all generators to produce a complete project.
 * Also provides `adoptProject()` for adding .nexus/ to existing projects.
 */

import path from 'node:path';

import { execa } from 'execa';
import ora from 'ora';

import type { NexusConfig } from '../types/config.js';
import type { GeneratedFile, GeneratedDirectory } from '../types/templates.js';
import { logger, writeGeneratorResult, getInstallCommand, gitInit } from '../utils/index.js';
import type { ProjectInfo } from '../utils/project-detector.js';

import { generateAiConfig } from './ai-config.js';
import { generateCiCd } from './ci-cd.js';
import { generateConfigs } from './config.js';
import { generateDocs } from './docs.js';
import { generateLandingPage } from './landing-page.js';
import {
  generateDirectories,
  generatePackageJson,
  generateGitignore,
  generateReadme,
} from './structure.js';
import { generateTests } from './tests.js';

/**
 * Run all generators and write the project to disk.
 */
export async function generateProject(config: NexusConfig): Promise<void> {
  const projectRoot = path.resolve(process.cwd(), config.projectName);

  const spinner = ora('Generating project structure...').start();

  try {
    // Collect all directories and files
    const directories: GeneratedDirectory[] = generateDirectories(config);

    const files: GeneratedFile[] = [
      generatePackageJson(config),
      generateGitignore(),
      generateReadme(config),
      ...generateDocs(config),
      ...generateConfigs(config),
      ...generateTests(config),
      ...generateCiCd(config),
      ...generateLandingPage(config),
      ...generateAiConfig(config),
    ];

    // Write everything to disk
    await writeGeneratorResult(projectRoot, files, directories);
    spinner.succeed('Project structure generated.');

    // Install dependencies
    if (config.installDeps) {
      const installCmd = getInstallCommand(config.packageManager);
      const installSpinner = ora(`Installing dependencies with ${config.packageManager}...`).start();

      try {
        const [cmd, ...args] = installCmd.split(' ');
        await execa(cmd, args, { cwd: projectRoot });
        installSpinner.succeed('Dependencies installed.');
      } catch {
        installSpinner.warn('Dependency installation failed. Run it manually.');
      }
    }

    // Initialize git
    if (config.git) {
      const gitSpinner = ora('Initializing git repository...').start();
      const success = await gitInit(projectRoot);
      if (success) {
        gitSpinner.succeed('Git repository initialized.');
      } else {
        gitSpinner.warn('Git initialization skipped.');
      }
    }

    // Done!
    logger.complete(config.projectName);
  } catch (err) {
    spinner.fail('Project generation failed.');
    throw err;
  }
}

/* ──────────────────────────────────────────────────────────────
 * Adopt mode — add .nexus/ to an existing project
 * ────────────────────────────────────────────────────────────── */

/**
 * Add NEXUS documentation and AI config to an existing project.
 *
 * This generates only:
 *   - .nexus/docs/ (8 documentation files + index + manifest)
 *   - .nexus/ai/   (AI agent instructions)
 *   - Root AI pointer files (.cursorrules, AGENTS.md, etc.)
 *
 * It does NOT scaffold source code, configs, tests, or landing pages.
 */
export async function adoptProject(
  targetDir: string,
  projectInfo: ProjectInfo,
): Promise<void> {
  const spinner = ora('Generating NEXUS documentation & AI config...').start();

  try {
    // Build a minimal NexusConfig from detected project info
    const config = buildAdoptConfig(targetDir, projectInfo);

    // Directories to create
    const directories: GeneratedDirectory[] = [
      { path: '.nexus' },
      { path: '.nexus/docs' },
      { path: '.nexus/ai' },
      { path: '.github' },
    ];

    // Files to generate — docs + AI config only
    const files: GeneratedFile[] = [
      ...generateDocs(config),
      ...generateAiConfig(config),
    ];

    // Write to disk
    await writeGeneratorResult(targetDir, files, directories);
    spinner.succeed('NEXUS documentation & AI config generated.');
  } catch (err) {
    spinner.fail('Adopt failed.');
    throw err;
  }
}

/**
 * Build a NexusConfig from detected ProjectInfo.
 *
 * Maps detected values to the closest NexusConfig equivalents,
 * using sensible defaults for anything not detected.
 */
function buildAdoptConfig(
  targetDir: string,
  info: ProjectInfo,
): NexusConfig {
  return {
    projectName: info.name ?? path.basename(targetDir),
    projectType: 'web',
    dataStrategy: 'cloud-first',
    appPatterns: [],
    frontendFramework: mapFramework(info.framework),
    backendStrategy: 'integrated',
    backendFramework: 'none',
    testFramework: mapTestFramework(info.testFramework),
    packageManager: mapPackageManager(info.packageManager),
    git: true,
    installDeps: false,
  };
}

function mapFramework(detected: string | null): NexusConfig['frontendFramework'] {
  const valid = ['nextjs', 'react-vite', 'sveltekit', 'nuxt', 'remix', 'astro'] as const;
  type FW = (typeof valid)[number];
  if (detected && (valid as readonly string[]).includes(detected)) {
    return detected as FW;
  }
  return 'nextjs'; // safe default
}

function mapTestFramework(detected: string | null): NexusConfig['testFramework'] {
  if (detected === 'vitest') return 'vitest';
  if (detected === 'jest') return 'jest';
  return 'vitest'; // default
}

function mapPackageManager(detected: string | null): NexusConfig['packageManager'] {
  if (detected === 'yarn') return 'yarn';
  if (detected === 'pnpm') return 'pnpm';
  return 'npm';
}
