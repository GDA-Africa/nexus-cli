/**
 * The single skill-frontmatter parser — SKILL_SPEC v2.0.0.
 *
 * Before this module there were two parsers with different bugs. The MCP one
 * read only inline `triggers: [a, b]`, which no registry skill uses, so every
 * skill parsed to zero triggers and the skills section of the context pack
 * never returned anything. Both call sites now come here.
 *
 * Frontmatter is matched anchored to the start of the string with no `m` flag:
 * with `m`, `^---` matches any markdown horizontal rule and the whole document
 * body gets scanned as frontmatter. That is the exact defect that shipped in
 * `isTemplate()`/`isPopulated()` and destroyed hand-written brains on upgrade.
 */

import {
  SKILL_CATEGORIES,
  SKILL_FRAMEWORKS,
  SKILL_INVOCATIONS,
  SKILL_STATUSES,
  type SkillFrontmatter,
  type SkillGate,
  type SkillInvocation,
  type SkillStatus,
  type SkillValidationIssue,
} from './types.js';

/** Anchored to string start, no `m` flag — see the module note. */
const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---/;

const EMPTY: SkillFrontmatter = {
  slug: '',
  version: null,
  framework: null,
  category: null,
  invocation: 'model',
  triggers: [],
  author: null,
  status: 'draft',
  updated: null,
  related: [],
  requires: [],
  gate: null,
  description: null,
  title: null,
};

export function extractFrontmatterBlock(content: string): string | null {
  return content.match(FRONTMATTER_BLOCK)?.[1] ?? null;
}

export function parseSkillFrontmatter(content: string): SkillFrontmatter {
  const block = extractFrontmatterBlock(content);
  if (block === null) return { ...EMPTY, title: firstHeading(content) };

  const scalar = (key: string): string | null => {
    const line = block.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'))?.[1];
    if (line === undefined) return null;
    const value = line.trim().replace(/^["']|["']$/g, '').trim();
    return value.length > 0 ? value : null;
  };

  const status = scalar('status');
  const invocation = scalar('invocation');

  return {
    slug: scalar('skill') ?? '',
    version: scalar('version'),
    framework: scalar('framework'),
    category: scalar('category'),
    invocation: isInvocation(invocation) ? invocation : 'model',
    triggers: parseStringList(block, 'triggers'),
    author: scalar('author'),
    status: isStatus(status) ? status : 'draft',
    updated: scalar('updated'),
    related: parseStringList(block, 'related'),
    requires: parseStringList(block, 'requires'),
    gate: parseGate(block),
    description: scalar('description'),
    title: scalar('title') ?? scalar('name') ?? firstHeading(content),
  };
}

/**
 * Read a YAML string list in either form:
 *
 *   triggers: ["a", "b"]        (inline)
 *   triggers:                   (block — what every registry skill actually uses)
 *     - "a"
 *     - "b"
 */
export function parseStringList(block: string, key: string): string[] {
  const inline = block.match(new RegExp(`^${key}:[ \\t]*\\[(.*)\\][ \\t]*$`, 'm'))?.[1];
  if (inline !== undefined) {
    return inline
      .split(',')
      .map((item) => item.trim().replace(/^["']|["']$/g, '').trim())
      .filter(Boolean);
  }

  const headerIdx = block.search(new RegExp(`^${key}:[ \\t]*$`, 'm'));
  if (headerIdx < 0) return [];

  const lines = block.slice(headerIdx).split('\n').slice(1);
  const items: string[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const item = line.match(/^[ \t]+-[ \t]+(.*)$/)?.[1];
    if (item === undefined) break; // dedented back to a sibling key — list is over
    const value = item.trim().replace(/^["']|["']$/g, '').trim();
    if (value.length > 0) items.push(value);
  }

  return items;
}

/**
 * Parse the optional `gate` block:
 *
 *   gate:
 *     plan_types:
 *       - feature
 *     record: "## Grilling"
 */
function parseGate(block: string): SkillGate | null {
  const headerIdx = block.search(/^gate:[ \t]*$/m);
  if (headerIdx < 0) return null;

  const lines = block.slice(headerIdx).split('\n').slice(1);
  const nested: string[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) continue;
    if (!/^[ \t]/.test(line)) break; // back to column 0 — gate block is over
    nested.push(line.replace(/^[ \t]{1,2}/, ''));
  }

  const nestedBlock = nested.join('\n');
  const planTypes = parseStringList(nestedBlock, 'plan_types');
  const record = nestedBlock
    .match(/^record:[ \t]*(.*)$/m)?.[1]
    ?.trim()
    .replace(/^["']|["']$/g, '')
    .trim();

  if (planTypes.length === 0 && !record) return null;

  return {
    planTypes,
    record: record && record.length > 0 ? record : '## Grilling',
  };
}

function firstHeading(content: string): string | null {
  return content.match(/^#[ \t]+(.+)$/m)?.[1]?.trim() ?? null;
}

function isInvocation(value: string | null): value is SkillInvocation {
  return value !== null && (SKILL_INVOCATIONS as readonly string[]).includes(value);
}

function isStatus(value: string | null): value is SkillStatus {
  return value !== null && (SKILL_STATUSES as readonly string[]).includes(value);
}

/**
 * Validate a parsed skill against SKILL_SPEC v2 §10.
 *
 * Returns issues rather than throwing — callers decide whether a warn blocks.
 * `errors` are spec violations; `warns` are things the spec permits but that
 * will not work well in practice (a trigger too long to ever match).
 */
export function validateSkillFrontmatter(
  fm: SkillFrontmatter,
  content?: string,
): SkillValidationIssue[] {
  const issues: SkillValidationIssue[] = [];
  const err = (field: string, message: string) =>
    issues.push({ field, message, severity: 'error' });
  const warn = (field: string, message: string) =>
    issues.push({ field, message, severity: 'warn' });

  if (!fm.slug) {
    err('skill', 'missing required field `skill`');
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.slug)) {
    err('skill', `\`skill\` must be kebab-case, got "${fm.slug}"`);
  }

  if (!fm.version) {
    err('version', 'missing required field `version`');
  } else if (!/^\d+\.\d+\.\d+$/.test(fm.version)) {
    err('version', `\`version\` must be semver MAJOR.MINOR.PATCH, got "${fm.version}"`);
  }

  if (!fm.framework) {
    err('framework', 'missing required field `framework`');
  } else if (!(SKILL_FRAMEWORKS as readonly string[]).includes(fm.framework)) {
    err('framework', `unknown framework "${fm.framework}" (allowed: ${SKILL_FRAMEWORKS.join(', ')})`);
  }

  if (!fm.category) {
    err('category', 'missing required field `category`');
  } else if (!(SKILL_CATEGORIES as readonly string[]).includes(fm.category)) {
    err('category', `unknown category "${fm.category}" (allowed: ${SKILL_CATEGORIES.join(', ')})`);
  }

  if (!fm.author) err('author', 'missing required field `author`');

  if (fm.triggers.length < 2) {
    err('triggers', `needs at least 2 triggers, found ${fm.triggers.length}`);
  }

  for (const trigger of fm.triggers) {
    if (trigger.split(/\s+/).length > 4) {
      warn(
        'triggers',
        `trigger "${trigger}" is longer than 4 words — it is unlikely to match a real task string`,
      );
    }
  }

  if (fm.gate && fm.invocation !== 'model') {
    err('gate', '`gate` may only be declared on an `invocation: model` skill (SKILL_SPEC v2 §6)');
  }

  if (fm.gate && fm.gate.planTypes.length === 0) {
    err('gate', '`gate.plan_types` must name at least one plan type');
  }

  if (content !== undefined) {
    issues.push(...validateSkillBody(fm, content));
  }

  return issues;
}

const REQUIRED_SECTIONS = [
  '## When to Read This',
  '## Context',
  '## Steps',
  '## Patterns We Use',
  '## Anti-Patterns — Never Do This',
];

export function validateSkillBody(fm: SkillFrontmatter, content: string): SkillValidationIssue[] {
  const issues: SkillValidationIssue[] = [];

  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      issues.push({ field: 'body', message: `missing required section \`${section}\``, severity: 'error' });
    }
  }

  if (fm.category === 'procedure') {
    if (!content.includes('## Completion Criteria')) {
      issues.push({
        field: 'body',
        message: 'a `procedure` skill requires `## Completion Criteria` (SKILL_SPEC v2 §4)',
        severity: 'error',
      });
    }
  } else if (!content.includes('## Example')) {
    issues.push({
      field: 'body',
      message: 'a reference skill requires `## Example` (SKILL_SPEC v2 §4)',
      severity: 'error',
    });
  }

  return issues;
}
