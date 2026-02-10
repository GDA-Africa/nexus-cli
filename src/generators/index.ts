/**
 * NEXUS CLI - Generator Orchestrator
 *
 * Coordinates all generators to produce a complete project.
 * Also provides `adoptProject()` for adding .nexus/ to existing projects.
 */

import path from 'node:path';

import { execa } from 'execa';
import ora from 'ora';

import type { AdoptionContext } from '../prompts/adoption.js';
import type { NexusConfig } from '../types/config.js';
import { DEFAULT_PERSONA } from '../types/config.js';
import type { GeneratedFile, GeneratedDirectory } from '../types/templates.js';
import { logger, writeGeneratorResult, readFile, fileExists, writeFile, ensureDirectory, getInstallCommand, gitInit, toDisplayName } from '../utils/index.js';
import type { ProjectInfo } from '../utils/project-detector.js';

import { generateAiConfig } from './ai-config.js';
import { generateCiCd } from './ci-cd.js';
import { generateConfigs } from './config.js';
import { generateDocs } from './docs.js';
import { generateLandingPage } from './landing-page.js';
import { generateSpringBootFiles } from './spring-boot.js';
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
      ...generateDocs(config, config.localOnly ?? false),
      ...generateConfigs(config),
      ...generateTests(config),
      ...generateCiCd(config),
      ...generateLandingPage(config),
      ...generateAiConfig(config),
    ];

    // Add Spring Boot files if backend is Spring Boot
    if (config.backendFramework === 'spring-boot') {
      files.push(...generateSpringBootFiles(config));
    }

    // Write everything to disk
    await writeGeneratorResult(projectRoot, files, directories);
    
    // If local-only mode, add .nexus/ to .gitignore
    if (config.localOnly) {
      await appendToGitignore(projectRoot);
      spinner.text = 'NEXUS configured as local-only (not tracked by git)';
    }
    
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
    logger.complete(config.projectName, config.displayName);
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
  adoptionContext: AdoptionContext,
): Promise<void> {
  const spinner = ora('Generating NEXUS documentation & AI config...').start();

  try {
    // Build a minimal NexusConfig from detected project info + user interview
    const config = buildAdoptConfig(targetDir, projectInfo, adoptionContext);

    // Directories to create
    const directories: GeneratedDirectory[] = [
      { path: '.nexus' },
      { path: '.nexus/docs' },
      { path: '.nexus/ai' },
      { path: '.github' },
    ];

    // Files to generate — docs + AI config only
    // Pass adoption context to docs generator for pre-filling
    const files: GeneratedFile[] = [
      ...generateDocs(config, adoptionContext.localOnly, adoptionContext),
      ...generateAiConfig(config),
    ];

    // If local-only mode, add .nexus/ to .gitignore
    if (adoptionContext.localOnly) {
      await appendToGitignore(targetDir);
      spinner.text = 'NEXUS configured as local-only (not tracked by git)';
    }

    // Write to disk
    await writeGeneratorResult(targetDir, files, directories);
    spinner.succeed('NEXUS documentation & AI config generated.');
  } catch (err) {
    spinner.fail('Adopt failed.');
    throw err;
  }
}

/* ──────────────────────────────────────────────────────────────
 * Upgrade & Repair — regenerate .nexus/ while preserving knowledge
 *
 * Two modes share the same core logic:
 *
 *   UPGRADE — Replace scaffolding files with latest CLI templates.
 *             Populate missing files. Preserve populated docs and
 *             knowledge. Used when the CLI version has changed.
 *
 *   REPAIR  — Restore missing or corrupted files only. Do NOT
 *             touch files that are structurally valid — even if
 *             they're old templates. Used to fix a broken .nexus/
 *             without changing template versions.
 *
 * File strategy per mode:
 *
 *   File category      | UPGRADE         | REPAIR
 *   ───────────────────┼─────────────────┼────────────────
 *   ALWAYS_REPLACE     | Replace         | Only if missing/corrupt
 *   ALWAYS_PRESERVE    | Preserve        | Only if missing/corrupt
 *   SMART (docs)       | Replace if      | Only if missing/corrupt
 *                      | status:template |
 * ────────────────────────────────────────────────────────────── */

/** Reconcile mode: upgrade replaces scaffolding; repair only fixes broken files */
export type ReconcileMode = 'upgrade' | 'repair';

/** Files that are ALWAYS safe to replace during upgrade (generated scaffolding) */
const ALWAYS_REPLACE: ReadonlySet<string> = new Set([
  '.nexus/ai/instructions.md',
  '.nexus/index.md',
  '.nexus/manifest.json',
  '.cursorrules',
  '.windsurfrules',
  '.clinerules',
  'AGENTS.md',
  '.github/copilot-instructions.md',
]);

/** Files that must NEVER be overwritten during upgrade (accumulated knowledge) */
const ALWAYS_PRESERVE: ReadonlySet<string> = new Set([
  '.nexus/docs/knowledge.md',
]);

/**
 * Determine whether an existing file has been populated by a user or agent.
 * Checks YAML frontmatter for `status: populated`.
 */
export function isPopulated(content: string): boolean {
  return /^---[\s\S]*?status:\s*populated[\s\S]*?---/m.test(content);
}

/**
 * Determine whether a NEXUS file is structurally corrupted.
 *
 * A file is considered corrupted if:
 *   - It's empty or only whitespace
 *   - It's a .nexus/docs/ file that should have YAML frontmatter but doesn't
 *   - It's a JSON file that doesn't parse
 */
export function isCorrupted(filePath: string, content: string): boolean {
  // Empty or whitespace-only
  if (content.trim().length === 0) return true;

  // JSON files must parse
  if (filePath.endsWith('.json')) {
    try {
      JSON.parse(content);
      return false;
    } catch {
      return true;
    }
  }

  // .nexus/docs/ markdown files should have YAML frontmatter (except knowledge.md)
  if (filePath.startsWith('.nexus/docs/') && !filePath.endsWith('knowledge.md')) {
    if (!content.startsWith('---')) return true;
    // Frontmatter must close
    const secondDashes = content.indexOf('---', 3);
    if (secondDashes === -1) return true;
  }

  return false;
}

/**
 * Core reconcile logic shared by upgrade and repair.
 *
 * @param targetDir - Absolute path to the project root
 * @param config    - The NexusConfig (from manifest)
 * @param mode      - 'upgrade' (replace scaffolding + fix) or 'repair' (fix only)
 * @returns Summary of what was replaced, preserved, created, and repaired
 */
export async function reconcileNexusFiles(
  targetDir: string,
  config: NexusConfig,
  mode: ReconcileMode,
): Promise<ReconcileResult> {
  // Ensure directories exist
  const directories: GeneratedDirectory[] = [
    { path: '.nexus' },
    { path: '.nexus/docs' },
    { path: '.nexus/ai' },
    { path: '.github' },
  ];

  for (const dir of directories) {
    await ensureDirectory(path.join(targetDir, dir.path));
  }

  // Generate all files with fresh templates
  const freshFiles: GeneratedFile[] = [
    ...generateDocs(config),
    ...generateAiConfig(config),
  ];

  const result: ReconcileResult = {
    replaced: [],
    preserved: [],
    created: [],
    repaired: [],
  };

  for (const file of freshFiles) {
    const fullPath = path.join(targetDir, file.path);
    const exists = await fileExists(fullPath);

    // ── Missing file → always create ──
    if (!exists) {
      await writeFile(fullPath, file.content);
      result.created.push(file.path);
      continue;
    }

    // ── File exists — read it ──
    const existingContent = await readFile(fullPath);
    const content = existingContent ?? '';
    const corrupted = isCorrupted(file.path, content);

    // ── Corrupted → always repair (both modes) ──
    if (corrupted) {
      await writeFile(fullPath, file.content);
      result.repaired.push(file.path);
      continue;
    }

    // ── From here: file exists and is structurally valid ──

    if (mode === 'repair') {
      // Repair mode: valid files are left untouched
      result.preserved.push(file.path);
      continue;
    }

    // ── Upgrade mode: apply the upgrade strategy ──

    if (ALWAYS_REPLACE.has(file.path)) {
      await writeFile(fullPath, file.content);
      result.replaced.push(file.path);
      continue;
    }

    if (ALWAYS_PRESERVE.has(file.path)) {
      result.preserved.push(file.path);
      continue;
    }

    // Smart check for docs with frontmatter
    if (isPopulated(content)) {
      result.preserved.push(file.path);
    } else {
      await writeFile(fullPath, file.content);
      result.replaced.push(file.path);
    }
  }

  return result;
}

/** Result summary from a reconcile (upgrade or repair) operation */
export interface ReconcileResult {
  /** Files that were overwritten with latest templates (upgrade only) */
  replaced: string[];
  /** Files that were preserved (populated docs, knowledge base, valid files in repair) */
  preserved: string[];
  /** New files that didn't exist before */
  created: string[];
  /** Files that were corrupted and restored */
  repaired: string[];
}

/**
 * Upgrade the NEXUS ecosystem — replace scaffolding with latest + fix broken.
 */
export async function upgradeProject(
  targetDir: string,
  config: NexusConfig,
): Promise<ReconcileResult> {
  return reconcileNexusFiles(targetDir, config, 'upgrade');
}

/**
 * Repair the NEXUS ecosystem — fix missing/corrupted files only.
 */
export async function repairProject(
  targetDir: string,
  config: NexusConfig,
): Promise<ReconcileResult> {
  return reconcileNexusFiles(targetDir, config, 'repair');
}

/**
 * Build a NexusConfig from detected ProjectInfo + user interview.
 *
 * Maps detected values to the closest NexusConfig equivalents,
 * using sensible defaults for anything not detected.
 */
function buildAdoptConfig(
  targetDir: string,
  info: ProjectInfo,
  _adoptionContext: AdoptionContext,
): NexusConfig {
  const slug = info.name ?? path.basename(targetDir);
  return {
    projectName: slug,
    displayName: toDisplayName(slug),
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
    persona: DEFAULT_PERSONA,
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

/**
 * Append `.nexus/` to .gitignore (for local-only mode).
 *
 * If .gitignore doesn't exist, create it. If it exists, append only if not already present.
 */
async function appendToGitignore(targetDir: string): Promise<void> {
  const gitignorePath = path.join(targetDir, '.gitignore');
  const entry = '\n# NEXUS (local-only mode)\n.nexus/\n';

  if (await fileExists(gitignorePath)) {
    const content = await readFile(gitignorePath);
    if (!content) {
      await writeFile(gitignorePath, entry.trim() + '\n');
      return;
    }
    if (content.includes('.nexus/')) {
      // Already gitignored
      return;
    }
    await writeFile(gitignorePath, content + entry);
  } else {
    await writeFile(gitignorePath, entry.trim() + '\n');
  }
}
