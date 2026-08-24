/**
 * NEXUS CLI — `nexus harness verify` core logic
 *
 * `window` in `harnesses.yml` is a claim, not a measurement — whatever the
 * user typed. For a local model behind Ollama the *effective* context is
 * governed by `OLLAMA_CONTEXT_LENGTH`, the Modelfile, and the per-request
 * `num_ctx`, and the defaults are small (4096, or legacy 2048). A wrong
 * declared `window` silently reproduces the exact bug this profile system
 * exists to fix: Ollama truncates silently and keeps the *tail*, so a model
 * can receive a fragment of `knowledge.md` and never see the instruction
 * file at all (`nexus-harness-work.md` §1, §4).
 *
 * This module runs three live probes against a configured Ollama-compatible
 * endpoint and reports what it actually found:
 *
 *   1. `probeEffectiveWindow` — a needle at increasing depth, until recall
 *      fails, to find the *effective* context window.
 *   2. `probeTruncation` — this project's own bounded pack (reusing the same
 *      composer `nexus context` / `nexus_get_context` use), compared against
 *      the endpoint's reported `prompt_eval_count`.
 *   3. `probeToolCalling` — one structured tool call, twenty times, to
 *      measure (not guess) `tool_calling`.
 *
 * It is the one place in this codebase allowed to make a live model call
 * (`ollama-client.ts`), matching the precedent `detectChameleon` sets for a
 * capability handshake (`chameleon/runner.ts:259-291`): opt-in, resolved
 * from the environment, absence handled gracefully, never on an automatic
 * path. `nexus doctor` never calls into this module.
 */

import { randomUUID } from 'node:crypto';

import { composeContext } from '../../commands/context.js';
import type { BrainContext } from '../../mcp/context.js';
import { CHARS_PER_TOKEN, countTokens } from '../tokens.js';

import { defaultOllamaClient, type OllamaClient } from './ollama-client.js';
import type { HarnessProfile, ToolCalling } from './types.js';

/* ──────────────────────────────────────────────────────────────
 * Defaults
 * ────────────────────────────────────────────────────────────── */

export const DEFAULT_BASE_URL = 'http://localhost:11434';

/**
 * Doubling ladder from 512 to 128k tokens. Coarse by design — this is a
 * cheap opt-in probe, not a binary search for the exact byte where recall
 * breaks, and a doubling step is enough to catch the failure modes that
 * matter (a 4k-window model claimed as 8k or 200k).
 */
export const DEFAULT_NEEDLE_DEPTHS_TOKENS: readonly number[] = [
  512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072,
];

export const DEFAULT_TOOL_CALL_ATTEMPTS = 20;

export const DEFAULT_VERIFY_TASK = 'orient a coding agent on this project';

/** Success-rate cutoff at/above which measured tool calling counts as `native`. */
export const TOOL_CALLING_NATIVE_THRESHOLD = 0.9;

/**
 * How far below tokens-sent `prompt_eval_count` has to fall before it counts
 * as truncation evidence rather than tokenizer-vs-tokenizer rounding noise
 * (NEXUS counts with `gpt-tokenizer`; Ollama counts with the model's own
 * tokenizer — the two are never byte-identical even when nothing was cut).
 */
export const TRUNCATION_THRESHOLD_RATIO = 0.9;

/* ──────────────────────────────────────────────────────────────
 * Tool-calling classification
 * ────────────────────────────────────────────────────────────── */

/** Turn a measured valid-call rate into the same vocabulary `tool_calling` uses. */
export function classifyToolCalling(successRate: number): ToolCalling {
  if (successRate <= 0) return 'none';
  if (successRate >= TOOL_CALLING_NATIVE_THRESHOLD) return 'native';
  return 'unreliable';
}

/* ──────────────────────────────────────────────────────────────
 * Needle-in-haystack window probe
 * ────────────────────────────────────────────────────────────── */

const NEEDLE_FILLER_LINE =
  'The quick brown fox jumps over the lazy dog near the riverbank at dusk. ';

/**
 * Pad to roughly `tokenBudget` tokens using the `CHARS_PER_TOKEN` heuristic
 * rather than calling `countTokens` in a growth loop — filler content does
 * not need to be exact, only roughly the right depth, and re-tokenizing a
 * string on every iteration would make the largest ladder rungs (128k
 * tokens) quadratic in the string length for no measurable benefit.
 */
function buildFiller(tokenBudget: number): string {
  if (tokenBudget <= 0) return '';
  const approxChars = tokenBudget * CHARS_PER_TOKEN;
  const repeats = Math.max(1, Math.ceil(approxChars / NEEDLE_FILLER_LINE.length));
  return NEEDLE_FILLER_LINE.repeat(repeats);
}

/** Build one needle probe prompt: a unique secret up front, then filler out to `depthTokens`. */
export function buildNeedlePrompt(depthTokens: number, secret: string): string {
  const header = `SECRET CODE: ${secret}\nRemember this secret code. It appears once, right here.\n\n`;
  const footer =
    '\n\nWhat is the SECRET CODE stated at the very beginning of this message? Reply with only the code, nothing else.';
  const fillerBudget = depthTokens - countTokens(header) - countTokens(footer);
  return `${header}${buildFiller(fillerBudget)}${footer}`;
}

export interface NeedleProbeResult {
  /** Largest depth at which the secret was recalled. `null` if even the smallest depth failed. */
  measuredWindow: number | null;
  /** Depths actually sent, in order, before the probe stopped. */
  attempted: number[];
  reachable: boolean;
  error?: string;
}

async function probeEffectiveWindow(params: {
  client: OllamaClient;
  baseUrl: string;
  model: string;
  depths: readonly number[];
}): Promise<NeedleProbeResult> {
  const attempted: number[] = [];
  let measuredWindow: number | null = null;

  for (const depth of params.depths) {
    const secret = `NEEDLE-${depth}-${randomUUID().slice(0, 8)}`;
    const prompt = buildNeedlePrompt(depth, secret);
    const reply = await params.client({ baseUrl: params.baseUrl, model: params.model, prompt });

    if (!reply.ok) {
      return { measuredWindow, attempted, reachable: attempted.length > 0, error: reply.error };
    }

    attempted.push(depth);

    if (reply.response.includes(secret)) {
      measuredWindow = depth;
    } else {
      break;
    }
  }

  return { measuredWindow, attempted, reachable: true };
}

/* ──────────────────────────────────────────────────────────────
 * Truncation probe — this project's own bounded pack
 * ────────────────────────────────────────────────────────────── */

export interface TruncationProbeResult {
  tokensSent: number;
  promptEvalCount: number | null;
  detected: boolean;
  reachable: boolean;
  error?: string;
}

async function probeTruncation(params: {
  client: OllamaClient;
  baseUrl: string;
  model: string;
  ctx: BrainContext;
  task: string;
  maxTokens: number;
}): Promise<TruncationProbeResult> {
  const pack = await composeContext(params.ctx, { task: params.task, maxTokens: params.maxTokens });
  const packJson = JSON.stringify(pack);
  const prompt = `${packJson}\n\nAcknowledge you received this by replying with only the word OK.`;
  const tokensSent = countTokens(prompt);

  const reply = await params.client({ baseUrl: params.baseUrl, model: params.model, prompt });
  if (!reply.ok) {
    return { tokensSent, promptEvalCount: null, detected: false, reachable: false, error: reply.error };
  }

  const promptEvalCount = reply.prompt_eval_count ?? null;
  const detected = promptEvalCount !== null && promptEvalCount < tokensSent * TRUNCATION_THRESHOLD_RATIO;

  return { tokensSent, promptEvalCount, detected, reachable: true };
}

/* ──────────────────────────────────────────────────────────────
 * Structured tool-call probe
 * ────────────────────────────────────────────────────────────── */

const TOOL_CALL_PROMPT = [
  'Respond with ONLY a single JSON object, no prose before or after it, matching exactly this shape:',
  '{"tool": "read_file", "arguments": {"path": "README.md"}}',
  'Use exactly those two top-level keys: "tool" (a string) and "arguments" (an object).',
].join('\n');

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function isValidToolCall(text: string): boolean {
  const candidate = extractJsonObject(text);
  if (!candidate) return false;

  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    return (
      typeof parsed.tool === 'string' &&
      parsed.tool.length > 0 &&
      typeof parsed.arguments === 'object' &&
      parsed.arguments !== null &&
      !Array.isArray(parsed.arguments)
    );
  } catch {
    return false;
  }
}

export interface ToolCallProbeResult {
  successRate: number | null;
  attemptsMade: number;
  reachable: boolean;
  error?: string;
}

async function probeToolCalling(params: {
  client: OllamaClient;
  baseUrl: string;
  model: string;
  attempts: number;
}): Promise<ToolCallProbeResult> {
  let successes = 0;
  let attemptsMade = 0;

  for (let i = 0; i < params.attempts; i += 1) {
    const reply = await params.client({
      baseUrl: params.baseUrl,
      model: params.model,
      prompt: TOOL_CALL_PROMPT,
      format: 'json',
    });

    if (!reply.ok) {
      if (attemptsMade === 0) {
        return { successRate: null, attemptsMade: 0, reachable: false, error: reply.error };
      }
      break;
    }

    attemptsMade += 1;
    if (isValidToolCall(reply.response)) successes += 1;
  }

  return {
    successRate: attemptsMade > 0 ? successes / attemptsMade : null,
    attemptsMade,
    reachable: true,
  };
}

/* ──────────────────────────────────────────────────────────────
 * Orchestrator
 * ────────────────────────────────────────────────────────────── */

export interface VerifyHarnessOptions {
  ctx: BrainContext;
  harnessId: string;
  profile: HarnessProfile;
  /** Model name to query — the CLI resolves this from `--model` or `profile.model`. */
  model: string;
  baseUrl?: string;
  client?: OllamaClient;
  needleDepths?: readonly number[];
  toolCallAttempts?: number;
  /** Task string used to compose the bounded pack for the truncation probe. */
  task?: string;
  /** Injectable clock — tests pin `measuredAt` without mocking global time. */
  now?: () => Date;
}

export interface HarnessVerifyReport {
  harnessId: string;
  model: string;
  baseUrl: string;
  /** False only when the endpoint could not be reached at all — no probe ran. */
  reachable: boolean;
  declaredWindow: number;
  measuredWindow: number | null;
  windowDisagreement: boolean;
  toolCallSuccessRate: number | null;
  measuredToolCalling: ToolCalling | null;
  truncation: {
    tokensSent: number;
    promptEvalCount: number | null;
    detected: boolean;
  } | null;
  /** Operator-facing findings — empty when measured reality matches the profile. */
  findings: string[];
  measuredAt: string;
  /** Populated only when `reachable` is false. */
  error?: string;
}

/**
 * Run all three probes against `options.model` at `options.baseUrl`
 * (default `http://localhost:11434`) and report what disagrees with the
 * declared profile. Never writes to `harnesses.yml` itself — see
 * `applyMeasuredValues` and `commands/harness.ts`, which do the write only
 * after the caller has seen the report.
 */
export async function verifyHarness(options: VerifyHarnessOptions): Promise<HarnessVerifyReport> {
  const client = options.client ?? defaultOllamaClient;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const depths = options.needleDepths ?? DEFAULT_NEEDLE_DEPTHS_TOKENS;
  const attempts = options.toolCallAttempts ?? DEFAULT_TOOL_CALL_ATTEMPTS;
  const task = options.task ?? DEFAULT_VERIFY_TASK;
  const now = options.now ?? ((): Date => new Date());
  const measuredAt = now().toISOString().slice(0, 10);
  const declaredWindow = options.profile.window;

  const windowProbe = await probeEffectiveWindow({
    client,
    baseUrl,
    model: options.model,
    depths,
  });

  if (!windowProbe.reachable) {
    return {
      harnessId: options.harnessId,
      model: options.model,
      baseUrl,
      reachable: false,
      declaredWindow,
      measuredWindow: null,
      windowDisagreement: false,
      toolCallSuccessRate: null,
      measuredToolCalling: null,
      truncation: null,
      findings: [],
      measuredAt,
      error: windowProbe.error ?? `Could not reach an Ollama-compatible endpoint at ${baseUrl}.`,
    };
  }

  const [truncationProbe, toolCallProbe] = await Promise.all([
    probeTruncation({
      client,
      baseUrl,
      model: options.model,
      ctx: options.ctx,
      task,
      maxTokens: options.profile.orientation_budget,
    }),
    probeToolCalling({ client, baseUrl, model: options.model, attempts }),
  ]);

  const findings: string[] = [];
  const measuredWindow = windowProbe.measuredWindow;
  const windowDisagreement = measuredWindow !== null && measuredWindow < declaredWindow;

  if (windowDisagreement) {
    findings.push(
      `Effective context measured at ${measuredWindow}, profile declares ${declaredWindow}.\n` +
        `Fix: OLLAMA_CONTEXT_LENGTH=${declaredWindow} ollama serve`,
    );
  } else if (measuredWindow === null) {
    findings.push(
      `Recall failed even at the smallest probed depth (${depths[0]} tokens) — the effective ` +
        'window could not be measured. The endpoint answered, so this looks like a genuinely ' +
        'tiny window rather than an unreachable one.',
    );
  }

  if (truncationProbe.detected) {
    findings.push(
      `Sent ${truncationProbe.tokensSent} tokens of this project's own bounded pack, but the ` +
        `endpoint reports evaluating only ${truncationProbe.promptEvalCount} — evidence of silent ` +
        'truncation on this exact orientation payload, independent of the needle probe above.',
    );
  }

  const measuredToolCalling =
    toolCallProbe.successRate !== null ? classifyToolCalling(toolCallProbe.successRate) : null;

  if (measuredToolCalling && measuredToolCalling !== options.profile.tool_calling) {
    const pct = Math.round((toolCallProbe.successRate ?? 0) * 100);
    findings.push(
      `Measured tool-call reliability is "${measuredToolCalling}" (${pct}% valid over ` +
        `${toolCallProbe.attemptsMade} attempts), but the profile declares ` +
        `"${options.profile.tool_calling}".`,
    );
  }

  return {
    harnessId: options.harnessId,
    model: options.model,
    baseUrl,
    reachable: true,
    declaredWindow,
    measuredWindow,
    windowDisagreement,
    toolCallSuccessRate: toolCallProbe.successRate,
    measuredToolCalling,
    truncation: {
      tokensSent: truncationProbe.tokensSent,
      promptEvalCount: truncationProbe.promptEvalCount,
      detected: truncationProbe.detected,
    },
    findings,
    measuredAt,
  };
}

/**
 * Fold a verify report into an updated profile, ready to write back.
 *
 * Deliberately never touches `window` — see that field's comment in
 * `types.ts`. `tool_calling` IS overwritten when a rate was measured: unlike
 * `window`, it is not a user intent to preserve, it is exactly the guess
 * this measurement replaces.
 */
export function applyMeasuredValues(
  profile: HarnessProfile,
  report: HarnessVerifyReport,
): HarnessProfile {
  return {
    ...profile,
    measured_at: report.measuredAt,
    ...(report.measuredWindow !== null ? { measured_window: report.measuredWindow } : {}),
    ...(report.toolCallSuccessRate !== null
      ? { tool_call_success_rate: report.toolCallSuccessRate }
      : {}),
    ...(report.truncation ? { truncation_detected: report.truncation.detected } : {}),
    ...(report.measuredToolCalling ? { tool_calling: report.measuredToolCalling } : {}),
  };
}
