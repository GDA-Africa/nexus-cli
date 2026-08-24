/**
 * Load and validate `.nexus/harnesses.yml`.
 *
 * The file is entirely optional. Absent it, every caller must fall back to
 * today's behaviour — that is a hard requirement (spec `nexus-harness-work.md`
 * §8), not a nicety, so this module returns `null` rather than a default
 * object when the file does not exist.
 */

import path from 'node:path';

import fs from 'fs-extra';
import yaml from 'js-yaml';
import { z } from 'zod';

import { HarnessesConfigSchema, type HarnessesConfig } from './types.js';

export class HarnessesConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HarnessesConfigError';
  }
}

/** Filename this module reads, relative to a project's `.nexus/` directory. */
export const HARNESSES_FILE_NAME = 'harnesses.yml';

/**
 * Load `<nexusDir>/harnesses.yml`.
 *
 * @returns `null` when the file does not exist — the caller's cue to use
 *   unbounded, today-identical behaviour. Throws `HarnessesConfigError` when
 *   the file exists but is not valid YAML or fails schema validation; a
 *   malformed declared budget is a configuration bug worth surfacing loudly,
 *   not one to silently paper over with a default.
 */
export async function loadHarnessesConfig(nexusDir: string): Promise<HarnessesConfig | null> {
  const filePath = path.join(nexusDir, HARNESSES_FILE_NAME);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }

  return parseHarnessesConfig(raw, filePath);
}

/** Parse and validate already-read YAML text. Exported for tests. */
export function parseHarnessesConfig(raw: string, sourcePath = HARNESSES_FILE_NAME): HarnessesConfig {
  let doc: unknown;
  try {
    doc = yaml.load(raw);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new HarnessesConfigError(`${sourcePath} is not valid YAML: ${detail}`);
  }

  const result = HarnessesConfigSchema.safeParse(doc);
  if (!result.success) {
    throw new HarnessesConfigError(
      `${sourcePath} failed validation:\n${formatIssues(result.error)}`,
    );
  }

  return result.data;
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`)
    .join('\n');
}

function isNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'ENOENT';
}
