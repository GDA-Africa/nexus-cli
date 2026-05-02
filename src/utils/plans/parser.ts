import fs from 'node:fs/promises';

import type { PlanDocument, PlanFrontmatter, PlanSection } from './types.js';

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;

const KNOWN_FRONTMATTER_ORDER = [
  'nexus_plan',
  'id',
  'title',
  'status',
  'created',
  'updated',
  'owner',
  'source',
  'parent',
  'estimate',
  'phase',
  'tags',
] as const;

export async function readPlanFile(filePath: string): Promise<PlanDocument> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parsePlanContent(content);
}

export async function writePlanFile(filePath: string, plan: PlanDocument): Promise<void> {
  await fs.writeFile(filePath, serializePlanContent(plan), 'utf-8');
}

export function parsePlanContent(content: string): PlanDocument {
  const frontmatterMatch = content.match(FRONTMATTER_PATTERN);
  const frontmatter = parseFrontmatter(frontmatterMatch?.[1] ?? '');
  const body = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;

  const { preamble, sections } = parseSections(body);

  if (!frontmatter.id || !frontmatter.title || !frontmatter.status) {
    throw new Error('Invalid plan file: required frontmatter fields `id`, `title`, and `status` are missing.');
  }

  return {
    frontmatter,
    preamble,
    sections,
  };
}

export function serializePlanContent(plan: PlanDocument): string {
  const frontmatterBlock = serializeFrontmatter(plan.frontmatter);
  const bodyParts: string[] = [];

  if (plan.preamble.trim()) {
    bodyParts.push(plan.preamble.trimEnd());
  }

  for (const section of plan.sections) {
    bodyParts.push(`## ${section.heading}\n${section.content.trimEnd()}`.trimEnd());
  }

  const body = bodyParts.join('\n\n');
  return `${frontmatterBlock}\n${body}\n`;
}

export function getSection(plan: PlanDocument, heading: string): PlanSection | null {
  const needle = heading.trim().toLowerCase();
  return plan.sections.find((section) => section.heading.trim().toLowerCase() === needle) ?? null;
}

export function setSection(plan: PlanDocument, heading: string, content: string): PlanDocument {
  const normalized = heading.trim().toLowerCase();
  const existingIdx = plan.sections.findIndex(
    (section) => section.heading.trim().toLowerCase() === normalized,
  );

  const nextSections = [...plan.sections];
  if (existingIdx >= 0) {
    nextSections[existingIdx] = { heading, content };
  } else {
    nextSections.push({ heading, content });
  }

  return {
    ...plan,
    sections: nextSections,
  };
}

export function appendSectionEntry(plan: PlanDocument, heading: string, entry: string): PlanDocument {
  const existing = getSection(plan, heading);
  const current = existing?.content.trimEnd() ?? '';
  const nextContent = current ? `${current}\n${entry}` : entry;
  return setSection(plan, heading, `${nextContent}\n`);
}

export function parseChecklist(sectionContent: string): Array<{ checked: boolean; text: string }> {
  return sectionContent
    .split('\n')
    .map((line) => line.match(/^\s*- \[( |x|X)\]\s+(.+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ checked: m[1]?.toLowerCase() === 'x', text: m[2]?.trim() ?? '' }));
}

export function updateChecklistItem(
  sectionContent: string,
  itemIndex: number,
  checked: boolean,
): string {
  if (itemIndex < 1) {
    throw new Error('Step index must be >= 1.');
  }

  let seen = 0;
  const updated = sectionContent.split('\n').map((line) => {
    const match = line.match(/^(\s*)- \[( |x|X)\](\s+.+)$/);
    if (!match) return line;

    seen += 1;
    if (seen !== itemIndex) return line;

    const prefix = match[1] ?? '';
    const suffix = match[3] ?? '';
    return `${prefix}- [${checked ? 'x' : ' '}]${suffix}`;
  });

  if (seen < itemIndex) {
    throw new Error(`Step ${itemIndex} does not exist. Found ${seen} step(s).`);
  }

  return `${updated.join('\n').trimEnd()}\n`;
}

function parseSections(body: string): { preamble: string; sections: PlanSection[] } {
  const headingRegex = /^##\s+(.+)$/gm;
  const matches = [...body.matchAll(headingRegex)];

  if (matches.length === 0) {
    return {
      preamble: body.trimEnd(),
      sections: [],
    };
  }

  const firstHeadingStart = matches[0]?.index ?? 0;
  const preamble = body.slice(0, firstHeadingStart).trimEnd();

  const sections: PlanSection[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    if (!current || current.index === undefined) {
      continue;
    }

    const heading = (current[1] ?? '').trim();
    const contentStart = current.index + current[0].length;
    const contentEnd = next?.index ?? body.length;
    const content = body.slice(contentStart, contentEnd).trim();

    sections.push({ heading, content });
  }

  return { preamble, sections };
}

function parseFrontmatter(frontmatter: string): PlanFrontmatter {
  const lines = frontmatter.split('\n');
  const parsed: Record<string, unknown> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

  const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!match) continue;

    const key = match[1] ?? '';
    const value = match[2] ?? '';
    parsed[key] = parseScalar(value);
  }

  return parsed as PlanFrontmatter;
}

function serializeFrontmatter(frontmatter: PlanFrontmatter): string {
  const orderedKeys = [
    ...KNOWN_FRONTMATTER_ORDER,
    ...Object.keys(frontmatter).filter((k) => !KNOWN_FRONTMATTER_ORDER.includes(k as never)),
  ];

  const seen = new Set<string>();
  const lines: string[] = ['---'];

  for (const key of orderedKeys) {
    if (seen.has(key) || !(key in frontmatter)) continue;
    seen.add(key);
    const value = frontmatter[key];
    lines.push(`${key}: ${formatScalar(value)}`);
  }

  lines.push('---');
  return lines.join('\n');
}

function parseScalar(rawValue: string): unknown {
  const value = rawValue.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : value;
    } catch {
      return value;
    }
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value;
}

function formatScalar(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return 'null';
  }
  return JSON.stringify(value);
}
