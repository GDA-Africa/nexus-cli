/**
 * NEXUS CLI — Skill Source Fetcher
 *
 * Sourcing skills from:
 *  1. Local directories (./path/to/skills, /abs/path, ../nexus-skills)
 *  2. GitHub repositories (owner/repo, github:owner/repo, https://github.com/owner/repo)
 *  3. Git repositories (git+https://..., git clone)
 *  4. NPM registry packages (@nexus-framework/skills, nexus-skill-*)
 */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';

import { execa } from 'execa';

import { dirExists } from '../file-system.js';
import { isGitInstalled } from '../git.js';

const gunzip = promisify(zlib.gunzip);

export type SkillSourceKind = 'local' | 'github' | 'git' | 'npm';

export interface ResolvedSkillSource {
  sourceKind: SkillSourceKind;
  label: string;
  version: string;
  files: Map<string, string>;
  isOfficialRegistry: boolean;
}

export type SkillFetchResult =
  | ResolvedSkillSource
  | { notFound: true; label: string }
  | null;

/**
 * Unpack a .tar.gz / .tgz buffer and extract all .md files into a Map.
 * Handles standard POSIX tar, ustar prefix, GNU long name (L), and PAX headers (x).
 */
export async function unpackTarGz(buffer: Buffer): Promise<Map<string, string>> {
  const tarData = await gunzip(buffer);
  const files = new Map<string, string>();

  let offset = 0;
  let nextFileName: string | null = null;

  while (offset + 512 <= tarData.length) {
    const header = tarData.slice(offset, offset + 512);

    // Empty block (all zeros) indicates end of archive
    if (header.every((b) => b === 0)) break;

    // Typeflag: byte 156
    const typeflag = String.fromCharCode(header[156] || 0);

    // Size: bytes 124–135 (octal ASCII)
    const sizeStr = header.slice(124, 136).toString('utf8').replace(/\0/g, '').trim();
    const fileSize = parseInt(sizeStr, 8) || 0;
    const dataStart = offset + 512;

    // Extract raw name from header
    let rawName: string;
    if (nextFileName) {
      rawName = nextFileName;
      nextFileName = null;
    } else {
      const nameEnd = header.indexOf(0, 0);
      const namePart = header.slice(0, nameEnd === -1 || nameEnd > 100 ? 100 : nameEnd).toString('utf8');

      // Check ustar prefix (bytes 345–499)
      const ustarMagic = header.slice(257, 263).toString('utf8');
      if (ustarMagic.startsWith('ustar')) {
        const prefixEnd = header.indexOf(0, 345);
        const prefixPart = header
          .slice(345, prefixEnd === -1 || prefixEnd > 500 ? 500 : prefixEnd)
          .toString('utf8')
          .trim();
        rawName = prefixPart ? `${prefixPart}/${namePart}` : namePart;
      } else {
        rawName = namePart;
      }
    }

    // GNU LongLink / LongName (typeflag 'L')
    if (typeflag === 'L') {
      const longNameBuffer = tarData.slice(dataStart, dataStart + fileSize);
      const longNameEnd = longNameBuffer.indexOf(0);
      nextFileName = longNameBuffer.slice(0, longNameEnd === -1 ? fileSize : longNameEnd).toString('utf8');
    } else if (typeflag === '0' || typeflag === '' || typeflag === '\0') {
      // Regular file
      if (rawName.toLowerCase().endsWith('.md')) {
        const content = tarData.slice(dataStart, dataStart + fileSize).toString('utf8');
        files.set(rawName, content);
      }
    }

    // Advance past header + file data (rounded up to 512-byte block)
    offset = dataStart + Math.ceil(fileSize / 512) * 512;
  }

  return files;
}

/**
 * Fetch an npm package tarball and extract its .md files.
 */
export async function fetchNpmTarball(
  pkgName: string,
  timeoutMs = 8000,
): Promise<{ files: Map<string, string>; version: string } | { notFound: true } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Support scoped packages by encoding '@scope/pkg' correctly
    const metaUrl = `https://registry.npmjs.org/${encodeURIComponent(pkgName).replace(/^%40/, '@')}/latest`;
    const metaRes = await fetch(metaUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (metaRes.status === 404) return { notFound: true };
    if (!metaRes.ok) return null;

    const meta = (await metaRes.json()) as { version?: string; dist?: { tarball?: string } };
    const tarballUrl = meta.dist?.tarball;
    const registryVersion = meta.version ?? '?';

    if (!tarballUrl) return null;

    const tgzController = new AbortController();
    const tgzTimer = setTimeout(() => tgzController.abort(), timeoutMs);

    const tgzRes = await fetch(tarballUrl, { signal: tgzController.signal });
    clearTimeout(tgzTimer);

    if (!tgzRes.ok || !tgzRes.body) return null;

    const bodyBuffer = Buffer.from(await tgzRes.arrayBuffer());
    const files = await unpackTarGz(bodyBuffer);

    return { files, version: registryVersion };
  } catch {
    return null;
  }
}

/**
 * Parse a GitHub target string into owner, repo, ref, and subpath.
 *
 * Supports:
 *  - github:owner/repo
 *  - github:owner/repo#branch
 *  - https://github.com/owner/repo
 *  - https://github.com/owner/repo.git
 *  - https://github.com/owner/repo/tree/branch/optional/subpath
 *  - owner/repo (where owner has no '@' prefix)
 */
export function parseGitHubRepo(
  source: string,
): { owner: string; repo: string; ref?: string; subpath?: string } | null {
  let clean = source.trim();

  // Strip github: prefix
  if (clean.startsWith('github:')) {
    clean = clean.slice('github:'.length);
  }

  // Handle https://github.com/...
  const httpMatch = clean.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#]+)(?:\/(?:tree|blob)\/([^/]+)(?:\/(.+))?)?/i);
  if (httpMatch) {
    const [, owner, rawRepo, ref, subpath] = httpMatch;
    const repo = rawRepo?.replace(/\.git$/i, '');
    if (owner && repo) {
      return { owner, repo, ref, subpath };
    }
  }

  // Handle git@github.com:owner/repo.git
  const sshMatch = clean.match(/^git@github\.com:([^/]+)\/([^/#]+)(?:\.git)?(?:#(.+))?$/i);
  if (sshMatch) {
    const [, owner, repo, ref] = sshMatch;
    if (owner && repo) {
      return { owner, repo: repo.replace(/\.git$/i, ''), ref };
    }
  }

  // Handle owner/repo with optional #ref
  // Note: must not start with '@' (which is an npm scope like @nexus-framework/skills)
  if (!clean.startsWith('@') && !clean.includes('://')) {
    const parts = clean.split('#');
    const pathPart = parts[0]!;
    const ref = parts[1];

    const segments = pathPart.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const owner = segments[0]!;
      const repo = segments[1]!;
      // Valid GitHub owner/repo chars: alphanumeric, hyphens, underscores, dots
      if (/^[a-zA-Z0-9_.-]+$/.test(owner) && /^[a-zA-Z0-9_.-]+$/.test(repo)) {
        const subpath = segments.slice(2).join('/');
        return { owner, repo, ref, subpath: subpath || undefined };
      }
    }
  }

  return null;
}

/**
 * Fetch a GitHub repo tarball and extract its .md files.
 */
export async function fetchGitHubRepoTarball(
  owner: string,
  repo: string,
  ref = 'HEAD',
  timeoutMs = 12000,
): Promise<{ files: Map<string, string>; version: string } | { notFound: true } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // GitHub codeload tarball endpoint (works with public repos without auth)
    const codeloadUrl = `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`;
    const res = await fetch(codeloadUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'nexus-cli',
      },
    });
    clearTimeout(timer);

    if (res.status === 404) return { notFound: true };
    if (!res.ok || !res.body) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const files = await unpackTarGz(buffer);

    return { files, version: ref };
  } catch {
    return null;
  }
}

/**
 * Recursively read all .md files from a local directory.
 */
export async function readLocalSkillsDir(
  dirPath: string,
): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  async function walk(currentDir: string, relativePrefix: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const name = entry.name;
      // Skip hidden dirs, node_modules, dist, .nexus
      if (name.startsWith('.') || name === 'node_modules' || name === 'dist') {
        continue;
      }

      const fullPath = path.join(currentDir, name);
      const relPath = relativePrefix ? `${relativePrefix}/${name}` : name;

      if (entry.isDirectory()) {
        await walk(fullPath, relPath);
      } else if (entry.isFile() && name.toLowerCase().endsWith('.md')) {
        const content = await fs.readFile(fullPath, 'utf-8');
        files.set(relPath, content);
      }
    }
  }

  await walk(dirPath, '');
  return files;
}

/**
 * Clone a git repo into a temp directory and read all .md files.
 */
export async function cloneGitRepo(
  gitUrl: string,
  ref?: string,
): Promise<{ files: Map<string, string>; version: string } | null> {
  const hasGit = await isGitInstalled();
  if (!hasGit) return null;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-skill-git-'));
  try {
    const args = ['clone', '--depth', '1'];
    if (ref) {
      args.push('--branch', ref);
    }
    args.push(gitUrl, tempDir);

    await execa('git', args);
    const files = await readLocalSkillsDir(tempDir);
    return { files, version: ref || 'HEAD' };
  } catch {
    return null;
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

/**
 * Resolve any skill source (local directory, GitHub repository, Git URL, or NPM package).
 */
export async function resolveSkillSource(
  source: string,
  cwd = process.cwd(),
): Promise<SkillFetchResult> {
  const trimmed = source.trim();

  // ── 1. Local directory check ─────────────────────────────────
  const isExplicitPath =
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('file:');

  const resolvedLocalPath = isExplicitPath
    ? path.resolve(cwd, trimmed.replace(/^file:\/\//, '').replace(/^file:/, ''))
    : path.resolve(cwd, trimmed);

  if (isExplicitPath || (await dirExists(resolvedLocalPath))) {
    if (!(await dirExists(resolvedLocalPath))) {
      return { notFound: true, label: trimmed };
    }
    const files = await readLocalSkillsDir(resolvedLocalPath);
    return {
      sourceKind: 'local',
      label: trimmed,
      version: 'local',
      files,
      isOfficialRegistry: false,
    };
  }

  // ── 2. GitHub repository check ───────────────────────────────
  const githubInfo = parseGitHubRepo(trimmed);
  if (githubInfo) {
    const { owner, repo, ref, subpath } = githubInfo;
    const label = `${owner}/${repo}${ref ? `#${ref}` : ''}`;
    const isOfficial =
      (owner.toLowerCase() === 'gda-africa' && repo.toLowerCase() === 'nexus-skills') ||
      repo.toLowerCase() === 'nexus-skills';

    const result = await fetchGitHubRepoTarball(owner, repo, ref || 'HEAD');
    if (!result) {
      // Fallback: try shallow git clone if fetch failed (e.g. private repo)
      const cloneUrl = `https://github.com/${owner}/${repo}.git`;
      const cloned = await cloneGitRepo(cloneUrl, ref);
      if (!cloned) return null;

      // Filter subpath if provided
      let files = cloned.files;
      if (subpath) {
        const filtered = new Map<string, string>();
        for (const [p, c] of files.entries()) {
          if (p.startsWith(subpath)) {
            filtered.set(p, c);
          }
        }
        files = filtered;
      }

      return {
        sourceKind: 'github',
        label,
        version: cloned.version,
        files,
        isOfficialRegistry: isOfficial,
      };
    }

    if ('notFound' in result) {
      return { notFound: true, label };
    }

    let files = result.files;
    if (subpath) {
      const filtered = new Map<string, string>();
      for (const [p, c] of files.entries()) {
        // Tar paths might have root dir prefix e.g. "nexus-skills-main/packages/core/..."
        const normalized = p.replace(/^[^/]+\//, '');
        if (normalized.startsWith(subpath)) {
          filtered.set(p, c);
        }
      }
      files = filtered;
    }

    return {
      sourceKind: 'github',
      label,
      version: result.version,
      files,
      isOfficialRegistry: isOfficial,
    };
  }

  // ── 3. Generic Git URL check ─────────────────────────────────
  if (trimmed.startsWith('git+') || trimmed.startsWith('git@') || trimmed.endsWith('.git')) {
    const cleanUrl = trimmed.replace(/^git\+/, '');
    const cloned = await cloneGitRepo(cleanUrl);
    if (!cloned) return null;
    return {
      sourceKind: 'git',
      label: trimmed,
      version: cloned.version,
      files: cloned.files,
      isOfficialRegistry: false,
    };
  }

  // ── 4. NPM package check (default) ───────────────────────────
  const isOfficial =
    trimmed === '@nexus-framework/skills' || trimmed.startsWith('@nexus-framework/skills/');
  const npmResult = await fetchNpmTarball(trimmed);

  if (!npmResult) return null;
  if ('notFound' in npmResult) {
    return { notFound: true, label: trimmed };
  }

  return {
    sourceKind: 'npm',
    label: trimmed,
    version: npmResult.version,
    files: npmResult.files,
    isOfficialRegistry: isOfficial,
  };
}
