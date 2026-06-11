/**
 * NEXUS Agents — Parser
 *
 * Parses agent definition files: restricted-YAML frontmatter + markdown body.
 * Like the plans parser, this is defensive — agent files are human-editable,
 * so every field is validated and unknown values produce clean errors, never
 * crashes (knowledge: "[bug-fix] Plan Lifecycle Crashes on Unknown Status").
 */

import path from 'node:path';

import fs from 'fs-extra';

import {
  AGENT_ROLES,
  AGENT_SOURCES,
  type AgentDefinition,
  type AgentFrontmatter,
  type AgentRole,
  type AgentSource,
  type AgentSummary,
} from './types.js';

/* ──────────────────────────────────────────────────────────────
 * Parsing
 * ────────────────────────────────────────────────────────────── */

export class AgentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentParseError';
  }
}

/** Parse an agent file's full content into a validated definition. */
export function parseAgentContent(content: string): AgentDefinition {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new AgentParseError('Agent file has no YAML frontmatter block.');
  }

  const raw = parseRestrictedYaml(match[1] ?? '');
  const body = (match[2] ?? '').trim();

  const name = asString(raw['agent']);
  if (!name) throw new AgentParseError('Frontmatter is missing required field "agent".');

  const roleRaw = asString(raw['role']) ?? 'custom';
  const role: AgentRole = (AGENT_ROLES as readonly string[]).includes(roleRaw)
    ? (roleRaw as AgentRole)
    : 'custom';

  const statusRaw = asString(raw['status']) ?? 'active';
  const status =
    statusRaw === 'draft' || statusRaw === 'deprecated' ? statusRaw : ('active' as const);

  const tools = isRecord(raw['tools']) ? raw['tools'] : {};
  const context = isRecord(raw['context']) ? raw['context'] : {};
  const handoff = isRecord(raw['handoff']) ? raw['handoff'] : {};

  const planScopeRaw = asString(context['plan_scope']) ?? 'active';
  const plan_scope =
    planScopeRaw === 'none' || planScopeRaw === 'all' ? planScopeRaw : ('active' as const);

  const frontmatter: AgentFrontmatter = {
    nexus_agent: raw['nexus_agent'] === true || raw['nexus_agent'] === 'true',
    agent: name,
    version: asString(raw['version']) ?? '1.0.0',
    role,
    triggers: asStringArray(raw['triggers']),
    tools: {
      read: asStringArray(tools['read']),
      write: asStringArray(tools['write']),
    },
    context: {
      docs: asStringArray(context['docs']),
      knowledge_categories: asStringArray(context['knowledge_categories']),
      skills: asStringArray(context['skills']),
      plan_scope,
    },
    handoff: {
      after: asString(handoff['after']) ?? undefined,
      to: asString(handoff['to']) ?? undefined,
    },
    status,
  };

  return { frontmatter, body };
}

/** Read and parse one agent file from disk. */
export async function readAgentFile(filePath: string): Promise<AgentDefinition> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseAgentContent(content);
}

/* ──────────────────────────────────────────────────────────────
 * Directory scanning (precedence: custom > core > community)
 * ────────────────────────────────────────────────────────────── */

/** Collect agent summaries across all three directories, deduped by precedence. */
export async function collectAgentSummaries(agentsDir: string): Promise<AgentSummary[]> {
  const summaries: AgentSummary[] = [];
  const seen = new Set<string>();

  for (const source of AGENT_SOURCES) {
    const dir = path.join(agentsDir, source);
    if (!(await fs.pathExists(dir))) continue;

    const files = (await fs.readdir(dir)).filter(
      (f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md',
    );

    for (const fileName of files.sort()) {
      const name = fileName.replace(/\.md$/, '');
      if (seen.has(name)) continue;
      seen.add(name);

      try {
        const def = await readAgentFile(path.join(dir, fileName));
        summaries.push({
          name: def.frontmatter.agent || name,
          source,
          role: def.frontmatter.role,
          status: def.frontmatter.status,
          triggers: def.frontmatter.triggers,
          fileName,
        });
      } catch {
        // Malformed agent files are reported by `nexus agent status`, not crashed on
        summaries.push({
          name,
          source,
          role: 'custom',
          status: 'invalid',
          triggers: [],
          fileName,
        });
      }
    }
  }

  return summaries;
}

/** Resolve one agent by name, honoring custom > core > community precedence. */
export async function resolveAgent(
  agentsDir: string,
  name: string,
): Promise<{ definition: AgentDefinition; source: AgentSource; filePath: string } | null> {
  const fileName = `${name.replace(/\.md$/, '')}.md`;

  for (const source of AGENT_SOURCES) {
    const filePath = path.join(agentsDir, source, fileName);
    if (await fs.pathExists(filePath)) {
      return { definition: await readAgentFile(filePath), source, filePath };
    }
  }

  return null;
}

/* ──────────────────────────────────────────────────────────────
 * Restricted YAML parser
 *
 * Supports exactly what agent frontmatter uses:
 *   scalars, inline arrays [a, b], dash lists, and one level of
 *   nested maps (tools:, context:, handoff:). Anything fancier
 *   belongs in the body, not the frontmatter.
 * ────────────────────────────────────────────────────────────── */

type YamlValue = string | boolean | string[] | { [key: string]: YamlValue };

/**
 * Max depth 2: root key → (scalar | list | map of (scalar | list)).
 * Type of an empty-valued key is decided lazily by its first child:
 * a dash line makes it a list; a "key: …" line makes it a map.
 */
function parseRestrictedYaml(block: string): Record<string, YamlValue> {
  const root: Record<string, YamlValue> = {};
  let topKey: string | null = null; // root key awaiting/holding children
  let subKey: string | null = null; // map key (inside topKey) holding a list

  for (const rawLine of block.split('\n')) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const indent = rawLine.length - rawLine.trimStart().length;

    // ── dash list item ──
    if (trimmed.startsWith('- ')) {
      const item = unquote(trimmed.slice(2).trim());
      if (subKey && topKey && isRecord(root[topKey])) {
        const map = root[topKey] as Record<string, YamlValue>;
        if (!Array.isArray(map[subKey])) map[subKey] = [];
        (map[subKey] as string[]).push(item);
      } else if (topKey) {
        if (!Array.isArray(root[topKey])) root[topKey] = [];
        (root[topKey] as string[]).push(item);
      }
      continue;
    }

    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();

    if (indent === 0) {
      subKey = null;
      if (value === '') {
        topKey = key; // children decide list vs map
      } else {
        root[key] = parseScalar(value);
        topKey = null;
      }
      continue;
    }

    // ── nested "key: …" line → parent is a map ──
    if (topKey) {
      if (!isRecord(root[topKey])) root[topKey] = {};
      const map = root[topKey] as Record<string, YamlValue>;
      if (value === '') {
        map[key] = [];
        subKey = key; // dash items follow
      } else {
        map[key] = parseScalar(value);
        subKey = null;
      }
    }
  }

  return root;
}

function parseScalar(value: string): YamlValue {
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((v) => unquote(v.trim()))
      .filter(Boolean);
  }
  if (value === 'true' || value === 'false') return value === 'true';
  return unquote(value);
}

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, '');
}

function isRecord(value: unknown): value is Record<string, YamlValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.length > 0) return [value];
  return [];
}
