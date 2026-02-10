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
import { promptAdoption } from '../prompts/adoption.js';
import { logger } from '../utils/logger.js';
import { detectProject } from '../utils/project-detector.js';
import { version } from '../version.js';

/**
 * Handler for `nexus adopt [path]`.
 *
 * @param targetPath - Optional path to the project to adopt (defaults to cwd)
 * @param options    - Command options (--force to skip project detection)
 */
export async function adoptCommand(
  targetPath?: string,
  options: { force?: boolean } = {},
): Promise<void> {
  logger.banner(version);

  const targetDir = targetPath
    ? path.resolve(process.cwd(), targetPath)
    : process.cwd();

  // Detect the existing project (skip if --force)
  const projectInfo = options.force
    ? {
        detected: true,
        signals: {
          hasPackageJson: false,
          hasGit: false,
          hasSrc: false,
          hasTsConfig: false,
          hasNodeModules: false,
          hasGoMod: false,
          hasCargoToml: false,
          hasPyProjectToml: false,
          hasFirebaseJson: false,
          hasPomXml: false,
          hasBuildGradle: false,
          isInsideMonorepo: false,
          monorepoRoot: null,
        },
        name: null,
        description: null,
        framework: null,
        testFramework: null,
        packageManager: null,
        hasNexus: false,
        dependencies: [],
      }
    : await detectProject(targetDir);

  if (!projectInfo.detected && !options.force) {
    logger.error('No existing project detected in this directory.');
    logger.newline();
    logger.info('NEXUS adopt works with:');
    logger.info('  • Node.js projects (package.json)');
    logger.info('  • Spring Boot projects (pom.xml, build.gradle)');
    logger.info('  • Cloud Functions (firebase.json)');
    logger.info('  • Go projects (go.mod)');
    logger.info('  • Rust projects (Cargo.toml)');
    logger.info('  • Python projects (pyproject.toml)');
    logger.info('  • Monorepos (workspace structure)');
    logger.newline();
    logger.info('To force adoption of any directory:');
    logger.nexus('  nexus adopt --force');
    logger.newline();
    logger.info('To create a brand-new project:');
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

  // Run pre-adoption interview
  const adoptionContext = await promptAdoption(projectInfo);

  try {
    await adoptProject(targetDir, projectInfo, adoptionContext);
    logger.adoptComplete(displayName);
  } catch (err) {
    logger.error('Failed to adopt project.');
    if (err instanceof Error) {
      logger.error(err.message);
    }
    process.exit(1);
  }
}
