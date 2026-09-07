import path from 'node:path';

import fs from 'fs-extra';

import type { VerifyCheck, VerifyManifest } from './types.js';

export const VERIFY_SCHEMA_URL = 'https://nexus-framework.dev/schemas/verify.json';

/**
 * Load .nexus/verify.json if it exists.
 */
export async function loadVerifyManifest(nexusDir: string): Promise<VerifyManifest | null> {
  const verifyPath = path.join(nexusDir, 'verify.json');
  if (!(await fs.pathExists(verifyPath))) {
    return null;
  }

  try {
    const raw = await fs.readFile(verifyPath, 'utf8');
    const parsed = JSON.parse(raw) as VerifyManifest;
    if (parsed && Array.isArray(parsed.checks)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save .nexus/verify.json.
 */
export async function saveVerifyManifest(nexusDir: string, manifest: VerifyManifest): Promise<void> {
  const verifyPath = path.join(nexusDir, 'verify.json');
  await fs.ensureDir(nexusDir);
  await fs.writeFile(verifyPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

/**
 * Generate default verify manifest checks based on package.json scripts in the project.
 */
export async function generateDefaultVerifyManifest(projectRoot: string): Promise<VerifyManifest> {
  const pkgPath = path.join(projectRoot, 'package.json');
  const checks: VerifyCheck[] = [];

  let scripts: Record<string, string> = {};
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      scripts = pkg.scripts || {};
    } catch {
      // Ignore package read errors
    }
  }

  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  if (await fs.pathExists(tsconfigPath)) {
    checks.push({
      id: 'types',
      run: 'npx tsc --noEmit',
      description: 'TypeScript typecheck without emit',
    });
  }

  if (scripts.test) {
    checks.push({
      id: 'tests',
      run: 'npm run test',
      description: 'Project unit and integration test suite',
    });
  }

  if (scripts.lint) {
    checks.push({
      id: 'lint',
      run: 'npm run lint',
      description: 'Project linter suite',
    });
  }

  // If no package.json checks were detected, provide standard fallback
  if (checks.length === 0) {
    checks.push({
      id: 'tests',
      run: 'npm test',
      description: 'Run project tests',
    });
  }

  return {
    $schema: VERIFY_SCHEMA_URL,
    checks,
  };
}
