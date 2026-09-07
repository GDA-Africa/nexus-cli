import { Command } from 'commander';

import { appendProgressEntry, BrainMemoryError, resolveBrainScope } from '../utils/brain-memory.js';
import { logger } from '../utils/logger.js';

export function logCommand(): Command {
  const cmd = new Command('log')
    .description('Append an entry to the Progress Log (docs/index.md)')
    .option('--message <message>', 'The progress entry text', '')
    .option('--status <status>', 'Status of the entry', 'completed')
    .option('--scope <scope>', 'Which brain to update: "root" (default) or a package name/path', 'root')
    .option('--date <date>', 'ISO date (YYYY-MM-DD), defaults to today', new Date().toISOString().split('T')[0])
    .action(async (options: { message: string; status: string; scope: string; date: string }) => {
      if (!options.message) {
        logger.error('--message is required for `nexus log`.');
        process.exit(1);
      }

      const statusIcons: Record<string, string> = {
        completed: '✅',
        'in-progress': '⏳',
        blocked: '🛑',
        failed: '✖',
      };
      const statusIcon = statusIcons[options.status] ?? '❔';

      try {
        const nexusDir = resolveBrainScope(options.scope);
        const { entry } = await appendProgressEntry(nexusDir, {
          date: options.date,
          statusIcon,
          message: options.message,
        });
        logger.success(`Progress Log updated in scope "${options.scope}": ${entry}`);
      } catch (error) {
        if (error instanceof BrainMemoryError) {
          logger.error(error.message);
        } else {
          logger.error(`Failed to update Progress Log: ${(error as Error).message}`);
        }
        process.exit(1);
      }
    });

  return cmd;
}
