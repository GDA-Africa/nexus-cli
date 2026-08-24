/**
 * NEXUS CLI — Ollama client unit tests
 *
 * `defaultOllamaClient` is the one function in this codebase allowed to make
 * a live model call. These tests never let it: `fetch` is spied and
 * replaced with a `Response`-returning fake, matching the pattern
 * `tests/unit/update-check.test.ts` already uses for the npm-registry
 * client (the other bare-`fetch` caller in this project).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultOllamaClient } from '../../src/utils/harnesses/ollama-client.js';

function mockOllamaResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('defaultOllamaClient', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: ReturnType<typeof vi.spyOn<any, any>>;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchSpy = vi.spyOn(globalThis as any, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('POSTs to /api/generate with stream:false and the given model/prompt', async () => {
    fetchSpy.mockResolvedValue(mockOllamaResponse({ response: 'ok', prompt_eval_count: 12 }));

    await defaultOllamaClient({ baseUrl: 'http://localhost:11434', model: 'cogito', prompt: 'hi' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/generate');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toEqual({ model: 'cogito', prompt: 'hi', stream: false });
  });

  it('strips a trailing slash from baseUrl before appending the path', async () => {
    fetchSpy.mockResolvedValue(mockOllamaResponse({ response: 'ok' }));

    await defaultOllamaClient({ baseUrl: 'http://localhost:11434/', model: 'cogito', prompt: 'hi' });

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/generate');
  });

  it('includes format:"json" only when requested', async () => {
    fetchSpy.mockResolvedValue(mockOllamaResponse({ response: '{}' }));

    await defaultOllamaClient({ baseUrl: 'http://x', model: 'm', prompt: 'p', format: 'json' });
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ format: 'json' });
  });

  it('returns ok:true with response and prompt_eval_count on success', async () => {
    fetchSpy.mockResolvedValue(
      mockOllamaResponse({ response: 'the answer', prompt_eval_count: 100, eval_count: 5 }),
    );

    const result = await defaultOllamaClient({ baseUrl: 'http://x', model: 'm', prompt: 'p' });
    expect(result).toEqual({
      ok: true,
      response: 'the answer',
      prompt_eval_count: 100,
      eval_count: 5,
    });
  });

  it('returns ok:false with a message on a non-2xx response', async () => {
    fetchSpy.mockResolvedValue(mockOllamaResponse({}, 500));

    const result = await defaultOllamaClient({ baseUrl: 'http://x', model: 'm', prompt: 'p' });
    expect(result.ok).toBe(false);
    expect(result.response).toBe('');
    expect(result.error).toContain('500');
  });

  it('returns ok:false rather than throwing when fetch rejects (endpoint down)', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await defaultOllamaClient({ baseUrl: 'http://x', model: 'm', prompt: 'p' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('returns ok:false with a timeout message on abort', async () => {
    fetchSpy.mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 5);
        }),
    );

    const result = await defaultOllamaClient({
      baseUrl: 'http://x',
      model: 'm',
      prompt: 'p',
      timeoutMs: 10,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('timed out');
  });

  it('tolerates a response body missing prompt_eval_count/eval_count', async () => {
    fetchSpy.mockResolvedValue(mockOllamaResponse({ response: 'ok' }));

    const result = await defaultOllamaClient({ baseUrl: 'http://x', model: 'm', prompt: 'p' });
    expect(result.ok).toBe(true);
    expect(result.prompt_eval_count).toBeUndefined();
    expect(result.eval_count).toBeUndefined();
  });
});
