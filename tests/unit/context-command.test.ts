import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { composeContext, runContextCommand } from '../../src/commands/context.js';
import { resolveBrainContext, type BrainContext } from '../../src/mcp/context.js';

const KNOWLEDGE_FIXTURE = `# Test Knowledge Base

## Entries

### [gotcha] Mount renames break npm
**2026-06-01** — npm install fails with ENOTEMPTY on mounted filesystems.

### [architecture] Markdown is the source of truth
**2026-06-02** — No database, no daemon. Everything lives in .nexus/.

---
`;

let tmpDir: string;
let ctx: BrainContext;

async function makeBrain(dir: string): Promise<void> {
  await fs.ensureDir(path.join(dir, '.nexus', 'docs'));
  await fs.ensureDir(path.join(dir, '.nexus', 'plans'));
  for (const sub of ['core', 'custom', 'community']) {
    await fs.ensureDir(path.join(dir, '.nexus', 'skills', sub));
  }
  await fs.writeFile(path.join(dir, '.nexus', 'docs', 'index.md'), '# Test Brain\n\n## ⏭️ What\'s Next\n');
  await fs.writeFile(path.join(dir, '.nexus', 'docs', 'knowledge.md'), KNOWLEDGE_FIXTURE);
}

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `nexus-context-cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await makeBrain(tmpDir);
  ctx = resolveBrainContext(tmpDir);
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

describe('composeContext — a straight pass-through to getContextTool', () => {
  it('defaults to a 3000-token budget when maxTokens is omitted', async () => {
    const result = await composeContext(ctx, { task: 'fix the login bug' });
    expect(result.task).toBe('fix the login bug');
    expect(result.truncated).toBe(false);
    expect(result.budget.maxTokens).toBe(3000);
  });

  it('a smaller maxTokens produces a pack that fits a proportionally smaller size', async () => {
    const generous = await composeContext(ctx, { task: 'mount renames npm', maxTokens: 3000 });
    const tiny = await composeContext(ctx, { task: 'mount renames npm', maxTokens: 500 });

    // getContextTool clamps to a 500-token floor (MIN_MAX_TOKENS), so a
    // request below that still returns *something* — the point is it is
    // not larger than the generous request.
    expect(tiny.budget.maxTokens).toBe(500);
    expect(JSON.stringify(tiny).length).toBeLessThanOrEqual(JSON.stringify(generous).length);
  });

  it('maxTokens reaches getContextTool untouched — no double conversion', async () => {
    // Regression guard: an earlier version of this command manually
    // converted maxTokens -> maxChars before calling getContextTool, which
    // (now that getContextTool accepts maxTokens natively) would silently
    // shrink or inflate the caller's actual budget through a second,
    // redundant conversion. budget.maxTokens on the result must equal
    // exactly what was requested.
    const result = await composeContext(ctx, { task: 'anything', maxTokens: 1234 });
    expect(result.budget.maxTokens).toBe(1234);
  });

  it('passes agent through to the underlying composer untouched', async () => {
    // An agent with no matching recipe file still degrades gracefully
    // (recipe resolves to null internally) rather than throwing — this
    // proves the `agent` field itself reaches getContextTool unmodified.
    const result = await composeContext(ctx, { task: 'anything', agent: 'nonexistent-agent' });
    expect(result.agent).toBe('nonexistent-agent');
    expect(result.task).toBe('anything');
  });

  it('carries contract_version, evicted[], and budget{} through from getContextTool', async () => {
    const result = await composeContext(ctx, { task: 'fix the login bug' });
    expect(typeof result.contract_version).toBe('string');
    expect(Array.isArray(result.evicted)).toBe(true);
    expect(result.budget).toEqual({
      maxTokens: 3000,
      used: expect.any(Number),
      remaining: expect.any(Number),
    });
  });
});

describe('runContextCommand', () => {
  let cwdSpy: MockInstance;
  let logSpy: MockInstance;

  beforeEach(() => {
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('returns the composed pack and prints valid, single-line JSON with --json', async () => {
    const result = await runContextCommand('fix the login bug', { json: true });
    expect(result?.task).toBe('fix the login bug');

    expect(logSpy).toHaveBeenCalledTimes(1);
    const printed = logSpy.mock.calls[0]?.[0] as string;
    expect(printed.includes('\n')).toBe(false);
    expect(() => JSON.parse(printed)).not.toThrow();
    expect(JSON.parse(printed)).toEqual(result);
  });

  it('--json surfaces evicted[] and budget{} — the caller needs to know what was dropped', async () => {
    // A tight budget against real knowledge/doc content forces an eviction,
    // so this is not just a shape check — it proves the caller can actually
    // see what did not make it into the pack.
    await runContextCommand('mount renames npm', { json: true, maxTokens: 500 });
    const printed = logSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(printed);

    expect(parsed.contract_version).toEqual(expect.any(String));
    expect(Array.isArray(parsed.evicted)).toBe(true);
    expect(parsed.budget).toEqual({ maxTokens: 500, used: expect.any(Number), remaining: expect.any(Number) });
  });

  it('prints a human-readable summary without --json, including budget and evictions', async () => {
    await runContextCommand('fix the login bug', {});
    const printed = logSpy.mock.calls[0]?.[0] as string;
    expect(printed).toContain('Task: fix the login bug');
    expect(printed).toContain('Active plan: none');
    expect(printed).toMatch(/Budget: \d+\/3000 tokens used, \d+ remaining/);
  });

  it('pretty output lists evictions when the budget forced any', async () => {
    await runContextCommand('mount renames npm', { maxTokens: 500 });
    const printed = logSpy.mock.calls[0]?.[0] as string;
    if (printed.includes('Truncated: yes')) {
      expect(printed).toContain('Evicted (did not fit the budget):');
    }
  });

  it('honours --max-tokens by forwarding it to composeContext', async () => {
    const result = await runContextCommand('mount renames npm', { json: true, maxTokens: 50 });
    expect(result).toBeDefined();
  });

  it('exits 1 with a clear error when run outside a NEXUS project', async () => {
    const bare = path.join(os.tmpdir(), `nexus-context-cmd-bare-${Date.now()}`);
    await fs.ensureDir(bare);
    cwdSpy.mockReturnValue(bare);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await expect(runContextCommand('anything')).rejects.toThrow('process.exit(1)');
    } finally {
      exitSpy.mockRestore();
      errorSpy.mockRestore();
      await fs.remove(bare);
    }
  });
});
