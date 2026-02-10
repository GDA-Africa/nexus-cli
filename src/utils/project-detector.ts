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
  // Non-Node.js project signals
  hasGoMod: boolean;
  hasCargoToml: boolean;
  hasPyProjectToml: boolean;
  hasFirebaseJson: boolean;
  // Java/Spring Boot signals
  hasPomXml: boolean;
  hasBuildGradle: boolean;
  // Monorepo signals
  isInsideMonorepo: boolean;
  monorepoRoot: string | null;
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
 * Now supports:
 * - Node.js projects (package.json)
 * - Spring Boot projects (pom.xml, build.gradle)
 * - Cloud Functions (firebase.json, .firebaserc)
 * - Go projects (go.mod)
 * - Rust projects (Cargo.toml)
 * - Python projects (pyproject.toml)
 * - Monorepos (checks parent directories for workspace root)
 *
 * This is a fast check used to decide whether to show the
 * "--adopt" suggestion before any heavier analysis.
 */
export function isExistingProject(targetDir: string): boolean {
  // Check Node.js
  if (fs.existsSync(path.join(targetDir, 'package.json'))) return true;
  
  // Check Spring Boot / Maven
  if (fs.existsSync(path.join(targetDir, 'pom.xml'))) return true;
  if (fs.existsSync(path.join(targetDir, 'build.gradle'))) return true;
  if (fs.existsSync(path.join(targetDir, 'build.gradle.kts'))) return true;
  
  // Check Cloud Functions
  if (fs.existsSync(path.join(targetDir, 'firebase.json'))) return true;
  if (fs.existsSync(path.join(targetDir, '.firebaserc'))) return true;
  
  // Check Go
  if (fs.existsSync(path.join(targetDir, 'go.mod'))) return true;
  
  // Check Rust
  if (fs.existsSync(path.join(targetDir, 'Cargo.toml'))) return true;
  
  // Check Python
  if (fs.existsSync(path.join(targetDir, 'pyproject.toml'))) return true;
  
  // Check if we're inside a monorepo (has parent package.json with workspaces)
  const monorepoRoot = findMonorepoRoot(targetDir);
  if (monorepoRoot) return true;
  
  return false;
}

/**
 * Inspect a directory and return detailed project information.
 *
 * This reads package.json (if present), checks for non-Node.js project
 * markers (go.mod, Cargo.toml, etc.), and detects monorepo structure.
 * The adopt generator uses this to pre-fill NEXUS documentation.
 */
export async function detectProject(targetDir: string): Promise<ProjectInfo> {
  const signals = await detectSignals(targetDir);

  // Default empty info
  const info: ProjectInfo = {
    detected:
      signals.hasPackageJson ||
      signals.hasGoMod ||
      signals.hasCargoToml ||
      signals.hasPyProjectToml ||
      signals.hasFirebaseJson ||
      signals.hasPomXml ||
      signals.hasBuildGradle ||
      signals.isInsideMonorepo,
    signals,
    name: null,
    description: null,
    framework: null,
    testFramework: null,
    packageManager: null,
    hasNexus: false,
    dependencies: [],
  };

  // Handle Spring Boot projects (Java/Kotlin)
  if (signals.hasPomXml || signals.hasBuildGradle) {
    info.framework = 'spring-boot';
    info.name = path.basename(targetDir);
    info.description = 'Spring Boot API';
    info.hasNexus = fs.existsSync(path.join(targetDir, '.nexus'));
    return info;
  }

  // If no package.json at this level but we're in a monorepo, try reading from monorepo root
  const pkgPath = signals.hasPackageJson
    ? path.join(targetDir, 'package.json')
    : signals.monorepoRoot
      ? path.join(signals.monorepoRoot, 'package.json')
      : null;

  if (pkgPath && fs.existsSync(pkgPath)) {
    try {
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
  }

  // For non-Node.js projects, set framework to the detected language
  if (!info.framework) {
    if (signals.hasGoMod) info.framework = 'go';
    else if (signals.hasCargoToml) info.framework = 'rust';
    else if (signals.hasPyProjectToml) info.framework = 'python';
    else if (signals.hasFirebaseJson) info.framework = 'cloud-functions';
  }

  // Check for existing .nexus/
  info.hasNexus = fs.existsSync(path.join(targetDir, '.nexus'));

  return info;
}

/* ──────────────────────────────────────────────────────────────
 * Internal helpers
 * ────────────────────────────────────────────────────────────── */

async function detectSignals(dir: string): Promise<ProjectSignals> {
  const [
    hasPackageJson,
    hasGit,
    hasSrc,
    hasTsConfig,
    hasNodeModules,
    hasGoMod,
    hasCargoToml,
    hasPyProjectToml,
    hasFirebaseJson,
    hasPomXml,
    hasBuildGradle,
  ] = await Promise.all([
    fs.pathExists(path.join(dir, 'package.json')),
    fs.pathExists(path.join(dir, '.git')),
    fs.pathExists(path.join(dir, 'src')),
    fs.pathExists(path.join(dir, 'tsconfig.json')),
    fs.pathExists(path.join(dir, 'node_modules')),
    fs.pathExists(path.join(dir, 'go.mod')),
    fs.pathExists(path.join(dir, 'Cargo.toml')),
    fs.pathExists(path.join(dir, 'pyproject.toml')),
    fs.pathExists(path.join(dir, 'firebase.json')),
    fs.pathExists(path.join(dir, 'pom.xml')),
    fs.pathExists(path.join(dir, 'build.gradle')).then(async (exists) => 
      exists || await fs.pathExists(path.join(dir, 'build.gradle.kts'))
    ),
  ]);

  // Check if we're inside a monorepo
  const monorepoRoot = findMonorepoRoot(dir);
  const isInsideMonorepo = !!monorepoRoot && monorepoRoot !== dir;

  return {
    hasPackageJson,
    hasGit,
    hasSrc,
    hasTsConfig,
    hasNodeModules,
    hasGoMod,
    hasCargoToml,
    hasPyProjectToml,
    hasFirebaseJson,
    hasPomXml,
    hasBuildGradle,
    isInsideMonorepo,
    monorepoRoot,
  };
}

/**
 * Walk up the directory tree to find a monorepo root.
 *
 * A monorepo root is identified by a package.json with a `workspaces` field
 * (Yarn/npm/pnpm workspaces) or a `pnpm-workspace.yaml` file.
 *
 * Returns the absolute path to the monorepo root, or null if not found.
 */
function findMonorepoRoot(startDir: string): string | null {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;

  // Walk up until we hit the filesystem root
  while (currentDir !== root) {
    const parentDir = path.dirname(currentDir);

    // Check for pnpm-workspace.yaml
    if (fs.existsSync(path.join(parentDir, 'pnpm-workspace.yaml'))) {
      return parentDir;
    }

    // Check for package.json with workspaces
    const pkgPath = path.join(parentDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = fs.readJSONSync(pkgPath) as Record<string, unknown>;
        if (pkg.workspaces) {
          return parentDir;
        }
      } catch {
        // Ignore unreadable package.json
      }
    }

    currentDir = parentDir;
  }

  return null;
}

function detectFramework(deps: string[]): string | null {
  // Cloud Functions
  if (deps.includes('firebase-functions')) return 'cloud-functions';
  if (deps.includes('@google-cloud/functions-framework')) return 'cloud-functions';
  
  // Frontend frameworks
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
