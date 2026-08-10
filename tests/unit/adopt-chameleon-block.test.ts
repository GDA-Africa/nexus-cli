/**
 * `nexus adopt` writes CLAUDE.md / AGENTS.md / .cursorrules through
 * `generateAiConfig`, exactly like `init` and `upgrade` do. Adopting into a
 * project that already runs Chameleon must therefore preserve the block
 * `chameleon agents init` spliced into those files — the same guarantee
 * `reconcileNexusFiles` gives upgrade and repair.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { adoptProject } from '../../src/generators/index.js';
import type { AdoptionContext } from '../../src/prompts/adoption.js';
import {
  CHAMELEON_BLOCK_END,
  CHAMELEON_BLOCK_START,
} from '../../src/utils/chameleon/agent-block.js';
import type { ProjectInfo } from '../../src/utils/project-detector.js';

const block = `${CHAMELEON_BLOCK_START}\n## Chameleon UI (v2.0.0-alpha.1)\nPrefer Chameleon components.\n${CHAMELEON_BLOCK_END}`;

const projectInfo = {
  name: 'existing-app',
  framework: 'react-vite',
  packageManager: 'npm',
  hasTypeScript: true,
  hasTests: false,
  hasGit: false,
} as unknown as ProjectInfo;

const adoptionContext: AdoptionContext = {
  projectDescription: 'An existing app that already uses Chameleon.',
  architectureType: 'monolith',
  techStack: 'React + Vite',
  painPoints: '',
  localOnly: false,
};

describe('adopt preserves Chameleon guidance', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-adopt-cham-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'existing-app', dependencies: { '@chameleon-ui-lib/react': '^2.0.0' } }),
      'utf8',
    );
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('keeps the block when adopting into a Chameleon project', async () => {
    for (const file of ['CLAUDE.md', 'AGENTS.md', '.cursorrules']) {
      await fs.writeFile(path.join(tmpDir, file), `# Existing notes\n\n${block}\n`, 'utf8');
    }

    await adoptProject(tmpDir, projectInfo, adoptionContext);

    for (const file of ['CLAUDE.md', 'AGENTS.md', '.cursorrules']) {
      const content = await fs.readFile(path.join(tmpDir, file), 'utf8');

      // NEXUS's instructions replaced the file, as they are meant to...
      expect(content).toContain('NEXUS');
      // ...but Chameleon's section survived the overwrite.
      expect(content, `${file} lost the Chameleon block`).toContain(CHAMELEON_BLOCK_START);
      expect(content).toContain('Prefer Chameleon components.');
    }
  });

  it('leaves a project with no Chameleon block untouched by the guard', async () => {
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# Existing notes\n', 'utf8');

    await adoptProject(tmpDir, projectInfo, adoptionContext);

    const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(content).not.toContain(CHAMELEON_BLOCK_START);
  });
});
