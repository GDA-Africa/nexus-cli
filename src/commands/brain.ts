import path from 'node:path';

import { Command } from 'commander';

import {
  DEFAULT_AUTO_INVOKE_CONFIG,
  loadAutoInvokeConfig,
  saveAutoInvokeConfig,
} from '../utils/auto-invoke-config.js';
import { detectBrainNeeds } from '../utils/brain-detector.js';
import { renderBrainStatus } from '../utils/brain-status.js';
import { getNexusDir } from '../utils/brain.js';
import { buildDoctorContext } from '../utils/doctor/context.js';
import { runDoctor } from '../utils/doctor/index.js';
import { logger } from '../utils/logger.js';

import { syncCommand } from './sync.js';

export function brainCommand(): Command {
  const brain = new Command('brain')
    .description('Inspect brain health and auto-invoke signals');

  brain
    .command('status')
    .description('Show brain health report and recommended actions')
    .option('--json', 'Output raw detection payload as JSON', false)
    .action(async (options: { json?: boolean }) => {
      const cwd = process.cwd();
      const nexusDir = getNexusDir(cwd);

      if (!nexusDir) {
        logger.error('No .nexus database found. Run `nexus init` first.');
        process.exit(1);
      }

  const root = path.dirname(nexusDir);
      const result = await detectBrainNeeds(root);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(renderBrainStatus(result));
    });

  brain
    .command('check')
    .description('Run detection and optionally apply safe actions')
    .option('--fix', 'Apply safe fixes (sync and/or doctor) when needed', false)
    .option('--json', 'Output raw detection payload as JSON', false)
    .action(async (options: { fix?: boolean; json?: boolean }) => {
      const cwd = process.cwd();
      const nexusDir = getNexusDir(cwd);

      if (!nexusDir) {
        logger.error('No .nexus database found. Run `nexus init` first.');
        process.exit(1);
      }

      const root = path.dirname(nexusDir);
      const config = await loadAutoInvokeConfig(root);
      const result = await detectBrainNeeds(root, {
        syncIntervalMinutes: config.sync_interval_minutes,
      });

      if (options.fix) {
        if (result.shouldSync) {
          await syncCommand(root, { write: true });
        }

        if (result.shouldDoctor) {
          const ctx = await buildDoctorContext(root, nexusDir);
          await runDoctor(ctx, { minSeverity: 'warn' });
        }
      }

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(renderBrainStatus(result));
    });

  brain
    .command('config')
    .description('View or update auto-invoke configuration')
    .option('--json', 'Print config as JSON', false)
    .option('--mode <mode>', 'Set mode: silent|interactive|disabled')
    .option('--enable', 'Enable auto-invoke')
    .option('--disable', 'Disable auto-invoke')
    .action(async (options: {
      json?: boolean;
      mode?: 'silent' | 'interactive' | 'disabled';
      enable?: boolean;
      disable?: boolean;
    }) => {
      const cwd = process.cwd();
      const nexusDir = getNexusDir(cwd);

      if (!nexusDir) {
        logger.error('No .nexus database found. Run `nexus init` first.');
        process.exit(1);
      }

      const root = path.dirname(nexusDir);
      const current = await loadAutoInvokeConfig(root);
      const next = { ...current };

      if (options.mode) {
        next.mode = options.mode;
      }

      if (options.enable) {
        next.enabled = true;
      }

      if (options.disable) {
        next.enabled = false;
      }

      const changed = JSON.stringify(next) !== JSON.stringify(current);
      if (changed) {
        await saveAutoInvokeConfig(root, next);
      }

      if (options.json) {
        console.log(JSON.stringify(next, null, 2));
        return;
      }

      if (changed) {
        logger.success('Auto-invoke config updated.');
      }

      console.log(JSON.stringify(next, null, 2));
    });

  brain
    .command('config:reset')
    .description('Reset auto-invoke config to defaults')
    .action(async () => {
      const cwd = process.cwd();
      const nexusDir = getNexusDir(cwd);

      if (!nexusDir) {
        logger.error('No .nexus database found. Run `nexus init` first.');
        process.exit(1);
      }

      const root = path.dirname(nexusDir);
      await saveAutoInvokeConfig(root, DEFAULT_AUTO_INVOKE_CONFIG);
      logger.success('Auto-invoke config reset to defaults.');
    });

  return brain;
}
