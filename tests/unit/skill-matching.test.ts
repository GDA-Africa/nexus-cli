import { describe, it, expect } from 'vitest';

import { rankByTriggers, scoreTrigger, tokenize } from '../../src/utils/skills/matching.js';

describe('tokenize', () => {
  it('drops stopwords and short tokens', () => {
    expect(tokenize('I need to add a new component')).toEqual(['add', 'new', 'component']);
  });

  it('keeps dotted and hyphenated technical tokens', () => {
    expect(tokenize('next.js server-actions')).toContain('next.js');
  });
});

describe('scoreTrigger', () => {
  it('scores a verbatim substring hit highest — the old behaviour, preserved', () => {
    expect(scoreTrigger('I want to add a new component here', 'new component')).toBe(1);
  });

  it('matches out-of-order wording that substring containment missed', () => {
    // The v1.2 matcher required the task to contain the trigger verbatim, so
    // this scored zero.
    expect(scoreTrigger('component that is new', 'new component')).toBeGreaterThan(0);
  });

  it('does not fire on a single incidental token overlap', () => {
    expect(scoreTrigger('add a new route', 'new component')).toBe(0);
  });

  it('requires a single-token trigger to be at least 4 characters', () => {
    // Only the token path is length-gated; a standalone word still matches
    // verbatim, which is the behaviour that already shipped.
    expect(scoreTrigger('update the routing table', 'routing')).toBeGreaterThan(0);
    expect(scoreTrigger('rewrite the parser', 'api')).toBe(0);
  });

  it('does not match a trigger buried inside a longer word', () => {
    // Plain containment fired "api" on "rapid" and "test" on "latest".
    expect(scoreTrigger('this is a rapid change', 'api')).toBe(0);
    expect(scoreTrigger('pull the latest changes', 'test')).toBe(0);
  });

  it('returns zero for an empty trigger', () => {
    expect(scoreTrigger('anything', '   ')).toBe(0);
  });
});

describe('rankByTriggers', () => {
  const skills = [
    { name: 'testing', triggers: ['writing a test', 'unit test'] },
    { name: 'component-creation', triggers: ['new component', 'add a component'] },
    { name: 'routing', triggers: ['new route', 'add a page'] },
  ];

  it('ranks the best match first rather than admitting in list order', () => {
    const ranked = rankByTriggers('add a new component to the dashboard', skills, (s) => s.triggers);
    expect(ranked[0]?.item.name).toBe('component-creation');
    expect(ranked[0]?.score).toBe(1);
  });

  it('returns nothing when no trigger is relevant', () => {
    expect(rankByTriggers('rename a variable', skills, (s) => s.triggers)).toEqual([]);
  });

  it('picks a skill\'s strongest trigger, not its first', () => {
    const ranked = rankByTriggers('I am writing a test for this', skills, (s) => s.triggers);
    expect(ranked[0]?.trigger).toBe('writing a test');
  });

  it('orders by score descending', () => {
    const ranked = rankByTriggers('add a component and a new route', skills, (s) => s.triggers);
    const scores = ranked.map((r) => r.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});
