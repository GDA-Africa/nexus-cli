import crypto from 'node:crypto';

import { execa } from 'execa';

import type { CheckResult, VerifyCheck, VerifyEvidenceBlock, VerifyManifest } from './types.js';

const DEFAULT_CHECK_TIMEOUT_MS = 60000;

/**
 * Execute a single verification check with execa.
 */
export async function executeCheck(
  check: VerifyCheck,
  cwd: string,
  timeoutMs: number = DEFAULT_CHECK_TIMEOUT_MS,
): Promise<CheckResult> {
  const start = Date.now();
  let exit = 0;
  let stdout = '';
  let stderr = '';

  try {
    const result = await execa(check.run, {
      cwd,
      shell: true,
      timeout: timeoutMs,
      reject: false,
    });
    exit = result.exitCode ?? (result.failed ? 1 : 0);
    stdout = result.stdout || '';
    stderr = result.stderr || '';
  } catch (err: unknown) {
    exit = 1;
    stderr = err instanceof Error ? err.message : String(err);
  }

  const duration_ms = Date.now() - start;
  const combined = `${stdout}\n${stderr}`.trim();
  const output_sha256 = crypto.createHash('sha256').update(combined).digest('hex');

  const summary = extractCheckSummary(check.id, combined, exit);

  return {
    id: check.id,
    run: check.run,
    exit,
    duration_ms,
    output_sha256,
    summary,
  };
}

/**
 * Run all checks defined in a VerifyManifest.
 */
export async function runVerifyChecks(
  manifest: VerifyManifest,
  cwd: string,
  timeoutMs: number = DEFAULT_CHECK_TIMEOUT_MS,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const check of manifest.checks) {
    const res = await executeCheck(check, cwd, timeoutMs);
    results.push(res);
  }
  return results;
}

/**
 * Format a VerifyEvidenceBlock into a markdown fenced json block.
 */
export function formatEvidenceBlock(evidence: VerifyEvidenceBlock): string {
  const json = JSON.stringify(evidence, null, 2);
  return '```json\n' + json + '\n```';
}

/**
 * Parse a fenced JSON evidence block from a plan's Evidence section.
 */
export function parseEvidenceBlock(evidenceText: string): VerifyEvidenceBlock | null {
  if (!evidenceText) return null;

  const match = /```(?:json)?\s*\n([\s\S]*?)\n```/.exec(evidenceText);
  if (!match || !match[1]) return null;

  try {
    const parsed = JSON.parse(match[1]) as VerifyEvidenceBlock;
    if (
      parsed &&
      typeof parsed.verified_at === 'string' &&
      typeof parsed.brain_hash === 'string' &&
      Array.isArray(parsed.checks)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract a human-readable one-line summary from check output.
 */
function extractCheckSummary(_checkId: string, output: string, exitCode: number): string {
  if (exitCode === 0) {
    const testMatch = output.match(/(\d+\s+passed|\d+\s+tests?\s+passed)/i);
    if (testMatch) return testMatch[1];
    return 'Passed cleanly';
  }

  const failMatch = output.match(/(\d+\s+failed)/i);
  if (failMatch) return `Failed (${failMatch[1]})`;
  return `Exited with code ${exitCode}`;
}
