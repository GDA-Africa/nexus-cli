import path from 'node:path';

import { execa } from 'execa';
import fs from 'fs-extra';

export interface PackagesSensorData {
  outdatedCount: number | null;
  vulnerableCount: number | null;
}

const DEFAULT_PACKAGE_TIMEOUT_MS = 2000;

/**
 * Capture package-health signals (outdated and vulnerabilities).
 * Returns null fields when command output is unavailable.
 */
export async function capturePackagesSensor(
  cwd: string = process.cwd(),
  timeoutMs: number = DEFAULT_PACKAGE_TIMEOUT_MS,
): Promise<PackagesSensorData> {
  const empty: PackagesSensorData = {
    outdatedCount: null,
    vulnerableCount: null,
  };

  const hasPackageJson = await fs.pathExists(path.join(cwd, 'package.json'));
  if (!hasPackageJson) {
    return empty;
  }

  const [outdatedCount, vulnerableCount] = await Promise.all([
    getOutdatedCount(cwd, timeoutMs),
    getVulnerableCount(cwd, timeoutMs),
  ]);

  return { outdatedCount, vulnerableCount };
}

async function getOutdatedCount(cwd: string, timeoutMs: number): Promise<number | null> {
  try {
    const result = await execa('npm', ['outdated', '--json'], {
      cwd,
      timeout: timeoutMs,
      reject: false,
    });

    const output = `${result.stdout}\n${result.stderr}`.trim();
    if (!output) {
      return 0;
    }

    const parsed = parseJsonObject(output);
    if (!parsed || Array.isArray(parsed)) {
      return null;
    }

    return Object.keys(parsed).length;
  } catch {
    return null;
  }
}

async function getVulnerableCount(cwd: string, timeoutMs: number): Promise<number | null> {
  try {
    const result = await execa('npm', ['audit', '--json'], {
      cwd,
      timeout: timeoutMs,
      reject: false,
    });

    const output = `${result.stdout}\n${result.stderr}`.trim();
    if (!output) {
      return 0;
    }

    const parsed = parseJsonObject(output);
    if (!parsed || Array.isArray(parsed)) {
      return null;
    }

    const metadata = parsed.metadata;
    if (isRecord(metadata)) {
      const vulnerabilities = metadata.vulnerabilities;
      if (isRecord(vulnerabilities)) {
        const total = vulnerabilities.total;
        if (typeof total === 'number' && Number.isFinite(total)) {
          return total;
        }

        // Fallback: sum known severities
        const severities = ['info', 'low', 'moderate', 'high', 'critical'];
        const sum = severities
          .map((severity) => vulnerabilities[severity])
          .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
          .reduce((acc, current) => acc + current, 0);

        return sum;
      }
    }

    // Older audit format fallback
    const vulnerabilities = parsed.vulnerabilities;
    if (isRecord(vulnerabilities)) {
      return Object.keys(vulnerabilities).length;
    }

    return null;
  } catch {
    return null;
  }
}

function parseJsonObject(raw: string): Record<string, unknown> | unknown[] | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown> | unknown[];
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
