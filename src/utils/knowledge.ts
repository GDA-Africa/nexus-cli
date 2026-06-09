/**
 * NEXUS Knowledge Utilities
 *
 * Parses `.nexus/docs/knowledge.md` entries and renders the consolidated
 * summary layer (`knowledge-summary.md`). The raw knowledge file stays
 * append-only — consolidation only ever adds a summary view on top.
 *
 * Spec: v1_alive_brain.md §5.4 (Memory hygiene — `nexus consolidate`)
 */

export interface KnowledgeEntry {
  /** Category tag, e.g. "architecture", "gotcha" */
  category: string;
  /** Entry title (text after the category tag) */
  title: string;
  /** ISO date (YYYY-MM-DD) extracted from the entry body, if present */
  date: string | null;
  /** One-line rolled-up insight for the summary view */
  summary: string;
  /** Optional TTL hint: entry is stale once the project reaches this version */
  expiresAfterVersion: string | null;
  /** Raw markdown lines of the entry, including the heading line */
  raw: string[];
}

export interface ParsedKnowledge {
  /** Lines before the first entry (header, how-to, category table) */
  preamble: string[];
  entries: KnowledgeEntry[];
  /** Lines after the last entry (footer) */
  postamble: string[];
}

const ENTRY_HEADING = /^### \[([\w][\w-]*)\] (.+)$/;
const ENTRY_DATE = /\*\*(\d{4}-\d{2}-\d{2})\*\*/;
const EXPIRES_HINT = /expires_after_version:\s*"?([\d]+(?:\.[\d]+)*)"?/;
/** Footer is the trailing `---` + italic signature line, if present */
const FOOTER_START = /^---\s*$/;

export function parseKnowledge(content: string): ParsedKnowledge {
  const lines = content.split('\n');
  const preamble: string[] = [];
  const entries: KnowledgeEntry[] = [];
  let postamble: string[] = [];

  let current: string[] | null = null;
  let inEntries = false;

  for (const line of lines) {
    if (ENTRY_HEADING.test(line)) {
      if (current) {
        entries.push(buildEntry(current));
      }
      current = [line];
      inEntries = true;
      continue;
    }

    if (!inEntries) {
      preamble.push(line);
      continue;
    }

    if (current) {
      current.push(line);
    }
  }

  if (current) {
    // Split a trailing footer (final `---` + signature) off the last entry.
    const footerIndex = findFooterIndex(current);
    if (footerIndex !== -1) {
      postamble = current.slice(footerIndex);
      current = current.slice(0, footerIndex);
    }
    entries.push(buildEntry(current));
  }

  return { preamble, entries, postamble };
}

function findFooterIndex(entryLines: string[]): number {
  for (let i = entryLines.length - 1; i > 0; i--) {
    if (FOOTER_START.test(entryLines[i])) {
      const rest = entryLines.slice(i + 1).filter((line) => line.trim().length > 0);
      const isSignature = rest.every((line) => line.trim().startsWith('*'));
      if (isSignature) {
        return i;
      }
      return -1;
    }
  }
  return -1;
}

function buildEntry(rawLines: string[]): KnowledgeEntry {
  const heading = rawLines[0].match(ENTRY_HEADING);
  const body = rawLines.slice(1);

  const dateMatch = rawLines.join('\n').match(ENTRY_DATE);
  const expiresMatch = rawLines.join('\n').match(EXPIRES_HINT);

  return {
    category: heading?.[1] ?? 'uncategorized',
    title: heading?.[2]?.trim() ?? 'Untitled',
    date: dateMatch?.[1] ?? null,
    summary: extractSummary(body),
    expiresAfterVersion: expiresMatch?.[1] ?? null,
    raw: trimTrailingBlankLines(rawLines),
  };
}

function extractSummary(bodyLines: string[]): string {
  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith('**Why:**') || trimmed.startsWith('**How to apply:**')) continue;

    // Strip a leading bold date ("**2026-06-09** — insight...")
    const withoutDate = trimmed.replace(/^\*\*\d{4}-\d{2}-\d{2}\*\*\s*[—–-]\s*/, '');
    return truncate(withoutDate, 200);
  }
  return '(no summary available)';
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function trimTrailingBlankLines(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }
  return result;
}

// ── Summary rendering ────────────────────────────────────────

export interface RenderSummaryOptions {
  /** Today's date as YYYY-MM-DD (injectable for deterministic tests) */
  generatedAt: string;
  /** Current project version, used to resolve expires_after_version hints */
  currentVersion?: string;
}

export function renderKnowledgeSummary(
  entries: KnowledgeEntry[],
  options: RenderSummaryOptions,
): string {
  const byCategory = new Map<string, KnowledgeEntry[]>();
  for (const entry of entries) {
    const bucket = byCategory.get(entry.category) ?? [];
    bucket.push(entry);
    byCategory.set(entry.category, bucket);
  }

  const categories = [...byCategory.keys()].sort();

  const sections = categories.flatMap((category) => {
    const bucket = byCategory.get(category) ?? [];
    const bullets = bucket.map((entry) => {
      const line = `${entry.title} — ${entry.summary}`;
      const expired =
        entry.expiresAfterVersion !== null &&
        options.currentVersion !== undefined &&
        compareVersions(options.currentVersion, entry.expiresAfterVersion) >= 0;
      return expired ? `- ~~${line}~~ _(expired at v${entry.expiresAfterVersion})_` : `- ${line}`;
    });

    return [
      `## ${category} (${bucket.length} ${bucket.length === 1 ? 'entry' : 'entries'})`,
      ...bullets,
      `[full entries: knowledge.md#${category}]`,
      '',
    ];
  });

  return [
    '---',
    'nexus_doc: true',
    'id: "knowledge_summary"',
    'status: auto',
    'generated_from: "knowledge.md"',
    `generated_at: "${options.generatedAt}"`,
    '---',
    '',
    '# Knowledge — Consolidated View',
    '',
    `> Auto-generated by \`nexus consolidate\` — do not edit by hand.`,
    `> Agents: read this first; the raw \`knowledge.md\` is the archaeology.`,
    '',
    ...sections,
  ].join('\n');
}

/**
 * Compare dotted version strings numerically.
 * Returns -1 / 0 / 1 like a standard comparator.
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i++) {
    const valueA = partsA[i] ?? 0;
    const valueB = partsB[i] ?? 0;
    if (valueA < valueB) return -1;
    if (valueA > valueB) return 1;
  }
  return 0;
}

/**
 * Strip volatile lines (generated_at) so summaries can be compared in --check mode.
 */
export function normalizeSummaryForComparison(summary: string): string {
  return summary
    .split('\n')
    .filter((line) => !line.startsWith('generated_at:'))
    .join('\n')
    .trimEnd();
}

// ── Archiving ────────────────────────────────────────────────

export interface ArchiveSplit {
  /** Entries that stay in knowledge.md */
  kept: KnowledgeEntry[];
  /** Entries older than the cutoff, moving to knowledge-archive.md */
  archived: KnowledgeEntry[];
}

export function splitForArchive(entries: KnowledgeEntry[], cutoffDate: string): ArchiveSplit {
  const kept: KnowledgeEntry[] = [];
  const archived: KnowledgeEntry[] = [];

  for (const entry of entries) {
    // Undated entries are never archived — we can't prove they're old.
    if (entry.date !== null && entry.date < cutoffDate) {
      archived.push(entry);
    } else {
      kept.push(entry);
    }
  }

  return { kept, archived };
}

export function renderKnowledgeFile(parsed: ParsedKnowledge, entries: KnowledgeEntry[]): string {
  const parts: string[] = [...parsed.preamble];

  for (const entry of entries) {
    parts.push(...entry.raw, '');
  }

  if (parsed.postamble.length > 0) {
    parts.push(...parsed.postamble);
  }

  return parts.join('\n');
}

export function renderArchiveHeader(): string {
  return [
    '# NEXUS Knowledge Archive',
    '',
    '> Entries older than one year, moved here by `nexus consolidate --archive`.',
    '> Still readable, off the hot path. Never delete.',
    '',
    '---',
    '',
  ].join('\n');
}
