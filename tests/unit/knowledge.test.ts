import { describe, expect, it } from 'vitest';

import {
  compareVersions,
  normalizeSummaryForComparison,
  parseKnowledge,
  renderKnowledgeFile,
  renderKnowledgeSummary,
  splitForArchive,
} from '../../src/utils/knowledge.js';

const SAMPLE = [
  '# NEXUS Knowledge Base',
  '',
  '> Progressive learning file.',
  '',
  '---',
  '',
  '### [architecture] Three-Tier Design',
  '**2026-02-07** — NEXUS has three tiers: CLI, Skills, Studio.',
  '**Why:** Separation of concerns.',
  '**How to apply:** Keep tiers decoupled.',
  '',
  '### [gotcha] Version Drift',
  '**2026-06-09** — src/version.ts must be bumped with package.json.',
  'expires_after_version: "1.0.0"',
  '',
  '### [gotcha] Old Trap',
  '**2024-01-15** — Ancient wisdom from long ago.',
  '',
  '---',
  '',
  '*NEXUS Knowledge Base — footer line*',
].join('\n');

describe('parseKnowledge()', () => {
  it('parses entries with category, title, date, and summary', () => {
    const parsed = parseKnowledge(SAMPLE);

    expect(parsed.entries).toHaveLength(3);
    expect(parsed.entries[0]).toMatchObject({
      category: 'architecture',
      title: 'Three-Tier Design',
      date: '2026-02-07',
    });
    expect(parsed.entries[0].summary).toContain('three tiers');
  });

  it('extracts expires_after_version TTL hints', () => {
    const parsed = parseKnowledge(SAMPLE);
    expect(parsed.entries[1].expiresAfterVersion).toBe('1.0.0');
    expect(parsed.entries[0].expiresAfterVersion).toBeNull();
  });

  it('keeps preamble and footer separate from entries', () => {
    const parsed = parseKnowledge(SAMPLE);
    expect(parsed.preamble.join('\n')).toContain('# NEXUS Knowledge Base');
    expect(parsed.postamble.join('\n')).toContain('footer line');
    expect(parsed.entries[2].raw.join('\n')).not.toContain('footer line');
  });

  it('returns no entries for an empty knowledge file', () => {
    const parsed = parseKnowledge('# Knowledge\n\nNothing here yet.\n');
    expect(parsed.entries).toHaveLength(0);
  });
});

describe('renderKnowledgeSummary()', () => {
  it('groups entries by category with counts and source links', () => {
    const parsed = parseKnowledge(SAMPLE);
    const summary = renderKnowledgeSummary(parsed.entries, { generatedAt: '2026-06-09' });

    expect(summary).toContain('## architecture (1 entry)');
    expect(summary).toContain('## gotcha (2 entries)');
    expect(summary).toContain('[full entries: knowledge.md#gotcha]');
    expect(summary).toContain('generated_at: "2026-06-09"');
    expect(summary).toContain('status: auto');
  });

  it('strikes through entries expired by the current version', () => {
    const parsed = parseKnowledge(SAMPLE);
    const summary = renderKnowledgeSummary(parsed.entries, {
      generatedAt: '2026-06-09',
      currentVersion: '1.0.0',
    });

    expect(summary).toContain('~~Version Drift');
    expect(summary).toContain('_(expired at v1.0.0)_');
  });

  it('does not strike through entries when version is below the TTL', () => {
    const parsed = parseKnowledge(SAMPLE);
    const summary = renderKnowledgeSummary(parsed.entries, {
      generatedAt: '2026-06-09',
      currentVersion: '0.4.1',
    });

    expect(summary).not.toContain('~~Version Drift');
  });

  it('is deterministic for identical input', () => {
    const parsed = parseKnowledge(SAMPLE);
    const first = renderKnowledgeSummary(parsed.entries, { generatedAt: '2026-06-09' });
    const second = renderKnowledgeSummary(parsed.entries, { generatedAt: '2026-06-09' });
    expect(first).toBe(second);
  });
});

describe('normalizeSummaryForComparison()', () => {
  it('ignores generated_at when comparing summaries', () => {
    const parsed = parseKnowledge(SAMPLE);
    const a = renderKnowledgeSummary(parsed.entries, { generatedAt: '2026-06-09' });
    const b = renderKnowledgeSummary(parsed.entries, { generatedAt: '2027-01-01' });

    expect(a).not.toBe(b);
    expect(normalizeSummaryForComparison(a)).toBe(normalizeSummaryForComparison(b));
  });
});

describe('splitForArchive()', () => {
  it('moves entries older than the cutoff and keeps the rest', () => {
    const parsed = parseKnowledge(SAMPLE);
    const { kept, archived } = splitForArchive(parsed.entries, '2025-06-09');

    expect(archived).toHaveLength(1);
    expect(archived[0].title).toBe('Old Trap');
    expect(kept).toHaveLength(2);
  });

  it('never archives undated entries', () => {
    const parsed = parseKnowledge('### [gotcha] No Date\nSome text without a date.\n');
    const { kept, archived } = splitForArchive(parsed.entries, '2099-01-01');

    expect(archived).toHaveLength(0);
    expect(kept).toHaveLength(1);
  });
});

describe('renderKnowledgeFile()', () => {
  it('round-trips preamble, kept entries, and footer', () => {
    const parsed = parseKnowledge(SAMPLE);
    const { kept } = splitForArchive(parsed.entries, '2025-06-09');
    const rewritten = renderKnowledgeFile(parsed, kept);

    expect(rewritten).toContain('# NEXUS Knowledge Base');
    expect(rewritten).toContain('Three-Tier Design');
    expect(rewritten).toContain('footer line');
    expect(rewritten).not.toContain('Old Trap');

    // Re-parsing the rewritten file yields the kept entries
    const reparsed = parseKnowledge(rewritten);
    expect(reparsed.entries).toHaveLength(2);
  });
});

describe('compareVersions()', () => {
  it('compares dotted versions numerically', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.4.1', '1.0.0')).toBe(-1);
    expect(compareVersions('1.0.0', '0.10.0')).toBe(1);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
  });
});
