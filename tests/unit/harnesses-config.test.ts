import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  HarnessesConfigError,
  HarnessesConfigSchema,
  loadHarnessesConfig,
  parseHarnessesConfig,
  resolveFileForHarness,
  resolveHarnessProfile,
  resolveProfileForFile,
  READS_MARKER_SUMMARY,
  READS_MARKER_NONE,
  withReadsMarker,
  assumedOrientationReads
} from '../../src/utils/harnesses/index.js';

const SPEC_EXAMPLE = `
default: claude-code

harnesses:
  claude-code:
    window: 200000
    orientation_budget: 16000
    tool_calling: native
  cursor:
    window: 128000
    orientation_budget: 12000
    tool_calling: native
  ollama-local:
    window: 4096
    orientation_budget: 1500
    tool_calling: unreliable
`;

describe('HarnessesConfigSchema', () => {
  it('accepts the spec\'s own example verbatim', () => {
    const parsed = parseHarnessesConfig(SPEC_EXAMPLE);
    expect(parsed.default).toBe('claude-code');
    expect(parsed.harnesses['claude-code']).toEqual({
      window: 200000,
      orientation_budget: 16000,
      tool_calling: 'native',
    });
    expect(parsed.harnesses['ollama-local'].tool_calling).toBe('unreliable');
  });

  it('rejects a default that names no harness', () => {
    expect(() =>
      parseHarnessesConfig(`
default: nonexistent
harnesses:
  claude-code: { window: 200000, orientation_budget: 16000, tool_calling: native }
`),
    ).toThrow(HarnessesConfigError);
  });

  it('rejects an unknown tool_calling value', () => {
    expect(() =>
      parseHarnessesConfig(`
default: x
harnesses:
  x: { window: 4096, orientation_budget: 1500, tool_calling: sometimes }
`),
    ).toThrow(HarnessesConfigError);
  });

  it('rejects a non-positive window or budget', () => {
    expect(() =>
      parseHarnessesConfig(`
default: x
harnesses:
  x: { window: -1, orientation_budget: 1500, tool_calling: native }
`),
    ).toThrow(HarnessesConfigError);

    expect(() =>
      parseHarnessesConfig(`
default: x
harnesses:
  x: { window: 4096, orientation_budget: 0, tool_calling: native }
`),
    ).toThrow(HarnessesConfigError);
  });

  it('rejects invalid YAML with a clear error, not a crash', () => {
    expect(() => parseHarnessesConfig('default: [unterminated')).toThrow(HarnessesConfigError);
  });

  it('accepts an explicit file override', () => {
    const parsed = parseHarnessesConfig(`
default: ollama
harnesses:
  ollama:
    window: 4096
    orientation_budget: 1500
    tool_calling: unreliable
    file: CLAUDE.md
`);
    expect(parsed.harnesses.ollama.file).toBe('CLAUDE.md');
  });

  it('schema is importable and usable directly (not just through parseHarnessesConfig)', () => {
    const result = HarnessesConfigSchema.safeParse({
      default: 'a',
      harnesses: { a: { window: 1, orientation_budget: 1, tool_calling: 'native' } },
    });
    expect(result.success).toBe(true);
  });
});

describe('loadHarnessesConfig — absent-file behaviour', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-harnesses-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns null, not a default object, when harnesses.yml does not exist', async () => {
    expect(await loadHarnessesConfig(tmpDir)).toBeNull();
  });

  it('loads and validates a real file from disk', async () => {
    await fs.writeFile(path.join(tmpDir, 'harnesses.yml'), SPEC_EXAMPLE, 'utf-8');
    const config = await loadHarnessesConfig(tmpDir);
    expect(config?.default).toBe('claude-code');
  });

  it('throws HarnessesConfigError, naming the file, for an invalid on-disk file', async () => {
    await fs.writeFile(path.join(tmpDir, 'harnesses.yml'), 'default: missing\nharnesses: {}\n', 'utf-8');
    await expect(loadHarnessesConfig(tmpDir)).rejects.toThrow(HarnessesConfigError);
  });
});

describe('resolveHarnessProfile / resolveProfileForFile / resolveFileForHarness', () => {
  const config = parseHarnessesConfig(SPEC_EXAMPLE);

  it('resolveHarnessProfile returns null for a null config — the "no harnesses.yml" case', () => {
    expect(resolveHarnessProfile(null, 'claude-code')).toBeNull();
  });

  it('resolveHarnessProfile finds a declared id directly', () => {
    expect(resolveHarnessProfile(config, 'cursor')?.orientation_budget).toBe(12000);
  });

  it('resolveHarnessProfile falls back to the declared default for an unknown id', () => {
    expect(resolveHarnessProfile(config, 'some-unlisted-harness')).toEqual(config.harnesses['claude-code']);
  });

  it('resolveProfileForFile maps CLAUDE.md to the claude-code profile via the canonical table', () => {
    expect(resolveProfileForFile(config, 'CLAUDE.md')?.orientation_budget).toBe(16000);
  });

  it('resolveProfileForFile maps .cursorrules to the cursor profile', () => {
    expect(resolveProfileForFile(config, '.cursorrules')?.orientation_budget).toBe(12000);
  });

  it('resolveProfileForFile returns null for a file no declared harness targets', () => {
    // Nothing in SPEC_EXAMPLE declares windsurf/cline/copilot.
    expect(resolveProfileForFile(config, '.windsurfrules')).toBeNull();
  });

  it('resolveProfileForFile returns null for every file when config itself is null', () => {
    expect(resolveProfileForFile(null, 'CLAUDE.md')).toBeNull();
  });

  it('an explicit file override on a harness id is honoured, even for a non-canonical id', () => {
    const withOverride = parseHarnessesConfig(`
default: ollama
harnesses:
  ollama:
    window: 4096
    orientation_budget: 1500
    tool_calling: unreliable
    file: CLAUDE.md
`);
    expect(resolveProfileForFile(withOverride, 'CLAUDE.md')?.orientation_budget).toBe(1500);
    expect(resolveFileForHarness(withOverride, 'ollama')).toBe('CLAUDE.md');
  });

  it('resolveFileForHarness returns null for a harness id with neither an override nor a canonical file', () => {
    // ollama-local in SPEC_EXAMPLE has no `file:` and is not in HARNESS_FILE_MAP —
    // it is a bare model target reached only through `nexus context`.
    expect(resolveFileForHarness(config, 'ollama-local')).toBeNull();
  });

  it('resolveFileForHarness resolves a canonical id to its conventional file', () => {
    expect(resolveFileForHarness(config, 'cursor')).toBe('.cursorrules');
    expect(resolveFileForHarness(config, 'claude-code')).toBe('CLAUDE.md');
  });
});

describe('summary-first orientation contract', () => {
  it('standard variant counts knowledge-summary.md, not the append-only log', () => {
    const standard = withReadsMarker('# instructions', READS_MARKER_SUMMARY);
    expect(assumedOrientationReads(standard)).toEqual([
      '.nexus/docs/index.md',
      '.nexus/docs/knowledge-summary.md',
    ]);
  });

  it('un-markered legacy files still assume the full read', () => {
    expect(assumedOrientationReads('# hand-written, no marker')).toEqual([
      '.nexus/docs/index.md',
      '.nexus/docs/knowledge.md',
    ]);
  });

  it('self-contained variants read nothing beyond themselves', () => {
    const none = withReadsMarker('# pointer', READS_MARKER_NONE);
    expect(assumedOrientationReads(none)).toEqual([]);
  });
});
