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

import { runHarnessLauncher, renderNexusBanner, runHarnessVerify } from '../../src/commands/harness.js';
import { setActivePlan } from '../../src/utils/plans/active.js';
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

describe('renderNexusBanner', () => {
  it('renders banner with project info, active plan, and web mode', () => {
    const banner = renderNexusBanner({
      projectName: 'my-cool-app',
      projectRoot: '/path/to/my-cool-app',
      activePlan: 'feature-oauth',
      mode: 'web',
      port: 3080,
    });

    expect(banner).toContain('NEXUS HARNESS');
    expect(banner).toContain('my-cool-app');
    expect(banner).toContain('/path/to/my-cool-app');
    expect(banner).toContain('feature-oauth');
    expect(banner).toContain('Web UI (http://localhost:3080)');
  });

  it('renders banner with desktop and tui modes', () => {
    const desktopBanner = renderNexusBanner({
      projectName: 'test',
      projectRoot: '/test',
      mode: 'desktop',
    });
    expect(desktopBanner).toContain('Desktop App');

    const tuiBanner = renderNexusBanner({
      projectName: 'test',
      projectRoot: '/test',
      mode: 'tui',
    });
    expect(tuiBanner).toContain('Interactive Terminal Agent');
  });
});

describe('runHarnessLauncher', () => {
  let tmpDir: string;
  let cwdSpy: MockInstance;
  let logSpy: MockInstance;
  let exitSpy: MockInstance;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-launcher-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(tmpDir);
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

  it('exits 1 when no .nexus directory is found', async () => {
    await expect(runHarnessLauncher()).rejects.toThrow('process.exit(1)');
    expect(loggedErrors(logSpy).some((m) => m.includes('No .nexus directory found'))).toBe(true);
  });

  it('launches web profile by default with patch and active plan', async () => {
    await fs.ensureDir(path.join(tmpDir, '.nexus', 'plans'));
    await fs.writeJson(path.join(tmpDir, 'package.json'), { name: 'super-project' });
    await setActivePlan(path.join(tmpDir, '.nexus', 'plans'), 'plan-alpha');

    const runner = vi.fn().mockResolvedValue(undefined);

    await runHarnessLauncher({ runner });

    expect(runner).toHaveBeenCalledTimes(1);
    const [command, args, opts] = runner.mock.calls[0] as [string, string[], { cwd: string; env: Record<string, string> }];

    expect(command).toBeDefined();
    expect(args).toContain('--profile');
    expect(args).toContain('web');
    expect(args).toContain('--port');
    expect(args).toContain('3080');
    expect(args).toContain('--patch');

    // Check patch file created
    const patchIdx = args.indexOf('--patch');
    const patchFile = args[patchIdx + 1];
    expect(await fs.pathExists(patchFile!)).toBe(true);
    const patchContent = await fs.readFile(patchFile!, 'utf-8');
    expect(patchContent).toContain('@deepseek-ai/dsh-experimental-nexus-brain-context');
    expect(patchContent).toContain(tmpDir);

    // Environment and cwd
    expect(opts.cwd).toBe(tmpDir);
    expect(opts.env.NEXUS_PROJECT_ROOT).toBe(tmpDir);

    // Banner logged with active plan
    const printedLogs = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printedLogs).toContain('super-project');
    expect(printedLogs).toContain('plan-alpha');
  });

  it('launches tui mode with --tui', async () => {
    await fs.ensureDir(path.join(tmpDir, '.nexus'));

    const runner = vi.fn().mockResolvedValue(undefined);
    await runHarnessLauncher({ tui: true, runner });

    expect(runner).toHaveBeenCalledTimes(1);
    const [, args] = runner.mock.calls[0] as [string, string[], unknown];
    expect(args).toContain('--profile');
    expect(args).toContain('headless');
  });

  it('launches tui mode with task when provided', async () => {
    await fs.ensureDir(path.join(tmpDir, '.nexus'));

    const runner = vi.fn().mockResolvedValue(undefined);
    await runHarnessLauncher({ tui: true, task: 'Analyze codebase', runner });

    expect(runner).toHaveBeenCalledTimes(1);
    const [, args] = runner.mock.calls[0] as [string, string[], unknown];
    expect(args).toContain('--profile');
    expect(args).toContain('headless');
    expect(args).toContain('Analyze codebase');
  });

  it('launches desktop mode with --desktop', async () => {
    await fs.ensureDir(path.join(tmpDir, '.nexus'));

    const runner = vi.fn().mockResolvedValue(undefined);
    await runHarnessLauncher({ desktop: true, runner });

    expect(runner).toHaveBeenCalledTimes(1);
    const [, args] = runner.mock.calls[0] as [string, string[], unknown];
    expect(args).toContain('--profile');
    expect(args).toContain('desktop');
  });

  it('passes custom port and --no-open', async () => {
    await fs.ensureDir(path.join(tmpDir, '.nexus'));

    const runner = vi.fn().mockResolvedValue(undefined);
    await runHarnessLauncher({ port: '8088', open: false, runner });

    expect(runner).toHaveBeenCalledTimes(1);
    const [, args] = runner.mock.calls[0] as [string, string[], unknown];
    expect(args).toContain('--port');
    expect(args).toContain('8088');
    expect(args).toContain('--no-open');
  });

  it('falls back to on-demand npx @nexus-framework/harness when local repository binary is absent', async () => {
    await fs.ensureDir(path.join(tmpDir, '.nexus'));

    const pathExistsSpy = vi.spyOn(fs, 'pathExists').mockImplementation(async (filePath) => {
      if (typeof filePath === 'string' && (filePath.includes('bin.js') || filePath.includes('nexus-harness.js'))) {
        return false;
      }
      return true;
    });

    const runner = vi.fn().mockResolvedValue(undefined);
    await runHarnessLauncher({ runner });

    pathExistsSpy.mockRestore();

    expect(runner).toHaveBeenCalledTimes(1);
    const [command, args] = runner.mock.calls[0] as [string, string[], unknown];
    expect(command).toBe('npx');
    expect(args[0]).toBe('-y');
    expect(args[1]).toBe('@nexus-framework/harness');
    expect(args).toContain('--profile');
    expect(args).toContain('web');
  });

  it('launches headless mode with task when task is provided', async () => {
    await fs.ensureDir(path.join(tmpDir, '.nexus'));

    const runner = vi.fn().mockResolvedValue(undefined);
    await runHarnessLauncher({ task: 'Run integration test suite', runner });

    expect(runner).toHaveBeenCalledTimes(1);
    const [, args] = runner.mock.calls[0] as [string, string[], unknown];
    expect(args).toContain('--profile');
    expect(args).toContain('headless');
    expect(args).toContain('Run integration test suite');
  });

  it('checks for harness updates, asks user, and downloads before launching when user accepts', async () => {
    await fs.ensureDir(path.join(tmpDir, '.nexus'));

    const checkUpdate = vi.fn().mockResolvedValue({
      current: '1.0.0',
      latest: '1.1.1',
      hasUpdate: true,
      installCmd: 'npm install -g @nexus-framework/harness',
    });
    const promptUpdate = vi.fn().mockResolvedValue(true);
    const installUpdate = vi.fn().mockResolvedValue(true);
    const runner = vi.fn().mockResolvedValue(undefined);

    await runHarnessLauncher({
      checkUpdate,
      promptUpdate,
      installUpdate,
      runner,
    });

    expect(checkUpdate).toHaveBeenCalledTimes(1);
    expect(promptUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        current: '1.0.0',
        latest: '1.1.1',
        hasUpdate: true,
      }),
    );
    expect(installUpdate).toHaveBeenCalledWith('npm install -g @nexus-framework/harness');
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('skips downloading and launches harness when user declines update prompt', async () => {
    await fs.ensureDir(path.join(tmpDir, '.nexus'));

    const checkUpdate = vi.fn().mockResolvedValue({
      current: '1.0.0',
      latest: '1.1.1',
      hasUpdate: true,
      installCmd: 'npm install -g @nexus-framework/harness',
    });
    const promptUpdate = vi.fn().mockResolvedValue(false);
    const installUpdate = vi.fn().mockResolvedValue(true);
    const runner = vi.fn().mockResolvedValue(undefined);

    await runHarnessLauncher({
      checkUpdate,
      promptUpdate,
      installUpdate,
      runner,
    });

    expect(checkUpdate).toHaveBeenCalledTimes(1);
    expect(promptUpdate).toHaveBeenCalledTimes(1);
    expect(installUpdate).not.toHaveBeenCalled();
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('skips prompt and downloads when no update is available', async () => {
    await fs.ensureDir(path.join(tmpDir, '.nexus'));

    const checkUpdate = vi.fn().mockResolvedValue({
      current: '1.1.1',
      latest: '1.1.1',
      hasUpdate: false,
      installCmd: 'npm install -g @nexus-framework/harness',
    });
    const promptUpdate = vi.fn().mockResolvedValue(true);
    const installUpdate = vi.fn().mockResolvedValue(true);
    const runner = vi.fn().mockResolvedValue(undefined);

    await runHarnessLauncher({
      checkUpdate,
      promptUpdate,
      installUpdate,
      runner,
    });

    expect(checkUpdate).toHaveBeenCalledTimes(1);
    expect(promptUpdate).not.toHaveBeenCalled();
    expect(installUpdate).not.toHaveBeenCalled();
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('bypasses update check entirely when updateCheck is false', async () => {
    await fs.ensureDir(path.join(tmpDir, '.nexus'));

    const checkUpdate = vi.fn().mockResolvedValue({
      current: '1.0.0',
      latest: '1.1.1',
      hasUpdate: true,
      installCmd: 'npm install -g @nexus-framework/harness',
    });
    const runner = vi.fn().mockResolvedValue(undefined);

    await runHarnessLauncher({
      updateCheck: false,
      checkUpdate,
      runner,
    });

    expect(checkUpdate).not.toHaveBeenCalled();
    expect(runner).toHaveBeenCalledTimes(1);
  });
});


