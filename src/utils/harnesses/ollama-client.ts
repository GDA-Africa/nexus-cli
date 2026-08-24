/**
 * NEXUS CLI — Ollama-compatible HTTP client for `nexus harness verify`
 *
 * `src/` makes zero model calls, by deliberate project invariant — this file
 * is the one explicit, opt-in exception (`verify.ts`'s three probes are the
 * only callers). The shape follows the same seam
 * `utils/chameleon/runner.ts` uses for `execa`: an injectable typed function
 * with a real default implementation, so production code gets the real
 * network call and tests supply a fake and never touch the network. No new
 * HTTP dependency — `fetch` is already how this project talks to the npm
 * registry (`utils/update-check.ts`, `commands/skill.ts`).
 */

export interface OllamaGenerateCall {
  baseUrl: string;
  model: string;
  prompt: string;
  /** Ask Ollama to constrain output to JSON — used by the tool-call probe. */
  format?: 'json';
  timeoutMs?: number;
}

export interface OllamaGenerateReply {
  ok: boolean;
  /** The model's text/JSON output. Empty when `ok` is false. */
  response: string;
  /** Tokens Ollama reports it evaluated from the prompt — the truncation tell. */
  prompt_eval_count?: number;
  eval_count?: number;
  /** Populated only when `ok` is false: network error, non-2xx, bad JSON. */
  error?: string;
}

/** Injectable Ollama caller — tests supply a fake instead of hitting the network. */
export type OllamaClient = (call: OllamaGenerateCall) => Promise<OllamaGenerateReply>;

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * The real client: `POST ${baseUrl}/api/generate`, non-streaming.
 *
 * Never throws — every failure mode (network error, timeout, non-2xx,
 * unparseable body) comes back as `{ ok: false, error }` so callers in
 * `verify.ts` can report "endpoint unreachable" instead of crashing the CLI.
 */
export const defaultOllamaClient: OllamaClient = async (call) => {
  const url = `${call.baseUrl.replace(/\/+$/, '')}/api/generate`;
  const timeoutMs = call.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: call.model,
        prompt: call.prompt,
        stream: false,
        ...(call.format ? { format: call.format } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, response: '', error: `Ollama responded ${res.status} ${res.statusText}` };
    }

    const data = (await res.json()) as Record<string, unknown>;
    return {
      ok: true,
      response: typeof data.response === 'string' ? data.response : '',
      prompt_eval_count: typeof data.prompt_eval_count === 'number' ? data.prompt_eval_count : undefined,
      eval_count: typeof data.eval_count === 'number' ? data.eval_count : undefined,
    };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const message = isAbort
      ? `timed out after ${timeoutMs}ms`
      : err instanceof Error
        ? err.message
        : String(err);
    return { ok: false, response: '', error: message };
  } finally {
    clearTimeout(timer);
  }
};
