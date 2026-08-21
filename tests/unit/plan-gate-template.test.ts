import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { planNewCommand } from '../../src/commands/plan.js';
import { parsePlanContent } from '../../src/utils/plans/parser.js';
import { GRILLING_PENDING_MARKER, recordIsSatisfied } from '../../src/utils/skills/gate.js';

const GATE = { planTypes: ['feature', 'refactor', 'spike'], record: '## Grilling' };

describe('nexus plan new — gate record scaffolding', () => {
  let tmpDir: string;
  let cwd: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-plannew-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(path.join(tmpDir, '.nexus', 'plans'), { recursive: true });
    cwd = process.cwd();
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    process.chdir(cwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function read(id: string) {
    return parsePlanContent(await fs.readFile(path.join(tmpDir, '.nexus', 'plans', `${id}.md`), 'utf-8'));
  }

  it('writes an explicit type field', async () => {
    await planNewCommand('Add auth', { type: 'feature' });
    expect((await read('add-auth')).frontmatter.type).toBe('feature');
  });

  it('scaffolds a Grilling section for a feature plan', async () => {
    await planNewCommand('Add auth', { type: 'feature' });
    const plan = await read('add-auth');
    expect(plan.sections.map((s) => s.heading)).toContain('Grilling');
  });

  it('seeds it pending, so an untouched template never satisfies the gate', async () => {
    await planNewCommand('Add auth', { type: 'feature' });
    const plan = await read('add-auth');
    const section = plan.sections.find((s) => s.heading === 'Grilling');
    expect(section?.content).toContain(GRILLING_PENDING_MARKER);
    expect(recordIsSatisfied(plan, GATE)).toBe(false);
  });

  it('omits the section for a chore', async () => {
    await planNewCommand('Bump deps', { type: 'chore' });
    const plan = await read('bump-deps');
    expect(plan.sections.map((s) => s.heading)).not.toContain('Grilling');
  });

  it('omits it for an ordinary bug plan', async () => {
    await planNewCommand('Fix typo', { type: 'bug' });
    expect((await read('fix-typo')).sections.map((s) => s.heading)).not.toContain('Grilling');
  });

  it('adds it, and major: true, for a bug plan created with --major', async () => {
    await planNewCommand('Fix data loss', { type: 'bug', major: true });
    const plan = await read('fix-data-loss');
    expect(plan.frontmatter.major).toBe(true);
    expect(plan.sections.map((s) => s.heading)).toContain('Grilling');
  });

  it('ignores --major on a type that is already gated by type', async () => {
    await planNewCommand('Add auth', { type: 'feature', major: true });
    expect((await read('add-auth')).frontmatter.major).toBeUndefined();
  });
});
