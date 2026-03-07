/**
 * NEXUS CLI - Skill Command
 *
 * Provides the `nexus skill` subcommand suite for managing skills in .nexus/skills/.
 *
 * Subcommands:
 *   nexus skill new <name>        — scaffold a new custom skill
 *   nexus skill list              — list all installed skills
 *   nexus skill install <pkg>     — install from registry (community/)
 *   nexus skill remove <name>     — remove a community skill
 *   nexus skill status            — check core skills freshness
 *
 * Directory rules:
 *   core/      — NEXUS-owned; updated by `nexus upgrade`; NOT manageable via this command
 *   custom/    — User-owned; created with `skill new`; NEVER removed by NEXUS
 *   community/ — Registry-installed; managed by `skill install` / `skill remove`
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { input, select } from '@inquirer/prompts';

import { fileExists, dirExists } from '../utils/file-system.js';
import { logger } from '../utils/logger.js';
import { version } from '../version.js';

/* ──────────────────────────────────────────────────────────────
 * nexus skill new <name>
 * ────────────────────────────────────────────────────────────── */

/**
 * Scaffold a new custom skill interactively.
 * Creates `.nexus/skills/custom/<name>.md` with template content and `status: draft`.
 */
export async function skillNewCommand(name?: string): Promise<void> {
  logger.banner(version);

  const targetDir = process.cwd();
  const skillsDir = path.join(targetDir, '.nexus', 'skills', 'custom');

  if (!(await dirExists(skillsDir))) {
    logger.error('No .nexus/skills/ directory found in this project.');
    logger.info('Run `nexus init` or `nexus adopt` first to set up the NEXUS framework.');
    process.exit(1);
  }

  // Prompt for skill details if not provided
  const skillName = name ?? (await input({
    message: 'Skill name (slug, e.g. "creating-a-service"):',
    validate: (v: string) => v.trim().length > 0 ? true : 'Name cannot be empty',
  }));

  const slug = skillName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const category = await select({
    message: 'Category:',
    choices: [
      { value: 'ui', name: '🎨 ui — Component creation, styling, layout' },
      { value: 'routing', name: '🗺️  routing — Pages, routes, navigation' },
      { value: 'data', name: '📊 data — Data fetching, state, caching' },
      { value: 'testing', name: '🧪 testing — Unit, integration, E2E tests' },
      { value: 'api', name: '🔌 api — API endpoints, handlers, clients' },
      { value: 'config', name: '⚙️  config — Configuration, environment, setup' },
      { value: 'workflow', name: '🔄 workflow — Git, commits, PR, deployment' },
    ],
    default: 'ui',
  });

  const rawTriggers = await input({
    message: 'Trigger phrases (comma-separated, e.g. "creating a service, new service file"):',
    validate: (v: string) => v.trim().length > 0 ? true : 'At least one trigger is required',
  });

  const triggers = rawTriggers
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const outputPath = path.join(skillsDir, `${slug}.md`);

  if (await fileExists(outputPath)) {
    logger.warn(`Skill "${slug}" already exists at .nexus/skills/custom/${slug}.md`);
    logger.info('Edit the file directly to update it.');
    process.exit(0);
  }

  const triggersYaml = triggers.map((t) => `  - "${t}"`).join('\n');

  const content = `---
skill: ${slug}
version: 1.0.0
framework: shared
category: ${category}
triggers:
${triggersYaml}
author: custom
status: draft
---

# Skill: ${toTitleCase(slug)}

## When to Read This
[Describe when an AI agent should read this skill — e.g. "Before creating any new service file."]

## Context
[Explain how this project specifically handles this type of task and why.]

## Steps
1. [First step]
2. [Second step]
3. [Continue...]

## Patterns We Use
- [Pattern the project follows]
- [Another pattern]

## Anti-Patterns — Never Do This
- [Something that looks reasonable but is wrong for this project]
- [Another anti-pattern]

## Example
\`\`\`
[A minimal, concrete example of the correct output]
\`\`\`

## Notes
[Optional: edge cases, exceptions, or links to relevant docs]
`;

  await fs.writeFile(outputPath, content, 'utf-8');

  logger.success(`Custom skill created: .nexus/skills/custom/${slug}.md`);
  logger.info('Status is set to "draft" — change to "active" when ready to enforce it.');
}

/* ──────────────────────────────────────────────────────────────
 * nexus skill list
 * ────────────────────────────────────────────────────────────── */

/**
 * List all skills installed in .nexus/skills/ grouped by directory.
 */
export async function skillListCommand(): Promise<void> {
  const targetDir = process.cwd();
  const skillsBase = path.join(targetDir, '.nexus', 'skills');

  if (!(await dirExists(skillsBase))) {
    logger.warn('No .nexus/skills/ directory found. Run `nexus init` or `nexus adopt` first.');
    process.exit(0);
  }

  logger.nexus('Installed Skills\n');

  for (const dir of ['core', 'custom', 'community'] as const) {
    const dirPath = path.join(skillsBase, dir);
    const label =
      dir === 'core' ? '📦 Core Skills (NEXUS-managed)' :
      dir === 'custom' ? '✏️  Custom Skills (yours)' :
      '🌐 Community Skills (registry-installed)';

    logger.info(label);

    if (!(await dirExists(dirPath))) {
      logger.info('  (none)\n');
      continue;
    }

    const entries = await fs.readdir(dirPath);
    const skillFiles = entries.filter((f) => f.endsWith('.md') && f !== 'README.md');

    if (skillFiles.length === 0) {
      logger.info('  (none)\n');
      continue;
    }

    for (const file of skillFiles) {
      const fullPath = path.join(dirPath, file);
      const raw = await fs.readFile(fullPath, 'utf-8');
      const meta = parseSkillFrontmatter(raw);
      const statusIcon = meta.status === 'active' ? '✅' : meta.status === 'deprecated' ? '⚠️ ' : '📝';
      const triggers = meta.triggers.length > 0 ? ` — ${meta.triggers.slice(0, 2).join(', ')}${meta.triggers.length > 2 ? '...' : ''}` : '';
      console.log(`  ${statusIcon} ${file.replace('.md', '')}${triggers}`);
    }

    logger.newline();
  }

  logger.info('Commands:');
  logger.info('  nexus skill new <name>       — create a custom skill');
  logger.info('  nexus skill install <pkg>    — install from registry');
  logger.info('  nexus skill remove <name>    — remove a community skill');
}

/* ──────────────────────────────────────────────────────────────
 * nexus skill registry [--framework <fw>]
 * ────────────────────────────────────────────────────────────── */

/**
 * List all skills available in the @nexus-framework/skills registry,
 * optionally filtered to a single framework.
 *
 * Reads directly from the installed npm package — no network required.
 */
export async function skillRegistryCommand(options: { framework?: string } = {}): Promise<void> {
  const { listFrameworks, listSkills } = await import('@nexus-framework/skills');

  const allFrameworks: string[] = listFrameworks();

  // Alias map: CLI-friendly names → package folder names
  const ALIASES: Record<string, string> = {
    nextjs: 'next.js',
  };

  // --framework filter: normalise alias, then validate
  let filterFramework: string | undefined;
  if (options.framework) {
    const input = options.framework.toLowerCase();
    filterFramework = ALIASES[input] ?? input;
    if (!allFrameworks.includes(filterFramework)) {
      const friendlyList = allFrameworks
        .map((f) => (f === 'next.js' ? 'nextjs (next.js)' : f))
        .join(', ');
      logger.error(`Unknown framework: "${options.framework}"`);
      logger.info(`Available frameworks: ${friendlyList}`);
      process.exit(1);
    }
  }

  logger.nexus('Skill Registry  (@nexus-framework/skills)\n');

  // Frameworks to show — either the filtered one or all (shared last)
  const frameworksToShow = filterFramework
    ? [filterFramework]
    : [...allFrameworks.filter((f) => f !== 'shared'), 'shared'];

  let totalSkills = 0;

  for (const fw of frameworksToShow) {
    const skills: string[] = listSkills(fw);
    totalSkills += skills.length;

    const label = fw === 'shared'
      ? '🔗 shared  (installed for every framework)'
      : `📦 ${fw}`;

    logger.info(`${label}  (${skills.length} skill${skills.length !== 1 ? 's' : ''})`);

    if (skills.length === 0) {
      logger.info('    (none)');
    } else {
      for (const slug of skills) {
        console.log(`    • ${slug}`);
      }
    }

    logger.newline();
  }

  if (!filterFramework) {
    logger.info(`Total: ${totalSkills} skills across ${frameworksToShow.length} framework(s)`);
    logger.newline();
  }

  logger.info('These skills are installed into .nexus/skills/core/ when you run `nexus init` or `nexus upgrade`.');
  logger.info('Use `nexus skill list` to see what is installed in your current project.');
}

/* ──────────────────────────────────────────────────────────────
 * nexus skill install <pkg>
 * ────────────────────────────────────────────────────────────── */

/**
 * Install skills from the @nexus-framework/skills registry into community/.
 *
 * Currently a stub — will source from npm when @nexus-framework/skills is published.
 * For now, notifies the user of upcoming availability.
 */
export async function skillInstallCommand(pkg?: string): Promise<void> {
  if (!pkg) {
    logger.error('Package name required. Usage: nexus skill install <package>');
    logger.info('Example: nexus skill install @nexus-framework/skills-integrations');
    process.exit(1);
  }

  const targetDir = process.cwd();
  const communityDir = path.join(targetDir, '.nexus', 'skills', 'community');

  if (!(await dirExists(communityDir))) {
    logger.error('No .nexus/skills/ directory found. Run `nexus init` or `nexus adopt` first.');
    process.exit(1);
  }

  // Stub: @nexus-framework/skills registry is in development
  if (pkg.startsWith('@nexus-framework/skills')) {
    logger.info(`📦 Package: ${pkg}`);
    logger.warn('The @nexus-framework/skills registry is coming in a future release.');
    logger.info('Core framework skills are already installed in .nexus/skills/core/');
    logger.info('Check .nexus/skills/README.md for available skills.');
    process.exit(0);
  }

  logger.warn(`Community skill packages from "${pkg}" are not yet supported.`);
  logger.info('Only @nexus-framework/skills packages will be supported initially.');
  process.exit(1);
}

/* ──────────────────────────────────────────────────────────────
 * nexus skill remove <name>
 * ────────────────────────────────────────────────────────────── */

/**
 * Remove a community skill from .nexus/skills/community/.
 * Refuses to remove core or custom skills with a clear explanation.
 */
export async function skillRemoveCommand(name?: string): Promise<void> {
  if (!name) {
    logger.error('Skill name required. Usage: nexus skill remove <name>');
    process.exit(1);
  }

  const targetDir = process.cwd();
  const slug = name.replace(/\.md$/, '');

  // Check if trying to remove a core skill
  const corePath = path.join(targetDir, '.nexus', 'skills', 'core', `${slug}.md`);
  if (await fileExists(corePath)) {
    logger.error(`Cannot remove core skill "${slug}".`);
    logger.info('Core skills are managed by NEXUS and regenerated on upgrade.');
    logger.info('If you want to override it, create a custom skill with the same slug in .nexus/skills/custom/');
    process.exit(1);
  }

  // Check if trying to remove a custom skill
  const customPath = path.join(targetDir, '.nexus', 'skills', 'custom', `${slug}.md`);
  if (await fileExists(customPath)) {
    logger.error(`Cannot remove custom skill "${slug}" via this command.`);
    logger.info('Custom skills are owned by you and are never touched by NEXUS.');
    logger.info(`Delete it manually if needed: .nexus/skills/custom/${slug}.md`);
    process.exit(1);
  }

  // Only proceed for community skills
  const communityPath = path.join(targetDir, '.nexus', 'skills', 'community', `${slug}.md`);
  if (!(await fileExists(communityPath))) {
    logger.error(`Community skill "${slug}" not found.`);
    logger.info('Run `nexus skill list` to see installed community skills.');
    process.exit(1);
  }

  await fs.unlink(communityPath);
  logger.success(`Removed community skill: .nexus/skills/community/${slug}.md`);
}

/* ──────────────────────────────────────────────────────────────
 * nexus skill status
 * ────────────────────────────────────────────────────────────── */

/**
 * Check if core skills are present and report any issues.
 * Suggests running `nexus upgrade` if core skills are missing or outdated.
 */
export async function skillStatusCommand(): Promise<void> {
  const targetDir = process.cwd();
  const skillsBase = path.join(targetDir, '.nexus', 'skills');

  if (!(await dirExists(skillsBase))) {
    logger.warn('No .nexus/skills/ directory found. Run `nexus upgrade` to add skills.');
    process.exit(0);
  }

  logger.nexus('Skills Status\n');

  let issues = 0;

  for (const dir of ['core', 'custom', 'community'] as const) {
    const dirPath = path.join(skillsBase, dir);
    const exists = await dirExists(dirPath);

    if (!exists) {
      if (dir === 'core') {
        logger.warn(`⚠️  Missing: .nexus/skills/core/ — run \`nexus upgrade\` to restore`);
        issues++;
      }
      continue;
    }

    const entries = await fs.readdir(dirPath);
    const skillFiles = entries.filter((f) => f.endsWith('.md') && f !== 'README.md');

    for (const file of skillFiles) {
      const fullPath = path.join(dirPath, file);
      const raw = await fs.readFile(fullPath, 'utf-8');
      const meta = parseSkillFrontmatter(raw);

      if (meta.status === 'deprecated') {
        logger.warn(`⚠️  Deprecated: .nexus/skills/${dir}/${file} — consider updating`);
        issues++;
      }

      if (!meta.slug || !meta.triggers.length) {
        logger.warn(`⚠️  Invalid frontmatter: .nexus/skills/${dir}/${file} — missing slug or triggers`);
        issues++;
      }
    }
  }

  if (issues === 0) {
    logger.success('All skills look healthy.');
  } else {
    logger.newline();
    logger.info(`${issues} issue(s) found. Run \`nexus upgrade\` to refresh core skills.`);
  }

  logger.newline();
  logger.info('Available skills: .nexus/skills/README.md');
}

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────── */

interface SkillFrontmatter {
  slug: string;
  status: string;
  triggers: string[];
}

/**
 * Parse minimal YAML frontmatter from a skill file.
 * Uses simple regex — no full YAML parser dependency needed.
 */
function parseSkillFrontmatter(content: string): SkillFrontmatter {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return { slug: '', status: 'draft', triggers: [] };

  const fm = fmMatch[1];

  const slug = (fm.match(/^skill:\s*(.+)$/m) ?? [])[1]?.trim() ?? '';
  const status = (fm.match(/^status:\s*(.+)$/m) ?? [])[1]?.trim() ?? 'draft';

  const triggersMatch = fm.match(/^triggers:\n((?:[ ]{2}- .+\n?)*)/m);
  const triggers: string[] = triggersMatch
    ? triggersMatch[1]
        .split('\n')
        .filter((l) => l.trim().startsWith('- '))
        .map((l) => l.replace(/^[ ]{2}- /, '').replace(/^"|"$/g, '').trim())
    : [];

  return { slug, status, triggers };
}

function toTitleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
