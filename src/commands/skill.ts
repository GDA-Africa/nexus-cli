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
 * map of { framework → slug[] } by scanning tar entry paths.
 *
 * Uses only Node built-ins (fetch + zlib + Buffer). No file extraction —
 * we only inspect the path names inside the .tgz to build the skill list.
 *
 * Returns null if the network is unavailable or the fetch fails.
 */
async function fetchLiveSkillRegistry(
  timeoutMs = 8000,
): Promise<{ skillMap: Map<string, string[]>; version: string } | null> {
  const { createGunzip } = await import('node:zlib');
  const { Readable } = await import('node:stream');

  const REGISTRY_PKG = '@nexus-framework/skills';

  try {
    // ── Step 1: resolve latest tarball URL ────────────────────
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const metaRes = await fetch(`https://registry.npmjs.org/${REGISTRY_PKG}/latest`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (!metaRes.ok) return null;

    const meta = (await metaRes.json()) as { version?: string; dist?: { tarball?: string } };
    const tarballUrl = meta.dist?.tarball;
    const registryVersion = meta.version ?? '?';

    if (!tarballUrl) return null;

    // ── Step 2: download tarball ───────────────────────────────
    const tgzController = new AbortController();
    const tgzTimer = setTimeout(() => tgzController.abort(), timeoutMs);

    const tgzRes = await fetch(tarballUrl, { signal: tgzController.signal });
    clearTimeout(tgzTimer);

    if (!tgzRes.ok || !tgzRes.body) return null;

    // ── Step 3: decompress and scan tar entry names ────────────
    // We only need the file paths (tar header block, offset 0, 100 bytes).
    // We never read file contents — this is purely a path scan.
    const chunks: Buffer[] = [];
    const gunzip = createGunzip();

    // Pump the fetch body through gunzip
    const bodyBuffer = Buffer.from(await tgzRes.arrayBuffer());
    const readable = Readable.from(bodyBuffer);
    readable.pipe(gunzip);

    await new Promise<void>((resolve, reject) => {
      gunzip.on('data', (chunk: Buffer) => chunks.push(chunk));
      gunzip.on('end', resolve);
      gunzip.on('error', reject);
    });

    const tarData = Buffer.concat(chunks);

    // ── Step 4: walk tar blocks (512-byte records) ─────────────
    // TAR format: each file entry starts with a 512-byte header.
    // Bytes 0–99: null-terminated file name.
    // Bytes 124–135: file size in octal ASCII.
    // We skip past header + file data (rounded up to 512-byte boundary).

    const skillMap = new Map<string, string[]>();

    let offset = 0;
    while (offset + 512 <= tarData.length) {
      const header = tarData.slice(offset, offset + 512);

      // Empty block = end of archive
      if (header.every((b) => b === 0)) break;

      // Extract file name (first 100 bytes, null-terminated)
      const nameEnd = header.indexOf(0, 0);
      const name = header.slice(0, nameEnd === -1 ? 100 : Math.min(nameEnd, 100)).toString('utf8');

      // Extract file size (bytes 124–135, octal)
      const sizeStr = header.slice(124, 136).toString('utf8').replace(/\0/g, '').trim();
      const fileSize = parseInt(sizeStr, 8) || 0;

      // Parse skill paths: package/<framework>/<slug>.md
      // e.g. "package/shared/git-workflow.md" or "package/next.js/routing.md"
      const match = name.match(/^package\/([^/]+)\/([^/]+)\.md$/);
      if (match) {
        const [, framework, slug] = match;
        if (framework && slug && slug !== 'README') {
          if (!skillMap.has(framework)) skillMap.set(framework, []);
          skillMap.get(framework)!.push(slug);
        }
      }

      // Advance past header + file data (rounded up to 512-byte boundary)
      offset += 512 + Math.ceil(fileSize / 512) * 512;
    }

    return skillMap.size > 0 ? { skillMap, version: registryVersion } : null;

  } catch {
    // Offline, timeout, or any network error — return null to trigger fallback
    return null;
  }
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
