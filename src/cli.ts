/**
 * NEXUS CLI - Entry Point
 *
 * Sets up Commander.js with all commands, flags, and version info.
 */

import { Command } from 'commander';

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
  .action(async (projectName?: string) => {
    await initCommand(projectName);
  });

// Default to help if no command is given
program.parse();
