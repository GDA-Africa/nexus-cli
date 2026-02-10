/**
 * NEXUS CLI - Upgrade & Repair System Unit Tests
 *
 * Tests for `nexus upgrade` and `nexus repair` logic:
 *   - isPopulated() frontmatter detection
 *   - isCorrupted() structural validation
 *   - upgradeProject() file strategy (replace, preserve, create, repair)
 *   - repairProject() fix-only mode (restore missing, fix corrupted, preserve valid)
 */

import path from 'node:path';
import { tmpdir } from 'node:os';

import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { upgradeProject, repairProject, isPopulated, isCorrupted } from '../../src/generators/index.js';
import { generateDocs } from '../../src/generators/docs.js';
import { generateAiConfig } from '../../src/generators/ai-config.js';
import type { NexusConfig } from '../../src/types/config.js';
import { DEFAULT_PERSONA } from '../../src/types/config.js';

const baseConfig: NexusConfig = {
  projectName: 'test-app',
  displayName: 'Test App',
  projectType: 'web',
  dataStrategy: 'cloud-first',
  appPatterns: [],
  frontendFramework: 'nextjs',
  backendStrategy: 'integrated',
  backendFramework: 'none',
  testFramework: 'vitest',
  packageManager: 'npm',
  git: true,
  installDeps: false,
  persona: DEFAULT_PERSONA,
};

/* ══════════════════════════════════════════════════════════════
 * isPopulated() — frontmatter detection
 * ══════════════════════════════════════════════════════════════ */

describe('isPopulated', () => {
  it('should return true for docs with status: populated', () => {
    const content = `---
nexus_doc: true
id: "01_vision"
status: populated
confidence: high
---
# Vision`;
    expect(isPopulated(content)).toBe(true);
  });

  it('should return false for docs with status: template', () => {
    const content = `---
nexus_doc: true
id: "01_vision"
status: template
---
# Vision`;
    expect(isPopulated(content)).toBe(false);
  });

  it('should return false for docs without frontmatter', () => {
    expect(isPopulated('# Just a heading\nSome text')).toBe(false);
  });

  it('should return false for empty content', () => {
    expect(isPopulated('')).toBe(false);
  });

  it('should handle extra whitespace around status value', () => {
    const content = `---
status:   populated
---`;
    expect(isPopulated(content)).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════
 * isCorrupted() — structural validation
 * ══════════════════════════════════════════════════════════════ */

describe('isCorrupted', () => {
  it('should detect empty files as corrupted', () => {
    expect(isCorrupted('.nexus/docs/01_vision.md', '')).toBe(true);
  });

  it('should detect whitespace-only files as corrupted', () => {
    expect(isCorrupted('.nexus/docs/01_vision.md', '   \n  \n  ')).toBe(true);
  });

  it('should detect missing frontmatter on .nexus/docs/ files', () => {
    expect(isCorrupted('.nexus/docs/01_vision.md', '# Just a heading\nNo frontmatter')).toBe(true);
  });

  it('should detect unclosed frontmatter as corrupted', () => {
    expect(isCorrupted('.nexus/docs/01_vision.md', '---\nstatus: template\n# No closing dashes')).toBe(true);
  });

  it('should accept valid doc files with frontmatter', () => {
    const content = `---
nexus_doc: true
status: template
---
# Vision`;
    expect(isCorrupted('.nexus/docs/01_vision.md', content)).toBe(false);
  });

  it('should accept knowledge.md without frontmatter', () => {
    expect(isCorrupted('.nexus/docs/knowledge.md', '# Knowledge\nSome entries')).toBe(false);
  });

  it('should detect invalid JSON in manifest', () => {
    expect(isCorrupted('.nexus/manifest.json', '{broken json')).toBe(true);
  });

  it('should accept valid JSON in manifest', () => {
    expect(isCorrupted('.nexus/manifest.json', '{"version":"1.0"}')).toBe(false);
  });

  it('should accept non-doc markdown files (AI instructions) without frontmatter', () => {
    expect(isCorrupted('.nexus/ai/instructions.md', '# Instructions\nContent here')).toBe(false);
  });

  it('should accept tool files without frontmatter', () => {
    expect(isCorrupted('.cursorrules', '# Cursor Instructions\nContent')).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════
 * upgradeProject() — file strategy
 * ══════════════════════════════════════════════════════════════ */

describe('upgradeProject', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(tmpdir(), `nexus-upgrade-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
    await fs.ensureDir(path.join(tempDir, '.nexus', 'docs'));
    await fs.ensureDir(path.join(tempDir, '.nexus', 'ai'));
    await fs.ensureDir(path.join(tempDir, '.github'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should create new files that do not exist yet', async () => {
    // Empty project — everything should be "created"
    const result = await upgradeProject(tempDir, baseConfig);
    expect(result.created.length).toBeGreaterThan(0);
    expect(result.preserved).toHaveLength(0);
  });

  it('should replace AI instruction files even when they exist', async () => {
    // Write an old version of .cursorrules
    await fs.writeFile(path.join(tempDir, '.cursorrules'), 'old content');
    await fs.writeFile(path.join(tempDir, '.windsurfrules'), 'old content');
    await fs.writeFile(path.join(tempDir, '.nexus', 'ai', 'instructions.md'), 'old content');

    const result = await upgradeProject(tempDir, baseConfig);

    expect(result.replaced).toContain('.cursorrules');
    expect(result.replaced).toContain('.windsurfrules');
    expect(result.replaced).toContain('.nexus/ai/instructions.md');

    // Content should be updated
    const newContent = await fs.readFile(path.join(tempDir, '.cursorrules'), 'utf-8');
    expect(newContent).toContain('Test App');
    expect(newContent).not.toBe('old content');
  });

  it('should always replace .nexus/manifest.json', async () => {
    await fs.writeFile(
      path.join(tempDir, '.nexus', 'manifest.json'),
      JSON.stringify({ old: true }),
    );

    const result = await upgradeProject(tempDir, baseConfig);
    expect(result.replaced).toContain('.nexus/manifest.json');
  });

  it('should preserve knowledge.md if it exists', async () => {
    const customKnowledge = '# My Knowledge\n\n### [architecture] Custom insight\nImportant stuff here.';
    await fs.writeFile(
      path.join(tempDir, '.nexus', 'docs', 'knowledge.md'),
      customKnowledge,
    );

    const result = await upgradeProject(tempDir, baseConfig);
    expect(result.preserved).toContain('.nexus/docs/knowledge.md');

    // Content should be unchanged
    const preserved = await fs.readFile(
      path.join(tempDir, '.nexus', 'docs', 'knowledge.md'),
      'utf-8',
    );
    expect(preserved).toBe(customKnowledge);
  });

  it('should create knowledge.md if it does not exist (new in this version)', async () => {
    // Don't create knowledge.md — simulate upgrade from older CLI
    const result = await upgradeProject(tempDir, baseConfig);
    expect(result.created).toContain('.nexus/docs/knowledge.md');

    const content = await fs.readFile(
      path.join(tempDir, '.nexus', 'docs', 'knowledge.md'),
      'utf-8',
    );
    expect(content).toContain('Knowledge Base');
  });

  it('should preserve populated docs (status: populated)', async () => {
    const populatedVision = `---
nexus_doc: true
id: "01_vision"
title: "Vision"
status: populated
confidence: high
last_updated: "2026-01-01"
---
# Test App — Vision

My carefully written vision document with real content.`;

    await fs.writeFile(
      path.join(tempDir, '.nexus', 'docs', '01_vision.md'),
      populatedVision,
    );

    const result = await upgradeProject(tempDir, baseConfig);
    expect(result.preserved).toContain('.nexus/docs/01_vision.md');

    // Content should be untouched
    const preserved = await fs.readFile(
      path.join(tempDir, '.nexus', 'docs', '01_vision.md'),
      'utf-8',
    );
    expect(preserved).toBe(populatedVision);
  });

  it('should replace template docs (status: template)', async () => {
    const templateDoc = `---
nexus_doc: true
id: "01_vision"
title: "Vision"
status: template
---
# Old template content`;

    await fs.writeFile(
      path.join(tempDir, '.nexus', 'docs', '01_vision.md'),
      templateDoc,
    );

    const result = await upgradeProject(tempDir, baseConfig);
    expect(result.replaced).toContain('.nexus/docs/01_vision.md');

    // Should have fresh content
    const updated = await fs.readFile(
      path.join(tempDir, '.nexus', 'docs', '01_vision.md'),
      'utf-8',
    );
    expect(updated).not.toBe(templateDoc);
    expect(updated).toContain('Test App');
  });

  it('should preserve populated index.md brain', async () => {
    const populatedBrain = `---
nexus_doc: true
id: "project_index"
status: populated
---
# My Brain with lots of progress data`;

    await fs.writeFile(
      path.join(tempDir, '.nexus', 'docs', 'index.md'),
      populatedBrain,
    );

    const result = await upgradeProject(tempDir, baseConfig);
    expect(result.preserved).toContain('.nexus/docs/index.md');
  });

  it('should replace template index.md brain', async () => {
    const templateBrain = `---
nexus_doc: true
id: "project_index"
status: template
---
# Old template brain`;

    await fs.writeFile(
      path.join(tempDir, '.nexus', 'docs', 'index.md'),
      templateBrain,
    );

    const result = await upgradeProject(tempDir, baseConfig);
    expect(result.replaced).toContain('.nexus/docs/index.md');
  });

  it('should handle a full upgrade scenario correctly', async () => {
    // Simulate a real project: some docs populated, some still template
    const files: Array<{ path: string; content: string }> = [
      {
        path: '.nexus/docs/01_vision.md',
        content: '---\nstatus: populated\n---\n# Real vision',
      },
      {
        path: '.nexus/docs/02_architecture.md',
        content: '---\nstatus: populated\n---\n# Real arch',
      },
      {
        path: '.nexus/docs/03_data_contracts.md',
        content: '---\nstatus: template\n---\n# Old template',
      },
      {
        path: '.nexus/docs/knowledge.md',
        content: '# Knowledge\n### [bug-fix] Important fix\nDont do X.',
      },
      {
        path: '.cursorrules',
        content: 'old cursor rules',
      },
      {
        path: '.nexus/ai/instructions.md',
        content: 'old instructions',
      },
    ];

    for (const f of files) {
      const fullPath = path.join(tempDir, f.path);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, f.content);
    }

    const result = await upgradeProject(tempDir, baseConfig);

    // Populated docs should be preserved
    expect(result.preserved).toContain('.nexus/docs/01_vision.md');
    expect(result.preserved).toContain('.nexus/docs/02_architecture.md');
    expect(result.preserved).toContain('.nexus/docs/knowledge.md');

    // Template docs should be replaced
    expect(result.replaced).toContain('.nexus/docs/03_data_contracts.md');

    // AI files should always be replaced
    expect(result.replaced).toContain('.cursorrules');
    expect(result.replaced).toContain('.nexus/ai/instructions.md');

    // New files that didn't exist should be created
    expect(result.created.length).toBeGreaterThan(0);
  });

  it('should produce correct counts in result summary', async () => {
    const result = await upgradeProject(tempDir, baseConfig);

    // Total files should match what generateDocs + generateAiConfig produce
    const allDocs = generateDocs(baseConfig);
    const allAi = generateAiConfig(baseConfig);
    const totalGenerated = allDocs.length + allAi.length;

    const totalResult = result.created.length + result.replaced.length + result.preserved.length + result.repaired.length;
    expect(totalResult).toBe(totalGenerated);
  });

  it('should repair corrupted files during upgrade', async () => {
    // Write a corrupted doc (empty file)
    await fs.writeFile(path.join(tempDir, '.nexus', 'docs', '01_vision.md'), '');
    // Write a corrupted manifest (broken JSON)
    await fs.writeFile(path.join(tempDir, '.nexus', 'manifest.json'), '{broken');

    const result = await upgradeProject(tempDir, baseConfig);

    expect(result.repaired).toContain('.nexus/docs/01_vision.md');
    expect(result.repaired).toContain('.nexus/manifest.json');

    // Repaired files should have fresh content
    const vision = await fs.readFile(path.join(tempDir, '.nexus', 'docs', '01_vision.md'), 'utf-8');
    expect(vision).toContain('Test App');
    expect(vision).toContain('---');
  });

  it('should repair docs with missing frontmatter during upgrade', async () => {
    await fs.writeFile(
      path.join(tempDir, '.nexus', 'docs', '02_architecture.md'),
      '# Just a heading\nNo frontmatter here',
    );

    const result = await upgradeProject(tempDir, baseConfig);
    expect(result.repaired).toContain('.nexus/docs/02_architecture.md');
  });
});

/* ══════════════════════════════════════════════════════════════
 * repairProject() — fix-only mode
 * ══════════════════════════════════════════════════════════════ */

describe('repairProject', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(tmpdir(), `nexus-repair-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
    await fs.ensureDir(path.join(tempDir, '.nexus', 'docs'));
    await fs.ensureDir(path.join(tempDir, '.nexus', 'ai'));
    await fs.ensureDir(path.join(tempDir, '.github'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should restore missing files', async () => {
    // Empty project — all files missing
    const result = await repairProject(tempDir, baseConfig);
    expect(result.created.length).toBeGreaterThan(0);
    expect(result.replaced).toHaveLength(0);
  });

  it('should repair corrupted files', async () => {
    // Write a corrupted doc
    await fs.writeFile(path.join(tempDir, '.nexus', 'docs', '01_vision.md'), '');

    const result = await repairProject(tempDir, baseConfig);
    expect(result.repaired).toContain('.nexus/docs/01_vision.md');
  });

  it('should NOT replace valid template docs (unlike upgrade)', async () => {
    const templateDoc = `---
nexus_doc: true
status: template
---
# Old template content from previous version`;

    await fs.writeFile(
      path.join(tempDir, '.nexus', 'docs', '01_vision.md'),
      templateDoc,
    );

    const result = await repairProject(tempDir, baseConfig);

    // Repair should preserve valid template docs — they're not broken
    expect(result.preserved).toContain('.nexus/docs/01_vision.md');

    // Content should be unchanged
    const content = await fs.readFile(
      path.join(tempDir, '.nexus', 'docs', '01_vision.md'),
      'utf-8',
    );
    expect(content).toBe(templateDoc);
  });

  it('should NOT replace valid AI instruction files (unlike upgrade)', async () => {
    const oldInstructions = '# Old Instructions\nStill valid content here.';
    await fs.writeFile(
      path.join(tempDir, '.nexus', 'ai', 'instructions.md'),
      oldInstructions,
    );

    const result = await repairProject(tempDir, baseConfig);

    // Repair preserves valid files even if they're scaffolding
    expect(result.preserved).toContain('.nexus/ai/instructions.md');
    const content = await fs.readFile(
      path.join(tempDir, '.nexus', 'ai', 'instructions.md'),
      'utf-8',
    );
    expect(content).toBe(oldInstructions);
  });

  it('should preserve valid populated docs', async () => {
    const populated = `---
status: populated
---
# My real vision document`;

    await fs.writeFile(
      path.join(tempDir, '.nexus', 'docs', '01_vision.md'),
      populated,
    );

    const result = await repairProject(tempDir, baseConfig);
    expect(result.preserved).toContain('.nexus/docs/01_vision.md');
  });

  it('should preserve valid knowledge.md', async () => {
    const knowledge = '# Knowledge\n### [bug-fix] Important\nDont do X.';
    await fs.writeFile(
      path.join(tempDir, '.nexus', 'docs', 'knowledge.md'),
      knowledge,
    );

    const result = await repairProject(tempDir, baseConfig);
    expect(result.preserved).toContain('.nexus/docs/knowledge.md');
  });

  it('should repair corrupted knowledge.md (empty)', async () => {
    await fs.writeFile(path.join(tempDir, '.nexus', 'docs', 'knowledge.md'), '');

    const result = await repairProject(tempDir, baseConfig);
    expect(result.repaired).toContain('.nexus/docs/knowledge.md');

    const content = await fs.readFile(
      path.join(tempDir, '.nexus', 'docs', 'knowledge.md'),
      'utf-8',
    );
    expect(content).toContain('Knowledge Base');
  });

  it('should never have replaced files in repair mode', async () => {
    // Pre-populate everything with valid content
    const allDocs = generateDocs(baseConfig);
    const allAi = generateAiConfig(baseConfig);
    for (const file of [...allDocs, ...allAi]) {
      const fullPath = path.join(tempDir, file.path);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, file.content);
    }

    const result = await repairProject(tempDir, baseConfig);

    // Nothing to fix, nothing to create, everything preserved
    expect(result.replaced).toHaveLength(0);
    expect(result.created).toHaveLength(0);
    expect(result.repaired).toHaveLength(0);
    expect(result.preserved.length).toBeGreaterThan(0);
  });

  it('should produce correct counts in result summary', async () => {
    const result = await repairProject(tempDir, baseConfig);

    const allDocs = generateDocs(baseConfig);
    const allAi = generateAiConfig(baseConfig);
    const totalGenerated = allDocs.length + allAi.length;

    const totalResult = result.created.length + result.replaced.length + result.preserved.length + result.repaired.length;
    expect(totalResult).toBe(totalGenerated);
  });

  it('should handle mixed scenario: some missing, some corrupted, some valid', async () => {
    // Valid populated doc
    await fs.writeFile(
      path.join(tempDir, '.nexus', 'docs', '01_vision.md'),
      '---\nstatus: populated\n---\n# Real vision',
    );
    // Corrupted doc (empty)
    await fs.writeFile(
      path.join(tempDir, '.nexus', 'docs', '02_architecture.md'),
      '',
    );
    // Valid AI instructions
    await fs.writeFile(
      path.join(tempDir, '.nexus', 'ai', 'instructions.md'),
      '# Valid instructions content',
    );
    // Missing: everything else

    const result = await repairProject(tempDir, baseConfig);

    expect(result.preserved).toContain('.nexus/docs/01_vision.md');
    expect(result.preserved).toContain('.nexus/ai/instructions.md');
    expect(result.repaired).toContain('.nexus/docs/02_architecture.md');
    expect(result.created.length).toBeGreaterThan(0);
    expect(result.replaced).toHaveLength(0);
  });
});
