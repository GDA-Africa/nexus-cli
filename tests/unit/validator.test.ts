/**
 * NEXUS CLI - Validator Unit Tests
 */

import { describe, it, expect } from 'vitest';

import {
  validateProjectName,
  sanitizeProjectName,
  validateNotEmpty,
  toSlug,
  toDisplayName,
} from '../../src/utils/validator.js';

describe('validateProjectName', () => {
  it('should accept a valid project name', () => {
    const result = validateProjectName('my-cool-app', '/tmp/fake-nonexistent-path');
    expect(result.valid).toBe(true);
  });

  it('should reject an empty name', () => {
    const result = validateProjectName('');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('empty');
  });

  it('should reject whitespace-only name', () => {
    const result = validateProjectName('   ');
    expect(result.valid).toBe(false);
  });

  it('should accept names with uppercase letters (free-text input)', () => {
    const result = validateProjectName('MyApp', '/tmp/fake-nonexistent-path');
    expect(result.valid).toBe(true);
  });

  it('should accept free-text names like "Todo List App"', () => {
    const result = validateProjectName('Todo List App', '/tmp/fake-nonexistent-path');
    expect(result.valid).toBe(true);
  });

  it('should accept names starting with a dot (slug strips leading dot)', () => {
    const result = validateProjectName('.hidden', '/tmp/fake-nonexistent-path');
    expect(result.valid).toBe(true);
  });

  it('should accept names starting with underscore (slug strips leading underscore)', () => {
    const result = validateProjectName('_private', '/tmp/fake-nonexistent-path');
    expect(result.valid).toBe(true);
  });
});

describe('sanitizeProjectName', () => {
  it('should lowercase the name', () => {
    expect(sanitizeProjectName('MyApp')).toBe('myapp');
  });

  it('should replace spaces with hyphens', () => {
    expect(sanitizeProjectName('my cool app')).toBe('my-cool-app');
  });

  it('should strip invalid characters', () => {
    expect(sanitizeProjectName('my@app!')).toBe('myapp');
  });

  it('should strip leading special characters', () => {
    expect(sanitizeProjectName('--my-app')).toBe('my-app');
  });

  it('should trim whitespace', () => {
    expect(sanitizeProjectName('  my-app  ')).toBe('my-app');
  });
});

describe('validateNotEmpty', () => {
  it('should pass for non-empty string', () => {
    const result = validateNotEmpty('hello');
    expect(result.valid).toBe(true);
  });

  it('should fail for empty string', () => {
    const result = validateNotEmpty('');
    expect(result.valid).toBe(false);
  });

  it('should fail for whitespace-only string', () => {
    const result = validateNotEmpty('   ');
    expect(result.valid).toBe(false);
  });

  it('should include field name in error message', () => {
    const result = validateNotEmpty('', 'Username');
    expect(result.message).toContain('Username');
  });
});

describe('toSlug', () => {
  it('should convert free-text to kebab-case', () => {
    expect(toSlug('Todo List App')).toBe('todo-list-app');
  });

  it('should lowercase everything', () => {
    expect(toSlug('MyApp')).toBe('myapp');
  });

  it('should pass through already-slugged names', () => {
    expect(toSlug('my-cool-app')).toBe('my-cool-app');
  });

  it('should trim whitespace', () => {
    expect(toSlug('  my app  ')).toBe('my-app');
  });

  it('should collapse multiple spaces to single hyphen', () => {
    expect(toSlug('my   cool   app')).toBe('my-cool-app');
  });

  it('should strip invalid characters', () => {
    expect(toSlug('my@app!')).toBe('myapp');
  });

  it('should strip leading separators', () => {
    expect(toSlug('--my-app')).toBe('my-app');
  });

  it('should return empty string for invalid input', () => {
    expect(toSlug('!!!@@@')).toBe('');
  });
});

describe('toDisplayName', () => {
  it('should convert slug to title case', () => {
    expect(toDisplayName('todo-list-app')).toBe('Todo List App');
  });

  it('should preserve free-text with spaces', () => {
    expect(toDisplayName('Todo List App')).toBe('Todo List App');
  });

  it('should preserve free-text with mixed case', () => {
    expect(toDisplayName('MyApp')).toBe('MyApp');
  });

  it('should collapse multiple spaces', () => {
    expect(toDisplayName('My  Cool  App')).toBe('My Cool App');
  });

  it('should convert underscore-separated names', () => {
    expect(toDisplayName('my_cool_app')).toBe('My Cool App');
  });
});
