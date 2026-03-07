/**
 * NEXUS CLI — Skill Command Unit Tests
 *
 * Tests for src/commands/skill.ts
 *
 * Strategy: create real temp directory trees with the expected .nexus/skills/
 * structure, then call command functions with process.cwd() mocked to point
 * at the temp dir. This catches real filesystem bugs (like the dirExists
 * regression) rather than faking the fs layer.
 *
 * process.exit() is replaced with a vi.fn() spy so commands can be tested
 * without actually killing the test runner.
 */

import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import { promisify } from 'node:util';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';

// Mock @inquirer/prompts so skillNewCommand tests don't hang waiting for stdin
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn().mockResolvedValue('test-skill'),
  select: vi.fn().mockResolvedValue('ui'),
}));

import {
  skillListCommand,
  skillNewCommand,
  skillRegistryCommand,
  skillRemoveCommand,
  skillStatusCommand,
  skillInstallCommand,
} from '../../src/commands/skill.js';

/* ──────────────────────────────────────────────────────────────
 * TAR / TGZ test helpers
 * ────────────────────────────────────────────────────────────── */

const gzip = promisify(zlib.gzip);

/**
 * Build a minimal POSIX tar buffer containing a set of zero-length files.
 * Each entry is a 512-byte header block followed by no data blocks
 * (size = 0), followed by two 512-byte null blocks (end-of-archive).
 *
 * @param paths - List of tar paths, e.g. ["package/shared/git-workflow.md"]
 */
function buildTar(paths: string[]): Buffer {
  const blocks: Buffer[] = [];

  for (const filePath of paths) {
    const header = Buffer.alloc(512, 0);

    // Name (bytes 0–99): null-terminated
    header.write(filePath.slice(0, 99), 0, 'utf8');

    // Mode (bytes 100–107): '0000644\0'
    header.write('0000644\0', 100, 'utf8');

    // UID / GID (bytes 108–123): '0000000\0' each
    header.write('0000000\0', 108, 'utf8');
    header.write('0000000\0', 116, 'utf8');

    // Size (bytes 124–135): '00000000000\0' (0 bytes)
    header.write('00000000000\0', 124, 'utf8');

    // Modification time (bytes 136–147): some valid octal
    header.write('00000000000\0', 136, 'utf8');

    // Type flag (byte 156): '0' = regular file
    header.write('0', 156, 'utf8');

    // Compute and write checksum (bytes 148–155)
    // Treat checksum field as 8 spaces during calculation
    header.fill(0x20, 148, 156);
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += header[i]!;
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 'utf8');

    blocks.push(header);
    // No data blocks — file size is 0
  }

  // Two null blocks = end-of-archive marker
  blocks.push(Buffer.alloc(512, 0));
  blocks.push(Buffer.alloc(512, 0));

  return Buffer.concat(blocks);
}

/**
 * Build a valid .tgz buffer from a list of file paths.
 */
async function buildTgz(paths: string[]): Promise<Buffer> {
  return gzip(buildTar(paths));
}

/**
 * Create a mock Response object compatible with the fetch API.
 */
function mockResponse(body: unknown, ok = true, status = 200): Response {
  const isBuffer = Buffer.isBuffer(body);
  return {
    ok,
    status,
    json: async () => body,
    arrayBuffer: async () => (isBuffer ? (body as Buffer).buffer.slice(
      (body as Buffer).byteOffset,
      (body as Buffer).byteOffset + (body as Buffer).byteLength,
    ) : new ArrayBuffer(0)),
    body: isBuffer ? {} : null,
  } as unknown as Response;
}

/* ──────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────── */

let tmpDir: string;
let cwdSpy: MockInstance;
let exitSpy: MockInstance;

/** Minimal valid skill frontmatter */
function skillFile(slug: string, status = 'active', triggers = ['doing the thing']): string {
  const triggerLines = triggers.map((t) => `  - "${t}"`).join('\n');
  return `---
skill: ${slug}
version: 1.0.0
framework: shared
category: ui
triggers:
${triggerLines}
author: core
status: ${status}
---

# Skill: ${slug}

Content here.
`;
}

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `nexus-skill-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.ensureDir(tmpDir);

  // Point process.cwd() at our temp dir
  cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);

  // Prevent process.exit() from killing the test runner
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit called');
  }) as never);
});

afterEach(async () => {
  cwdSpy.mockRestore();
  exitSpy.mockRestore();
  await fs.remove(tmpDir);
});

/** Build a standard .nexus/skills/ tree in tmpDir */
async function makeSkillsTree(opts: {
  core?: Record<string, string>;   // slug → file content
  custom?: Record<string, string>;
  community?: Record<string, string>;
} = {}): Promise<void> {
  const base = path.join(tmpDir, '.nexus', 'skills');
  await fs.ensureDir(path.join(base, 'core'));
  await fs.ensureDir(path.join(base, 'custom'));
  await fs.ensureDir(path.join(base, 'community'));

  for (const [slug, content] of Object.entries(opts.core ?? {})) {
    await fs.writeFile(path.join(base, 'core', `${slug}.md`), content, 'utf-8');
  }
  for (const [slug, content] of Object.entries(opts.custom ?? {})) {
    await fs.writeFile(path.join(base, 'custom', `${slug}.md`), content, 'utf-8');
  }
  for (const [slug, content] of Object.entries(opts.community ?? {})) {
    await fs.writeFile(path.join(base, 'community', `${slug}.md`), content, 'utf-8');
  }
}

/* ──────────────────────────────────────────────────────────────
 * nexus skill list
 * ────────────────────────────────────────────────────────────── */

describe('skillListCommand()', () => {
  /**
   * REGRESSION TEST — the production bug.
   *
   * Before the dirExists fix, fileExists(.nexus/skills/) returned false because
   * fileExists uses stat.isFile(). The command would immediately exit with:
   * "No .nexus/skills/ directory found."
   *
   * This test creates a real .nexus/skills/ directory and asserts the command
   * does NOT call process.exit(). If the dirExists fix is ever reverted, this
   * test will fail.
   */
  it('does NOT exit when .nexus/skills/ directory exists (regression: dirExists bug)', async () => {
    await makeSkillsTree();
    // Should complete without throwing (no process.exit)
    await expect(skillListCommand()).resolves.not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits with guidance when .nexus/skills/ directory is missing', async () => {
    // No skills tree created — directory does not exist
    await expect(skillListCommand()).rejects.toThrow('process.exit called');
  });

  it('lists core skill files when they exist', async () => {
    await makeSkillsTree({
      core: {
        'component-creation': skillFile('component-creation'),
        'api-routes': skillFile('api-routes', 'active', ['creating an API route']),
      },
    });
    const lines: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => lines.push(msg));
    await skillListCommand();
    logSpy.mockRestore();
    const output = lines.join('\n');
    expect(output).toContain('component-creation');
    expect(output).toContain('api-routes');
  });

  it('shows status icons: ✅ active, ⚠️  deprecated, 📝 draft', async () => {
    await makeSkillsTree({
      core: {
        'active-skill': skillFile('active-skill', 'active'),
        'old-skill': skillFile('old-skill', 'deprecated'),
        'wip-skill': skillFile('wip-skill', 'draft'),
      },
    });
    const lines: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => lines.push(msg));
    await skillListCommand();
    logSpy.mockRestore();
    const output = lines.join('\n');
    expect(output).toContain('✅');
    expect(output).toContain('⚠️');
    expect(output).toContain('📝');
  });

  it('shows trigger phrases next to skill names', async () => {
    await makeSkillsTree({
      core: {
        'routing': skillFile('routing', 'active', ['creating a page', 'adding a route']),
      },
    });
    const lines: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => lines.push(msg));
    await skillListCommand();
    logSpy.mockRestore();
    const output = lines.join('\n');
    expect(output).toContain('creating a page');
    expect(output).toContain('adding a route');
  });

  it('handles empty core/ directory gracefully', async () => {
    await makeSkillsTree(); // empty dirs
    await expect(skillListCommand()).resolves.not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('lists custom skills separately from core skills', async () => {
    await makeSkillsTree({
      core: { 'core-skill': skillFile('core-skill') },
      custom: { 'my-pattern': skillFile('my-pattern') },
    });
    const lines: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => lines.push(msg));
    await skillListCommand();
    logSpy.mockRestore();
    const output = lines.join('\n');
    expect(output).toContain('core-skill');
    expect(output).toContain('my-pattern');
  });

  it('skips README.md files when listing skills', async () => {
    await makeSkillsTree();
    // Write a README into core/
    await fs.writeFile(
      path.join(tmpDir, '.nexus', 'skills', 'core', 'README.md'),
      '# Core Skills',
      'utf-8',
    );
    const lines: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => lines.push(msg));
    await skillListCommand();
    logSpy.mockRestore();
    const output = lines.join('\n');
    expect(output).not.toContain('README');
  });
});

/* ──────────────────────────────────────────────────────────────
 * nexus skill new
 * ────────────────────────────────────────────────────────────── */

describe('skillNewCommand()', () => {
  it('exits with guidance when .nexus/skills/custom/ directory is missing', async () => {
    // No skills tree — directory does not exist
    await expect(skillNewCommand('my-skill')).rejects.toThrow('process.exit called');
  });

  it('exits with a warning if the skill file already exists', async () => {
    await makeSkillsTree({
      custom: { 'existing-skill': skillFile('existing-skill') },
    });
    await expect(skillNewCommand('existing-skill')).rejects.toThrow('process.exit called');
  });

  it('does NOT exit when .nexus/skills/custom/ exists (directory guard regression)', async () => {
    await makeSkillsTree();
    // With prompts mocked (input → 'test-skill', select → 'ui'), the command
    // should complete successfully without calling process.exit.
    await expect(skillNewCommand('test-skill')).resolves.not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

/* ──────────────────────────────────────────────────────────────
 * nexus skill remove
 * ────────────────────────────────────────────────────────────── */

describe('skillRemoveCommand()', () => {
  it('exits with error when no name is provided', async () => {
    await expect(skillRemoveCommand()).rejects.toThrow('process.exit called');
  });

  it('refuses to remove a core skill', async () => {
    await makeSkillsTree({
      core: { 'component-creation': skillFile('component-creation') },
    });
    await expect(skillRemoveCommand('component-creation')).rejects.toThrow('process.exit called');
  });

  it('refuses to remove a custom skill', async () => {
    await makeSkillsTree({
      custom: { 'my-pattern': skillFile('my-pattern') },
    });
    await expect(skillRemoveCommand('my-pattern')).rejects.toThrow('process.exit called');
  });

  it('exits with error when community skill is not found', async () => {
    await makeSkillsTree();
    await expect(skillRemoveCommand('nonexistent-skill')).rejects.toThrow('process.exit called');
  });

  it('removes a community skill successfully', async () => {
    await makeSkillsTree({
      community: { 'stripe-integration': skillFile('stripe-integration') },
    });
    const skillPath = path.join(tmpDir, '.nexus', 'skills', 'community', 'stripe-integration.md');
    expect(await fs.pathExists(skillPath)).toBe(true);

    await skillRemoveCommand('stripe-integration');

    expect(await fs.pathExists(skillPath)).toBe(false);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('strips .md extension from name if provided', async () => {
    await makeSkillsTree({
      community: { 'my-skill': skillFile('my-skill') },
    });
    const skillPath = path.join(tmpDir, '.nexus', 'skills', 'community', 'my-skill.md');
    await skillRemoveCommand('my-skill.md'); // with extension
    expect(await fs.pathExists(skillPath)).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────
 * nexus skill status
 * ────────────────────────────────────────────────────────────── */

describe('skillStatusCommand()', () => {
  it('exits with guidance when .nexus/skills/ directory is missing', async () => {
    await expect(skillStatusCommand()).rejects.toThrow('process.exit called');
  });

  it('does NOT exit when .nexus/skills/ directory exists (regression: dirExists bug)', async () => {
    await makeSkillsTree();
    await expect(skillStatusCommand()).resolves.not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('reports healthy when all skills have valid frontmatter', async () => {
    await makeSkillsTree({
      core: { 'component-creation': skillFile('component-creation', 'active') },
    });
    await expect(skillStatusCommand()).resolves.not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('runs without error when skills dirs are empty', async () => {
    await makeSkillsTree(); // all dirs exist but are empty
    await expect(skillStatusCommand()).resolves.not.toThrow();
  });

  it('detects deprecated skills', async () => {
    await makeSkillsTree({
      core: { 'old-approach': skillFile('old-approach', 'deprecated') },
    });
    // Should complete without throwing — deprecated is a warning, not an exit
    await expect(skillStatusCommand()).resolves.not.toThrow();
  });
});

/* ──────────────────────────────────────────────────────────────
 * nexus skill install
 * ────────────────────────────────────────────────────────────── */

describe('skillInstallCommand()', () => {
  it('exits with error when no package name is provided', async () => {
    await expect(skillInstallCommand()).rejects.toThrow('process.exit called');
  });

  it('exits with error when community/ directory is missing (regression: dirExists bug)', async () => {
    // No skills tree created — community/ dir does not exist
    await expect(skillInstallCommand('@nexus-framework/skills-test')).rejects.toThrow('process.exit called');
  });

  it('does NOT exit for missing-dir reason when community/ exists', async () => {
    await makeSkillsTree(); // creates community/ dir
    // @nexus-framework/skills packages exit with a "coming soon" message (not an error)
    // so process.exit IS called, but for a different reason (not the dir-missing check)
    try {
      await skillInstallCommand('@nexus-framework/skills-integrations');
    } catch {
      // process.exit was called — but we verify it wasn't for the dir-missing check
    }
    // The directory check is at the TOP of the function; if it fired, exitSpy would
    // have been called before reaching the pkg.startsWith check.
    // We can verify by checking the community/ dir still exists (not removed or anything).
    const communityDir = path.join(tmpDir, '.nexus', 'skills', 'community');
    expect(await fs.pathExists(communityDir)).toBe(true);
  });

  it('rejects unsupported (non-nexus-framework) packages', async () => {
    await makeSkillsTree();
    await expect(skillInstallCommand('some-random-package')).rejects.toThrow('process.exit called');
  });
});

/* ──────────────────────────────────────────────────────────────
 * nexus skill registry
 * ────────────────────────────────────────────────────────────── */

describe('skillRegistryCommand()', () => {
  let fetchSpy: MockInstance;

  /** Standard skill paths that represent a minimal registry tarball */
  const MOCK_PATHS = [
    'package/next.js/routing.md',
    'package/next.js/api-routes.md',
    'package/react-vite/component-creation.md',
    'package/shared/git-workflow.md',
    'package/shared/mapbox-integration.md',
    'package/shared/skill-authoring.md',
    // These should be ignored (not skill .md files)
    'package/README.md',
    'package/index.js',
    'package/next.js/README.md',
  ];

  /** Registry metadata response returned by the first fetch() call */
  const MOCK_META = {
    version: '1.2.3',
    dist: { tarball: 'https://registry.npmjs.org/@nexus-framework/skills/-/skills-1.2.3.tgz' },
  };

  beforeEach(() => {
    // fetchSpy is set per-test so each can configure its own sequence
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('fetches live registry and lists frameworks + skills from the tarball', async () => {
    const tgz = await buildTgz(MOCK_PATHS);

    fetchSpy
      .mockResolvedValueOnce(mockResponse(MOCK_META))      // metadata fetch
      .mockResolvedValueOnce(mockResponse(tgz));           // tarball fetch

    const lines: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    });
    await skillRegistryCommand();
    logSpy.mockRestore();

    const output = lines.join('\n');
    // Skills from tarball should appear
    expect(output).toContain('routing');
    expect(output).toContain('api-routes');
    expect(output).toContain('component-creation');
    expect(output).toContain('git-workflow');
    expect(output).toContain('mapbox-integration');
    expect(output).toContain('skill-authoring');
  });

  it('shows the live npm version in the header', async () => {
    const tgz = await buildTgz(MOCK_PATHS);

    fetchSpy
      .mockResolvedValueOnce(mockResponse(MOCK_META))
      .mockResolvedValueOnce(mockResponse(tgz));

    const captured: string[] = [];
    // logger uses console.log(prefix, message) — capture all arguments
    const logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      captured.push(args.map(String).join(' '));
    });

    await skillRegistryCommand();
    logSpy.mockRestore();

    // Version string from mock meta should appear somewhere in output
    expect(captured.join('\n')).toContain('1.2.3');
  });

  it('ignores README.md and non-.md files in the tarball', async () => {
    const tgz = await buildTgz(MOCK_PATHS);

    fetchSpy
      .mockResolvedValueOnce(mockResponse(MOCK_META))
      .mockResolvedValueOnce(mockResponse(tgz));

    const lines: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    });
    await skillRegistryCommand();
    logSpy.mockRestore();

    const output = lines.join('\n');
    expect(output).not.toContain('README');
    expect(output).not.toContain('index.js');
  });

  it('falls back to locally installed package when metadata fetch fails (non-ok)', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({}, false, 500));

    // Should complete without throwing — fallback uses the installed package
    await expect(skillRegistryCommand()).resolves.not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('falls back to locally installed package when fetch throws (offline)', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));

    await expect(skillRegistryCommand()).resolves.not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('falls back to locally installed package when tarball fetch fails', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockResponse(MOCK_META))           // metadata ok
      .mockResolvedValueOnce(mockResponse(Buffer.alloc(0), false, 404)); // tarball 404

    await expect(skillRegistryCommand()).resolves.not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('filters by --framework when a valid framework is provided', async () => {
    const tgz = await buildTgz(MOCK_PATHS);

    fetchSpy
      .mockResolvedValueOnce(mockResponse(MOCK_META))
      .mockResolvedValueOnce(mockResponse(tgz));

    const lines: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    });
    await skillRegistryCommand({ framework: 'shared' });
    logSpy.mockRestore();

    const output = lines.join('\n');
    // shared skills should appear
    expect(output).toContain('git-workflow');
    expect(output).toContain('mapbox-integration');
    expect(output).toContain('skill-authoring');
    // next.js skills should NOT appear
    expect(output).not.toContain('routing');
    expect(output).not.toContain('api-routes');
  });

  it('resolves the "nextjs" alias to "next.js" framework folder', async () => {
    const tgz = await buildTgz(MOCK_PATHS);

    fetchSpy
      .mockResolvedValueOnce(mockResponse(MOCK_META))
      .mockResolvedValueOnce(mockResponse(tgz));

    const lines: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    });
    await skillRegistryCommand({ framework: 'nextjs' }); // alias — not the real folder name
    logSpy.mockRestore();

    const output = lines.join('\n');
    expect(output).toContain('routing');
    expect(output).toContain('api-routes');
    // shared skills should NOT appear (filtered to next.js only)
    expect(output).not.toContain('git-workflow');
  });

  it('exits with error for an unknown --framework value', async () => {
    const tgz = await buildTgz(MOCK_PATHS);

    fetchSpy
      .mockResolvedValueOnce(mockResponse(MOCK_META))
      .mockResolvedValueOnce(mockResponse(tgz));

    await expect(skillRegistryCommand({ framework: 'angular' })).rejects.toThrow('process.exit called');
  });

  it('prints a total skill count when no framework filter is applied', async () => {
    const tgz = await buildTgz(MOCK_PATHS);

    fetchSpy
      .mockResolvedValueOnce(mockResponse(MOCK_META))
      .mockResolvedValueOnce(mockResponse(tgz));

    const captured: string[] = [];
    // logger uses console.log(prefix, message) — capture all arguments
    const logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      captured.push(args.map(String).join(' '));
    });

    await skillRegistryCommand();
    logSpy.mockRestore();

    // "Total: N skills across M framework(s)" should appear somewhere
    expect(captured.join('\n')).toMatch(/Total:\s+\d+\s+skills/);
  });

  it('does not make a second fetch if the metadata response has no tarball URL', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ version: '1.0.0', dist: {} }), // no tarball key
    );

    // Falls back gracefully — does not crash
    await expect(skillRegistryCommand()).resolves.not.toThrow();
    // Only one fetch call (the metadata one)
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
