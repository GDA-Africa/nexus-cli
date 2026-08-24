import fs from 'node:fs/promises';
import path from 'node:path';

import { Command } from 'commander';

import { getNexusDir } from '../utils/brain.js';
import { buildDoctorContext } from '../utils/doctor/context.js';
import { DEFAULT_CHECKS, runDoctor } from '../utils/doctor/index.js';
import type { DoctorCheck, DoctorReport, DoctorSeverity } from '../utils/doctor/types.js';
import { logger } from '../utils/logger.js';

import { syncCommand } from './sync.js';

export interface RunDoctorCommandOptions {
  severity?: DoctorSeverity;
  fix?: boolean;
  json?: boolean;
  strict?: boolean;
}

export interface DoctorRunResult {
  report: DoctorReport;
  exitCode: number;
}

export function doctorCommand() {
  const doctor = new Command('doctor')
    .description('Run drift detection and validity checks against the project brain')
    .option('--severity <level>', 'Minimum severity level to report (info, warn, error)', 'info')
    .option('--fix', 'Automatically run safe fixes (like nexus sync)', false)
    .option('--json', 'Output findings as JSON', false)
    .option('--strict', 'Escalate advisory findings to errors (for CI gating)', false)
    .action(async (options) => {
      const cwd = process.cwd();
      const nexusDir = getNexusDir(cwd);

      if (!nexusDir) {
        logger.error('No .nexus database found. Run `nexus init` first.');
        process.exit(1);
      }

      const { exitCode } = await runDoctorCommand(cwd, nexusDir, {
        severity: options.severity as DoctorSeverity,
        fix: options.fix === true,
        json: options.json === true,
        strict: options.strict === true,
      });

      process.exit(exitCode);
    });

  return doctor;
}

/**
 * The doctor command's core: build context, run checks, render, optionally
 * fix, persist, and compute the exit code. Exported (and taking an
 * already-resolved `nexusDir` rather than re-deriving it) so it is directly
 * testable without going through Commander or mocking `process.exit`.
 */
export async function runDoctorCommand(
  cwd: string,
  nexusDir: string,
  options: RunDoctorCommandOptions,
): Promise<DoctorRunResult> {
  const strict = options.strict === true;
  const minSeverity = options.severity ?? 'info';

  const doctorConfig = await readDoctorConfig(nexusDir);
  const checks = DEFAULT_CHECKS.filter((check) => !doctorConfig.disabledChecks.includes(check.id));

  const ctx = await buildDoctorContext(cwd, nexusDir, { strict });
  let report = await runDoctor(ctx, { checks, minSeverity });

  render(report, options.json === true);

  // B3: `--fix` used to run after the report (and the exit code) were
  // already finalized, so a successful fix still exited 1 — the report it
  // fixed was stale by the time the process exited. Recompute afterward so
  // the exit code (and the persisted report) reflect what actually remains.
  if (options.fix === true) {
    report = await applyFixesAndRecompute(cwd, nexusDir, checks, minSeverity, strict, report);
  }

  await persistDoctorReport(nexusDir, report);

  return { report, exitCode: highestSeverityExitCode(report) };
}

async function applyFixesAndRecompute(
  cwd: string,
  nexusDir: string,
  checks: DoctorCheck[],
  minSeverity: DoctorSeverity,
  strict: boolean,
  report: DoctorReport,
): Promise<DoctorReport> {
  const autoFixable = report.findings.filter((f) => f.autoFixable);
  if (autoFixable.length === 0) return report;

  logger.info(`Found ${autoFixable.length} auto-fixable issues. Applying...`);
  if (autoFixable.some((finding) => finding.id === 'D08')) {
    await syncCommand(cwd, { write: true });
    logger.success('Auto-fix complete: Vital Signs refreshed via `nexus sync`.');
  }

  const postFixCtx = await buildDoctorContext(cwd, nexusDir, { strict });
  return runDoctor(postFixCtx, { checks, minSeverity });
}

async function persistDoctorReport(nexusDir: string, report: DoctorReport): Promise<void> {
  const stateDir = path.join(nexusDir, 'state');
  const filePath = path.join(stateDir, 'doctor.json');

  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(
    filePath,
    JSON.stringify({
      ranAt: new Date().toISOString(),
      summary: report.summary,
      findings: report.findings,
    }, null, 2),
    'utf8',
  );
}

function highestSeverityExitCode(report: DoctorReport): number {
  if (report.summary.error > 0) return 2;
  if (report.summary.warn > 0) return 1;
  return 0;
}

async function readDoctorConfig(nexusDir: string): Promise<{ disabledChecks: string[] }> {
  const configPath = path.join(nexusDir, 'doctor.config.json');

  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { disabledChecks?: unknown };
    const disabledChecks = Array.isArray(parsed.disabledChecks)
      ? parsed.disabledChecks.filter((item): item is string => typeof item === 'string')
      : [];

    return { disabledChecks };
  } catch {
    return { disabledChecks: [] };
  }
}

function render(report: DoctorReport, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  renderReport(report);
}

function renderReport(report: DoctorReport) {
  if (report.findings.length === 0) {
    logger.success('Doctor found no issues! Project brain is healthy.');
    return;
  }

  logger.info('🧠 Nexus Doctor Report\n');

  for (const finding of report.findings) {
    let icon = 'ℹ️';
    if (finding.severity === 'warn') icon = '⚠️';
    if (finding.severity === 'error') icon = '❌';

    logger.info(`${icon} [${finding.id}] ${finding.description}`);
    if (finding.fixHint) {
      logger.info(`      Hint: ${finding.fixHint}`);
    }
    console.log('');
  }

  console.log('---');
  logger.info(`Summary: ${report.summary.error} errors, ${report.summary.warn} warnings, ${report.summary.info} info`);
}
