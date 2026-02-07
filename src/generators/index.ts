/**
 * NEXUS CLI - Generator Orchestrator
 *
 * Coordinates all generators to produce a complete project.
 */

import path from 'node:path';

import { execa } from 'execa';
import ora from 'ora';

import type { NexusConfig } from '../types/config.js';
import type { GeneratedFile, GeneratedDirectory } from '../types/templates.js';
import { logger, writeGeneratorResult, getInstallCommand, gitInit } from '../utils/index.js';

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
