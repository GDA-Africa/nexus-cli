/**
 * NEXUS CLI - Entry Point
 *
 * Sets up Commander.js with all commands, flags, and version info.
 */

import { Command } from 'commander';

import { adoptCommand } from './commands/adopt.js';
import { brainCommand } from './commands/brain.js';
import { briefCommand } from './commands/brief.js';
import { doctorCommand } from './commands/doctor.js';
import { initCommand } from './commands/init.js';
import { packCommand, unpackCommand } from './commands/pack.js';
import {
  planDoneCommand,
  planListCommand,
  planNewCommand,
  planNoteCommand,
  planShowCommand,
  planStartCommand,
  planTickCommand,
} from './commands/plan.js';
import { repairCommand } from './commands/repair.js';
import {
  skillInstallCommand,
  skillListCommand,
  skillNewCommand,
  skillRegistryCommand,
  skillRemoveCommand,
  skillStatusCommand,
} from './commands/skill.js';
import { syncCommand } from './commands/sync.js';
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
  .command('registry')
  .description('Browse all skills available in the @nexus-framework/skills registry')
  .option('--framework <name>', 'Filter to a single framework (e.g. nextjs, react-vite, shared)')
  .action(async (options: { framework?: string }) => {
    await skillRegistryCommand(options);
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

// ── nexus plan ───────────────────────────────────────────────

const planCmd = program
  .command('plan')
  .description('Manage durable multi-step plans in .nexus/plans/');

planCmd
  .command('new <title>')
  .description('Create a new plan file from the selected type template')
  .option('--type <kind>', 'Template kind: feature|bug|refactor|spike|chore', 'feature')
  .option('--owner <owner>', 'Plan owner (default: unassigned)')
  .option('--phase <phase>', 'Phase label (default inferred from type)')
  .option('--estimate <estimate>', 'Effort estimate, e.g. 2d')
  .action(async (title: string, options: {
    type?: 'feature' | 'bug' | 'refactor' | 'spike' | 'chore';
    owner?: string;
    phase?: string;
    estimate?: string;
  }) => {
    await planNewCommand(title, options);
  });

planCmd
  .command('list')
  .description('List plans, optionally filtered by status')
  .option('--status <status>', 'Filter: draft|approved|in_progress|blocked|done|abandoned')
  .action(async (options: {
    status?: 'draft' | 'approved' | 'in_progress' | 'blocked' | 'done' | 'abandoned';
  }) => {
    await planListCommand({ status: options.status });
  });

planCmd
  .command('show <id>')
  .description('Print a plan markdown file')
  .action(async (id: string) => {
    await planShowCommand(id);
  });

planCmd
  .command('start <id>')
  .description('Move plan to in_progress and mark it active')
  .action(async (id: string) => {
    await planStartCommand(id);
  });

planCmd
  .command('tick <id> <step>')
  .description('Mark a checklist step as done (or reopen with --undo)')
  .option('--undo', 'Set the step back to unchecked')
  .action(async (id: string, step: string, options: { undo?: boolean }) => {
    await planTickCommand(id, Number(step), !options.undo);
  });

planCmd
  .command('note <id> <message>')
  .description('Append a timestamped note entry to a plan')
  .action(async (id: string, message: string) => {
    await planNoteCommand(id, message);
  });

planCmd
  .command('done <id>')
  .description('Mark a plan done, update active pointer, and append progress log')
  .option('--summary <text>', 'Optional completion summary appended to Evidence')
  .action(async (id: string, options: { summary?: string }) => {
    await planDoneCommand(id, options.summary);
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

// ── nexus doctor ──────────────────────────────────────────────
program.addCommand(doctorCommand());

// ── nexus brief ───────────────────────────────────────────────
program.addCommand(briefCommand());

// ── nexus brain ───────────────────────────────────────────────
program.addCommand(brainCommand());

// ── nexus update ──────────────────────────────────────────────

program
  .command('update')
  .description('Check for a newer version of NEXUS CLI and install it automatically')
  .action(async () => {
    await updateCommand();
  });

program
  .command('sync [path]')
  .description('Capture repository Vital Signs and update the managed block in .nexus/docs/index.md')
  .option('--write', 'Write updated Vital Signs block to index.md (default behavior)')
  .option('--dry-run', 'Do not write files; capture and print output only')
  .option('--json', 'Print captured Vital Signs as JSON')
  .option('--scope <name>', 'Limit JSON output scope: all|git|files|tests|packages', 'all')
  .action(async (targetPath: string | undefined, options: {
    write?: boolean;
    dryRun?: boolean;
    json?: boolean;
    scope?: 'all' | 'git' | 'files' | 'tests' | 'packages';
  }) => {
    await syncCommand(targetPath, {
      write: options.write,
      dryRun: options.dryRun,
      json: options.json,
      scope: options.scope,
    });
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
