/**
 * NEXUS CLI - Entry Point
 *
 * Sets up Commander.js with all commands, flags, and version info.
 */

import { Command } from 'commander';

import { adoptCommand } from './commands/adopt.js';
import { initCommand } from './commands/init.js';
import { version } from './version.js';

const program = new Command();

program
  .name('nexus')
  .description('NEXUS CLI — AI-Native Project Scaffolding for the Modern Era')
  .version(version, '-v, --version');

program
  .command('init [project-name]')
  .description('Initialize a new NEXUS project with interactive setup')
  .option('--adopt', 'Shorthand: same as `nexus adopt` (add NEXUS to an existing project)')
  .action(async (projectName: string | undefined, options: { adopt?: boolean }) => {
    await initCommand(projectName, { adopt: options.adopt ?? false });
  });

program
  .command('adopt [path]')
  .description('Add NEXUS docs & AI config to an existing project (no scaffolding)')
  .action(async (targetPath: string | undefined) => {
    await adoptCommand(targetPath);
  });

// Default to help if no command is given
program.parse();
