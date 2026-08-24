/**
 * Harness profiles — schema and constants.
 *
 * A "harness" here means what it already means in `D14.ts`: the external
 * client app that loads an instruction file and runs the agent — Cursor,
 * Claude Code, Cline, Windsurf, Codex, Copilot. `.nexus/harnesses.yml` is an
 * OPTIONAL declaration of the window and tool-calling reliability of each
 * harness a project targets, so generation can size its output to fit.
 *
 * Absent the file, nothing here changes generated output — every consumer
 * treats a `null` config as "use today's unbounded behaviour."
 */

import { z } from 'zod';

/**
 * `native`    — the harness reliably invokes MCP tools. Small budgets can
 *               rely on a single pointer to `nexus_get_context`.
 * `unreliable`— tool calls happen but cannot be counted on (small/local
 *               models miss the invocation or malform arguments).
 * `none`      — no tool calling at all. Orientation must be fully inlined.
 */
export const TOOL_CALLING_LEVELS = ['native', 'unreliable', 'none'] as const;

export const ToolCallingSchema = z.enum(TOOL_CALLING_LEVELS);
export type ToolCalling = z.infer<typeof ToolCallingSchema>;

export const HarnessProfileSchema = z.object({
  /** The harness's effective context window, in tokens. Informational — not
   *  enforced by generation, and never overwritten by `nexus harness verify`
   *  (see `verify.ts`): it is read as the *target* budget a live endpoint is
   *  expected to honour, and a disagreement's fix is to raise the endpoint
   *  to meet it (e.g. `OLLAMA_CONTEXT_LENGTH`), not to shrink the profile. */
  window: z.number().int().positive(),
  /**
   * Bytes NEXUS may spend on orientation — the instruction file, plus
   * whatever it tells the agent to read — before the agent has done
   * anything. This is the contract generation is held to.
   */
  orientation_budget: z.number().int().positive(),
  tool_calling: ToolCallingSchema,
  /**
   * Optional explicit override naming which generated file this harness
   * reads (e.g. `"CLAUDE.md"`). Without it, a harness id is matched against
   * `HARNESS_FILE_MAP` below; a harness with neither an override nor a
   * canonical entry (e.g. a bare model target like `ollama-local` reached
   * only through `nexus context`, never through an auto-loaded file) simply
   * has no generated instruction file of its own.
   */
  file: z.string().min(1).optional(),
  /**
   * Ollama-compatible model name this profile talks to when verified —
   * irrelevant to generation, read only by `nexus harness verify` (and
   * overridable there with `--model`). Optional because most profiles
   * (cloud harnesses with no live endpoint to probe) never need it.
   */
  model: z.string().min(1).optional(),
  /** ISO date (`YYYY-MM-DD`) of the most recent `nexus harness verify` run
   *  that updated this profile. Absent until the profile has been verified
   *  at least once. */
  measured_at: z.string().min(1).optional(),
  /**
   * The effective context window `nexus harness verify` actually observed
   * via a needle-recall probe, in tokens. Deliberately a separate field from
   * `window` — see that field's comment — so the declared target and the
   * measured reality stay visible side by side instead of one silently
   * overwriting the other.
   */
  measured_window: z.number().int().positive().optional(),
  /**
   * Fraction (0–1) of `nexus harness verify`'s structured tool-call attempts
   * that produced a valid call. Unlike `window`, this is what actually sets
   * `tool_calling` above when verify runs — a measured capability rather
   * than the user's stated intent, so there is nothing to preserve by
   * keeping it separate.
   */
  tool_call_success_rate: z.number().min(0).max(1).optional(),
  /**
   * Whether verify's bounded-pack probe found the endpoint's reported
   * `prompt_eval_count` materially lower than the tokens actually sent —
   * i.e. direct evidence of silent truncation, independent of the
   * needle-recall measurement above.
   */
  truncation_detected: z.boolean().optional(),
});
export type HarnessProfile = z.infer<typeof HarnessProfileSchema>;

export const HarnessesConfigSchema = z
  .object({
    default: z.string().min(1),
    harnesses: z.record(z.string(), HarnessProfileSchema),
  })
  .refine((cfg) => cfg.default in cfg.harnesses, {
    message: '`default` must name a key present in `harnesses`',
    path: ['default'],
  });
export type HarnessesConfig = z.infer<typeof HarnessesConfigSchema>;

/**
 * Canonical mapping from the six always-loaded files (`D14.ts`'s
 * `ALWAYS_LOADED`) to the harness id that conventionally reads each one.
 * A harness declared under one of these ids gets its own file generated at
 * its own budget; `AGENTS.md` is shared ground between Claude Code and
 * Codex, so both ids resolve to it.
 */
export const HARNESS_FILE_MAP: Readonly<Record<string, string>> = {
  'claude-code': 'CLAUDE.md',
  codex: 'AGENTS.md',
  cursor: '.cursorrules',
  windsurf: '.windsurfrules',
  cline: '.clinerules',
  copilot: '.github/copilot-instructions.md',
};

/**
 * Sensible fallback orientation budget when no `.nexus/harnesses.yml` is
 * declared. Matches the `claude-code` figure in the spec's own example —
 * generous enough that today's standard content (~8 KB on this repo) is
 * nowhere near it, so D14's project-total check does not regress an
 * unconfigured project.
 */
export const DEFAULT_ORIENTATION_BUDGET = 16 * 1024;
