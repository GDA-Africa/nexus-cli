/**
 * NEXUS CLI - File System Utility
 *
 * Wrappers around fs-extra for project generation and upgrade.
 */

import path from 'node:path';

import fs from 'fs-extra';
import Mustache from 'mustache';

import type { GeneratedFile, GeneratedDirectory, TemplateContext } from '../types/templates.js';

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * Write a file, creating parent directories as needed.
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Read a file's content. Returns null if the file doesn't exist.
 */
export async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Check if a file exists at the given path.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Write all generated files and directories to disk.
 */
export async function writeGeneratorResult(
  projectRoot: string,
  files: GeneratedFile[],
  directories: GeneratedDirectory[],
): Promise<void> {
  // Create directories first
  for (const dir of directories) {
    await ensureDirectory(path.join(projectRoot, dir.path));
  }

  // Then write files
  for (const file of files) {
    await writeFile(path.join(projectRoot, file.path), file.content);
  }
}

/**
 * Read a template file and render it with Mustache.
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  return Mustache.render(template, context);
}

/**
 * Check if a directory exists and is non-empty.
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
