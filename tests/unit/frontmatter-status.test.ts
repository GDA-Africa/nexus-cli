import { describe, expect, it } from 'vitest';

import { isPopulated, isTemplate } from '../../src/generators/index.js';

/**
 * Regression suite for the `nexus upgrade` data-loss bug (backlog #11).
 *
 * Both predicates used `/^---[\s\S]*?status:\s*"?template"?[\s\S]*?---/m`. The
 * `m` flag makes `^---` match at the start of ANY line, so a markdown
 * horizontal rule opens what the regex treats as frontmatter, and the lazy
 * `[\s\S]*?` then scans the whole document body for the status text.
 *
 * Consequence: any document containing a `---` rule and the words
 * `status: template` anywhere in its prose was classified as a template and
 * overwritten. That is what destroyed `nexus-cli/.nexus/docs/index.md` on
 * 2026-08-10 — a hand-written brain with no frontmatter that happened to
 * document the status convention.
 *
 * The contract these tests protect: **only the leading frontmatter block
 * decides.** Everything else is user content and is preserved.
 */
describe('isTemplate / isPopulated — only the leading frontmatter decides', () => {
  describe('the shipped data-loss cases', () => {
    it('does not treat a frontmatter-less doc that discusses the convention as a template', () => {
      // The real shape of the file destroyed on 2026-08-10.
      const doc = [
        '# NEXUS CLI — Project Index',
        '',
        'Hand-written brain. No frontmatter.',
        '',
        '---',
        '',
        '## Conventions',
        '',
        'A fresh scaffold uses',
        'status: template',
        'and an agent flips it to populated once filled in.',
        '',
        '---',
        '',
        '## Backlog',
      ].join('\n');

      expect(isTemplate(doc)).toBe(false);
      expect(isPopulated(doc)).toBe(false);
    });

    it('does not treat a populated doc that mentions the convention as a template', () => {
      const doc = [
        '---',
        'id: "design"',
        'status: "populated"',
        '---',
        '',
        '# Design',
        '',
        '---',
        'We replace a doc only when its frontmatter says status: template.',
        '---',
      ].join('\n');

      expect(isTemplate(doc)).toBe(false);
      expect(isPopulated(doc)).toBe(true);
    });

    it('never reports a document as both template and populated', () => {
      // The old regexes could both return true for one file, which made the
      // classification depend on which predicate the caller happened to ask.
      const doc = [
        '---',
        'status: "populated"',
        '---',
        '',
        '---',
        'status: template',
        '---',
      ].join('\n');

      expect(isTemplate(doc) && isPopulated(doc)).toBe(false);
    });
  });

  describe('genuine template detection still works', () => {
    it('detects an unquoted status', () => {
      expect(isTemplate('---\nid: "x"\nstatus: template\n---\n\n# Doc\n')).toBe(true);
    });

    it('detects a double-quoted status', () => {
      expect(isTemplate('---\nstatus: "template"\n---\n')).toBe(true);
    });

    it('detects a single-quoted status', () => {
      expect(isTemplate("---\nstatus: 'template'\n---\n")).toBe(true);
    });

    it('tolerates trailing whitespace after the value', () => {
      expect(isTemplate('---\nstatus: template   \n---\n')).toBe(true);
    });

    it('handles CRLF line endings', () => {
      expect(isTemplate('---\r\nstatus: template\r\n---\r\n\r\n# Doc\r\n')).toBe(true);
      expect(isPopulated('---\r\nstatus: populated\r\n---\r\n')).toBe(true);
    });

    it('detects populated regardless of field order', () => {
      expect(isPopulated('---\ntitle: "T"\nstatus: populated\nconfidence: high\n---\n')).toBe(true);
    });
  });

  describe('everything else is preserved by default', () => {
    it('a doc with no frontmatter is not a template', () => {
      expect(isTemplate('# Hand-written\n\nNo frontmatter here.\n')).toBe(false);
    });

    it('frontmatter without a status field is not a template', () => {
      expect(isTemplate('---\nid: "x"\ntitle: "T"\n---\n\n# Doc\n')).toBe(false);
    });

    it('an unrecognised status value is not a template', () => {
      expect(isTemplate('---\nstatus: draft\n---\n')).toBe(false);
      expect(isPopulated('---\nstatus: draft\n---\n')).toBe(false);
    });

    it('a status line in the body never counts', () => {
      expect(isTemplate('---\nid: "x"\n---\n\nstatus: template\n')).toBe(false);
    });

    it('an unterminated frontmatter block is not a template', () => {
      // isCorrupted owns this case; the replace gate must not claim it.
      expect(isTemplate('---\nstatus: template\n\n# Doc with no closing fence\n')).toBe(false);
    });

    it('an empty document is not a template', () => {
      expect(isTemplate('')).toBe(false);
      expect(isPopulated('')).toBe(false);
    });

    it('a status field that is only a prefix does not match', () => {
      expect(isTemplate('---\nstatus: templated\n---\n')).toBe(false);
      expect(isPopulated('---\nstatus: populated-by-hand\n---\n')).toBe(false);
    });

    it('a differently-named field ending in status does not match', () => {
      expect(isTemplate('---\ndoc_status: template\n---\n')).toBe(false);
    });
  });
});

/**
 * End-to-end guarantee, at the level that actually caused the data loss.
 *
 * The unit tests above pin the predicate. This one pins the contract users
 * care about: run an upgrade over a real directory and a hand-written brain
 * doc is still there afterwards, byte for byte.
 */
describe('nexus upgrade — preserve-by-default over a real directory', () => {
  /** The 26 KB hand-written file destroyed on 2026-08-10, in miniature. */
  const handWrittenBrain = [
    '# NEXUS CLI — Project Index',
    '',
    '**Project:** NEXUS CLI',
    '**Coverage:** Unit: 334/334 passing',
    '',
    '---',
    '',
    '## Conventions',
    '',
    'A freshly scaffolded doc carries status: template in its frontmatter,',
    'and an agent flips it to populated once the doc is filled in.',
    '',
    '---',
    '',
    '## Backlog',
    '- Ship v1.3',
    '',
  ].join('\n');

  it('does not overwrite a frontmatter-less hand-written doc', async () => {
    const fs = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const { reconcileNexusFiles } = await import('../../src/generators/index.js');

    const tmpDir = path.join(
      os.tmpdir(),
      `nexus-upgrade-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const docPath = path.join(tmpDir, '.nexus', 'docs', 'index.md');

    try {
      await fs.mkdir(path.dirname(docPath), { recursive: true });
      await fs.writeFile(docPath, handWrittenBrain, 'utf-8');

      const config = {
        displayName: 'Demo',
        projectType: 'fullstack',
        frontendFramework: 'nextjs',
        dataStrategy: 'postgres',
        backendFramework: 'none',
        backendStrategy: 'api-routes',
        testFramework: 'vitest',
        packageManager: 'npm',
        appPatterns: [],
        persona: { name: 'Nexus', tone: 'friendly', verbosity: 'balanced', identity: 'AI dev partner' },
      } as never;

      const result = await reconcileNexusFiles(tmpDir, config, 'upgrade');

      expect(result.preserved).toContain('.nexus/docs/index.md');
      expect(result.replaced).not.toContain('.nexus/docs/index.md');
      expect(await fs.readFile(docPath, 'utf-8')).toBe(handWrittenBrain);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
