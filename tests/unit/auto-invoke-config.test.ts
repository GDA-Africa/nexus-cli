import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_AUTO_INVOKE_CONFIG,
  isInteractiveEnvironment,
  resolveAutoInvokeMode,
  shouldPromptInteractively,
  shouldSkipAutoInvoke,
  type AutoInvokeConfig,
} from '../../src/utils/auto-invoke-config.js';

describe('auto-invoke-config utilities', () => {
  it('resolves interactive mode when --brain-check is used', () => {
    const mode = resolveAutoInvokeMode(DEFAULT_AUTO_INVOKE_CONFIG, {
      brainCheck: true,
      noBrainCheck: false,
    });

    expect(mode).toBe('interactive');
  });

  it('resolves disabled mode when --no-brain-check is used', () => {
    const mode = resolveAutoInvokeMode(DEFAULT_AUTO_INVOKE_CONFIG, {
      brainCheck: false,
      noBrainCheck: true,
    });

    expect(mode).toBe('disabled');
  });

  it('skips auto-invoke for init/adopt and disabled command entries', () => {
    const config: AutoInvokeConfig = {
      ...DEFAULT_AUTO_INVOKE_CONFIG,
      disabled_for_commands: ['skill install'],
    };

    expect(shouldSkipAutoInvoke(['init'], config)).toBe(true);
    expect(shouldSkipAutoInvoke(['adopt'], config)).toBe(true);
    expect(shouldSkipAutoInvoke(['skill', 'install'], config)).toBe(true);
    expect(shouldSkipAutoInvoke(['plan', 'new'], config)).toBe(false);
  });

  it('only prompts in interactive mode — silent and disabled never prompt', () => {
    // Regression guard: a stale repo or an always_prompt_for command must NOT
    // escalate silent mode into a prompt, because that prompt crashes in any
    // non-TTY (agent/CI/pipe) environment.
    expect(shouldPromptInteractively('interactive')).toBe(true);
    expect(shouldPromptInteractively('silent')).toBe(false);
    expect(shouldPromptInteractively('disabled')).toBe(false);
  });

  describe('isInteractiveEnvironment', () => {
    const original = {
      ci: process.env.CI,
      nonInteractive: process.env.NEXUS_NONINTERACTIVE,
      stdin: process.stdin.isTTY,
      stdout: process.stdout.isTTY,
    };

    afterEach(() => {
      restoreEnv('CI', original.ci);
      restoreEnv('NEXUS_NONINTERACTIVE', original.nonInteractive);
      setTty('stdin', original.stdin);
      setTty('stdout', original.stdout);
    });

    it('is false when NEXUS_NONINTERACTIVE=1, regardless of TTY', () => {
      delete process.env.CI;
      process.env.NEXUS_NONINTERACTIVE = '1';
      setTty('stdin', true);
      setTty('stdout', true);
      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('is false under CI', () => {
      delete process.env.NEXUS_NONINTERACTIVE;
      process.env.CI = 'true';
      setTty('stdin', true);
      setTty('stdout', true);
      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('is false when stdin/stdout are not TTYs (the agent/pipe case)', () => {
      delete process.env.CI;
      delete process.env.NEXUS_NONINTERACTIVE;
      setTty('stdin', false);
      setTty('stdout', false);
      expect(isInteractiveEnvironment()).toBe(false);
    });

    it('is true only with real TTYs and no opt-out', () => {
      delete process.env.CI;
      delete process.env.NEXUS_NONINTERACTIVE;
      setTty('stdin', true);
      setTty('stdout', true);
      expect(isInteractiveEnvironment()).toBe(true);
    });
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

function setTty(stream: 'stdin' | 'stdout', value: boolean | undefined): void {
  Object.defineProperty(process[stream], 'isTTY', {
    value,
    configurable: true,
  });
}
