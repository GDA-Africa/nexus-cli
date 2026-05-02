import { describe, expect, it } from 'vitest';

import { renderVitalSignsBlock } from '../../src/commands/sync.js';

describe('renderVitalSignsBlock()', () => {
  it('renders a stable markdown block for fixed input', () => {
    const block = renderVitalSignsBlock({
      capturedAt: '2026-05-02T16:00:00.000Z',
      git: {
        branch: 'fix-backend-scaffolding',
        aheadOfMain: 8,
        lastCommit: '092d7e7 — feat: release v0.3.2 · Glenhalton · 8 weeks ago',
        isDirty: true,
      },
      files: {
        staleFolders: [
          { folder: 'src/commands', staleDays: 56 },
          { folder: 'src/utils', staleDays: 56 },
          { folder: 'src/generators', staleDays: 56 },
          { folder: 'tests/e2e', staleDays: -1 },
        ],
      },
      tests: {
        passed: 306,
        failed: 0,
        skipped: 0,
        durationMs: 2520,
        source: 'vitest run',
      },
      packages: {
        outdatedCount: 0,
        vulnerableCount: 0,
      },
    });

    expect(block).toMatchInlineSnapshot(`"<!-- NEXUS:VITAL_SIGNS:START — managed by \`nexus sync\` -->
## 🩺 Vital Signs (auto)

_Last sync: 2026-05-02T16:00:00.000Z · branch \`fix-backend-scaffolding\` · 8 commits ahead of main · working tree dirty_

| Sensor | Reading |
|--------|---------|
| Last commit | 092d7e7 — feat: release v0.3.2 · Glenhalton · 8 weeks ago |
| Tests | 306 passed · 0 failed · 0 skipped |
| Coverage | not collected · M1 sensor adds \`vitest --coverage\` parsing |
| Stale folders | src/commands 56 days · src/utils 56 days · src/generators 56 days · tests/e2e never created |
| Packages | 0 outdated · 0 vulnerable |
<!-- NEXUS:VITAL_SIGNS:END -->"`);
  });
});
