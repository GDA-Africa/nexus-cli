/**
 * NEXUS CLI - Project Detector
 *
 * Detects whether a directory contains an existing project and
 * extracts basic project information by inspecting well-known files.
 *
 * Used by `nexus init --adopt` to intelligently generate .nexus/
 * documentation for projects that already exist.
 */

import path from 'node:path';

import fs from 'fs-extra';

/* ──────────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────────── */

/** Signals that indicate an existing project */
export interface ProjectSignals {
  hasPackageJson: boolean;
  hasGit: boolean;
  hasSrc: boolean;
  hasTsConfig: boolean;
  hasNodeModules: boolean;
}

/** Information extracted from an existing project */
export interface ProjectInfo {
  /** Whether we detected a project at all */
  detected: boolean;
  /** Specific signals found */
  signals: ProjectSignals;
  /** Project name from package.json (if available) */
  name: string | null;
  /** Project description from package.json (if available) */
  description: string | null;
  /** Detected frontend framework (or null) */
  framework: string | null;
  /** Detected test framework (or null) */
  testFramework: string | null;
  /** Detected package manager */
  packageManager: string | null;
  /** Whether the project already has .nexus/ */
  hasNexus: boolean;
  /** List of detected dependencies (combined deps + devDeps) */
  dependencies: string[];
}

/* ──────────────────────────────────────────────────────────────
 * Detection — runs against a directory path
 * ────────────────────────────────────────────────────────────── */

/**
 * Check whether a directory looks like it already contains a project.
 *
 * Returns `true` if a `package.json` exists at the target path.
 * This is a fast check used to decide whether to show the
 * "--adopt" suggestion before any heavier analysis.
 */
export function isExistingProject(targetDir: string): boolean {
  return fs.existsSync(path.join(targetDir, 'package.json'));
}

/**
 * Inspect a directory and return detailed project information.
 *
 * This reads package.json (if present) and checks for common
 * framework/tooling markers so the adopt generator can pre-fill
 * as much of the NEXUS documentation as possible.
 */
export async function detectProject(targetDir: string): Promise<ProjectInfo> {
  const signals = await detectSignals(targetDir);

  // Default empty info
  const info: ProjectInfo = {
    detected: signals.hasPackageJson,
    signals,
    name: null,
    description: null,
    framework: null,
    testFramework: null,
    packageManager: null,
    hasNexus: false,
    dependencies: [],
  };

  if (!signals.hasPackageJson) {
    return info;
  }

  // Read package.json
  try {
    const pkgPath = path.join(targetDir, 'package.json');
    const pkg = (await fs.readJSON(pkgPath)) as Record<string, unknown>;

    info.name = typeof pkg.name === 'string' ? pkg.name : null;
    info.description = typeof pkg.description === 'string' ? pkg.description : null;

    // Collect all dependency names
    const deps = Object.keys((pkg.dependencies as Record<string, string>) ?? {});
    const devDeps = Object.keys((pkg.devDependencies as Record<string, string>) ?? {});
    info.dependencies = [...deps, ...devDeps];

    // Detect framework
    info.framework = detectFramework(info.dependencies);

    // Detect test framework
    info.testFramework = detectTestFramework(info.dependencies);

    // Detect package manager
    info.packageManager = await detectPM(targetDir);
  } catch {
    // package.json unreadable — keep defaults
  }

  // Check for existing .nexus/
  info.hasNexus = fs.existsSync(path.join(targetDir, '.nexus'));

  return info;
}

/* ──────────────────────────────────────────────────────────────
 * Internal helpers
 * ────────────────────────────────────────────────────────────── */

async function detectSignals(dir: string): Promise<ProjectSignals> {
  const [hasPackageJson, hasGit, hasSrc, hasTsConfig, hasNodeModules] = await Promise.all([
    fs.pathExists(path.join(dir, 'package.json')),
    fs.pathExists(path.join(dir, '.git')),
    fs.pathExists(path.join(dir, 'src')),
    fs.pathExists(path.join(dir, 'tsconfig.json')),
    fs.pathExists(path.join(dir, 'node_modules')),
  ]);

  return { hasPackageJson, hasGit, hasSrc, hasTsConfig, hasNodeModules };
}

function detectFramework(deps: string[]): string | null {
  if (deps.includes('next')) return 'nextjs';
  if (deps.includes('nuxt') || deps.includes('nuxt3')) return 'nuxt';
  if (deps.includes('@sveltejs/kit')) return 'sveltekit';
  if (deps.includes('astro')) return 'astro';
  if (deps.includes('remix') || deps.includes('@remix-run/react')) return 'remix';
  if (deps.includes('react') && deps.includes('vite')) return 'react-vite';
  if (deps.includes('react')) return 'react-vite'; // React without Next is likely Vite/CRA
  if (deps.includes('vue')) return 'nuxt'; // Vue without Nuxt — closest match
  if (deps.includes('svelte')) return 'sveltekit'; // Svelte without kit — closest match
  return null;
}

function detectTestFramework(deps: string[]): string | null {
  if (deps.includes('vitest')) return 'vitest';
  if (deps.includes('jest')) return 'jest';
  if (deps.includes('@jest/core')) return 'jest';
  return null;
}

async function detectPM(dir: string): Promise<string | null> {
  if (await fs.pathExists(path.join(dir, 'yarn.lock'))) return 'yarn';
  if (await fs.pathExists(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fs.pathExists(path.join(dir, 'package-lock.json'))) return 'npm';
  return null;
}
