import { Command } from 'commander';

import { appendKnowledgeEntry, BrainMemoryError, KNOWLEDGE_CATEGORIES, resolveBrainScope } from '../utils/brain-memory.js';
import { logger } from '../utils/logger.js';

export function noteCommand(): Command {
  const cmd = new Command('note')
    .description('Append an entry to the Knowledge Base (docs/knowledge.md)')
    .option('--category <category>', 'Knowledge category tag')
    .option('--title <title>', 'Entry title')
    .option('--body <body>', '1-3 sentence insight')
    .option('--why <why>', 'Optional "Why" line')
    .option('--how-to-apply <howToApply>', 'Optional "How to apply" line')
    .option('--scope <scope>', 'Which brain to update: "root" (default) or a package name/path', 'root')
    .action(async (options: {
      category: string;
      title: string;
      body: string;
      why?: string;
      howToApply?: string;
      scope: string;
    }) => {
      if (!options.category || !options.title || !options.body) {
        logger.error('--category, --title, and --body are required for `nexus note`.');
        process.exit(1);
      }
      if (!(KNOWLEDGE_CATEGORIES as readonly string[]).includes(options.category)) {
        logger.error(`Invalid knowledge category: "${options.category}". Must be one of: ${KNOWLEDGE_CATEGORIES.join(', ')}.`);
        process.exit(1);
      }

      try {
        const nexusDir = resolveBrainScope(options.scope);
        const { heading } = await appendKnowledgeEntry(nexusDir, options);
        logger.success(`Knowledge Base updated in scope "${options.scope}": ${heading}`);
      } catch (error) {
        if (error instanceof BrainMemoryError) {
          logger.error(error.message);
        } else {
          logger.error(`Failed to update Knowledge Base: ${(error as Error).message}`);
        }
        process.exit(1);
      }
    });

  return cmd;
}
