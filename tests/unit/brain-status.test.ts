import { describe, expect, it } from 'vitest';

import { renderBrainStatus } from '../../src/utils/brain-status.js';

describe('renderBrainStatus', () => {
  it('renders status lines and recommendations', () => {
    const output = renderBrainStatus({
      checkedAt: '2026-05-03T00:00:00.000Z',
      shouldSync: true,
      shouldDoctor: true,
      reasons: [
        { code: 'sync-stale', message: 'Last sync is stale' },
      ],
      lastSyncAt: '2026-05-01T00:00:00.000Z',
      hasNewCommitsSinceSync: true,
      doctorWarnOrHigher: 2,
      knowledgeLines: 100,
      knowledgeEntries: 20,
      stalePlanCount: 1,
      vitalsPresent: false,
    });

    expect(output).toContain('Brain Status Report');
    expect(output).toContain('Commits since sync: ⚠ yes');
    expect(output).toContain('Run `nexus sync`');
    expect(output).toContain('Run `nexus doctor --severity=warn`');
    expect(output).toContain('[sync-stale] Last sync is stale');
  });
});
