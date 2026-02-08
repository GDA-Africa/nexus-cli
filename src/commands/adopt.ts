/**
 * NEXUS CLI - Adopt Command
 *
 * The `nexus adopt [path]` command that adds NEXUS documentation and
 * AI configuration to an existing project — without touching source code.
 *
 * Also reachable via `nexus init --adopt` for convenience.
 *
 * Flow:
 *   1. Detect the project (package.json, framework, test runner, PM)
 *   2. Generate .nexus/docs/ (8 docs with `status: template` frontmatter)
 *   3. Generate .nexus/ai/  (AI agent master instructions)
 *   4. Write AI tool pointers (.cursorrules, AGENTS.md, etc.)
 *
 * AI agents will auto-populate the template docs on the user's next
 * interaction — reading the codebase and asking targeted questions.
 */

import path from 'node:path';

import { adoptProject } from '../generators/index.js';
import { logger } from '../utils/logger.js';
import { detectProject } from '../utils/project-detector.js';
import { version } from '../version.js';

/**
 * Handler for `nexus adopt [path]`.
 *
 * @param targetPath - Optional path to the project to adopt (defaults to cwd)
 * @param options    - Reserved for future flags (e.g. --force)
 */
export async function adoptCommand(
  targetPath?: string,
  _options: Record<string, unknown> = {},
): Promise<void> {
  logger.banner(version);

  const targetDir = targetPath
    ? path.resolve(process.cwd(), targetPath)
    : process.cwd();

  // Detect the existing project
  const projectInfo = await detectProject(targetDir);

  if (!projectInfo.detected) {
    logger.error('No existing project detected in this directory.');
    logger.newline();
    logger.info('The adopt command is for existing projects that already have a package.json.');
    logger.info('To create a brand-new project, run:');
    logger.newline();
    logger.nexus('  nexus init <project-name>');
    logger.newline();
    process.exit(1);
  }

  if (projectInfo.hasNexus) {
    logger.warn('This project already has a .nexus/ directory.');
    logger.info(
      'NEXUS documentation is already set up. Your AI agent will auto-populate template docs on next use.',
    );
    process.exit(0);
  }

  const displayName = projectInfo.name ?? path.basename(targetDir);
  const framework = projectInfo.framework ?? 'unknown';
  const testFw = projectInfo.testFramework ?? 'none';
  const pm = projectInfo.packageManager ?? 'npm';

  logger.nexus(`Adopting "${displayName}" into the NEXUS ecosystem...`);
  logger.newline();
  logger.info(`Detected framework: ${framework}`);
  logger.info(`Detected test framework: ${testFw}`);
  logger.info(`Detected package manager: ${pm}`);
  logger.newline();

  try {
    await adoptProject(targetDir, projectInfo);
    logger.adoptComplete(displayName);
  } catch (err) {
    logger.error('Failed to adopt project.');
    if (err instanceof Error) {
      logger.error(err.message);
    }
    process.exit(1);
  }
}
