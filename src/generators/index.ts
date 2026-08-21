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

import { generateAgents } from './agents.js';
import { generateAiConfig } from './ai-config.js';
import { generateCiCd } from './ci-cd.js';
import { generateConfigs } from './config.js';
import { generateDocs } from './docs.js';
import { generateLandingPage } from './landing-page.js';
import { generateSkills } from './skills.js';
import { generateSpringBootFiles } from './spring-boot.js';
import {
  generateDirectories,
  generatePackageJson,
  generateGitignore,
  generateReadme,
} from './structure.js';
import { generateTests } from './tests.js';
import {
  filterChameleonOwned,
  finishUiDelegation,
  prepareUiDelegation,
  preserveChameleonBlocks,
  runPreWriteDelegation,
} from './ui-delegation.js';

/**
 * Run all generators and write the project to disk.
 */
export async function generateProject(config: NexusConfig): Promise<void> {
  const projectRoot = path.resolve(process.cwd(), config.projectName);

  // ─── UI delegation, phase 1: decide before anything is written ───
  // `chameleon new` refuses a non-empty directory, so the generator has to run
  // first and NEXUS overlays afterwards. A `none` provider, a missing
  // Chameleon, or an unsupported target all resolve to "NEXUS generates it".
  let delegation = await prepareUiDelegation(config, projectRoot);
  delegation = await runPreWriteDelegation(delegation, config, projectRoot);

  const spinner = ora('Generating project structure...').start();

  try {
    // Collect all directories and files
    const directories: GeneratedDirectory[] = generateDirectories(config);

    let files: GeneratedFile[] = [
      generatePackageJson(config),
      generateGitignore(),
      generateReadme(config),
      ...generateDocs(config, config.localOnly ?? false),
      ...generateConfigs(config),
      ...generateTests(config),
      ...generateCiCd(config),
      ...generateLandingPage(config),
      ...generateAiConfig(config),
      ...generateSkills(config),
      ...generateAgents(config),
    ];

    // Add Spring Boot files if backend is Spring Boot
    if (config.backendFramework === 'spring-boot') {
      files.push(...generateSpringBootFiles(config));
    }

    // Stand back from the files Chameleon owns (app shell, bundler config,
    // its package.json) — NEXUS overlays around them rather than over them.
    const filtered = filterChameleonOwned(files, delegation);
    files = filtered.files;
    delegation = filtered.state;

    // Write everything to disk
    await writeGeneratorResult(projectRoot, files, directories);

    // If local-only mode, add .nexus/ to .gitignore
    if (config.localOnly) {
      await appendToGitignore(projectRoot);
      spinner.text = 'NEXUS configured as local-only (not tracked by git)';
    }
    
    spinner.succeed('Project structure generated.');

    // ─── UI delegation, phase 3: post-write work ───
    // Path B's `chameleon init`, the package.json merge that gives the
    // generated app a linter and test runner, Chameleon's agent block, and the
    // evidence record.
    delegation = await finishUiDelegation(delegation, config, projectRoot);

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
      { path: '.nexus/plans' },
      { path: '.nexus/state' },
      { path: '.nexus/skills' },
      { path: '.nexus/skills/core' },
      { path: '.nexus/skills/custom' },
      { path: '.nexus/skills/community' },
      { path: '.github' },
    ];

    // Files to generate — docs + AI config + skills
    // Pass adoption context to docs generator for pre-filling
    const files: GeneratedFile[] = [
      ...generateDocs(config, adoptionContext.localOnly, adoptionContext),
      ...generateAiConfig(config),
      ...generateSkills(config),
      ...generateAgents(config),
    ];

    // If local-only mode, add .nexus/ to .gitignore
    if (adoptionContext.localOnly) {
      await appendToGitignore(targetDir);
      spinner.text = 'NEXUS configured as local-only (not tracked by git)';
    }

    // Write to disk. `generateAiConfig` produces CLAUDE.md / AGENTS.md /
    // .cursorrules, so adopting into a project that already runs Chameleon
    // would otherwise delete the block `chameleon agents init` put there —
    // the same hazard `reconcileNexusFiles` guards for upgrade and repair.
    await preserveChameleonBlocks(targetDir, async () => {
      await writeGeneratorResult(targetDir, files, directories);
    });
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
  'CLAUDE.md',
  'AGENTS.md',
  '.github/copilot-instructions.md',
]);

/** Files that must NEVER be overwritten during upgrade (accumulated knowledge) */
const ALWAYS_PRESERVE: ReadonlySet<string> = new Set([
  '.nexus/docs/knowledge.md',
]);

/**
 * The leading YAML frontmatter block, and nothing else.
 *
 * Anchored to the start of the string with NO `m` flag — that combination is
 * the whole point. With `m`, `^---` matches at the start of any line, so a
 * markdown horizontal rule opens what the regex treats as frontmatter and the
 * scan runs over the entire document body.
 */
const LEADING_FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * The `status` value declared in a file's leading frontmatter, or `null` when
 * the file has no frontmatter, no `status` field, or an unterminated block.
 *
 * The inner `m` flag is safe and necessary: it scans only the captured
 * frontmatter block, never the document body. `^status:` anchors to a line
 * start so `doc_status:` cannot match, and the value is captured whole so
 * `templated` cannot pass as `template`.
 */
function frontmatterStatus(content: string): string | null {
  const block = content.match(LEADING_FRONTMATTER)?.[1];
  if (block === undefined) return null;

  return block.match(/^status:[ \t]*["']?([A-Za-z][\w-]*)["']?[ \t]*$/m)?.[1] ?? null;
}

/**
 * Determine whether an existing file has been populated by a user or agent.
 * Reads `status` from the leading frontmatter block only.
 */
export function isPopulated(content: string): boolean {
  return frontmatterStatus(content) === 'populated';
}

/**
 * Determine whether a file is still in its scaffolded template state.
 * ONLY an explicit `status: template` in the leading frontmatter qualifies.
 *
 * This is the replace gate for the smart file strategy. Everything else —
 * `status: populated`, frontmatter without a status, or NO frontmatter at
 * all (hand-written brains) — is treated as user content and preserved.
 *
 * History, two incidents:
 *
 *   - Before v1.0.0 the gate was inverted (`!isPopulated`), which destroyed
 *     hand-written, frontmatter-less brain docs on upgrade (2026-06-11).
 *   - Through v1.2.0 both predicates used
 *     `/^---[\s\S]*?status:\s*"?template"?[\s\S]*?---/m`. The `m` flag let
 *     `^---` match any horizontal rule, so ANY document containing a `---`
 *     rule plus the words `status: template` somewhere in its prose was
 *     classified as a template and overwritten — including documents whose
 *     own frontmatter said `populated`, which could report `true` from both
 *     predicates at once. This destroyed `nexus-cli/.nexus/docs/index.md` on
 *     2026-08-10.
 *
 * Preserve-by-default is the contract. When in doubt, do not overwrite.
 */
export function isTemplate(content: string): boolean {
  return frontmatterStatus(content) === 'template';
}

/**
 * Determine whether a NEXUS file is structurally corrupted.
 *
 * A file is considered corrupted ONLY if:
 *   - It's empty or only whitespace
 *   - It's a JSON file that doesn't parse
 *   - It OPENS a YAML frontmatter block that never closes
 *
 * Missing frontmatter is NOT corruption — hand-written brain docs
 * legitimately have none, and "repairing" them destroys user work.
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

  // A frontmatter block that opens but never closes is broken markdown
  if (content.startsWith('---')) {
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
  // `CLAUDE.md` and `AGENTS.md` are in ALWAYS_REPLACE, so regeneration would
  // silently delete the block `chameleon agents init` splices into them.
  // Capture it first, put it back after — NEXUS owns the file, Chameleon owns
  // its section.
  return preserveChameleonBlocks(targetDir, () => reconcileFiles(targetDir, config, mode));
}

async function reconcileFiles(
  targetDir: string,
  config: NexusConfig,
  mode: ReconcileMode,
): Promise<ReconcileResult> {
  // Ensure directories exist
  const directories: GeneratedDirectory[] = [
    { path: '.nexus' },
    { path: '.nexus/docs' },
    { path: '.nexus/ai' },
    { path: '.nexus/plans' },
    { path: '.nexus/state' },
    { path: '.nexus/skills' },
    { path: '.nexus/skills/core' },
    { path: '.nexus/skills/custom' },
    { path: '.nexus/skills/community' },
    { path: '.nexus/agents' },
    { path: '.nexus/agents/core' },
    { path: '.nexus/agents/custom' },
    { path: '.nexus/agents/community' },
    { path: '.claude' },
    { path: '.claude/agents' },
    { path: '.github' },
  ];

  for (const dir of directories) {
    await ensureDirectory(path.join(targetDir, dir.path));
  }

  // Generate all files with fresh templates
  const freshFiles: GeneratedFile[] = [
    ...generateDocs(config),
    ...generateAiConfig(config),
    ...generateSkills(config),
    ...generateAgents(config),
  ];

  const result: ReconcileResult = {
    replaced: [],
    preserved: [],
    created: [],
    repaired: [],
  };

  // One backup folder per reconcile run: .nexus/state/upgrade-backup/<stamp>/
  const backupStamp = new Date().toISOString().replace(/[:.]/g, '-');

  for (const file of freshFiles) {
    const fullPath = path.join(targetDir, file.path);
    const exists = await fileExists(fullPath);

    // ── Skills & Agents: custom/ is SACRED — never read, never written, never deleted ──
    if (file.path.startsWith('.nexus/skills/custom/') || file.path.startsWith('.nexus/agents/custom/')) {
      // Only create if it doesn't exist yet (first init)
      if (!exists) {
        await writeFile(fullPath, file.content);
        result.created.push(file.path);
      } else {
        result.preserved.push(file.path);
      }
      continue;
    }

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

    // ── Corrupted → always repair (both modes) — except custom/ skills ──
    if (corrupted) {
      await backupBeforeOverwrite(targetDir, file.path, content, backupStamp);
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

    // Plans and session state are runtime data, not scaffolding — a valid
    // existing file always wins over a fresh template (v1.0: upgrade must
    // never lose plan or handshake state).
    if (file.path.startsWith('.nexus/plans/') || file.path.startsWith('.nexus/state/')) {
      result.preserved.push(file.path);
      continue;
    }

    if (ALWAYS_REPLACE.has(file.path)) {
      await backupBeforeOverwrite(targetDir, file.path, content, backupStamp);
      await writeFile(fullPath, file.content);
      result.replaced.push(file.path);
      continue;
    }

    if (ALWAYS_PRESERVE.has(file.path)) {
      result.preserved.push(file.path);
      continue;
    }

    // Skills: core/ and README are always replaced on upgrade (regenerated from latest templates)
    // community/ skills are preserved — reinstallable via `nexus skill install`
    if (file.path.startsWith('.nexus/skills/community/') || file.path.startsWith('.nexus/agents/community/')) {
      result.preserved.push(file.path);
      continue;
    }

    if (
      file.path.startsWith('.nexus/skills/') ||
      file.path.startsWith('.nexus/agents/') ||
      file.path.startsWith('.claude/agents/')
    ) {
      // core content and READMEs — replace on upgrade, preserve on repair
      await backupBeforeOverwrite(targetDir, file.path, content, backupStamp);
      await writeFile(fullPath, file.content);
      result.replaced.push(file.path);
      continue;
    }

    // Smart check: replace ONLY files explicitly still in template state.
    // Populated docs, frontmatter without status, and hand-written docs
    // with no frontmatter are all user content — preserve by default.
    if (isTemplate(content)) {
      await backupBeforeOverwrite(targetDir, file.path, content, backupStamp);
      await writeFile(fullPath, file.content);
      result.replaced.push(file.path);
    } else {
      result.preserved.push(file.path);
    }
  }

  return result;
}

/**
 * Safety net: before reconcile overwrites ANY existing non-empty file, the
 * old content is mirrored to .nexus/state/upgrade-backup/<stamp>/<path>.
 * state/ is gitignored, so backups never pollute the repo — but a bad
 * upgrade is always recoverable even without version control.
 */
async function backupBeforeOverwrite(
  targetDir: string,
  relPath: string,
  oldContent: string,
  stamp: string,
): Promise<void> {
  if (oldContent.trim().length === 0) return;
  const backupPath = path.join(targetDir, '.nexus', 'state', 'upgrade-backup', stamp, relPath);
  await ensureDirectory(path.dirname(backupPath));
  await writeFile(backupPath, oldContent);
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
