import { captureFilesSensor, type FilesSensorData } from './files.js';
import { captureGitSensor, type GitSensorData } from './git.js';
import { capturePackagesSensor, type PackagesSensorData } from './packages.js';
import { captureTestsSensor, type TestsSensorData } from './tests.js';

export interface VitalSigns {
  capturedAt: string;
  git: GitSensorData;
  files: FilesSensorData;
  tests: TestsSensorData;
  packages: PackagesSensorData;
}

export interface CaptureVitalSignsOptions {
  cwd?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Capture all available sensor data with graceful degradation.
 */
export async function captureVitalSigns(options: CaptureVitalSignsOptions = {}): Promise<VitalSigns> {
  const cwd = options.cwd ?? process.cwd();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const [git, files, tests, packagesData] = await Promise.all([
    withTimeout(captureGitSensor(cwd), timeoutMs, emptyGit()),
    withTimeout(captureFilesSensor(cwd), timeoutMs, emptyFiles()),
    withTimeout(captureTestsSensor(cwd, timeoutMs), timeoutMs, emptyTests()),
    withTimeout(capturePackagesSensor(cwd, timeoutMs), timeoutMs, emptyPackages()),
  ]);

  return {
    capturedAt: new Date().toISOString(),
    git,
    files,
    tests,
    packages: packagesData,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => {
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } catch {
    return fallback;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function emptyGit(): GitSensorData {
  return {
    branch: null,
    aheadOfMain: null,
    lastCommit: null,
    isDirty: null,
  };
}

function emptyFiles(): FilesSensorData {
  return {
    staleFolders: [],
  };
}

function emptyTests(): TestsSensorData {
  return {
    passed: null,
    failed: null,
    skipped: null,
    durationMs: null,
    source: null,
  };
}

function emptyPackages(): PackagesSensorData {
  return {
    outdatedCount: null,
    vulnerableCount: null,
  };
}
