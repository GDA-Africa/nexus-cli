import path from 'node:path';

import fs from 'fs-extra';

export const DEFAULT_STALE_FOLDERS = [
  'src/commands',
  'src/utils',
  'src/generators',
  'tests/e2e',
  'tests/unit',
  'tests/integration',
];

export interface FolderStaleData {
  folder: string;
  staleDays: number;
}

export interface FilesSensorData {
  staleFolders: FolderStaleData[];
}

/**
 * Capture file and folder staleness.
 * Specifically checks the modification times of phase folders if present, 
 * or general src/ folders to compute stale days.
 * @param cwd The working directory of the project.
 */
export async function captureFilesSensor(cwd: string = process.cwd()): Promise<FilesSensorData> {
  const staleFolders: FolderStaleData[] = [];
  const now = Date.now();

  for (const folder of DEFAULT_STALE_FOLDERS) {
    const fullPath = path.join(cwd, folder);

    if (!(await fs.pathExists(fullPath))) {
      staleFolders.push({ folder, staleDays: -1 }); // -1 indicates never created or missing
      continue;
    }

    try {
      const latestMtimeMs = await findLatestMtime(fullPath);
      const staleTimeMs = now - latestMtimeMs;
      const staleDays = Math.max(0, Math.floor(staleTimeMs / (1000 * 60 * 60 * 24)));
      staleFolders.push({ folder, staleDays });
    } catch {
      // In case of error (e.g. permission issue), mark as unavailable.
      staleFolders.push({ folder, staleDays: -1 });
    }
  }

  return { staleFolders };
}

// Find the latest modification time of any file within a directory (recursively)
async function findLatestMtime(dir: string): Promise<number> {
  const dirStats = await fs.stat(dir);
  let latestFileMtime = 0;
  let fileCount = 0;
  
  async function walk(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        fileCount += 1;
        const stats = await fs.stat(fullPath);
        if (stats.mtimeMs > latestFileMtime) {
          latestFileMtime = stats.mtimeMs;
        }
      }
    }
  }

  await walk(dir);

  if (fileCount === 0) {
    return dirStats.mtimeMs;
  }

  return latestFileMtime;
}
