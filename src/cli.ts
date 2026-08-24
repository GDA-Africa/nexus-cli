/**
 * NEXUS CLI - Entry Point
 *
 * Sets up Commander.js with all commands, flags, and version info.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { select } from '@inquirer/prompts';
import { Command } from 'commander';

import { adoptCommand } from './commands/adopt.js';
import {
  agentInstallCommand,
  agentListCommand,
  agentNewCommand,
  agentRemoveCommand,
  agentStatusCommand,
  agentSyncCommand,
} from './commands/agent.js';
import { brainCommand } from './commands/brain.js';
import { briefCommand } from './commands/brief.js';
import { consolidateCommand } from './commands/consolidate.js';
import { contextCommand } from './commands/context.js';
import { doctorCommand } from './commands/doctor.js';
import { initCommand } from './commands/init.js';
import { mcpCommand } from './commands/mcp.js';
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
import { useCommand } from './commands/use.js';
import { wakeCommand } from './commands/wake.js';
import {
  isInteractiveEnvironment,
  loadAutoInvokeConfig,
  resolveAutoInvokeMode,
  saveAutoInvokeConfig,
  shouldPromptInteractively,
  shouldSkipAutoInvoke,
  type AutoInvokeConfig,
} from './utils/auto-invoke-config.js';
import { detectBrainNeeds, type BrainDetectionResult } from './utils/brain-detector.js';
import { getNexusDir } from './utils/brain.js';
import { buildDoctorContext } from './utils/doctor/context.js';
import { runDoctor } from './utils/doctor/index.js';
import { checkForUpdate } from './utils/update-check.js';
import { version } from './version.js';

const program = new Command();

program
  .name('nexus')
  .description('NEXUS CLI — AI-Native Project Scaffolding for the Modern Era')
  .version(version, '-v, --version')
  .option('--brain-check', 'Run interactive brain-check flow before command execution')
  .option('--no-brain-check', 'Disable auto-invoke checks for this command run');

program
  .command('init [project-name]')
  .description('Initialize a new NEXUS project with interactive setup')
  .option('--adopt', 'Shorthand: same as `nexus adopt` (add NEXUS to an existing project)')
  .option('--local', 'Configure NEXUS as local-only (not tracked by git)')
  .option('--ui <provider>', 'UI generator for this run: chameleon | none (overrides saved preference)')
  .option('--explain', 'Explain where the resolved UI preference came from')
  .action(async (projectName: string | undefined, options: {
    adopt?: boolean;
    local?: boolean;
    ui?: string;
    explain?: boolean;
  }) => {
    await initCommand(projectName, {
      adopt: options.adopt ?? false,
      local: options.local ?? false,
      ui: options.ui,
      explain: options.explain ?? false,
    });
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

// ── nexus agent ──────────────────────────────────────────────

const agentCmd = program
  .command('agent')
  .description('Manage brain-grounded agent definitions in .nexus/agents/ (v1.1)');

agentCmd.command('list').description('List all agents (custom / core / community)').action(agentListCommand);
agentCmd.command('new [name]').description('Scaffold a new custom agent').action(agentNewCommand);
agentCmd.command('install <name>').description('Install a community agent from the registry').action(agentInstallCommand);
agentCmd.command('remove <name>').description('Remove a community agent (refuses core/custom)').action(agentRemoveCommand);
agentCmd.command('status').description('Validate agent frontmatter and context recipes').action(agentStatusCommand);
agentCmd.command('sync').description('Regenerate client outputs (.claude/agents/ + Agent Roles blocks)').action(agentSyncCommand);

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
  .option('--major', 'Mark a bug plan as a major fix — opts it into the alignment gate', false)
  .action(async (title: string, options: {
    type?: 'feature' | 'bug' | 'refactor' | 'spike' | 'chore';
    owner?: string;
    phase?: string;
    estimate?: string;
    major?: boolean;
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
program.addCommand(useCommand());

program.addCommand(doctorCommand());

// ── nexus brief ───────────────────────────────────────────────
program.addCommand(briefCommand());

// ── nexus context ─────────────────────────────────────────────
program.addCommand(contextCommand());

// ── nexus consolidate ─────────────────────────────────────────
program.addCommand(consolidateCommand());

// ── nexus wake ────────────────────────────────────────────────
program.addCommand(wakeCommand());

// ── nexus brain ───────────────────────────────────────────────
program.addCommand(brainCommand());

// ── nexus mcp ─────────────────────────────────────────────────
program.addCommand(mcpCommand());

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

/**
 * `nexus mcp` speaks the MCP protocol over stdout — auto-invoke output,
 * interactive prompts, and the update banner would corrupt the stream.
 */
function isMcpInvocation(): boolean {
  return process.argv[2] === 'mcp';
}

/**
 * `nexus context --json` exists so a harness with no MCP server — a shell
 * script, a CI job, a local-model wrapper — can pipe stdout straight into
 * JSON parsing (`nexus-harness-work.md` §2.3: "the wrapper script fetches
 * the pack and prepends it"). The auto-invoke banner and update notice both
 * write plain text to that same stdout, which breaks exactly that use case
 * the same way it would for `nexus mcp` — so it gets the same carve-out.
 */
function isJsonContextInvocation(): boolean {
  return process.argv[2] === 'context' && process.argv.includes('--json');
}

/** Stdout must stay clean of anything but the command's own output. */
function needsCleanStdout(): boolean {
  return isMcpInvocation() || isJsonContextInvocation();
}

async function runWithUpdateCheck(): Promise<void> {
  // Fire update check in background — does not block CLI startup.
  // Skipped entirely when stdout must stay protocol-clean.
  const updatePromise = needsCleanStdout() ? Promise.resolve(null) : checkForUpdate(4000);

  program.hook('preAction', async (_thisCommand, actionCommand) => {
    await runAutoInvokePre(actionCommand);
  });

  program.hook('postAction', async (_thisCommand, actionCommand) => {
    await runAutoInvokePost(actionCommand);
  });

  // Parse and run the actual command
  await program.parseAsync();

  // After the command finishes, check if an update was found
  const info = await updatePromise;
  if (info?.hasUpdate) {
    printUpdateBanner(info);
  }
}

void runWithUpdateCheck();

async function runAutoInvokePre(actionCommand: Command): Promise<void> {
  if (needsCleanStdout()) return;

  const cwd = process.cwd();
  const nexusDir = getNexusDir(cwd);
  if (!nexusDir) return;

  const commandPath = getCommandPath(actionCommand);
  const projectRoot = path.dirname(nexusDir);
  const config = await loadAutoInvokeConfig(projectRoot);
  const mode = resolveAutoInvokeMode(config, {
    brainCheck: process.argv.includes('--brain-check'),
    noBrainCheck: process.argv.includes('--no-brain-check'),
  });

  if (mode === 'disabled' || shouldSkipAutoInvoke(commandPath, config)) {
    return;
  }

  if (shouldPreSync(commandPath)) {
    await syncCommand(projectRoot, { write: true });
  }

  const detection = await detectBrainNeeds(projectRoot, {
    syncIntervalMinutes: config.sync_interval_minutes,
  });

  if (!detection.shouldDoctor && !detection.shouldSync) {
    return;
  }

  // Only `interactive` mode prompts, and only when a real TTY is present.
  // Everything else (silent/disabled, or any non-interactive environment such
  // as an AI agent, CI, or a pipe) degrades to safe silent auto-actions — never
  // a prompt that would throw ExitPromptError and abort the real command.
  if (!shouldPromptInteractively(mode) || !isInteractiveEnvironment()) {
    await runSilentAutoActions(projectRoot, nexusDir, config, detection);
    return;
  }

  let choice: string;
  try {
    choice = await select<string>({
      message: '🧠 Brain Check: choose an action',
      choices: [
        { value: 'sync', name: 'Run nexus sync (refresh repo state)' },
        { value: 'doctor', name: 'Run doctor checks (warn+)' },
        { value: 'both', name: 'Run sync and doctor' },
        { value: 'skip', name: 'Skip for now' },
        { value: 'disable', name: 'Always skip brain checks (disable auto-invoke)' },
      ],
      default: 'both',
    });
  } catch {
    // Prompt was closed (Ctrl-C / ExitPromptError) or the environment turned out
    // to be non-interactive after all. Degrade to safe silent actions instead of
    // crashing the command the user actually asked for.
    await runSilentAutoActions(projectRoot, nexusDir, config, detection);
    return;
  }

  if (choice === 'disable') {
    await saveAutoInvokeConfig(projectRoot, {
      ...config,
      enabled: false,
      mode: 'disabled',
    });
    return;
  }

  if (choice === 'skip') {
    return;
  }

  if (choice === 'sync' || choice === 'both') {
    await syncCommand(projectRoot, { write: true });
  }

  if (choice === 'doctor' || choice === 'both') {
    const ctx = await buildDoctorContext(projectRoot, nexusDir);
    const report = await runDoctor(ctx, { minSeverity: 'warn' });
    await persistDoctorState(nexusDir, report);
  }
}

/**
 * Non-interactive fallback for the pre-action auto-invoke hook.
 *
 * Runs only the actions the user has opted into via `auto_fix_doctor` — by
 * default this does nothing (read-only detection), so a NEXUS command run by an
 * agent or in CI never surprises the caller with file writes. When opted in, it
 * refreshes Vital Signs and/or persists a doctor report silently.
 */
async function runSilentAutoActions(
  projectRoot: string,
  nexusDir: string,
  config: AutoInvokeConfig,
  detection: BrainDetectionResult,
): Promise<void> {
  if (!config.auto_fix_doctor) return;

  if (detection.shouldSync) {
    await syncCommand(projectRoot, { write: true });
  }

  if (detection.shouldDoctor) {
    const ctx = await buildDoctorContext(projectRoot, nexusDir);
    const report = await runDoctor(ctx, { minSeverity: 'warn' });
    await persistDoctorState(nexusDir, report);
  }
}

async function runAutoInvokePost(actionCommand: Command): Promise<void> {
  if (needsCleanStdout()) return;

  const cwd = process.cwd();
  const nexusDir = getNexusDir(cwd);
  if (!nexusDir) return;

  const commandPath = getCommandPath(actionCommand);
  const projectRoot = path.dirname(nexusDir);
  const config = await loadAutoInvokeConfig(projectRoot);
  const mode = resolveAutoInvokeMode(config, {
    brainCheck: process.argv.includes('--brain-check'),
    noBrainCheck: process.argv.includes('--no-brain-check'),
  });

  if (mode === 'disabled' || shouldSkipAutoInvoke(commandPath, config)) {
    return;
  }

  const detection = await detectBrainNeeds(projectRoot, {
    syncIntervalMinutes: config.sync_interval_minutes,
  });

  const syncLabel = detection.lastSyncAt ? `last synced ${detection.lastSyncAt}` : 'never synced';
  const doctorLabel = `${detection.doctorWarnOrHigher} doctor warn/error`;
  const knowledgeLabel = `${detection.knowledgeEntries} knowledge entries`;
  console.log(`→ Brain: ${syncLabel}, ${doctorLabel}, ${knowledgeLabel}`);
}

function getCommandPath(actionCommand: Command): string[] {
  const parts: string[] = [];
  let current: Command | null = actionCommand;

  while (current) {
    const currentName = current.name();
    if (currentName && currentName !== 'nexus') {
      parts.unshift(currentName);
    }

    current = current.parent ?? null;
  }

  return parts;
}

function shouldPreSync(commandPath: string[]): boolean {
  const full = commandPath.join(' ');
  return full === 'plan new'
    || full === 'plan start'
    || full === 'plan done'
    || full === 'skill install';
}

async function persistDoctorState(
  nexusDir: string,
  report: Awaited<ReturnType<typeof runDoctor>>,
): Promise<void> {
  const stateDir = path.join(nexusDir, 'state');
  const filePath = path.join(stateDir, 'doctor.json');

  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify({
    ranAt: new Date().toISOString(),
    summary: report.summary,
    findings: report.findings,
  }, null, 2), 'utf8');
}
