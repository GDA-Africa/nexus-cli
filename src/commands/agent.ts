/**
 * NEXUS CLI — `nexus agent`
 *
 * Manage brain-grounded agent definitions in `.nexus/agents/`.
 *
 * Subcommands (mirrors `nexus skill`):
 *   nexus agent list              — all agents (custom / core / community)
 *   nexus agent new [name]        — scaffold a custom agent
 *   nexus agent install <name>    — install from the @nexus-framework/skills registry (agents/ area)
 *   nexus agent remove <name>     — remove a community agent (refuses core/custom)
 *   nexus agent status            — frontmatter validity + stale context recipes
 *   nexus agent sync              — regenerate client outputs (.claude/agents/, AGENTS.md block)
 */

import path from 'node:path';

import { input } from '@inquirer/prompts';
import fs from 'fs-extra';

import {
  claudeSubagentTools,
  coreAgentRolesSummaries,
  renderAgentRolesBlock,
  replaceAgentRolesBlock,
  subagentDescription,
} from '../generators/agents.js';
import { collectAgentSummaries, resolveAgent } from '../utils/agents/parser.js';
import { getNexusDir } from '../utils/brain.js';
import { fileExists } from '../utils/file-system.js';
import { logger } from '../utils/logger.js';

function requireAgentsDir(): { nexusDir: string; agentsDir: string; projectRoot: string } {
  const nexusDir = getNexusDir(process.cwd());
  if (!nexusDir) {
    logger.error('Could not find .nexus/ in this path or any parent directory.');
    logger.info('Run `nexus init` or `nexus adopt` first.');
    process.exit(1);
  }
  return {
    nexusDir,
    agentsDir: path.join(nexusDir, 'agents'),
    projectRoot: path.dirname(nexusDir),
  };
}

/* ── list ─────────────────────────────────────────────────────── */

export async function agentListCommand(): Promise<void> {
  const { agentsDir } = requireAgentsDir();
  const summaries = await collectAgentSummaries(agentsDir);

  if (summaries.length === 0) {
    logger.info('No agents installed. Run `nexus upgrade` to generate the core four, or `nexus agent new`.');
    return;
  }

  logger.nexus(`Agents (${summaries.length}) — precedence: custom > core > community`);
  for (const a of summaries) {
    const flag = a.status === 'invalid' ? ' ⚠ INVALID' : a.status === 'deprecated' ? ' (deprecated)' : '';
    logger.info(`  ${a.name}  [${a.source}] — ${a.role}${flag}`);
  }
}

/* ── new ──────────────────────────────────────────────────────── */

export async function agentNewCommand(name?: string): Promise<void> {
  const { agentsDir } = requireAgentsDir();

  const agentName =
    name ??
    (await input({
      message: 'Agent name (kebab-case, e.g. migration-runner):',
      validate: (v) => (/^[a-z][a-z0-9-]+$/.test(v) ? true : 'Use kebab-case: letters, digits, dashes'),
    }));

  const filePath = path.join(agentsDir, 'custom', `${agentName}.md`);
  if (await fileExists(filePath)) {
    logger.error(`Custom agent already exists: .nexus/agents/custom/${agentName}.md`);
    process.exit(1);
  }

  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, customAgentTemplate(agentName), 'utf-8');
  logger.success(`Created .nexus/agents/custom/${agentName}.md`);
  logger.info('Edit the definition, then run `nexus agent sync` to regenerate client outputs.');
}

function customAgentTemplate(name: string): string {
  return `---
nexus_agent: true
agent: ${name}
version: 1.0.0
role: custom
triggers: ["describe", "when", "to use me"]
tools:
  read: [nexus_wake, nexus_get_active_plan, nexus_query_knowledge]
  write: [nexus_plan_note]
  exec: [Read, Edit, Write, Bash, Grep, Glob]
context:
  docs: []
  knowledge_categories: [gotcha, convention]
  skills: []
  plan_scope: active
handoff:
  after: ""
status: draft
---

# Agent: ${name}

## Mission
<!-- One sentence: what outcome this agent owns. -->

## Working Agreement
1. Session start: \`nexus_wake\` — echo the token.
2. <!-- The steps this agent always follows. -->

## Definition of Done
<!-- What must be true before this agent's work counts as complete. -->

## Anti-Patterns
- ❌ <!-- What this agent must never do. -->
`;
}

/* ── install / remove (community, via registry) ───────────────── */

export async function agentInstallCommand(name: string): Promise<void> {
  const { agentsDir } = requireAgentsDir();

  let content: string | null = null;
  try {
    const registry = await import('@nexus-framework/skills');
    content = registry.getSkillContent('agents', name) as string | null;
  } catch {
    content = null;
  }

  if (!content) {
    logger.error(`Agent "${name}" not found in the registry (@nexus-framework/skills agents/).`);
    logger.info('Browse available packs: https://www.npmjs.com/package/@nexus-framework/skills');
    process.exit(1);
  }

  const filePath = path.join(agentsDir, 'community', `${name}.md`);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
  logger.success(`Installed community agent: .nexus/agents/community/${name}.md`);
  logger.info('Run `nexus agent sync` to regenerate client outputs.');
}

export async function agentRemoveCommand(name: string): Promise<void> {
  const { agentsDir } = requireAgentsDir();
  const communityPath = path.join(agentsDir, 'community', `${name}.md`);

  if (!(await fileExists(communityPath))) {
    const resolved = await resolveAgent(agentsDir, name);
    if (resolved) {
      logger.error(`"${name}" is a ${resolved.source} agent — only community agents can be removed.`);
      logger.info(resolved.source === 'core' ? 'Core agents regenerate on upgrade; override with a custom agent of the same name.' : 'Custom agents are yours — delete the file manually if you really mean it.');
    } else {
      logger.error(`Agent not found: ${name}`);
    }
    process.exit(1);
  }

  await fs.remove(communityPath);
  logger.success(`Removed community agent: ${name}`);
}

/* ── status ───────────────────────────────────────────────────── */

export async function agentStatusCommand(): Promise<void> {
  const { agentsDir, nexusDir } = requireAgentsDir();
  const summaries = await collectAgentSummaries(agentsDir);

  if (summaries.length === 0) {
    logger.info('No agents installed.');
    return;
  }

  let problems = 0;
  for (const a of summaries) {
    if (a.status === 'invalid') {
      logger.error(`✖ ${a.name} [${a.source}] — frontmatter does not parse`);
      problems++;
      continue;
    }

    // Validate the context recipe: referenced docs must exist
    const resolved = await resolveAgent(agentsDir, a.name);
    if (!resolved) continue;
    const staleDocs: string[] = [];
    for (const doc of resolved.definition.frontmatter.context.docs) {
      if (!(await fileExists(path.join(nexusDir, 'docs', doc)))) staleDocs.push(doc);
    }
    if (staleDocs.length > 0) {
      logger.warn(`⚠ ${a.name} [${a.source}] — context recipe references missing docs: ${staleDocs.join(', ')}`);
      problems++;
    } else {
      logger.success(`✔ ${a.name} [${a.source}] — ${a.role}, ${a.triggers.length} triggers`);
    }
  }

  if (problems === 0) logger.nexus('All agents healthy.');
  else process.exitCode = 1;
}

/* ── sync ─────────────────────────────────────────────────────── */

/** Instruction files that receive the fenced Agent Roles block. */
const ROLE_BLOCK_TARGETS = ['AGENTS.md', 'CLAUDE.md', '.nexus/ai/instructions.md'];

export async function agentSyncCommand(): Promise<void> {
  const { agentsDir, projectRoot } = requireAgentsDir();
  const summaries = await collectAgentSummaries(agentsDir);

  if (summaries.length === 0) {
    logger.info('No agents to sync.');
    return;
  }

  // 1. Claude Code subagents — regenerate from the resolved definitions
  const claudeDir = path.join(projectRoot, '.claude', 'agents');
  await fs.ensureDir(claudeDir);
  let written = 0;

  for (const summary of summaries) {
    if (summary.status === 'invalid') continue;
    const resolved = await resolveAgent(agentsDir, summary.name);
    if (!resolved) continue;
    const def = resolved.definition;
    const { tools } = def.frontmatter;
    const subagentTools = claudeSubagentTools({ exec: tools.exec, read: tools.read, write: tools.write });
    const out = `---
name: ${def.frontmatter.agent}
description: ${subagentDescription(def.frontmatter.role, def.frontmatter.triggers, tools.exec)}
tools: ${subagentTools.join(', ')}
---

You are **${def.frontmatter.agent}**, a brain-grounded ${def.frontmatter.role} agent in a NEXUS project.
The project brain is served by the \`nexus-brain\` MCP server (see .mcp.json).
Source of truth: \`.nexus/agents/${resolved.source}/${def.frontmatter.agent}.md\`.

${def.body}
`;
    await fs.writeFile(path.join(claudeDir, `${def.frontmatter.agent}.md`), out, 'utf-8');
    written++;
  }

  // 2. Fenced Agent Roles block in instruction files
  const roleSummaries = summaries
    .filter((s) => s.status !== 'invalid')
    .map((s) => ({
      name: s.name,
      role: s.role,
      mission: coreAgentRolesSummaries().find((c) => c.name === s.name)?.mission ?? s.triggers.slice(0, 3).join(', '),
    }));
  const block = renderAgentRolesBlock(roleSummaries);

  let patched = 0;
  for (const target of ROLE_BLOCK_TARGETS) {
    const fullPath = path.join(projectRoot, target);
    if (!(await fileExists(fullPath))) continue;
    const content = await fs.readFile(fullPath, 'utf-8');
    await fs.writeFile(fullPath, replaceAgentRolesBlock(content, block), 'utf-8');
    patched++;
  }

  logger.success(`Synced ${written} subagent(s) to .claude/agents/ and patched ${patched} instruction file(s).`);
}
