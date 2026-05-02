import { describe, it, expect } from 'vitest';
import { D04_knowledge_bloat } from '../../src/utils/doctor/checks/D04.js';
import { D06_plan_stale } from '../../src/utils/doctor/checks/D06.js';
import { D07_plan_orphan } from '../../src/utils/doctor/checks/D07.js';
import { D08_vital_signs_missing } from '../../src/utils/doctor/checks/D08.js';
import type { DoctorContext } from '../../src/utils/doctor/types.js';

describe('Doctor Checks', () => {
  const dummyCtx: DoctorContext = {
    cwd: '/fake/cwd',
    vitalSigns: null,
    plans: [],
    activePlans: null,
  };

  describe('D06 - Stale Plan', () => {
    it('detects plans older than 14 days', async () => {
      const recent = new Date();
      recent.setDate(recent.getDate() - 1);
      const old = new Date();
      old.setDate(old.getDate() - 15);

      const ctx = {
        ...dummyCtx,
        plans: [
          { fileName: 'fresh.md', id: '1', title: 'P1', status: 'in_progress', owner: '', updated: recent.toISOString(), phase: '' },
          { fileName: 'stale.md', id: '2', title: 'P2', status: 'in_progress', owner: '', updated: old.toISOString(), phase: '' },
          { fileName: 'done.md', id: '3', title: 'P3', status: 'done', owner: '', updated: old.toISOString(), phase: '' }, // done not tracked 
        ]
      } as DoctorContext;

      const findings = await D06_plan_stale.run(ctx);
      expect(findings).toHaveLength(1);
      expect(findings[0].description).toContain('P2');
      expect(findings[0].description).toContain('stale.md');
    });
  });

  describe('D08 - Vital Signs Missing', () => {
    it('reports missing vital signs', async () => {
      const findings = await D08_vital_signs_missing.run(dummyCtx);
      expect(findings).toHaveLength(1);
      expect(findings[0].description).toContain('missing');
      expect(findings[0].autoFixable).toBe(true);
    });

    it('reports stale vital signs', async () => {
      const old = new Date();
      old.setDate(old.getDate() - 2);
      
      const findings = await D08_vital_signs_missing.run({
        ...dummyCtx,
        vitalSigns: { capturedAt: old.toISOString() } as any,
      });
      expect(findings).toHaveLength(1);
      expect(findings[0].description).toContain('older than 24 hours');
      expect(findings[0].autoFixable).toBe(true);
    });

    it('returns empty if healthy', async () => {
      const recent = new Date();
      const findings = await D08_vital_signs_missing.run({
        ...dummyCtx,
        vitalSigns: { capturedAt: recent.toISOString() } as any,
      });
      expect(findings).toHaveLength(0);
    });
  });
});
