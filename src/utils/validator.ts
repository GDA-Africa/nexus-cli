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
 * Validate a project name (accepts free-text like "Todo List App").
 * Validates that the derived slug is a valid npm name and the directory doesn't exist.
 */
export function validateProjectName(name: string, targetDir?: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: 'Project name cannot be empty.' };
  }

  const slug = toSlug(name);

  if (!slug) {
    return { valid: false, message: 'Project name must contain at least one letter or number.' };
  }

  // Check npm naming rules against the derived slug
  const npmResult = validateNpmPackageName(slug);
  if (!npmResult.validForNewPackages) {
    const errors = [...(npmResult.errors ?? []), ...(npmResult.warnings ?? [])];
    return {
      valid: false,
      message: `Invalid package name "${slug}": ${errors.join(', ')}`,
    };
  }

  // Check if directory already exists
  const dir = targetDir ?? path.resolve(process.cwd(), slug);
  if (fs.existsSync(dir)) {
    return {
      valid: false,
      message: `Directory "${slug}" already exists. Choose a different name or delete the existing directory.`,
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
 * Convert any project name into a kebab-case slug for folder & package.json name.
 *
 * Examples:
 *   "Todo List App"  → "todo-list-app"
 *   "My Cool Project" → "my-cool-project"
 *   "todo-list-app"  → "todo-list-app"
 *   "  Some  App  "  → "some-app"
 */
export function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_.]/g, '')  // strip invalid chars (keep spaces for now)
    .replace(/\s+/g, '-')              // spaces → hyphens
    .replace(/-+/g, '-')               // collapse multiple hyphens
    .replace(/^[-_.]+/, '')            // strip leading separators
    .replace(/[-_.]+$/, '');           // strip trailing separators
}

/**
 * Convert a project name into a human-readable display name.
 *
 * If the input is already "free text" (contains spaces/uppercase), keep it.
 * If it's a slug like "todo-list-app", convert to "Todo List App".
 */
export function toDisplayName(name: string): string {
  const trimmed = name.trim();

  // If already has spaces or mixed case, it's a free-text name — just clean it up
  if (/\s/.test(trimmed) || /[A-Z]/.test(trimmed)) {
    return trimmed.replace(/\s+/g, ' ');
  }

  // Otherwise convert slug → title case: "todo-list-app" → "Todo List App"
  return trimmed
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Sanitize a project name for use as a directory name.
 * @deprecated Use `toSlug()` instead — this is kept for backwards compatibility.
 */
export function sanitizeProjectName(name: string): string {
  return toSlug(name);
}
