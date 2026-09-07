import path from 'node:path';
import fs from 'fs-extra';
import { getNexusDir } from './brain.js';
import { parseKnowledge } from './knowledge.js';
export class BrainMemoryError extends Error {}

/* ──────────────────────────────────────────────────────────────
 * Progress Log
 * ────────────────────────────────────────────────────────────── */

export interface AppendProgressInput {
  date: string;      // YYYY-MM-DD
  statusIcon: string;
  message: string;
}

export interface AppendProgressResult {
  appended: true;
  entry: string;
}

const PROGRESS_HEADING = /^## .+Progress Log/i;
const SECTION_BOUNDARY = /^#{1,2}\\s/; // Matches ## or #, with space

/**
 * Appends a formatted entry to the Progress Log section of docs/index.md.
 * Uses a line-walker for robustness against human edits around the section.
 * @param nexusDir The .nexus directory path.
 * @param input The progress entry details.
 * @returns {AppendProgressResult} Confirmation of append and the entry.
 * @throws {BrainMemoryError} If the Progress Log section is not found.
 */
export async function appendProgressEntry(nexusDir: string, input: AppendProgressInput): Promise<AppendProgressResult> {
  const indexPath = path.join(nexusDir, 'docs', 'index.md');
  if (!(await fs.pathExists(indexPath))) {
    throw new BrainMemoryError(`No index.md found at ${indexPath}.`);
  }

  const content = await fs.readFile(indexPath, 'utf-8');
  const entry = `- ${input.date} — ${input.statusIcon} ${input.message}`;

  const updatedContent = insertProgressEntryIntoMarkdown(content, entry);

  await fs.writeFile(indexPath, updatedContent, 'utf-8');

  return { appended: true as const, entry };
}

/**
 * Inserts a new Progress Log entry into the markdown content.
 * This is a pure function for easier testing.
 * @param content The full markdown content of index.md.
 * @param entryLine The formatted entry line to insert.
 * @returns The updated markdown content.
 * @throws {BrainMemoryError} If the Progress Log section is not found.
 */
export function insertProgressEntryIntoMarkdown(content: string, entryLine: string): string {
  const lines = content.split('\\n');
  let headingIndex = -1;

  // Find the last "Progress Log" heading, walking backwards
  for (let i = lines.length - 1; i >= 0; i--) {
    if (PROGRESS_HEADING.test(lines[i])) {
      headingIndex = i;
      break;
    }
  }

  if (headingIndex === -1) {
    throw new BrainMemoryError('No "Progress Log" section found in docs/index.md. Ensure the section exists with a heading like "## 🔄 Progress Log".');
  }

  const bodyStart = headingIndex + 1;
  let sectionEnd = lines.length;

  // Find the end of the section (next same-or-higher level heading, or EOF)
  for (let i = bodyStart; i < lines.length; i++) {
    if (SECTION_BOUNDARY.test(lines[i])) {
      sectionEnd = i;
      break;
    }
  }

  // Identify the actual insertion point, handling trailing blank lines within the section
  let insertionPoint = sectionEnd; // Default to end of section
  for (let i = sectionEnd - 1; i >= bodyStart; i--) {
    if (lines[i].trim() !== '') {
      insertionPoint = i + 1; // Insert after the last non-blank line
      break;
    } else if (i === bodyStart) {
      insertionPoint = bodyStart; // Section is all blanks or empty, insert at start of body
    }
  }
  
  const rebuiltLines: string[] = [];
  rebuiltLines.push(...lines.slice(0, insertionPoint)); // Content before insertion point
  rebuiltLines.push(entryLine);                           // The new entry
  if (lines[insertionPoint-1]?.trim() !== '') {
    rebuiltLines.push('');                                // Add a blank line if not already there
  }
  rebuiltLines.push(...lines.slice(insertionPoint));      // Content after insertion point

  let result = rebuiltLines.join('\\n');
  if (!result.endsWith('\\n')) result += '\\n'; // Ensure trailing newline
  return result;
}

/* ──────────────────────────────────────────────────────────────
 * Knowledge Base
 * ────────────────────────────────────────────────────────────── */

export const KNOWLEDGE_CATEGORIES = [
  'architecture',
  'bug-fix',
  'pattern',
  'package',
  'performance',
  'convention',
  'gotcha',
  'integration',
] as const;

export interface AppendKnowledgeInput {
  category: (typeof KNOWLEDGE_CATEGORIES)[number] | string; // Allow string for CLI, validate
  title: string;
  body: string;
  why?: string;
  howToApply?: string;
}

export interface AppendKnowledgeResult {
  heading: string;
  appended: true;
}

/**
 * Appends a new entry to the append-only knowledge.md.
 * @param nexusDir The .nexus directory path.
 * @param input The knowledge entry details.
 * @returns {AppendKnowledgeResult} Confirmation of append and the entry heading.
 * @throws {BrainMemoryError} If knowledge.md is not found, category is invalid, or entry already exists.
 */
export async function appendKnowledgeEntry(nexusDir: string, input: AppendKnowledgeInput): Promise<AppendKnowledgeResult> {
  const knowledgePath = path.join(nexusDir, 'docs', 'knowledge.md');
  if (!(await fs.pathExists(knowledgePath))) {
    throw new BrainMemoryError(`No knowledge base found at ${knowledgePath}.`);
  }

  if (!(KNOWLEDGE_CATEGORIES as readonly string[]).includes(input.category)) {
    throw new BrainMemoryError(`Invalid knowledge category: "${input.category}". Must be one of: ${KNOWLEDGE_CATEGORIES.join(', ')}.`);
  }

  const heading = `### [${input.category}] ${input.title}`;
  const today = new Date().toISOString().split('T')[0] ?? '';
  const entryLines = [heading, `**${today}** — ${input.body.trim()}`];
  if (input.why) entryLines.push(`**Why:** ${input.why.trim()}`);
  if (input.howToApply) entryLines.push(`**How to apply:** ${input.howToApply.trim()}`);

  const content = await fs.readFile(knowledgePath, 'utf-8');
  const parsed = parseKnowledge(content);

  if (parsed.entries.some(entry => entry.category === input.category && entry.title === input.title)) {
    throw new BrainMemoryError(
      `An entry "[${input.category}] ${input.title}" already exists. The knowledge base is append-only — pick a new title.`,
    );
  }

  const updatedContent = insertBeforePostamble(content, parsed.postamble, entryLines.join('\n'));
  await fs.writeFile(knowledgePath, updatedContent, 'utf-8');

  return { heading, appended: true as const };
}

/**
 * Inserts a new entry before the file footer (trailing `---` + signature), or appends it.
 * This is a pure function, extracted from src/mcp/tools.ts.
 * @param content The full markdown content.
 * @param postamble The detected postamble lines by parseKnowledge.
 * @param entry The new entry markdown string.
 * @returns The updated markdown content.
 */
export function insertBeforePostamble(content: string, postamble: string[], entry: string): string {
  const trimmedPostamble = postamble.join('\n');

  if (trimmedPostamble.trim().length > 0 && content.endsWith(trimmedPostamble)) {
    const head = content.slice(0, content.length - trimmedPostamble.length).trimEnd();
    return `${head}\n\n${entry}\n\n${trimmedPostamble.trimStart()}`;
  }

  return `${content.trimEnd()}\n\n${entry}\n`;
}

/* ──────────────────────────────────────────────────────────────
 * Scope Resolution
 * ────────────────────────────────────────────────────────────── */

/**
 * Resolves the .nexus directory path for a given scope.
 * @param scope The scope ('root', a package name, or a path).
 * @param cwd The current working directory (for resolving relative paths).
 * @returns The absolute path to the .nexus directory.
 * @throws {BrainMemoryError} If the .nexus directory is not found for the scope.
 */
export function resolveBrainScope(scope: string, cwd: string = process.cwd()): string {
  let startDir: string;
  if (scope === 'root') {
    startDir = cwd; // getNexusDir will walk up to the monorepo root if inside a package
  } else {
    // Treat scope as a relative or absolute path to a package/project
    startDir = path.resolve(cwd, scope);
  }

  const nexusDir = getNexusDir(startDir);
  if (!nexusDir) {
    throw new BrainMemoryError(`No .nexus database found for scope "${scope}". Run \`nexus init\` first.`);
  }
  return nexusDir;
}
