import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runDoctor } from '../../src/utils/doctor/index.js';
import type { DoctorCheck, DoctorContext } from '../../src/utils/doctor/types.js';

describe('runDoctor', () => {
  const dummyCtx: DoctorContext = {
    cwd: '/fake/cwd',
    vitalSigns: null,
    plans: [],
    activePlans: null,
  };

  it('runs provided checks and filters by minSeverity', async () => {
    const mockCheck1: DoctorCheck = {
      id: 'D01',
      name: 'Test 1',
      description: 'First test',
      run: async () => [{ id: 'D01', severity: 'info', description: 'Just info' }]
    };
    
    const mockCheck2: DoctorCheck = {
      id: 'D02',
      name: 'Test 2',
      description: 'Second test',
      run: async () => [{ id: 'D02', severity: 'warn', description: 'A warning' }]
    };

    const reportAll = await runDoctor(dummyCtx, { checks: [mockCheck1, mockCheck2], minSeverity: 'info' });
    expect(reportAll.findings).toHaveLength(2);
    expect(reportAll.summary.info).toBe(1);
    expect(reportAll.summary.warn).toBe(1);

    const reportWarn = await runDoctor(dummyCtx, { checks: [mockCheck1, mockCheck2], minSeverity: 'warn' });
    expect(reportWarn.findings).toHaveLength(1);
    expect(reportWarn.findings[0].id).toBe('D02');
  });

  it('handles checks that throw errors robustly', async () => {
    const failingCheck: DoctorCheck = {
      id: 'FAIL',
      name: 'Fail',
      description: 'Fails',
      run: async () => { throw new Error('Boom'); }
    };

    const report = await runDoctor(dummyCtx, { checks: [failingCheck] });
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].id).toBe('D-INTERNAL');
    expect(report.findings[0].description).toContain('Boom');
  });
});
