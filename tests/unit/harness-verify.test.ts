/**
 * NEXUS CLI — `nexus harness verify` core logic unit tests
 *
 * Every test here runs against an injected fake `OllamaClient` (the same
 * seam `ChameleonExec` gives `chameleon-runner.test.ts`) — no test in this
 * file makes a network call or requires a real Ollama instance.
 */

import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveBrainContext, type BrainContext } from '../../src/mcp/context.js';
import type { OllamaClient, OllamaGenerateCall } from '../../src/utils/harnesses/ollama-client.js';
import type { HarnessProfile } from '../../src/utils/harnesses/types.js';
import { countTokens } from '../../src/utils/tokens.js';

import {
  applyMeasuredValues,
  buildNeedlePrompt,
  classifyToolCalling,
  verifyHarness,
  type HarnessVerifyReport,
} from '../../src/utils/harnesses/verify.js';

/* ──────────────────────────────────────────────────────────────
 * Fixture brain (composeContext reads real files off disk)
 * ────────────────────────────────────────────────────────────── */

const KNOWLEDGE_FIXTURE = `# Test Knowledge Base

## Entries

### [gotcha] Mount renames break npm
**2026-06-01** — npm install fails with ENOTEMPTY on mounted filesystems.
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
  tmpDir = path.join(os.tmpdir(), `nexus-harness-verify-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await makeBrain(tmpDir);
  ctx = resolveBrainContext(tmpDir);
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

/* ──────────────────────────────────────────────────────────────
 * Fake client
 * ────────────────────────────────────────────────────────────── */

interface FakeClientOptions {
  /** Needle recall succeeds only when the sent prompt is at or under this token depth. */
  effectiveWindowTokens: number;
  /** How many of the (in-order) structured tool-call attempts return valid JSON. */
  toolCallSuccesses: number;
  /** `prompt_eval_count` returned for the truncation probe = tokensSent * this ratio. */
  truncationRatio?: number;
  /** After this many total calls, every further call fails (simulates the endpoint dying). */
  failAfterCalls?: number;
  onCall?: (call: OllamaGenerateCall) => void;
}

function makeFakeClient(opts: FakeClientOptions): OllamaClient {
  let totalCalls = 0;
  let toolCallAttempts = 0;

  return async (call: OllamaGenerateCall) => {
    totalCalls += 1;
    opts.onCall?.(call);

    if (opts.failAfterCalls !== undefined && totalCalls > opts.failAfterCalls) {
      return { ok: false, response: '', error: 'simulated connection reset' };
    }

    // Tool-call probe: identified by format:'json', per verify.ts's probeToolCalling.
    if (call.format === 'json') {
      toolCallAttempts += 1;
      const valid = toolCallAttempts <= opts.toolCallSuccesses;
      return {
        ok: true,
        response: valid ? '{"tool": "read_file", "arguments": {"path": "README.md"}}' : 'not json at all',
      };
    }

    // Truncation probe: identified by the composed pack's own JSON shape.
    if (call.prompt.includes('"contract_version"')) {
      const tokensSent = countTokens(call.prompt);
      const ratio = opts.truncationRatio ?? 1;
      return { ok: true, response: 'OK', prompt_eval_count: Math.floor(tokensSent * ratio) };
    }

    // Needle probe: recall succeeds only under the simulated effective window.
    const match = /SECRET CODE: (\S+)/.exec(call.prompt);
    const secret = match?.[1] ?? '';
    const depth = countTokens(call.prompt);
    if (depth <= opts.effectiveWindowTokens) {
      return { ok: true, response: `The secret code is ${secret}.` };
    }
    return { ok: true, response: "I don't know." };
  };
}

function makeProfile(overrides: Partial<HarnessProfile> = {}): HarnessProfile {
  return {
    window: 8192,
    orientation_budget: 1500,
    tool_calling: 'native',
    ...overrides,
  };
}

/* ──────────────────────────────────────────────────────────────
 * classifyToolCalling
 * ────────────────────────────────────────────────────────────── */

describe('classifyToolCalling', () => {
  it('classifies 0 as none', () => {
    expect(classifyToolCalling(0)).toBe('none');
  });

  it('classifies a partial rate as unreliable', () => {
    expect(classifyToolCalling(0.5)).toBe('unreliable');
    expect(classifyToolCalling(0.89)).toBe('unreliable');
  });

  it('classifies >= 0.9 as native', () => {
    expect(classifyToolCalling(0.9)).toBe('native');
    expect(classifyToolCalling(1)).toBe('native');
  });
});

/* ──────────────────────────────────────────────────────────────
 * buildNeedlePrompt
 * ────────────────────────────────────────────────────────────── */

describe('buildNeedlePrompt', () => {
  it('embeds the given secret verbatim near the front', () => {
    const prompt = buildNeedlePrompt(512, 'NEEDLE-abc123');
    expect(prompt).toContain('SECRET CODE: NEEDLE-abc123');
    expect(prompt.indexOf('NEEDLE-abc123')).toBeLessThan(100);
  });

  it('pads out to roughly the requested depth', () => {
    const prompt = buildNeedlePrompt(2000, 'X');
    // Heuristic padding, not exact — just needs to be in the right neighbourhood.
    expect(countTokens(prompt)).toBeGreaterThan(1000);
  });

  it('does not crash or go negative when the requested depth is smaller than the scaffolding text', () => {
    const prompt = buildNeedlePrompt(1, 'X');
    expect(prompt).toContain('SECRET CODE: X');
  });
});

/* ──────────────────────────────────────────────────────────────
 * verifyHarness
 * ────────────────────────────────────────────────────────────── */

describe('verifyHarness', () => {
  it('reports a window disagreement, with the operator fix, when the endpoint recalls less than declared', async () => {
    const client = makeFakeClient({ effectiveWindowTokens: 300, toolCallSuccesses: 20 });
    const profile = makeProfile({ window: 8192 });

    const report = await verifyHarness({
      ctx,
      harnessId: 'ollama-local',
      profile,
      model: 'cogito',
      client,
      needleDepths: [100, 250, 500, 1000],
      toolCallAttempts: 4,
    });

    expect(report.reachable).toBe(true);
    expect(report.measuredWindow).toBe(250);
    expect(report.windowDisagreement).toBe(true);
    expect(report.findings.some((f) => f.includes('Effective context measured at 250'))).toBe(true);
    expect(report.findings.some((f) => f.includes('Fix: OLLAMA_CONTEXT_LENGTH=8192 ollama serve'))).toBe(true);
  });

  it('reports no disagreement when the measured window meets or exceeds the declared one', async () => {
    const client = makeFakeClient({ effectiveWindowTokens: 100_000, toolCallSuccesses: 4 });
    const profile = makeProfile({ window: 1000 });

    const report = await verifyHarness({
      ctx,
      harnessId: 'claude-code',
      profile,
      model: 'big-model',
      client,
      needleDepths: [100, 500, 1000],
      toolCallAttempts: 4,
    });

    expect(report.measuredWindow).toBe(1000);
    expect(report.windowDisagreement).toBe(false);
    expect(report.findings.some((f) => f.includes('Fix: OLLAMA_CONTEXT_LENGTH'))).toBe(false);
  });

  it('reports an unmeasured window, with a distinct finding, when recall fails at the smallest depth', async () => {
    const client = makeFakeClient({ effectiveWindowTokens: 0, toolCallSuccesses: 4 });
    const profile = makeProfile();

    const report = await verifyHarness({
      ctx,
      harnessId: 'tiny',
      profile,
      model: 'm',
      client,
      needleDepths: [100, 200],
      toolCallAttempts: 4,
    });

    expect(report.measuredWindow).toBeNull();
    expect(report.windowDisagreement).toBe(false);
    expect(report.findings.some((f) => f.includes('Recall failed even at the smallest probed depth'))).toBe(true);
  });

  it('measures the tool-call success rate and flags disagreement with the declared tool_calling', async () => {
    const client = makeFakeClient({ effectiveWindowTokens: 100_000, toolCallSuccesses: 1 });
    const profile = makeProfile({ tool_calling: 'native' });

    const report = await verifyHarness({
      ctx,
      harnessId: 'x',
      profile,
      model: 'm',
      client,
      needleDepths: [100],
      toolCallAttempts: 20,
    });

    expect(report.toolCallSuccessRate).toBeCloseTo(1 / 20);
    expect(report.measuredToolCalling).toBe('unreliable');
    expect(report.findings.some((f) => f.includes('Measured tool-call reliability is "unreliable"'))).toBe(true);
  });

  it('does not flag a tool-calling disagreement when the measured rate matches the declared value', async () => {
    const client = makeFakeClient({ effectiveWindowTokens: 100_000, toolCallSuccesses: 20 });
    const profile = makeProfile({ tool_calling: 'native' });

    const report = await verifyHarness({
      ctx,
      harnessId: 'x',
      profile,
      model: 'm',
      client,
      needleDepths: [100],
      toolCallAttempts: 20,
    });

    expect(report.measuredToolCalling).toBe('native');
    expect(report.findings.some((f) => f.includes('Measured tool-call reliability'))).toBe(false);
  });

  it('detects truncation when prompt_eval_count is materially lower than tokens sent', async () => {
    const client = makeFakeClient({ effectiveWindowTokens: 100_000, toolCallSuccesses: 4, truncationRatio: 0.3 });
    const profile = makeProfile();

    const report = await verifyHarness({
      ctx,
      harnessId: 'x',
      profile,
      model: 'm',
      client,
      needleDepths: [100],
      toolCallAttempts: 4,
    });

    expect(report.truncation?.detected).toBe(true);
    expect(report.findings.some((f) => f.includes('evidence of silent truncation'))).toBe(true);
    expect(report.truncation?.promptEvalCount).toBeLessThan(report.truncation?.tokensSent ?? 0);
  });

  it('does not flag truncation when prompt_eval_count roughly matches tokens sent', async () => {
    const client = makeFakeClient({ effectiveWindowTokens: 100_000, toolCallSuccesses: 4, truncationRatio: 1 });
    const profile = makeProfile();

    const report = await verifyHarness({
      ctx,
      harnessId: 'x',
      profile,
      model: 'm',
      client,
      needleDepths: [100],
      toolCallAttempts: 4,
    });

    expect(report.truncation?.detected).toBe(false);
  });

  it('reports reachable:false with an error, and runs no other probes, when the endpoint never responds', async () => {
    const client: OllamaClient = async () => ({ ok: false, response: '', error: 'ECONNREFUSED' });
    const profile = makeProfile();

    const report = await verifyHarness({
      ctx,
      harnessId: 'x',
      profile,
      model: 'm',
      client,
      needleDepths: [100, 200],
      toolCallAttempts: 4,
    });

    expect(report.reachable).toBe(false);
    expect(report.error).toBe('ECONNREFUSED');
    expect(report.measuredWindow).toBeNull();
    expect(report.toolCallSuccessRate).toBeNull();
    expect(report.truncation).toBeNull();
    expect(report.findings).toEqual([]);
  });

  it('sends every probe to the configured baseUrl and model', async () => {
    const calls: OllamaGenerateCall[] = [];
    const client = makeFakeClient({
      effectiveWindowTokens: 100_000,
      toolCallSuccesses: 4,
      onCall: (call) => calls.push(call),
    });
    const profile = makeProfile();

    await verifyHarness({
      ctx,
      harnessId: 'x',
      profile,
      model: 'cogito:8b',
      baseUrl: 'http://example.internal:11434',
      client,
      needleDepths: [100],
      toolCallAttempts: 4,
    });

    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.baseUrl).toBe('http://example.internal:11434');
      expect(call.model).toBe('cogito:8b');
    }
  });

  it('stamps measuredAt using the injected clock, formatted as an ISO date', async () => {
    const client = makeFakeClient({ effectiveWindowTokens: 100_000, toolCallSuccesses: 4 });
    const profile = makeProfile();

    const report = await verifyHarness({
      ctx,
      harnessId: 'x',
      profile,
      model: 'm',
      client,
      needleDepths: [100],
      toolCallAttempts: 4,
      now: () => new Date('2026-08-24T12:34:56Z'),
    });

    expect(report.measuredAt).toBe('2026-08-24');
  });
});

/* ──────────────────────────────────────────────────────────────
 * applyMeasuredValues
 * ────────────────────────────────────────────────────────────── */

describe('applyMeasuredValues', () => {
  const baseProfile = makeProfile({ window: 8192, tool_calling: 'native' });

  const report: HarnessVerifyReport = {
    harnessId: 'x',
    model: 'm',
    baseUrl: 'http://localhost:11434',
    reachable: true,
    declaredWindow: 8192,
    measuredWindow: 4096,
    windowDisagreement: true,
    toolCallSuccessRate: 0.5,
    measuredToolCalling: 'unreliable',
    truncation: { tokensSent: 1000, promptEvalCount: 400, detected: true },
    findings: ['some finding'],
    measuredAt: '2026-08-24',
  };

  it('never touches the declared window', () => {
    const updated = applyMeasuredValues(baseProfile, report);
    expect(updated.window).toBe(8192);
  });

  it('overwrites tool_calling with the measured classification', () => {
    const updated = applyMeasuredValues(baseProfile, report);
    expect(updated.tool_calling).toBe('unreliable');
  });

  it('records measured_at, measured_window, tool_call_success_rate, and truncation_detected', () => {
    const updated = applyMeasuredValues(baseProfile, report);
    expect(updated.measured_at).toBe('2026-08-24');
    expect(updated.measured_window).toBe(4096);
    expect(updated.tool_call_success_rate).toBe(0.5);
    expect(updated.truncation_detected).toBe(true);
  });

  it('leaves tool_calling untouched when the report has no measured classification', () => {
    const unreachableReport: HarnessVerifyReport = {
      ...report,
      reachable: false,
      measuredToolCalling: null,
      toolCallSuccessRate: null,
      measuredWindow: null,
      truncation: null,
    };
    const updated = applyMeasuredValues(baseProfile, unreachableReport);
    expect(updated.tool_calling).toBe('native');
    expect(updated.measured_window).toBeUndefined();
    expect(updated.tool_call_success_rate).toBeUndefined();
    expect(updated.truncation_detected).toBeUndefined();
  });
});
