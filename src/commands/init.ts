/**
 * NEXUS CLI - Init Command
 *
 * The main `nexus init [project-name]` command that runs the full scaffolding flow.
 *
 * Supports two modes:
 *   1. **New project** (default) — full interactive prompts → generate everything
 *   2. **Adopt** (`--adopt` flag) — delegates to `nexus adopt` logic
 *
 * If the user runs `nexus init` without `--adopt` but we detect an existing
 * project in the target directory, we show a helpful suggestion to use `nexus adopt`.
 */

import path from 'node:path';

import { generateProject } from '../generators/index.js';
import { runPrompts } from '../prompts/index.js';
import { logger } from '../utils/logger.js';
import { isExistingProject } from '../utils/project-detector.js';
import { validateProjectName, toSlug } from '../utils/validator.js';
import { version } from '../version.js';

import { adoptCommand } from './adopt.js';

/** Options passed from cli.ts */
export interface InitOptions {
  adopt?: boolean;
}

/**
 * Handler for the `nexus init` command.
 *
 * @param projectName - Optional project name from CLI argument
 * @param options     - Command options (e.g. --adopt)
 */
export async function initCommand(
  projectName?: string,
  options: InitOptions = {},
): Promise<void> {
  logger.banner(version);

  // ─── Adopt mode ────────────────────────────────────────────
  if (options.adopt) {
    await adoptCommand(projectName);
    return;
  }

  // ─── New project mode ──────────────────────────────────────

  // Validate project name early if provided
  if (projectName) {
    const validation = validateProjectName(projectName);
    if (!validation.valid) {
      logger.error(validation.message ?? 'Invalid project name.');
      process.exit(1);
    }

    // Check if the target directory is an existing project
    const slug = toSlug(projectName);
    const targetDir = path.resolve(process.cwd(), slug);
    if (isExistingProject(targetDir)) {
      showAdoptSuggestion(slug);
      process.exit(1);
    }
  }

  // Also check current directory for bare `nexus init` (no name)
  if (!projectName && isExistingProject(process.cwd())) {
    showAdoptSuggestion();
    process.exit(1);
  }

  try {
    // Run interactive prompts
    const config = await runPrompts(projectName);

    logger.newline();
    logger.nexus(`Creating "${config.displayName}" with ${config.frontendFramework}...`);
    logger.newline();

    // Generate the project
    await generateProject(config);
  } catch (err) {
    // Handle user cancellation (Ctrl+C)
    if (err instanceof Error && err.message.includes('User force closed')) {
      logger.newline();
      logger.warn('Setup cancelled.');
      process.exit(0);
    }

    logger.newline();
    logger.error('Something went wrong during project creation.');
    if (err instanceof Error) {
      logger.error(err.message);
    }
    process.exit(1);
  }
}

/* ──────────────────────────────────────────────────────────────
 * Suggestion message when user runs init in existing project
 * ────────────────────────────────────────────────────────────── */

function showAdoptSuggestion(projectName?: string): void {
  logger.warn('An existing project was detected in the target directory.');
  logger.newline();
  logger.info('It looks like you\'re trying to add NEXUS to an existing project.');
  logger.info('Use the `nexus adopt` command instead:');
  logger.newline();

  if (projectName) {
    logger.nexus(`  nexus adopt ${projectName}`);
  } else {
    logger.nexus('  nexus adopt');
  }

  logger.newline();
  logger.info('This will:');
  logger.info('  • Generate .nexus/docs/ with 8 structured documentation files');
  logger.info('  • Generate .nexus/ai/ with AI agent instructions');
  logger.info('  • Add AI tool config files (.cursorrules, AGENTS.md, etc.)');
  logger.info('  • NOT modify any of your existing source code');
  logger.newline();
  logger.info('Your AI agent will then auto-populate the docs from your codebase.');
}
