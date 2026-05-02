import path from 'node:path';

import { execa } from 'execa';
import fs from 'fs-extra';

export interface TestsSensorData {
  passed: number | null;
  failed: number | null;
  skipped: number | null;
  durationMs: number | null;
  source: string | null;
}

const DEFAULT_TEST_TIMEOUT_MS = 2000;

interface CommandResultLike {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Capture test summary using Vitest-compatible command output.
 * The command is time-bounded and degrades gracefully to null fields.
 */
export async function captureTestsSensor(
  cwd: string = process.cwd(),
  timeoutMs: number = DEFAULT_TEST_TIMEOUT_MS,
): Promise<TestsSensorData> {
  const empty: TestsSensorData = {
    passed: null,
    failed: null,
    skipped: null,
    durationMs: null,
    source: null,
  };

  const commands = await getCandidateCommands(cwd);

  for (const [command, args] of commands) {
    try {
      const result = await execa(command, args, {
        cwd,
        timeout: timeoutMs,
        reject: false,
      }) as CommandResultLike;

      const combinedOutput = `${result.stdout}\n${result.stderr}`.trim();
      const parsed = parseTestSummary(combinedOutput);

      if (parsed) {
        return {
          ...parsed,
          source: `${command} ${args.join(' ')}`,
        };
      }

      if (result.exitCode === 0) {
        return {
          ...empty,
          source: `${command} ${args.join(' ')}`,
        };
      }
    } catch {
      // continue to next command candidate
    }
  }

  return empty;
}

async function getCandidateCommands(cwd: string): Promise<Array<[string, string[]]>> {
  const hasYarn = await fs.pathExists(path.join(cwd, 'yarn.lock'));

  if (hasYarn) {
    return [
      ['yarn', ['vitest', 'run', '--reporter=json']],
      ['npx', ['vitest', 'run', '--reporter=json']],
    ];
  }

  return [
    ['npx', ['vitest', 'run', '--reporter=json']],
    ['npm', ['test', '--', '--reporter=json']],
  ];
}

function parseTestSummary(output: string): Omit<TestsSensorData, 'source'> | null {
  if (!output.trim()) return null;

  const jsonSummary = parseJsonSummary(output);
  if (jsonSummary) {
    return jsonSummary;
  }

  return parseTextSummary(output);
}

function parseJsonSummary(output: string): Omit<TestsSensorData, 'source'> | null {
  const jsonCandidate = extractJsonObject(output);
  if (!jsonCandidate) return null;

  try {
    const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;

    const passed = asNumber(parsed.numPassedTests) ?? asNumber(parsed.passed);
    const failed = asNumber(parsed.numFailedTests) ?? asNumber(parsed.failed);
    const skipped = asNumber(parsed.numPendingTests) ?? asNumber(parsed.skipped) ?? 0;
    const durationMs = asNumber(parsed.duration) ?? asNumber(parsed.durationMs) ?? null;

    if (passed === null && failed === null) {
      return null;
    }

    return {
      passed,
      failed: failed ?? 0,
      skipped,
      durationMs,
    };
  } catch {
    return null;
  }
}

function parseTextSummary(output: string): Omit<TestsSensorData, 'source'> | null {
  const failedPassedSkipped = output.match(/Tests?\s+(\d+)\s+failed\s*\|\s*(\d+)\s+passed(?:\s*\|\s*(\d+)\s+skipped)?/i);
  const onlyPassed = output.match(/Tests?\s+(\d+)\s+passed(?:\s*\((\d+)\))?/i);
  const durationMatch = output.match(/Duration\s+([0-9.]+)(ms|s)/i);

  let passed: number | null = null;
  let failed: number | null = null;
  let skipped = 0;

  if (failedPassedSkipped) {
    failed = Number(failedPassedSkipped[1]);
    passed = Number(failedPassedSkipped[2]);
    skipped = failedPassedSkipped[3] ? Number(failedPassedSkipped[3]) : 0;
  } else if (onlyPassed) {
    passed = Number(onlyPassed[1]);
    failed = 0;
  }

  if (passed === null || failed === null) {
    return null;
  }

  return {
    passed,
    failed,
    skipped,
    durationMs: durationMatch ? toMs(Number(durationMatch[1]), durationMatch[2]) : null,
  };
}

function extractJsonObject(output: string): string | null {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return output.slice(start, end + 1);
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toMs(value: number, unit: string): number {
  return unit.toLowerCase() === 's' ? Math.round(value * 1000) : Math.round(value);
}
