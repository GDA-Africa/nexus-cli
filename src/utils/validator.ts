/**
 * NEXUS CLI - Validator Utility
 *
 * Input validation for project names and other user input.
 */

import fs from 'node:fs';
import path from 'node:path';

import validateNpmPackageName from 'validate-npm-package-name';

/** Result of a validation check */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate a project name.
 * Must be a valid npm package name and the target directory must not already exist.
 */
export function validateProjectName(name: string, targetDir?: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: 'Project name cannot be empty.' };
  }

  const trimmed = name.trim();

  // Check npm naming rules
  const npmResult = validateNpmPackageName(trimmed);
  if (!npmResult.validForNewPackages) {
    const errors = [...(npmResult.errors ?? []), ...(npmResult.warnings ?? [])];
    return {
      valid: false,
      message: `Invalid package name: ${errors.join(', ')}`,
    };
  }

  // Check if directory already exists
  const dir = targetDir ?? path.resolve(process.cwd(), trimmed);
  if (fs.existsSync(dir)) {
    return {
      valid: false,
      message: `Directory "${trimmed}" already exists. Choose a different name or delete the existing directory.`,
    };
  }

  return { valid: true };
}

/**
 * Validate that a value is non-empty.
 */
export function validateNotEmpty(value: string, fieldName = 'Value'): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, message: `${fieldName} cannot be empty.` };
  }
  return { valid: true };
}

/**
 * Sanitize a project name for use as a directory name.
 * Converts to lowercase, replaces spaces with hyphens, strips invalid chars.
 */
export function sanitizeProjectName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.]/g, '')
    .replace(/^[-_.]+/, '')
    .replace(/[-_.]+$/, '');
}
