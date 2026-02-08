/**
 * NEXUS CLI - Entry Point
 *
 * Sets up Commander.js with all commands, flags, and version info.
 */

import { Command } from 'commander';

import { adoptCommand } from './commands/adopt.js';
import { initCommand } from './commands/init.js';
import { repairCommand } from './commands/repair.js';
import { upgradeCommand } from './commands/upgrade.js';
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

program
  .command('upgrade [path]')
  .description('Upgrade NEXUS ecosystem to latest templates (preserves project knowledge)')
  .action(async (targetPath: string | undefined) => {
    await upgradeCommand(targetPath);
  });

program
  .command('repair [path]')
  .description('Repair missing or corrupted .nexus/ files (preserves everything valid)')
  .action(async (targetPath: string | undefined) => {
    await repairCommand(targetPath);
  });

// Default to help if no command is given
program.parse();
