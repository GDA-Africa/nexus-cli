/**
 * NEXUS CLI - Init Command
 *
 * The main `nexus init [project-name]` command that runs the full scaffolding flow.
 */

import { generateProject } from '../generators/index.js';
import { runPrompts } from '../prompts/index.js';
import { logger } from '../utils/logger.js';
import { validateProjectName } from '../utils/validator.js';
import { version } from '../version.js';

/**
 * Handler for the `nexus init` command.
 *
 * @param projectName - Optional project name from CLI argument
 */
export async function initCommand(projectName?: string): Promise<void> {
  logger.banner(version);

  // Validate project name early if provided
  if (projectName) {
    const validation = validateProjectName(projectName);
    if (!validation.valid) {
      logger.error(validation.message ?? 'Invalid project name.');
      process.exit(1);
    }
  }

  try {
    // Run interactive prompts
    const config = await runPrompts(projectName);

    logger.newline();
    logger.nexus(`Creating "${config.projectName}" with ${config.frontendFramework}...`);
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
