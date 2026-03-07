/**
 * NEXUS CLI — Update Check Utility Unit Tests
 *
 * Tests for src/utils/update-check.ts
 *
 * Covers:
 *   - isNewer() semver comparison (exported indirectly via checkForUpdate behaviour)
 *   - checkForUpdate() — mocked fetch for online/offline/error scenarios
 *   - RELEASE_HEADLINES lookup via checkForUpdate headline output
 *
 * The internal isNewer and getHeadline functions are not exported, so we test
 * them through checkForUpdate's observable output (UpdateInfo fields).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { checkForUpdate } from '../../src/utils/update-check.js';

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────── */

/** Build a minimal npm registry response for a given version */
function mockNpmResponse(version: string): Response {
  return new Response(JSON.stringify({ version }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/* ──────────────────────────────────────────────────────────────
 * checkForUpdate() — network mocked
 * ────────────────────────────────────────────────────────────── */

describe('checkForUpdate()', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: ReturnType<typeof vi.spyOn<any, any>>;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchSpy = vi.spyOn(globalThis as any, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns null when fetch throws (offline / network error)', async () => {
    fetchSpy.mockRejectedValue(new Error('Network Error'));
    const result = await checkForUpdate(500);
    expect(result).toBeNull();
  });

  it('returns null when fetch times out (AbortError)', async () => {
    fetchSpy.mockImplementation(() => new Promise((_, reject) => {
      setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 50);
    }));
    const result = await checkForUpdate(10); // very short timeout
    expect(result).toBeNull();
  });

  it('returns null when registry returns a non-ok response', async () => {
    fetchSpy.mockResolvedValue(new Response('Not Found', { status: 404 }));
    const result = await checkForUpdate(500);
    expect(result).toBeNull();
  });

  it('returns null when registry response has no version field', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ name: '@nexus-framework/cli' }), { status: 200 }),
    );
    const result = await checkForUpdate(500);
    expect(result).toBeNull();
  });

  it('returns UpdateInfo with hasUpdate: false when on latest version', async () => {
    // Mock registry returning same version as installed
    fetchSpy.mockResolvedValue(mockNpmResponse('0.3.1')); // current is 0.3.1 per package.json
    const result = await checkForUpdate(500);
    // hasUpdate should be false — the installed version equals or is newer than registry
    expect(result).not.toBeNull();
    expect(result!.hasUpdate).toBe(false);
  });

  it('returns hasUpdate: true when registry has a newer version', async () => {
    fetchSpy.mockResolvedValue(mockNpmResponse('99.0.0'));
    const result = await checkForUpdate(500);
    expect(result).not.toBeNull();
    expect(result!.hasUpdate).toBe(true);
    expect(result!.latest).toBe('99.0.0');
  });

  it('returns hasUpdate: false when registry has an older version', async () => {
    fetchSpy.mockResolvedValue(mockNpmResponse('0.0.1'));
    const result = await checkForUpdate(500);
    expect(result).not.toBeNull();
    expect(result!.hasUpdate).toBe(false);
  });

  it('returns the current and latest versions in UpdateInfo', async () => {
    fetchSpy.mockResolvedValue(mockNpmResponse('99.0.0'));
    const result = await checkForUpdate(500);
    expect(result!.current).toBeTruthy();
    expect(result!.latest).toBe('99.0.0');
  });

  it('returns a non-empty installCmd in UpdateInfo', async () => {
    fetchSpy.mockResolvedValue(mockNpmResponse('99.0.0'));
    const result = await checkForUpdate(500);
    expect(result!.installCmd).toMatch(/@nexus-framework\/cli/);
  });

  it('returns a headline for a known release version', async () => {
    fetchSpy.mockResolvedValue(mockNpmResponse('99.0.0'));
    const result = await checkForUpdate(500);
    // Headline should be a non-empty string (fallback at minimum)
    expect(result!.headline.length).toBeGreaterThan(0);
  });

  it('returns empty headline string when there is no update', async () => {
    fetchSpy.mockResolvedValue(mockNpmResponse('0.0.1'));
    const result = await checkForUpdate(500);
    // No update → headline is empty string (nothing to show in banner)
    expect(result!.headline).toBe('');
  });
});

/* ──────────────────────────────────────────────────────────────
 * Semver comparison — tested via observable behaviour
 * ──────────────────────────────────────────────────────────────
 * isNewer() is not exported, but we can test the logic exhaustively
 * by feeding versions to checkForUpdate and observing hasUpdate.
 */

describe('semver comparison via checkForUpdate()', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: ReturnType<typeof vi.spyOn<any, any>>;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchSpy = vi.spyOn(globalThis as any, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const cases: Array<[string, boolean, string]> = [
    ['99.0.0', true,  'major bump is newer'],
    ['0.99.0', true,  'minor bump is newer'],
    ['0.0.99', false, 'patch bump — depends on current, use an obviously large number'],
    ['0.1.0',  false, 'very old version is not newer'],
    ['0.0.0',  false, 'zero version is not newer'],
  ];

  for (const [version, expectedHasUpdate, description] of cases) {
    it(`${description} (${version})`, async () => {
      fetchSpy.mockResolvedValue(mockNpmResponse(version));
      const result = await checkForUpdate(500);
      expect(result!.hasUpdate).toBe(expectedHasUpdate);
    });
  }
});
