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
import { fetchNpmTarball, resolveSkillSource } from '../utils/skills/fetcher.js';
import {
  parseSkillFrontmatter,
  validateSkillFrontmatter,
} from '../utils/skills/frontmatter.js';
import type { SkillInvocation } from '../utils/skills/types.js';
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
      { value: 'procedure', name: '🎯 procedure — A discipline the agent runs: interview, diagnosis, review' },
      { value: 'integration', name: '🔗 integration — Wiring a third-party service into this project' },
    ],
    default: 'ui',
  });

  // SKILL_SPEC v2 §3 — who may invoke this skill. `model` is the default and
  // covers almost everything; `user` is for a skill that drives a whole session
  // and should never fire on its own.
  const invocation = (await select({
    message: 'Invocation:',
    choices: [
      { value: 'model', name: '🤖 model — the agent may reach for it, or you can (default)' },
      { value: 'user', name: '🙋 user — only you can invoke it; it orchestrates' },
    ],
    default: 'model',
  })) as SkillInvocation;

  const rawTriggers = await input({
    message: 'Trigger phrases, 2-4 words each (comma-separated, e.g. "new service, service file"):',
    validate: (v: string) => {
      const parsed = v.split(',').map((t) => t.trim()).filter(Boolean);
      if (parsed.length < 2) return 'At least 2 triggers are required (SKILL_SPEC v2 §3)';
      const tooLong = parsed.find((t) => t.split(/\s+/).length > 4);
      if (tooLong) {
        return `"${tooLong}" is longer than 4 words — long triggers rarely match a real task. Shorten it.`;
      }
      return true;
    },
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

  // A `procedure` skill takes `## Completion Criteria` in place of `## Example`:
  // its output is a changed state of understanding, not a file (SKILL_SPEC v2 §4).
  const closingSection = category === 'procedure'
    ? `## Completion Criteria
[The checkable condition that ends this procedure. State the not-done cases too —
they are cheaper to recognise than the done case.]

Not done when: [the cases where the agent might declare itself finished early]`
    : `## Example
\`\`\`
[A minimal, concrete example of the correct output]
\`\`\``;

  const content = `---
skill: ${slug}
version: 1.0.0
framework: shared
category: ${category}
invocation: ${invocation}
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

${closingSection}

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
      // v2: procedure skills and gates are worth seeing at a glance.
      const kind = meta.category === 'procedure' ? ' [procedure]' : '';
      const invocation = meta.invocation === 'user' ? ' [user-invoked]' : '';
      const gate = meta.gate ? ` [gates ${meta.gate.planTypes.join('/')}]` : '';
      console.log(`  ${statusIcon} ${file.replace('.md', '')}${kind}${invocation}${gate}${triggers}`);
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
 * Fetch the latest @nexus-framework/skills tarball from npm and return a
 * map of { framework → slug[] } by scanning the decoded .md file paths.
 *
 * Returns null if the network is unavailable, the fetch fails, or (unlikely,
 * since this is our own registry package) the package isn't found.
 */
async function fetchLiveSkillRegistry(
  timeoutMs = 8000,
): Promise<{ skillMap: Map<string, string[]>; version: string } | null> {
  const result = await fetchNpmTarball('@nexus-framework/skills', timeoutMs);
  if (!result || 'notFound' in result) return null;

  const skillMap = new Map<string, string[]>();

  for (const name of result.files.keys()) {
    // Parse skill paths: package/<framework>/<slug>.md or <framework>/<slug>.md
    // e.g. "package/shared/git-workflow.md" or "package/next.js/routing.md"
    const match = name.match(/(?:^|\/)(?:package\/)?([^/]+)\/([^/]+)\.md$/);
    if (match) {
      const [, framework, slug] = match;
      if (framework && slug && slug !== 'README') {
        if (!skillMap.has(framework)) skillMap.set(framework, []);
        skillMap.get(framework)!.push(slug);
      }
    }
  }

  return skillMap.size > 0 ? { skillMap, version: result.version } : null;
}

/**
 * List all skills available in the @nexus-framework/skills registry,
 * optionally filtered to a single framework.
 *
 * Always fetches the LIVE version from npm — no need to republish nexus-cli
 * when new skills are added to @nexus-framework/skills.
 * Falls back to the locally installed package if the network is unavailable.
 */
export async function skillRegistryCommand(options: { framework?: string } = {}): Promise<void> {
  // Alias map: CLI-friendly names → package folder names
  const ALIASES: Record<string, string> = {
    nextjs: 'next.js',
  };

  // ── Attempt live fetch from npm ──────────────────────────────
  logger.info('Fetching latest skill registry from npm…');
  const live = await fetchLiveSkillRegistry();

  let allFrameworks: string[];
  let getSkills: (fw: string) => string[];
  let sourceLabel: string;

  if (live) {
    // Sort: non-shared alphabetically, then shared last
    allFrameworks = [
      ...[...live.skillMap.keys()].filter((f) => f !== 'shared').sort(),
      ...(live.skillMap.has('shared') ? ['shared'] : []),
    ];
    getSkills = (fw: string) => [...(live.skillMap.get(fw) ?? [])].sort();
    sourceLabel = `@nexus-framework/skills v${live.version} (live from npm)`;
  } else {
    // ── Fallback: locally installed package ─────────────────────
    logger.warn('Could not reach npm — showing locally installed skills instead.');
    const { listFrameworks, listSkills } = await import('@nexus-framework/skills');
    allFrameworks = [
      ...listFrameworks().filter((f: string) => f !== 'shared').sort(),
      'shared',
    ];
    getSkills = (fw: string) => [...listSkills(fw)].sort();

    // Read installed version from its own package.json
    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    const installedVersion: string =
      (req('@nexus-framework/skills/package.json') as { version?: string }).version ?? '?';
    sourceLabel = `@nexus-framework/skills v${installedVersion} (local — offline fallback)`;
  }

  // ── --framework filter ───────────────────────────────────────
  let filterFramework: string | undefined;
  if (options.framework) {
    const rawInput = options.framework.toLowerCase();
    filterFramework = ALIASES[rawInput] ?? rawInput;
    if (!allFrameworks.includes(filterFramework)) {
      const friendlyList = allFrameworks
        .map((f) => (f === 'next.js' ? 'nextjs (next.js)' : f))
        .join(', ');
      logger.error(`Unknown framework: "${options.framework}"`);
      logger.info(`Available frameworks: ${friendlyList}`);
      process.exit(1);
    }
  }

  logger.nexus(`Skill Registry  (${sourceLabel})\n`);

  // ── Display ──────────────────────────────────────────────────
  const frameworksToShow = filterFramework
    ? [filterFramework]
    : allFrameworks;

  let totalSkills = 0;

  for (const fw of frameworksToShow) {
    const skills = getSkills(fw);
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
 * nexus skill install <source>
 * ────────────────────────────────────────────────────────────── */

export interface SkillInstallOptions {
  /** Narrow to one framework subfolder — e.g. for multi-framework registries or repos. */
  framework?: string;
  /** Which slug to install from a multi-skill source like @nexus-framework/skills. */
  skill?: string;
  /** Overwrite an already-installed community skill of the same slug. */
  force?: boolean;
}

/**
 * Install skills into `.nexus/skills/community/` from an npm package,
 * GitHub repository (owner/repo), Git repository URL, or local path.
 */
export async function skillInstallCommand(
  source?: string,
  options: SkillInstallOptions = {},
): Promise<void> {
  if (!source) {
    logger.error('Source required. Usage: nexus skill install <source>');
    logger.info('Examples:');
    logger.info('  nexus skill install @nexus-framework/skills --skill routing --framework nextjs');
    logger.info('  nexus skill install GDA-Africa/nexus-skills --skill git-workflow');
    logger.info('  nexus skill install https://github.com/owner/skill-pack');
    logger.info('  nexus skill install ./path/to/custom-skills');
    logger.info('  nexus skill install nexus-skill-grilling');
    process.exit(1);
  }

  const targetDir = process.cwd();
  const communityDir = path.join(targetDir, '.nexus', 'skills', 'community');

  if (!(await dirExists(communityDir))) {
    logger.error('No .nexus/skills/ directory found. Run `nexus init` or `nexus adopt` first.');
    process.exit(1);
  }

  logger.info(`Fetching "${source}"…`);
  const result = await resolveSkillSource(source, targetDir);

  if (result === null) {
    logger.error(`Could not reach or fetch source "${source}".`);
    logger.info('Check your network connection or local path and try again.');
    process.exit(1);
  }

  if ('notFound' in result) {
    logger.error(`Source "${result.label}" was not found.`);
    logger.info('`nexus skill install` works with npm packages, GitHub repos (owner/repo), and local paths containing SKILL_SPEC-formatted .md files — double-check the name.');
    process.exit(1);
  }

  // Alias map: CLI-friendly names → package folder names (matches `skill registry`)
  const ALIASES: Record<string, string> = { nextjs: 'next.js' };

  const targetFw = options.framework
    ? (ALIASES[options.framework.toLowerCase()] ?? options.framework.toLowerCase())
    : undefined;

  const candidates = [...result.files.entries()]
    .filter(([filePath]) => path.basename(filePath).toLowerCase() !== 'readme.md');

  // Parse each candidate file's frontmatter and resolve its framework context
  const parsedCandidates = candidates.map(([filePath, content]) => {
    const meta = parseSkillFrontmatter(content);
    const slug = meta.slug || path.basename(filePath, '.md');

    // Detect framework from meta or directory structure
    let fw = meta.framework;
    if (!fw || fw === 'shared' || fw === 'none') {
      const match = filePath.match(/(?:package\/|packages\/core\/|skills\/)?([^/]+)\/[^/]+\.md$/);
      if (match && match[1] && match[1] !== 'package' && match[1] !== 'core' && match[1] !== 'skills') {
        fw = match[1];
      }
    }

    return { filePath, content, meta, slug, framework: fw };
  });

  let toInstall: Array<{ filePath: string; content: string; meta: ReturnType<typeof parseSkillFrontmatter>; slug: string }>;

  if (options.skill) {
    let matches = parsedCandidates.filter(
      (c) => c.slug === options.skill || path.basename(c.filePath, '.md') === options.skill,
    );

    if (targetFw) {
      matches = matches.filter(
        (c) =>
          c.framework === targetFw ||
          c.meta.framework === targetFw ||
          c.filePath.includes(`/${targetFw}/`) ||
          c.filePath.startsWith(`${targetFw}/`),
      );
    }

    if (matches.length === 0) {
      logger.error(`No skill "${options.skill}" found in ${result.label}${targetFw ? ` for framework "${targetFw}"` : ''}.`);
      if (result.isOfficialRegistry) {
        logger.info('Run `nexus skill registry` to see available slugs.');
      }
      process.exit(1);
    }

    if (matches.length > 1) {
      const frameworks = matches
        .map((c) => c.framework)
        .filter((f): f is string => Boolean(f));
      const uniqueFws = [...new Set(frameworks)];
      if (uniqueFws.length > 1) {
        logger.error(`Skill "${options.skill}" exists in multiple frameworks: ${uniqueFws.join(', ')}.`);
        logger.info('Narrow it down with --framework <fw>.');
        process.exit(1);
      }
    }

    toInstall = matches;
  } else if (result.isOfficialRegistry) {
    if (!targetFw) {
      logger.error(`"${result.label}" is a multi-framework registry — specify which skill to install.`);
      logger.info(`Usage: nexus skill install ${result.label} --skill <slug> [--framework <fw>]`);
      logger.info('Run `nexus skill registry` to browse available slugs.');
      process.exit(1);
    }

    const matches = parsedCandidates.filter(
      (c) =>
        c.framework === targetFw ||
        c.meta.framework === targetFw ||
        c.filePath.includes(`/${targetFw}/`) ||
        c.filePath.startsWith(`${targetFw}/`),
    );

    if (matches.length === 0) {
      logger.error(`No skills found in ${result.label} for framework "${targetFw}".`);
      process.exit(1);
    }

    toInstall = matches;
  } else {
    if (targetFw) {
      toInstall = parsedCandidates.filter(
        (c) =>
          c.framework === targetFw ||
          c.meta.framework === targetFw ||
          c.filePath.includes(`/${targetFw}/`) ||
          c.filePath.startsWith(`${targetFw}/`),
      );
    } else {
      toInstall = parsedCandidates;
    }
  }

  if (toInstall.length === 0) {
    logger.error(`No skill files found in "${source}".`);
    logger.info('A valid skill source must contain one or more .md files with SKILL_SPEC frontmatter.');
    process.exit(1);
  }

  const icon =
    result.sourceKind === 'local'
      ? '📁 Directory'
      : result.sourceKind === 'github'
        ? '🐙 GitHub'
        : result.sourceKind === 'git'
          ? '🌿 Git'
          : '📦 Package';

  const versionTag =
    result.version && result.version !== '?' && result.version !== 'local' && result.version !== 'HEAD'
      ? ` v${result.version}`
      : '';

  logger.info(`${icon}: ${result.label}${versionTag}`);
  logger.newline();

  let installed = 0;
  let skipped = 0;
  let invalid = 0;

  for (const { filePath, content, meta } of toInstall) {
    const problems = validateSkillFrontmatter(meta, content);
    const errors = problems.filter((p) => p.severity === 'error');

    if (errors.length > 0) {
      invalid++;
      logger.warn(`Skipping ${filePath} — invalid SKILL_SPEC frontmatter:`);
      for (const problem of errors) {
        logger.info(`    ${problem.field}: ${problem.message}`);
      }
      continue;
    }

    const destPath = path.join(communityDir, `${meta.slug}.md`);

    if (!options.force && (await fileExists(destPath))) {
      skipped++;
      logger.warn(`Skipping "${meta.slug}" — already installed. Use --force to overwrite.`);
      continue;
    }

    await fs.writeFile(destPath, content, 'utf-8');
    installed++;
    logger.success(`Installed .nexus/skills/community/${meta.slug}.md`);
  }

  logger.newline();

  if (installed === 0) {
    logger.error(`Nothing installed from "${source}".`);
    process.exit(1);
  }

  logger.info(`${installed} installed, ${skipped} skipped, ${invalid} invalid.`);
  logger.info('Run `nexus skill list` to confirm, or `nexus skill status` to validate.');
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

      // Validate against SKILL_SPEC v2. Before v1.3 the only frontmatter that
      // was ever checked was slug + triggers, and only at creation time via the
      // `skill new` prompt — so any hand-authored or hand-edited skill could
      // carry an unknown category or framework indefinitely and nothing said so.
      const problems = validateSkillFrontmatter(meta, raw);
      for (const problem of problems) {
        const icon = problem.severity === 'error' ? '❌' : '⚠️ ';
        logger.warn(`${icon} .nexus/skills/${dir}/${file} — ${problem.field}: ${problem.message}`);
        if (problem.severity === 'error') issues++;
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

/**
 * Skill frontmatter parsing and validation now live in
 * `utils/skills/frontmatter.ts` — one parser, shared with the MCP server.
 * The copy that used to live here read only slug/status/triggers, so category,
 * framework, version and author were never checked anywhere.
 */

function toTitleCase(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
