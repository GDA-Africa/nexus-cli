import { describe, expect, it } from 'vitest';

import {
  DEFAULT_AUTO_INVOKE_CONFIG,
  resolveAutoInvokeMode,
  shouldPromptInteractively,
  shouldSkipAutoInvoke,
  type AutoInvokeConfig,
} from '../../src/utils/auto-invoke-config.js';
import type { BrainDetectionResult } from '../../src/utils/brain-detector.js';

describe('auto-invoke-config utilities', () => {
  const baseDetection: BrainDetectionResult = {
    checkedAt: new Date().toISOString(),
    shouldSync: false,
    shouldDoctor: false,
    reasons: [],
    lastSyncAt: new Date().toISOString(),
    hasNewCommitsSinceSync: false,
    doctorWarnOrHigher: 0,
    knowledgeLines: 10,
    knowledgeEntries: 2,
    stalePlanCount: 0,
    vitalsPresent: true,
  };

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

  it('prompts in silent mode when command is configured as always_prompt_for', () => {
    const config: AutoInvokeConfig = {
      ...DEFAULT_AUTO_INVOKE_CONFIG,
      always_prompt_for: ['plan'],
    };

    const shouldPrompt = shouldPromptInteractively('silent', ['plan', 'start'], config, baseDetection);
    expect(shouldPrompt).toBe(true);
  });
});
