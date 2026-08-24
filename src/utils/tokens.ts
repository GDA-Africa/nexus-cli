/**
 * Token counting for the context pack budget (P0.1).
 *
 * Wraps `gpt-tokenizer`. A char budget cannot express a model's context
 * window — JSON-escaped payloads, code blocks, and non-ASCII tokenize far
 * worse than prose, so a fixed char cap is somewhere between 2x and 5x off
 * depending on what lands in the pack.
 *
 * Loaded lazily via `createRequire` (not a top-level `import`) so that
 * `countTokens` stays a synchronous function callers can drop into an
 * ordinary reduce/filter — while the default CLI path (`nexus wake`,
 * `nexus plan`, `nexus doctor`, `nexus sync`, ...) never requires or parses
 * this module at all. Only `nexus_get_context` — the one caller that needs a
 * token count — pays gpt-tokenizer's load cost, and only on first use.
 */

import { createRequire } from 'node:module';

interface TokenizerModule {
  countTokens: (text: string) => number;
}

let tokenizer: TokenizerModule | null = null;

function loadTokenizer(): TokenizerModule {
  if (!tokenizer) {
    const require = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    tokenizer = require('gpt-tokenizer') as TokenizerModule;
  }
  return tokenizer;
}

/**
 * Count tokens in `s`. Always rounds up — landing under budget with margin
 * matters more than exactness (accuracy target: within 10%, never under).
 */
export function countTokens(s: string): number {
  if (!s) return 0;
  return Math.ceil(loadTokenizer().countTokens(s));
}

/** Rough chars-per-token used only to map the deprecated `maxChars` input
 * onto a token budget — never used to charge the budget itself. */
export const CHARS_PER_TOKEN = 4;
