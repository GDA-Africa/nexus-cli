import { describe, it, expect } from 'vitest';

import { parsePlanContent } from '../../src/utils/plans/parser.js';
import {
  DEFAULT_GATE_RECORD,
  GRILLING_PENDING_MARKER,
  collectGates,
  evaluateGate,
  isMajor,
  planIsGated,
  planTypeOf,
  recordIsSatisfied,
  taskLooksLikeBuild,
} from '../../src/utils/skills/gate.js';
import type { SkillGate } from '../../src/utils/skills/types.js';

const GATE: SkillGate = { planTypes: ['feature', 'refactor', 'spike'], record: DEFAULT_GATE_RECORD };

function plan(frontmatter: string, body = ''): ReturnType<typeof parsePlanContent> {
  return parsePlanContent(`---\nid: "p1"\ntitle: "P"\nstatus: "in_progress"\n${frontmatter}\n---\n\n## Goal\nA goal.\n${body}`);
}

describe('planTypeOf', () => {
  it('prefers the explicit type field', () => {
    expect(planTypeOf(plan('type: "refactor"\nsource: "manual:feature"').frontmatter)).toBe('refactor');
  });

  it('falls back to the source convention for pre-v1.3 plans', () => {
    expect(planTypeOf(plan('source: "template:spike"').frontmatter)).toBe('spike');
  });

  it('falls back to the first tag, normalising the bug-fix tag', () => {
    expect(planTypeOf(plan('tags: ["bug-fix"]').frontmatter)).toBe('bug');
  });

  it('returns null when nothing identifies the type', () => {
    expect(planTypeOf(plan('owner: "x"').frontmatter)).toBeNull();
  });
});

describe('planIsGated', () => {
  it('gates feature, refactor and spike by type', () => {
    for (const type of ['feature', 'refactor', 'spike']) {
      expect(planIsGated(plan(`type: "${type}"`).frontmatter, GATE)).toBe(true);
    }
  });

  it('does not gate a plain bug plan — a typo fix is a bug plan too', () => {
    expect(planIsGated(plan('type: "bug"').frontmatter, GATE)).toBe(false);
  });

  it('gates a bug plan explicitly marked major', () => {
    const fm = plan('type: "bug"\nmajor: true').frontmatter;
    expect(isMajor(fm)).toBe(true);
    expect(planIsGated(fm, GATE)).toBe(true);
  });

  it('never gates a chore', () => {
    expect(planIsGated(plan('type: "chore"\nmajor: true').frontmatter, GATE)).toBe(false);
  });
});

describe('recordIsSatisfied', () => {
  it('is false when the section is absent', () => {
    expect(recordIsSatisfied(plan('type: "feature"'), GATE)).toBe(false);
  });

  it('is false for an untouched template — the pending marker blocks it', () => {
    const doc = plan('type: "feature"', `\n## Grilling\n<!-- ${GRILLING_PENDING_MARKER} — run it. -->\n`);
    expect(recordIsSatisfied(doc, GATE)).toBe(false);
  });

  it('is false for a section holding only bullet stubs', () => {
    expect(recordIsSatisfied(plan('type: "feature"', '\n## Grilling\n-\n- (none yet)\n'), GATE)).toBe(false);
  });

  it('is true once the section carries real content', () => {
    const doc = plan('type: "feature"', '\n## Grilling\n**Ask:** Ship per-project skill overrides.\n');
    expect(recordIsSatisfied(doc, GATE)).toBe(true);
  });
});

describe('collectGates', () => {
  const base = { gate: GATE, invocation: 'model' as const, status: 'active' };

  it('collects a gate from a model-invoked skill', () => {
    expect(collectGates([{ name: 'grilling', ...base }])).toHaveLength(1);
  });

  it('ignores a gate on a user-invoked skill (the §6 invariant)', () => {
    expect(collectGates([{ name: 'x', ...base, invocation: 'user' }])).toHaveLength(0);
  });

  it('ignores a deprecated skill', () => {
    expect(collectGates([{ name: 'x', ...base, status: 'deprecated' }])).toHaveLength(0);
  });

  it('ignores skills with no gate', () => {
    expect(collectGates([{ name: 'x', ...base, gate: null }])).toHaveLength(0);
  });
});

describe('evaluateGate', () => {
  const decls = [{ skill: 'grilling', gate: GATE }];

  it('requires alignment for a gated plan with no record', () => {
    const result = evaluateGate(plan('type: "feature"'), decls);
    expect(result.required).toBe(true);
    expect(result.skill).toBe('grilling');
    expect(result.reason).toContain('type=feature');
  });

  it('is satisfied once the record is filled', () => {
    const doc = plan('type: "feature"', '\n## Grilling\n**Ask:** Real content.\n');
    const result = evaluateGate(doc, decls);
    expect(result.required).toBe(false);
    expect(result.satisfiedBy).toContain('## Grilling');
  });

  it('leaves ungated plan types alone', () => {
    expect(evaluateGate(plan('type: "chore"'), decls).required).toBe(false);
  });

  it('never fires when no skill declares a gate', () => {
    expect(evaluateGate(plan('type: "feature"'), []).required).toBe(false);
  });

  it('fires with no plan only when the task looks like build work', () => {
    expect(evaluateGate(null, decls, { taskLooksLikeBuild: true }).required).toBe(true);
    expect(evaluateGate(null, decls, { taskLooksLikeBuild: false }).required).toBe(false);
  });

  it('stays bounded — the status is four short fields, so it can be charged but never dropped', () => {
    const size = JSON.stringify(evaluateGate(plan('type: "feature"'), decls)).length;
    expect(size).toBeLessThan(400);
  });
});

describe('taskLooksLikeBuild', () => {
  it('recognises build phrasing', () => {
    expect(taskLooksLikeBuild('add a new export command')).toBe(true);
    expect(taskLooksLikeBuild('refactor the parser')).toBe(true);
  });

  it('does not fire on a question', () => {
    expect(taskLooksLikeBuild('what does the doctor check?')).toBe(false);
  });
});
