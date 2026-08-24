import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { D15_manifest_invariants } from '../../src/utils/doctor/checks/D15.js';
import { D16_artifact_drift } from '../../src/utils/doctor/checks/D16.js';
import type { DoctorContext } from '../../src/utils/doctor/types.js';

let tmpDir: string;
let ctx: DoctorContext;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `nexus-d1516-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(path.join(tmpDir, '.nexus', 'docs'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, '.nexus', 'plans'), { recursive: true });
  ctx = { cwd: tmpDir, vitalSigns: null, plans: [], activePlans: null };
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const writeManifest = (config: Record<string, unknown>) =>
  fs.writeFile(path.join(tmpDir, '.nexus', 'manifest.json'), JSON.stringify({ config }));

const writePackageJson = (pkg: Record<string, unknown>) =>
  fs.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify(pkg));

const writePlan = (id: string, status: string) =>
  fs.writeFile(path.join(tmpDir, '.nexus', 'plans', `${id}.md`), `---\nstatus: "${status}"\n---\n\n# ${id}\n`);

describe('D15 — manifest invariants', () => {
  it('is silent when declarations match the repository', async () => {
    await writeManifest({ testFramework: 'vitest', packageManager: 'npm' });
    await writePackageJson({ devDependencies: { vitest: '^3.0.0' } });
    await fs.writeFile(path.join(tmpDir, 'package-lock.json'), '{}');

    expect(await D15_manifest_invariants.run(ctx)).toEqual([]);
  });

  it('reports a declared test framework that is not installed', async () => {
    await writeManifest({ testFramework: 'vitest' });
    await writePackageJson({ devDependencies: { jest: '^29.0.0' } });

    const findings = await D15_manifest_invariants.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].description).toContain('testFramework "vitest"');
  });

  it('reports a lockfile that contradicts the declared package manager', async () => {
    await writeManifest({ packageManager: 'yarn' });
    await writePackageJson({});
    await fs.writeFile(path.join(tmpDir, 'package-lock.json'), '{}');

    const findings = await D15_manifest_invariants.run(ctx);
    expect(findings[0]?.description).toContain('expects yarn.lock');
  });

  it('does not report a lockfile absence — only a contradiction', async () => {
    await writeManifest({ packageManager: 'yarn' });
    await writePackageJson({});

    expect(await D15_manifest_invariants.run(ctx)).toEqual([]);
  });

  it('ignores declarations with no unambiguous on-disk counterpart', async () => {
    await writeManifest({ frontendFramework: 'none', dataStrategy: 'local-only' });
    await writePackageJson({});

    expect(await D15_manifest_invariants.run(ctx)).toEqual([]);
  });

  it('never throws on a malformed manifest', async () => {
    await fs.writeFile(path.join(tmpDir, '.nexus', 'manifest.json'), '{ not json');
    await writePackageJson({});

    expect(await D15_manifest_invariants.run(ctx)).toEqual([]);
  });
});

describe('D16 — artifact drift', () => {
  it('reports an active id whose plan file does not exist', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.nexus', 'plans', '_active.json'),
      JSON.stringify({ active: ['ghost-plan'] }),
    );

    const findings = await D16_artifact_drift.run(ctx);
    expect(findings[0]?.description).toContain('ghost-plan');
  });

  it('reports an active plan whose frontmatter says done', async () => {
    await writePlan('shipped', 'done');
    await fs.writeFile(
      path.join(tmpDir, '.nexus', 'plans', '_active.json'),
      JSON.stringify({ active: ['shipped'] }),
    );

    const findings = await D16_artifact_drift.run(ctx);
    expect(findings[0]?.description).toContain('status: done');
  });

  it('reports open plans missing from the dashboard', async () => {
    await writePlan('open-one', 'draft');
    await writePlan('open-two', 'approved');
    await writePlan('closed', 'done');
    await fs.writeFile(path.join(tmpDir, '.nexus', 'plans', 'index.md'), '# Plans\n\nNothing here.\n');

    const findings = await D16_artifact_drift.run(ctx);
    const drift = findings.find((f) => f.description.includes('does not list'));
    expect(drift?.description).toContain('open-one');
    expect(drift?.description).toContain('open-two');
    expect(drift?.description).not.toContain('closed');
  });

  it('does not require closed plans to stay on the dashboard', async () => {
    await writePlan('closed', 'done');
    await fs.writeFile(path.join(tmpDir, '.nexus', 'plans', 'index.md'), '# Plans\n');

    const findings = await D16_artifact_drift.run(ctx);
    expect(findings.filter((f) => f.description.includes('does not list'))).toEqual([]);
  });

  it('reports a brain that never mentions the shipped version', async () => {
    await writePackageJson({ version: '1.4.0' });
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), '# Index\n\nCurrent phase: v1.1.2.\n');

    const findings = await D16_artifact_drift.run(ctx);
    expect(findings[0]?.description).toContain('1.4.0');
  });

  it('is silent when the brain mentions the shipped version', async () => {
    await writePackageJson({ version: '1.4.0' });
    await fs.writeFile(path.join(tmpDir, '.nexus', 'docs', 'index.md'), '# Index\n\nShipped: v1.4.0.\n');

    expect(await D16_artifact_drift.run(ctx)).toEqual([]);
  });

  it('tolerates CRLF frontmatter', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.nexus', 'plans', 'crlf.md'),
      '---\r\nstatus: "done"\r\n---\r\n\r\n# crlf\r\n',
    );
    await fs.writeFile(path.join(tmpDir, '.nexus', 'plans', 'index.md'), '# Plans\n');

    const findings = await D16_artifact_drift.run(ctx);
    expect(findings.filter((f) => f.description.includes('does not list'))).toEqual([]);
  });
});
