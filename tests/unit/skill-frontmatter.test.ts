import { describe, it, expect } from 'vitest';

import {
  parseSkillFrontmatter,
  parseStringList,
  validateSkillFrontmatter,
} from '../../src/utils/skills/frontmatter.js';

const BLOCK_LIST_SKILL = `---
skill: grilling
version: 1.0.0
framework: shared
category: procedure
invocation: model
gate:
  plan_types:
    - feature
    - refactor
  record: "## Grilling"
triggers:
  - "new feature"
  - "major fix"
  - "refactor"
author: "@nexus-framework/skills"
status: draft
---

# Skill: Grilling (Shared)

## When to Read This
Before any new feature.

## Context
Context.

## Steps
1. Ask.

## Patterns We Use
- One question at a time.

## Anti-Patterns — Never Do This
- ❌ Do not batch questions.

## Completion Criteria
Every branch decided or recorded out of scope.
`;

describe('parseSkillFrontmatter', () => {
  it('reads block-list triggers — the form every registry skill actually uses', () => {
    // Regression: the previous MCP parser read only inline `triggers: [a, b]`,
    // so all 22 shared skills parsed to zero triggers and the skills section of
    // the context pack never returned anything.
    const fm = parseSkillFrontmatter(BLOCK_LIST_SKILL);
    expect(fm.triggers).toEqual(['new feature', 'major fix', 'refactor']);
  });

  it('reads inline triggers too', () => {
    const fm = parseSkillFrontmatter('---\nskill: x\ntriggers: ["a b", "c d"]\n---\n');
    expect(fm.triggers).toEqual(['a b', 'c d']);
  });

  it('parses the v2 fields', () => {
    const fm = parseSkillFrontmatter(BLOCK_LIST_SKILL);
    expect(fm.slug).toBe('grilling');
    expect(fm.category).toBe('procedure');
    expect(fm.invocation).toBe('model');
    expect(fm.gate).toEqual({ planTypes: ['feature', 'refactor'], record: '## Grilling' });
  });

  it('defaults invocation to model so every v1 skill stays valid', () => {
    const fm = parseSkillFrontmatter('---\nskill: legacy\ncategory: workflow\n---\n');
    expect(fm.invocation).toBe('model');
  });

  it('falls back to the H1 for a title, since NEXUS skills carry no title field', () => {
    const fm = parseSkillFrontmatter(BLOCK_LIST_SKILL);
    expect(fm.title).toBe('Skill: Grilling (Shared)');
  });

  it('does not treat a mid-document horizontal rule as frontmatter', () => {
    // Same defect class as the isTemplate()/isPopulated() bug that destroyed
    // hand-written brains on upgrade: `^---` with the `m` flag matches any rule.
    const doc = '# Title\n\nSome prose.\n\n---\n\nskill: not-really\n\n---\n';
    expect(parseSkillFrontmatter(doc).slug).toBe('');
  });

  it('stops a block list at the next sibling key', () => {
    const block = 'triggers:\n  - "a"\n  - "b"\nauthor: someone\nstatus: active';
    expect(parseStringList(block, 'triggers')).toEqual(['a', 'b']);
  });
});

describe('validateSkillFrontmatter', () => {
  it('accepts a well-formed v2 procedure skill', () => {
    const fm = parseSkillFrontmatter(BLOCK_LIST_SKILL);
    const errors = validateSkillFrontmatter(fm, BLOCK_LIST_SKILL).filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('rejects an unknown category — the category:maps class of violation', () => {
    const fm = parseSkillFrontmatter(BLOCK_LIST_SKILL.replace('category: procedure', 'category: maps'));
    const issues = validateSkillFrontmatter(fm);
    expect(issues.some((i) => i.field === 'category' && i.severity === 'error')).toBe(true);
  });

  it('requires Completion Criteria on a procedure skill', () => {
    const content = BLOCK_LIST_SKILL.replace('## Completion Criteria', '## Example');
    const fm = parseSkillFrontmatter(content);
    const issues = validateSkillFrontmatter(fm, content);
    expect(issues.some((i) => i.message.includes('Completion Criteria'))).toBe(true);
  });

  it('requires Example on a reference skill', () => {
    const content = BLOCK_LIST_SKILL
      .replace('category: procedure', 'category: workflow')
      .replace('## Completion Criteria', '## Notes');
    const fm = parseSkillFrontmatter(content);
    const issues = validateSkillFrontmatter(fm, content);
    expect(issues.some((i) => i.message.includes('## Example'))).toBe(true);
  });

  it('rejects a gate on a user-invoked skill (SKILL_SPEC v2 §6 invariant)', () => {
    const fm = parseSkillFrontmatter(BLOCK_LIST_SKILL.replace('invocation: model', 'invocation: user'));
    const issues = validateSkillFrontmatter(fm);
    expect(issues.some((i) => i.field === 'gate' && i.severity === 'error')).toBe(true);
  });

  it('warns about a trigger too long to ever match', () => {
    const fm = parseSkillFrontmatter(
      BLOCK_LIST_SKILL.replace('- "new feature"', '- "creating a reusable React component"'),
    );
    const issues = validateSkillFrontmatter(fm);
    expect(issues.some((i) => i.field === 'triggers' && i.severity === 'warn')).toBe(true);
  });

  it('requires at least two triggers', () => {
    const fm = parseSkillFrontmatter('---\nskill: x\nversion: 1.0.0\nframework: shared\ncategory: ui\nauthor: me\ntriggers:\n  - "only one"\n---\n');
    const issues = validateSkillFrontmatter(fm);
    expect(issues.some((i) => i.field === 'triggers' && i.severity === 'error')).toBe(true);
  });
});
