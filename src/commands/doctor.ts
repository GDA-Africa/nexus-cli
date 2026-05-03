import fs from 'node:fs/promises';
import path from 'node:path';

import { Command } from 'commander';

import { getNexusDir } from '../utils/brain.js';
import { buildDoctorContext } from '../utils/doctor/context.js';
import { DEFAULT_CHECKS, runDoctor } from '../utils/doctor/index.js';
import type { DoctorReport, DoctorSeverity } from '../utils/doctor/types.js';
import { logger } from '../utils/logger.js';

import { syncCommand } from './sync.js';

export function doctorCommand() {
  const doctor = new Command('doctor')
    .description('Run drift detection and validity checks against the project brain')
    .option('--severity <level>', 'Minimum severity level to report (info, warn, error)', 'info')
    .option('--fix', 'Automatically run safe fixes (like nexus sync)', false)
    .option('--json', 'Output findings as JSON', false)
    .action(async (options) => {
      const cwd = process.cwd();
      const nexusDir = getNexusDir(cwd);

      if (!nexusDir) {
        logger.error('No .nexus database found. Run `nexus init` first.');
        process.exit(1);
      }

      // 1. Gather context
      const ctx = await buildDoctorContext(cwd, nexusDir);

      // 2. Run checks
      const doctorConfig = await readDoctorConfig(nexusDir);
      const checks = DEFAULT_CHECKS.filter((check) => !doctorConfig.disabledChecks.includes(check.id));
      const report = await runDoctor(ctx, {
        checks,
        minSeverity: options.severity as DoctorSeverity,
      });

      // 3. Output
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        renderReport(report);
      }

      await persistDoctorReport(nexusDir, report);

      // 4. Handle fix
      if (options.fix) {
        const autoFixable = report.findings.filter(f => f.autoFixable);
        if (autoFixable.length > 0) {
          logger.info(`Found ${autoFixable.length} auto-fixable issues. Applying...`);
          if (autoFixable.some((finding) => finding.id === 'D08')) {
            await syncCommand(cwd, { write: true });
            logger.success('Auto-fix complete: Vital Signs refreshed via `nexus sync`.');
          }
        }
      }

      // 5. Exit Code
      process.exit(highestSeverityExitCode(report));
    });

  return doctor;
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
