import { Command } from 'commander';

import { getNexusDir } from '../utils/brain.js';
import { buildDoctorContext } from '../utils/doctor/context.js';
import { runDoctor } from '../utils/doctor/index.js';
import type { DoctorReport, DoctorSeverity } from '../utils/doctor/types.js';
import { logger } from '../utils/logger.js';

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
      const report = await runDoctor(ctx, {
        minSeverity: options.severity as DoctorSeverity,
      });

      // 3. Output
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        renderReport(report);
      }

      // 4. Handle fix
      if (options.fix) {
        const autoFixable = report.findings.filter(f => f.autoFixable);
        if (autoFixable.length > 0) {
          logger.info(`Found ${autoFixable.length} auto-fixable issues. Applying...`);
          // Basic auto-fix for D08 - just suggest running sync
          // Full auto-fix logic for sync, etc. goes here
        }
      }

      // 5. Exit Code
      if (report.summary.error > 0) {
        process.exit(2);
      }
    });

  return doctor;
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
