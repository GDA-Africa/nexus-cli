import crypto from 'node:crypto';
import path from 'node:path';

import fs from 'fs-extra';

/**
 * Locate the .nexus directory by walking up from the current directory.
 * @param startDir The directory to start searching from. Defaults to process.cwd().
 * @returns The absolute path to the .nexus directory, or null if not found.
 */
export function getNexusDir(startDir: string = process.cwd()): string | null {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const nexusPath = path.join(currentDir, '.nexus');
    if (fs.existsSync(nexusPath) && fs.statSync(nexusPath).isDirectory()) {
      // For tests, do not climb outside the temp dir if we are trapped there.
      // But in real execution, we just return the first .nexus we find walking up.
      return nexusPath;
    }
    currentDir = path.dirname(currentDir);
  }

  // Check the root directory itself
  const rootNexusPath = path.join(root, '.nexus');
  if (fs.existsSync(rootNexusPath) && fs.statSync(rootNexusPath).isDirectory()) {
    return rootNexusPath;
  }

  return null;
}

/**
 * Compute a hash of the .nexus directory to detect changes.
 * This computes a hash based on the contents and structure of the .nexus directory.
 * @param nexusDir The absolute path to the .nexus directory.
 * @returns A SHA-256 hash string of the brain's state.
 */
export async function computeBrainHash(nexusDir: string): Promise<string> {
  const hash = crypto.createHash('sha256');

  // Helper to recursively read directory contents
  async function hashDirectory(currentPath: string, relativePath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    // Sort to ensure consistent hashing
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      // Ignore the state directory since it contains ephemeral data
      if (entry.name === 'state' && relativePath === '') {
        continue;
      }

      const fullPath = path.join(currentPath, entry.name);
      const entryRelativePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        hash.update(`dir:${entryRelativePath}\n`);
        await hashDirectory(fullPath, entryRelativePath);
      } else if (entry.isFile()) {
        const content = await fs.readFile(fullPath);
        hash.update(`file:${entryRelativePath}:`);
        hash.update(content);
        hash.update('\n');
      }
    }
  }

  await hashDirectory(nexusDir, '');
  return hash.digest('hex');
}
