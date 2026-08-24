/**
 * NEXUS CLI — `nexus harness verify` command unit tests
 *
 * `runHarnessVerify` is the testable core behind the CLI wiring
 * (`context-command.test.ts` establishes this pattern for `nexus context`).
 * The `client` field on its options is not a real CLI flag — see the
 * comment on `HarnessVerifyCliOptions` — it exists so these tests can drive
 * the whole command (validation, rendering, the harnesses.yml write-back)
 * without a real network call or a real Ollama instance.
 */

import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { runHarnessVerify } from '../../src/commands/harness.js';
import { loadHarnessesConfig } from '../../src/utils/harnesses/index.js';
import type { OllamaClient, OllamaGenerateCall } from '../../src/utils/harnesses/ollama-client.js';

const HARNESSES_YML = `
default: claude-code

harnesses:
  claude-code:
    window: 200000
    orientation_budget: 16000
    tool_calling: native
  ollama-local:
    window: 8192
    orientation_budget: 1500
    tool_calling: native
    model: cogito:8b
`;

let tmpDir: string;

async function makeProject(withHarnesses: boolean): Promise<void> {
  await fs.ensureDir(path.join(tmpDir, '.nexus', 'docs'));
  await fs.ensureDir(path.join(tmpDir, '.nexus', 'plans'));
  for (const sub of ['core', 'custom', 'community']) {
    await fs.ensureDir(path.join(tmpDir, '.nexus', 'skills', sub));
  }
  await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), '# Test Brain\n\n## ⏭️ What\'s Next\n');
  await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'knowledge.md'), '# Knowledge\n');
  if (withHarnesses) {
    await fs.writeFile(path.join(tmpDir, '.nexus', 'harnesses.yml'), HARNESSES_YML);
  }
}

/** A fake client that always recalls, always calls the tool correctly, never truncates. */
function makeHealthyClient(onCall?: (call: OllamaGenerateCall) => void): OllamaClient {
  return async (call) => {
    onCall?.(call);
    if (call.format === 'json') {
      return { ok: true, response: '{"tool": "read_file", "arguments": {"path": "README.md"}}' };
    }
    if (call.prompt.includes('"contract_version"')) {
      return { ok: true, response: 'OK', prompt_eval_count: 999999 };
    }
    const match = /SECRET CODE: (\S+)/.exec(call.prompt);
    return { ok: true, response: `The code is ${match?.[1] ?? ''}` };
  };
}

const unreachableClient: OllamaClient = async () => ({
  ok: false,
  response: '',
  error: 'connect ECONNREFUSED 127.0.0.1:11434',
});

/**
 * `logger.error` prints via `console.log(icon, message)` — see
 * `utils/logger.ts` — so error text is asserted through the same spy as
 * ordinary output, not `console.error`.
 */
function loggedErrors(logSpy: MockInstance): string[] {
  return logSpy.mock.calls.map((call) => String(call[1] ?? call[0]));
}

describe('runHarnessVerify', () => {
  let cwdSpy: MockInstance;
  let logSpy: MockInstance;
  let exitSpy: MockInstance;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-harness-cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    logSpy.mockRestore();
    exitSpy.mockRestore();
    await fs.remove(tmpDir);
  });

  it('exits 1 with a clear error when run outside a NEXUS project', async () => {
    await fs.ensureDir(tmpDir);
    await expect(runHarnessVerify('ollama-local', { client: makeHealthyClient() })).rejects.toThrow('process.exit(1)');
  });

  it('exits 1 with a clear error when .nexus/harnesses.yml does not exist', async () => {
    await makeProject(false);
    await expect(runHarnessVerify('ollama-local', { client: makeHealthyClient() })).rejects.toThrow('process.exit(1)');
    expect(loggedErrors(logSpy).some((m) => m.includes('No .nexus/harnesses.yml found'))).toBe(true);
  });

  it('exits 1 naming the declared profiles when the requested one is not declared', async () => {
    await makeProject(true);
    await expect(runHarnessVerify('nonexistent', { client: makeHealthyClient() })).rejects.toThrow('process.exit(1)');
    const messages = loggedErrors(logSpy);
    expect(messages.some((m) => m.includes('No profile named "nonexistent"'))).toBe(true);
    expect(messages.some((m) => m.includes('claude-code'))).toBe(true);
    expect(messages.some((m) => m.includes('ollama-local'))).toBe(true);
  });

  it('exits 1 when the profile has no model and --model was not given', async () => {
    await makeProject(true);
    // claude-code has no `model:` field in the fixture.
    await expect(runHarnessVerify('claude-code', { client: makeHealthyClient() })).rejects.toThrow('process.exit(1)');
    expect(loggedErrors(logSpy).some((m) => m.includes('needs to know which Ollama model'))).toBe(true);
  });

  it('--model overrides a missing profile model', async () => {
    await makeProject(true);
    const report = await runHarnessVerify('claude-code', { client: makeHealthyClient(), model: 'llama3' });
    expect(report?.model).toBe('llama3');
  });

  it('uses the profile\'s own model when --model is not given', async () => {
    await makeProject(true);
    const calls: OllamaGenerateCall[] = [];
    const report = await runHarnessVerify('ollama-local', { client: makeHealthyClient((c) => calls.push(c)) });
    expect(report?.model).toBe('cogito:8b');
    expect(calls.every((c) => c.model === 'cogito:8b')).toBe(true);
  });

  it('writes measured values back to harnesses.yml by default', async () => {
    await makeProject(true);
    const report = await runHarnessVerify('ollama-local', { client: makeHealthyClient() });
    expect(report?.reachable).toBe(true);

    const updated = await loadHarnessesConfig(path.join(tmpDir, '.nexus'));
    expect(updated?.harnesses['ollama-local']?.measured_at).toBe(report?.measuredAt);
    // The declared window must survive untouched.
    expect(updated?.harnesses['ollama-local']?.window).toBe(8192);
    // The other profile in the file must be untouched.
    expect(updated?.harnesses['claude-code']?.window).toBe(200000);
  });

  it('--dry-run reports findings without writing harnesses.yml', async () => {
    await makeProject(true);
    const before = await fs.readFile(path.join(tmpDir, '.nexus', 'harnesses.yml'), 'utf-8');

    await runHarnessVerify('ollama-local', { client: makeHealthyClient(), dryRun: true });

    const after = await fs.readFile(path.join(tmpDir, '.nexus', 'harnesses.yml'), 'utf-8');
    expect(after).toBe(before);
  });

  it('prints single-line JSON with --json', async () => {
    await makeProject(true);
    await runHarnessVerify('ollama-local', { client: makeHealthyClient(), json: true, dryRun: true });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const printed = logSpy.mock.calls[0]?.[0] as string;
    expect(printed.includes('\n')).toBe(false);
    expect(() => JSON.parse(printed)).not.toThrow();
  });

  it('prints a human-readable report without --json', async () => {
    await makeProject(true);
    await runHarnessVerify('ollama-local', { client: makeHealthyClient(), dryRun: true });

    const printed = logSpy.mock.calls[0]?.[0] as string;
    expect(printed).toContain('Harness: ollama-local');
    expect(printed).toContain('Declared window: 8192');
  });

  it('exits 1 and does not write harnesses.yml when the endpoint is unreachable', async () => {
    await makeProject(true);
    const before = await fs.readFile(path.join(tmpDir, '.nexus', 'harnesses.yml'), 'utf-8');

    await expect(runHarnessVerify('ollama-local', { client: unreachableClient })).rejects.toThrow('process.exit(1)');

    const after = await fs.readFile(path.join(tmpDir, '.nexus', 'harnesses.yml'), 'utf-8');
    expect(after).toBe(before);
    expect(loggedErrors(logSpy).some((m) => m.includes('Could not verify "ollama-local"'))).toBe(true);
  });
});
