import path from 'node:path';

import { Command } from 'commander';

import { detectBrainNeeds } from '../utils/brain-detector.js';
import { renderBrainStatus } from '../utils/brain-status.js';
import { getNexusDir } from '../utils/brain.js';
import { logger } from '../utils/logger.js';

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

  return brain;
}
