/**
 * NEXUS CLI — MCP public barrel smoke test
 *
 * Proves `src/mcp/index.ts` is a real, standalone entry point: importing
 * only from the barrel (never `context.js`/`tools.js`/`server.js` directly)
 * is enough to resolve a brain and call both a read and a write tool with no
 * stdio transport involved. This is the surface an embedding host (e.g. a
 * Cordis plugin) depends on via the package's `./mcp` export.
 */

import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  addKnowledgeEntryTool,
  buildMcpServer,
  McpToolError,
  resolveBrainContext,
  wakeTool,
  type BrainContext,
} from '../../src/mcp/index.js';

let tmpDir: string;
let ctx: BrainContext;

async function makeBrain(dir: string): Promise<void> {
  await fs.ensureDir(path.join(dir, '.nexus', 'docs'));
  await fs.ensureDir(path.join(dir, '.nexus', 'plans'));
  await fs.ensureDir(path.join(dir, '.nexus', 'state'));
  for (const sub of ['core', 'custom', 'community']) {
    await fs.ensureDir(path.join(dir, '.nexus', 'skills', sub));
  }

  await fs.writeFile(path.join(dir, '.nexus', 'docs', 'index.md'), '# Test Brain\n\n## ⏭️ What\'s Next\n');
  await fs.writeFile(
    path.join(dir, '.nexus', 'docs', 'knowledge.md'),
    '# Test Knowledge Base\n\n> Append-only log.\n\n## Entries\n\n---\n\n*Test footer*\n',
  );
}

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `nexus-mcp-barrel-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await makeBrain(tmpDir);
  ctx = resolveBrainContext(tmpDir);
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

describe('mcp/index.ts barrel', () => {
  it('exports McpToolError and resolveBrainContext throws it, not a raw error', () => {
    const bare = path.join(os.tmpdir(), `nexus-mcp-barrel-bare-${Date.now()}`);
    expect(() => resolveBrainContext(bare)).toThrow(McpToolError);
  });

  it('resolves a brain and calls a read tool with no stdio transport', async () => {
    const result = await wakeTool(ctx);
    expect(result.token).toMatch(/^NX-WAKE-/);
    expect(typeof result.doctorErrors).toBe('number');
  });

  it('resolves a brain and calls a write tool with no stdio transport', async () => {
    const result = await addKnowledgeEntryTool(ctx, {
      category: 'pattern',
      title: 'Barrel smoke test entry',
      body: 'Written directly through the mcp/index.ts barrel, not via MCP stdio.',
    });
    expect(result.appended).toBe(true);

    const knowledge = await fs.readFile(path.join(ctx.docsDir, 'knowledge.md'), 'utf-8');
    expect(knowledge).toContain('Barrel smoke test entry');
  });

  it('also exports buildMcpServer for hosts that want the MCP envelope', () => {
    const server = buildMcpServer({ rootDir: tmpDir });
    expect(server).toBeDefined();
  });
});
