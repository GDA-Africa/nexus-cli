import path from 'node:path';

import fs from 'fs-extra';

import { getNexusDir } from '../utils/brain.js';
import { logger } from '../utils/logger.js';
import { captureVitalSigns, type VitalSigns } from '../utils/sensors/index.js';

const VITAL_SIGNS_START = '<!-- NEXUS:VITAL_SIGNS:START';
const VITAL_SIGNS_END = '<!-- NEXUS:VITAL_SIGNS:END -->';

export interface SyncCommandOptions {
  write?: boolean;
  dryRun?: boolean;
  json?: boolean;
  scope?: 'all' | 'git' | 'files' | 'tests' | 'packages';
}

export async function syncCommand(
  targetPath?: string,
  options: SyncCommandOptions = {},
): Promise<void> {
  const cwd = targetPath ? path.resolve(targetPath) : process.cwd();
  const nexusDir = getNexusDir(cwd);

  if (!nexusDir) {
    logger.error('Could not find .nexus/ directory in this path or any parent directory.');
    logger.info('Run `nexus init` or `nexus adopt` first.');
    process.exit(1);
  }

  const vitalSigns = await captureVitalSigns({ cwd, timeoutMs: 2000 });
  const scope = options.scope ?? 'all';

  const shouldWrite = options.write ?? !options.dryRun;

  if (options.json) {
    const scoped = scopeVitalSigns(vitalSigns, scope);
    console.log(JSON.stringify(scoped, null, 2));
  }

  if (!shouldWrite) {
    logger.info('Dry run mode: no files were written.');
    return;
  }

  // B1: persist the snapshot doctor (D02, D08) and nexus_get_context (B4)
  // read. Nothing else in src/ ever wrote this file, so vitalSigns was
  // always null downstream and `nexus doctor` could never exit 0.
  await writeLastSyncSnapshot(nexusDir, vitalSigns);

  const indexPath = path.join(nexusDir, 'docs', 'index.md');
  const indexContent = await fs.readFile(indexPath, 'utf-8');
  const renderedBlock = renderVitalSignsBlock(vitalSigns);

  const updated = replaceVitalSignsBlock(indexContent, renderedBlock);
  if (updated === indexContent) {
    logger.warn('Vital Signs fences were not found; no update was written.');
    return;
  }

  await atomicWrite(indexPath, updated);
  logger.success('Vital Signs block updated successfully.');
}

export function renderVitalSignsBlock(vitalSigns: VitalSigns): string {
  const staleFolders = formatStaleFolders(vitalSigns);
  const tests = formatTests(vitalSigns);
  const packages = formatPackages(vitalSigns);

  return [
    '<!-- NEXUS:VITAL_SIGNS:START — managed by `nexus sync` -->',
    '## 🩺 Vital Signs (auto)',
    '',
    `_Last sync: ${vitalSigns.capturedAt} · branch \`${vitalSigns.git.branch ?? 'unknown'}\`${formatAhead(vitalSigns)}${formatDirty(vitalSigns)}_`,
    '',
    '| Sensor | Reading |',
    '|--------|---------|',
    `| Last commit | ${vitalSigns.git.lastCommit ?? 'not available'} |`,
    `| Tests | ${tests} |`,
    '| Coverage | not collected · M1 sensor adds `vitest --coverage` parsing |',
    `| Stale folders | ${staleFolders} |`,
    `| Packages | ${packages} |`,
    '<!-- NEXUS:VITAL_SIGNS:END -->',
  ].join('\n');
}

export function replaceVitalSignsBlock(content: string, renderedBlock: string): string {
  const startIndex = content.indexOf(VITAL_SIGNS_START);
  const endIndex = content.indexOf(VITAL_SIGNS_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return content;
  }

  const endInclusive = endIndex + VITAL_SIGNS_END.length;
  return `${content.slice(0, startIndex)}${renderedBlock}${content.slice(endInclusive)}`;
}

function scopeVitalSigns(vitalSigns: VitalSigns, scope: NonNullable<SyncCommandOptions['scope']>): unknown {
  if (scope === 'all') {
    return vitalSigns;
  }

  return {
    capturedAt: vitalSigns.capturedAt,
    [scope]: vitalSigns[scope],
  };
}

/** B1: write the sensor snapshot `doctor/context.ts` and `nexus_get_context` read. */
async function writeLastSyncSnapshot(nexusDir: string, vitalSigns: VitalSigns): Promise<void> {
  const stateDir = path.join(nexusDir, 'state');
  await fs.ensureDir(stateDir);
  await atomicWrite(path.join(stateDir, 'last-sync.json'), JSON.stringify(vitalSigns, null, 2));
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, content, 'utf-8');
  await fs.move(tmpPath, filePath, { overwrite: true });
}

function formatAhead(vitalSigns: VitalSigns): string {
  if (vitalSigns.git.aheadOfMain === null) return '';
  return ` · ${vitalSigns.git.aheadOfMain} commits ahead of main`;
}

function formatDirty(vitalSigns: VitalSigns): string {
  if (vitalSigns.git.isDirty === null) return '';
  return ` · working tree ${vitalSigns.git.isDirty ? 'dirty' : 'clean'}`;
}

function formatTests(vitalSigns: VitalSigns): string {
  const tests = vitalSigns.tests;
  if (tests.passed === null && tests.failed === null && tests.skipped === null) {
    return 'not yet measured';
  }

  const passed = tests.passed ?? 0;
  const failed = tests.failed ?? 0;
  const skipped = tests.skipped ?? 0;
  return `${passed} passed · ${failed} failed · ${skipped} skipped`;
}

function formatPackages(vitalSigns: VitalSigns): string {
  const outdated = vitalSigns.packages.outdatedCount;
  const vulnerable = vitalSigns.packages.vulnerableCount;

  if (outdated === null && vulnerable === null) {
    return 'not yet measured';
  }

  const outdatedLabel = outdated === null ? 'n/a' : String(outdated);
  const vulnerableLabel = vulnerable === null ? 'n/a' : String(vulnerable);
  return `${outdatedLabel} outdated · ${vulnerableLabel} vulnerable`;
}

function formatStaleFolders(vitalSigns: VitalSigns): string {
  if (vitalSigns.files.staleFolders.length === 0) {
    return 'not measured';
  }

  const labels = vitalSigns.files.staleFolders.map((item) => {
    if (item.staleDays < 0) {
      return `${item.folder} never created`;
    }

    return `${item.folder} ${item.staleDays} days`;
  });

  return labels.join(' · ');
}
