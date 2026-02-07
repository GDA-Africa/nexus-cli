/**
 * NEXUS CLI - Validator Unit Tests
 */

import { describe, it, expect } from 'vitest';

import {
  validateProjectName,
  sanitizeProjectName,
  validateNotEmpty,
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

  it('should reject names with uppercase letters (npm rules)', () => {
    const result = validateProjectName('MyApp', '/tmp/fake-nonexistent-path');
    expect(result.valid).toBe(false);
  });

  it('should reject names starting with a dot', () => {
    const result = validateProjectName('.hidden', '/tmp/fake-nonexistent-path');
    expect(result.valid).toBe(false);
  });

  it('should reject names starting with underscore', () => {
    const result = validateProjectName('_private', '/tmp/fake-nonexistent-path');
    expect(result.valid).toBe(false);
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
