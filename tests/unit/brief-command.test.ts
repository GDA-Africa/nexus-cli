import { describe, expect, it } from 'vitest';

import { renderBriefMarkdown, renderBriefPretty, type BriefData } from '../../src/commands/brief.js';

function makeBriefData(): BriefData {
  return {
    generatedAt: '2026-05-02T18:00:00.000Z',
    since: '7 days ago',
    vitalSigns: {
      capturedAt: '2026-05-02T17:40:00.000Z',
      git: { branch: 'main', aheadOfMain: 1, lastCommit: 'abc123 commit', isDirty: false },
      files: { staleFolders: [] },
      tests: { passed: 10, failed: 0, skipped: 0, durationMs: 200, source: 'vitest' },
      packages: { outdatedCount: 0, vulnerableCount: 0 },
    },
    doctor: {
      findings: [{ id: 'D08', severity: 'warn', description: 'Vital signs stale' }],
      summary: { info: 0, warn: 1, error: 0 },
    },
    plans: [
      {
        id: 'plan-1',
        title: 'Plan 1',
        status: 'in_progress',
        owner: 'team',
        updated: '2026-05-02',
        phase: 'm3',
        fileName: 'plan-1.md',
      },
    ],
    shippedLast7d: ['abc123 feat: add thing'],
    suggestedNext: ['Run `nexus doctor --severity=warn`'],
  };
}

describe('brief renderers', () => {
  it('renders pretty digest with key sections', () => {
    const output = renderBriefPretty(makeBriefData());

    expect(output).toContain('Nexus Brief');
    expect(output).toContain('Shipped (1):');
    expect(output).toContain('Active plans (1):');
    expect(output).toContain('Drift: 0 error(s), 1 warning(s), 0 info');
    expect(output).toMatchSnapshot();
  });

  it('renders markdown digest with expected headings', () => {
    const output = renderBriefMarkdown(makeBriefData());

    expect(output).toContain('## Nexus Brief');
    expect(output).toContain('### Shipped');
    expect(output).toContain('### Active Plans');
    expect(output).toContain('### Drift');
    expect(output).toContain('### Suggested Next');
    expect(output).toMatchSnapshot();
  });
});
