import fs from 'node:fs/promises';
import path from 'node:path';

import { fileExists } from '../../file-system.js';
import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

/**
 * D15 — Manifest Invariants.
 *
 * `.nexus/manifest.json` records the committed choices a project made at
 * setup: its test framework, package manager, and frameworks. Until now
 * nothing read them back. A declaration nobody verifies is a comment.
 *
 * This check compares each declaration against observable repository facts —
 * a dependency that is present, a lockfile that exists — and reports where
 * the two disagree. It is deliberately structural: it never reads prose, and
 * never asks a model whether a choice "looks right". That satisfies the
 * standing rule that gates key off structural facts and never off wording an
 * agent could phrase around (NEXUS.md §18 #5, utils/skills/gate.ts).
 *
 * Scope is intentionally narrow. Only declarations with an unambiguous
 * on-disk counterpart are checked; anything requiring interpretation is left
 * alone rather than guessed at.
 */
export const D15_manifest_invariants: DoctorCheck = {
  id: 'D15',
  name: 'Manifest Invariants',
  description: 'Checks declared manifest choices against what the repository actually contains',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const manifestPath = path.join(ctx.cwd, '.nexus', 'manifest.json');
    const packageJsonPath = path.join(ctx.cwd, 'package.json');
    if (!(await fileExists(manifestPath)) || !(await fileExists(packageJsonPath))) return [];

    const config = await readManifestConfig(manifestPath);
    if (!config) return [];

    const deps = await readAllDependencies(packageJsonPath);
    if (!deps) return [];

    const findings: DoctorFinding[] = [];

    // Test framework: the declared runner should be an actual dependency.
    const testPkg = TEST_FRAMEWORK_PACKAGES[config.testFramework ?? ''];
    if (testPkg && !deps.has(testPkg)) {
      findings.push(invariantFinding(
        `manifest declares testFramework "${config.testFramework}", but "${testPkg}" is not a dependency`,
        `Install ${testPkg}, or correct testFramework in .nexus/manifest.json.`,
      ));
    }

    // Package manager: the declared manager's lockfile should be the one present.
    const expectedLock = PACKAGE_MANAGER_LOCKFILES[config.packageManager ?? ''];
    if (expectedLock) {
      const present = await presentLockfiles(ctx.cwd);
      if (present.length > 0 && !present.includes(expectedLock)) {
        findings.push(invariantFinding(
          `manifest declares packageManager "${config.packageManager}" (expects ${expectedLock}), ` +
            `but the repository has ${present.join(' and ')}`,
          `Remove the stray lockfile, or correct packageManager in .nexus/manifest.json. ` +
            `Two managers in one repo produce different dependency trees for the same commit.`,
        ));
      }
    }

    // Frontend framework: a declared framework should be installed.
    for (const [field, value] of [
      ['frontendFramework', config.frontendFramework],
      ['backendFramework', config.backendFramework],
    ] as const) {
      const pkg = FRAMEWORK_PACKAGES[value ?? ''];
      if (pkg && !deps.has(pkg)) {
        findings.push(invariantFinding(
          `manifest declares ${field} "${value}", but "${pkg}" is not a dependency`,
          `Install ${pkg}, or correct ${field} in .nexus/manifest.json.`,
        ));
      }
    }

    return findings;
  },
};

function invariantFinding(description: string, fixHint: string): DoctorFinding {
  return { id: 'D15', severity: 'warn', description: `Declared vs actual: ${description}.`, fixHint };
}

/** Declared value -> the package that proves it. Only unambiguous mappings. */
const TEST_FRAMEWORK_PACKAGES: Record<string, string> = {
  vitest: 'vitest',
  jest: 'jest',
  mocha: 'mocha',
  playwright: '@playwright/test',
};

const FRAMEWORK_PACKAGES: Record<string, string> = {
  react: 'react',
  next: 'next',
  svelte: 'svelte',
  vue: 'vue',
  express: 'express',
  fastify: 'fastify',
  nestjs: '@nestjs/core',
};

const PACKAGE_MANAGER_LOCKFILES: Record<string, string> = {
  npm: 'package-lock.json',
  yarn: 'yarn.lock',
  pnpm: 'pnpm-lock.yaml',
  bun: 'bun.lockb',
};

async function presentLockfiles(cwd: string): Promise<string[]> {
  const found: string[] = [];
  for (const lock of Object.values(PACKAGE_MANAGER_LOCKFILES)) {
    if (await fileExists(path.join(cwd, lock))) found.push(lock);
  }
  return found;
}

type ManifestConfig = {
  testFramework?: string;
  packageManager?: string;
  frontendFramework?: string;
  backendFramework?: string;
};

async function readManifestConfig(manifestPath: string): Promise<ManifestConfig | null> {
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const config =
      parsed && typeof parsed === 'object'
        ? (parsed as { config?: ManifestConfig }).config
        : undefined;
    return config && typeof config === 'object' ? config : null;
  } catch {
    // A malformed manifest is D-other's business; never throw from a check.
    return null;
  }
}

async function readAllDependencies(packageJsonPath: string): Promise<Set<string> | null> {
  try {
    const raw = await fs.readFile(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
      peerDependencies?: Record<string, unknown>;
    };
    return new Set([
      ...Object.keys(parsed.dependencies ?? {}),
      ...Object.keys(parsed.devDependencies ?? {}),
      ...Object.keys(parsed.peerDependencies ?? {}),
    ]);
  } catch {
    return null;
  }
}
