/**
 * NEXUS CLI - Entry Point
 *
 * Sets up Commander.js with all commands, flags, and version info.
 */

import { Command } from 'commander';

import { adoptCommand } from './commands/adopt.js';
import { initCommand } from './commands/init.js';
import { packCommand, unpackCommand } from './commands/pack.js';
import { repairCommand } from './commands/repair.js';
import {
  skillInstallCommand,
  skillListCommand,
  skillNewCommand,
  skillRemoveCommand,
  skillStatusCommand,
} from './commands/skill.js';
import { updateCommand, printUpdateBanner } from './commands/update.js';
import { upgradeCommand } from './commands/upgrade.js';
import { checkForUpdate } from './utils/update-check.js';
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
  .option('--local', 'Configure NEXUS as local-only (not tracked by git)')
  .action(async (projectName: string | undefined, options: { adopt?: boolean; local?: boolean }) => {
    await initCommand(projectName, { adopt: options.adopt ?? false, local: options.local ?? false });
  });

program
  .command('adopt [path]')
  .description('Add NEXUS docs & AI config to an existing project (no scaffolding)')
  .option('--force', 'Force adoption even if no project is detected')
  .action(async (targetPath: string | undefined, options: { force?: boolean }) => {
    await adoptCommand(targetPath, options);
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

// ── nexus skill ──────────────────────────────────────────────

const skillCmd = program
  .command('skill')
  .description('Manage NEXUS Skills — pre-read AI task instructions in .nexus/skills/');

skillCmd
  .command('new [name]')
  .description('Scaffold a new custom skill in .nexus/skills/custom/')
  .action(async (name: string | undefined) => {
    await skillNewCommand(name);
  });

skillCmd
  .command('list')
  .description('List all installed skills (core / custom / community)')
  .action(async () => {
    await skillListCommand();
  });

skillCmd
  .command('install <package>')
  .description('Install community skills from @nexus-framework/skills or a registry package')
  .action(async (pkg: string) => {
    await skillInstallCommand(pkg);
  });

skillCmd
  .command('remove <name>')
  .description('Remove a community skill (cannot remove core or custom skills)')
  .action(async (name: string) => {
    await skillRemoveCommand(name);
  });

skillCmd
  .command('status')
  .description('Check skill health — missing core skills, invalid frontmatter, deprecated status')
  .action(async () => {
    await skillStatusCommand();
  });

// ── nexus pack / unpack ───────────────────────────────────────

program
  .command('pack [path]')
  .description('Zip .nexus/ into a portable nexus-backup-<timestamp>.zip for migration')
  .action(async (targetPath: string | undefined) => {
    await packCommand(targetPath);
  });

program
  .command('unpack [path]')
  .description('Extract a nexus-backup-*.zip and verify the restored .nexus/ structure')
  .option('--file <zipfile>', 'Specify a zip file to unpack (default: most recent backup in directory)')
  .action(async (targetPath: string | undefined, options: { file?: string }) => {
    await unpackCommand(targetPath, options);
  });

// ── nexus update ──────────────────────────────────────────────

program
  .command('update')
  .description('Check for a newer version of NEXUS CLI and install it automatically')
  .action(async () => {
    await updateCommand();
  });

// ── Startup update notification ───────────────────────────────
// Silently checks the npm registry after every command.
// If a newer version exists, prints a short non-blocking banner
// at the end of the command output.

async function runWithUpdateCheck(): Promise<void> {
  // Fire update check in background — does not block CLI startup
  const updatePromise = checkForUpdate(4000);

  // Parse and run the actual command
  await program.parseAsync();

  // After the command finishes, check if an update was found
  const info = await updatePromise;
  if (info?.hasUpdate) {
    printUpdateBanner(info);
  }
}

void runWithUpdateCheck();
