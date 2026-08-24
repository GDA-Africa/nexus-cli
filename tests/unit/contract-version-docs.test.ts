/**
 * QA regression (independent verification pass, 2026-08-24):
 *
 * `ComposedContext.contract_version` (nexus-harness-work.md §2.3 DoD: "Add
 * `contract_version` and treat it as public API from the next minor") landed
 * in the type and in `getContextTool`'s return value, but no doc anywhere —
 * `NEXUS.md`, `.nexus/docs/04_api_contracts.md`, or a doc comment at the
 * field itself — told a consumer the field existed, what it means, or what
 * its current value is. A field a host is expected to bind against is not
 * "public API" if nothing describes it.
 *
 * These checks don't re-verify the composer (see mcp-context-pack.test.ts
 * for that); they guard the documentation itself from silently drifting
 * back out of sync with the source of truth (`CONTRACT_VERSION` in
 * `src/mcp/tools.ts`) on a future edit or regen.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveBrainContext } from '../../src/mcp/context.js';
import { getContextTool } from '../../src/mcp/tools.js';

const repoRoot = process.cwd();

describe('contract_version is documented where a consumer would find it', () => {
  it('NEXUS.md documents the contract_version field', async () => {
    const content = await fs.readFile(path.join(repoRoot, 'NEXUS.md'), 'utf8');
    expect(content).toContain('contract_version');
  });

  it('.nexus/docs/04_api_contracts.md documents the contract_version field', async () => {
    const content = await fs.readFile(
      path.join(repoRoot, '.nexus/docs/04_api_contracts.md'),
      'utf8',
    );
    expect(content).toContain('contract_version');
  });

  it('the documented current value matches what the composer actually emits', async () => {
    // Minimal fixture: enough of a .nexus tree for getContextTool to run
    // without throwing, nothing more — this test is about the version
    // string, not composition behaviour.
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-cv-'));
    const nexusDir = path.join(tmpDir, '.nexus');
    await fs.mkdir(path.join(nexusDir, 'docs'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'plans'), { recursive: true });
    await fs.mkdir(path.join(nexusDir, 'state'), { recursive: true });
    await fs.writeFile(path.join(nexusDir, 'docs', 'index.md'), '# Index\n');
    await fs.writeFile(path.join(nexusDir, 'docs', 'knowledge.md'), '# Knowledge\n');

    const ctx = resolveBrainContext(tmpDir);
    const pack = await getContextTool(ctx, { task: 'orient' });

    const nexusMd = await fs.readFile(path.join(repoRoot, 'NEXUS.md'), 'utf8');
    const apiDoc = await fs.readFile(
      path.join(repoRoot, '.nexus/docs/04_api_contracts.md'),
      'utf8',
    );

    expect(nexusMd).toContain(`"${pack.contract_version}"`);
    expect(apiDoc).toContain(`"${pack.contract_version}"`);

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
