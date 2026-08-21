import { describe, expect, it } from 'vitest';

import { generateAiConfig } from '../../src/generators/ai-config.js';
import type { NexusConfig } from '../../src/types/config.js';

const config = {
  displayName: 'Demo',
  projectType: 'fullstack',
  frontendFramework: 'nextjs',
  dataStrategy: 'postgres',
  backendFramework: 'none',
  backendStrategy: 'api-routes',
  testFramework: 'vitest',
  packageManager: 'npm',
  appPatterns: ['auth'],
  persona: { name: 'Nexus', tone: 'friendly', verbosity: 'balanced', identity: 'AI dev partner' },
} as unknown as NexusConfig;

/** Must match D14's BUDGET_BYTES — NEXUS's own output has to pass its own check. */
const BUDGET_BYTES = 8 * 1024;

const ALWAYS_LOADED = [
  'CLAUDE.md',
  'AGENTS.md',
  '.cursorrules',
  '.windsurfrules',
  '.clinerules',
  '.github/copilot-instructions.md',
];

describe('generated instruction files — context load budget', () => {
  const files = generateAiConfig(config);
  const loaded = files.filter((f) => ALWAYS_LOADED.includes(f.path));

  it('generates every always-loaded file', () => {
    expect(loaded.map((f) => f.path).sort()).toEqual([...ALWAYS_LOADED].sort());
  });

  it.each(ALWAYS_LOADED)('%s stays inside the 8 KB always-loaded budget', (target) => {
    // A regression here means NEXUS's own generator would trip D14 in every
    // project it scaffolds. Push new reference material behind a pointer into
    // `.nexus/ai/instructions.md` instead of growing this file.
    const file = loaded.find((f) => f.path === target);
    expect(file, `${target} was not generated`).toBeDefined();
    expect(file!.content.length).toBeLessThan(BUDGET_BYTES);
  });

  it('keeps the disclosed detail reachable in .nexus/ai/instructions.md', () => {
    const master = files.find((f) => f.path === '.nexus/ai/instructions.md');
    expect(master).toBeDefined();
    // Everything the tool files now point at rather than repeat.
    expect(master!.content).toMatch(/Onboarding Protocol/i);
    expect(master!.content).toMatch(/### \[category\]/);
    expect(master!.content).toMatch(/\| Tag \| Use When \|/);
  });

  it('documents the knowledge format that parseKnowledge actually reads', () => {
    // The generator used to teach `## [YYYY-MM-DD] category — title`, which
    // ENTRY_HEADING in utils/knowledge.ts cannot parse — so entries written by
    // hand were invisible to query_knowledge, get_context and consolidate.
    const master = files.find((f) => f.path === '.nexus/ai/instructions.md');
    expect(master!.content).toContain('### [category]');
    expect(master!.content).not.toMatch(/^## \[YYYY-MM-DD\] category — title$/m);
  });

  it('points every tool file at the disclosed detail rather than repeating it', () => {
    for (const file of loaded) {
      expect(file.content, `${file.path} lost its pointer`).toContain('.nexus/ai/instructions.md');
    }
  });

  it('tells agents to honour the alignment gate', () => {
    for (const file of loaded) {
      expect(file.content, `${file.path} lost the gate rule`).toMatch(/gate\.required/);
    }
  });
});
