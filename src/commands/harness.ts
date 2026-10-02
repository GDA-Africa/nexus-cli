/**
 * NEXUS CLI — `nexus harness verify`
 *
 * The one command in this codebase that makes a live call to a model
 * endpoint — everywhere else in `src/`, zero model calls, by deliberate
 * invariant. `nexus doctor` and every other automatic path never touch this;
 * it runs only when a user types it, which is what keeps the
 * deterministic-and-offline guarantee everything else relies on intact.
 *
 * `.nexus/harnesses.yml`'s `window` field is a claim, not a measurement.
 * This verifies it against a real Ollama-compatible endpoint and writes the
 * measured values back — see `utils/harnesses/verify.ts` for the three
 * probes and `nexus-harness-work.md` §4 for the spec this implements.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import { Command } from 'commander';
import { execa } from 'execa';
import fs from 'fs-extra';

import { McpToolError, resolveBrainContext, type BrainContext } from '../mcp/context.js';
import { getNexusDir } from '../utils/brain.js';
import {
  applyMeasuredValues,
  DEFAULT_BASE_URL,
  DEFAULT_TOOL_CALL_ATTEMPTS,
  loadHarnessesConfig,
  saveHarnessesConfig,
  verifyHarness,
  type HarnessVerifyReport,
  type OllamaClient,
} from '../utils/harnesses/index.js';
import { logger } from '../utils/logger.js';
import { readActivePlans } from '../utils/plans/active.js';


export interface HarnessLauncherCliOptions {
  port?: string;
  tui?: boolean;
  desktop?: boolean;
  open?: boolean;
  task?: string;
  /** Injectable runner for unit tests. */
  runner?: (command: string, args: string[], options: Record<string, unknown>) => Promise<unknown>;
}

export interface HarnessVerifyCliOptions {
  baseUrl?: string;
  model?: string;
  task?: string;
  toolCallAttempts?: number;
  dryRun?: boolean;
  json?: boolean;
  client?: OllamaClient;
}

export function renderNexusBanner(info: {
  projectName: string;
  projectRoot: string;
  activePlan?: string;
  mode: 'web' | 'tui' | 'desktop' | 'headless';
  task?: string;
  port?: number | string;
}): string {
  const art = [
    chalk.cyan('  _   _ _______  ___   _ ____  '),
    chalk.cyan(' | \\ | | ____\\ \\/ / | | / ___| '),
    chalk.cyan(' |  \\| |  _|  \\  /| | | \\___ \\ '),
    chalk.cyan(' | |\\  | |___ /  \\| |_| |___) |'),
    chalk.cyan(' |_| \\_|_____/_/\\_\\\\___/|____/ '),
  ].join('\n');

  const title = chalk.bold.white('NEXUS HARNESS') + ' — ' + chalk.dim('AI-Native Project Partner');
  const modeText =
    info.mode === 'web'
      ? chalk.bold(`Web UI (http://localhost:${info.port})`)
      : info.mode === 'desktop'
        ? chalk.bold('Desktop App')
        : info.mode === 'headless'
          ? chalk.bold.yellow('Autonomous Headless Agent')
          : chalk.bold('Interactive Terminal Agent');

  const details = [
    `${chalk.cyan('⚡ Project:')}    ${chalk.bold(info.projectName)} (${chalk.dim(info.projectRoot)})`,
    `${chalk.cyan('📋 Active Plan:')} ${info.activePlan ? chalk.bold.green(info.activePlan) : chalk.dim('No active plan')}`,
    `${chalk.cyan('🚀 Mode:')}        ${modeText}`,
  ];

  if (info.task) {
    details.push(`${chalk.cyan('🎯 Task:')}        ${chalk.bold.white(info.task)}`);
  }

  return `\n${art}\n  ${title}\n\n${details.join('\n')}\n`;
}

export function harnessCommand(): Command {
  const harness = new Command('harness')
    .description('Launch the Nexus execution harness or verify harness profiles')
    .option('-p, --port <port>', 'Port to bind the local web interface (default: 3080)', '3080')
    .option('--tui', 'Launch interactive terminal agent instead of web interface', false)
    .option('--desktop', 'Launch the packaged desktop application', false)
    .option('--no-open', 'Do not automatically open the browser on launch')
    .action(async (options: HarnessLauncherCliOptions) => {
      await runHarnessLauncher(options);
    });

  harness
    .command('verify <profile>')
    .description(
      'Opt-in, live probe of a configured Ollama-compatible endpoint: measures effective ' +
        'context window, silent truncation, and structured tool-call reliability, and writes ' +
        'the results back into harnesses.yml. Never runs automatically — you have to type this.',
    )
    .option('--base-url <url>', `Ollama-compatible base URL (default ${DEFAULT_BASE_URL})`)
    .option('--model <name>', "Model to query — overrides the profile's own `model:` field")
    .option('--task <text>', 'Task string used to compose the bounded pack sent in the truncation probe')
    .option(
      '--tool-call-attempts <n>',
      `Number of structured tool-call attempts (default ${DEFAULT_TOOL_CALL_ATTEMPTS})`,
      (value: string) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new Error(`--tool-call-attempts must be a positive integer, got "${value}"`);
        }
        return parsed;
      },
    )
    .option('--dry-run', 'Report findings without writing measured values back to harnesses.yml', false)
    .option('--json', 'Output the verification report as JSON', false)
    .action(async (profileId: string, options: HarnessVerifyCliOptions) => {
      await runHarnessVerify(profileId, options);
    });

  return harness;
}

/**
 * The testable core behind `nexus harness` / `nexus agent` launcher.
 */
export async function runHarnessLauncher(options: HarnessLauncherCliOptions = {}): Promise<void> {
  const currentCwd = process.cwd();
  const nexusDir = getNexusDir(currentCwd);
  if (!nexusDir) {
    logger.error('No .nexus directory found in current working tree. Run "nexus init" first.');
    process.exit(1);
    return;
  }

  const projectRoot = path.dirname(nexusDir);
  let projectName = path.basename(projectRoot);
  try {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      if (pkg.name) {
        projectName = pkg.name;
      }
    }
  } catch {
    // Ignore read errors, fallback to folder name
  }

  let activePlan: string | undefined;
  try {
    const plansDir = path.join(nexusDir, 'plans');
    const activeState = await readActivePlans(plansDir);
    if (activeState.active && activeState.active.length > 0) {
      activePlan = activeState.active.join(', ');
    }
  } catch {
    // Ignore plan read errors
  }

  const mode: 'web' | 'tui' | 'desktop' | 'headless' = options.task
    ? 'headless'
    : options.desktop
      ? 'desktop'
      : options.tui
        ? 'tui'
        : 'web';

  const port = options.port ?? '3080';

  console.log(
    renderNexusBanner({
      projectName,
      projectRoot,
      activePlan,
      mode,
      task: options.task,
      port,
    }),
  );

  // Generate / update dynamic patch file for nexus-brain-context and tool-nexus-brain
  const stateDir = path.join(nexusDir, 'state');
  await fs.ensureDir(stateDir);
  const patchPath = path.join(stateDir, 'nexus-brain.patch.yml');
  const patchContent = [
    `# Auto-generated by NEXUS CLI for ${projectName}`,
    '- insert:',
    `    - id: nexus-brain-context`,
    `      name: '@deepseek-ai/dsh-experimental-nexus-brain-context'`,
    `      config:`,
    `        projectRoot: ${JSON.stringify(projectRoot)}`,
    `    - id: tool-nexus-brain`,
    `      name: '@deepseek-ai/dsh-experimental-tool-nexus-brain'`,
    `      config:`,
    `        projectRoot: ${JSON.stringify(projectRoot)}`,
    '',
  ].join('\n');
  await fs.writeFile(patchPath, patchContent, 'utf-8');

  // Candidate binaries
  const candidateBins = [
    path.join(projectRoot, 'nexus-harness', 'apps', 'nexus-harness', 'bin', 'nexus-harness.js'),
    path.resolve(projectRoot, '..', 'nexus-harness', 'apps', 'nexus-harness', 'bin', 'nexus-harness.js'),
    path.resolve(fileURLToPath(import.meta.url), '../../../../nexus-harness/apps/nexus-harness/bin/nexus-harness.js'),
    path.join(projectRoot, 'nexus-harness', 'apps', 'cli', 'lib', 'bin.js'),
    path.resolve(projectRoot, '..', 'nexus-harness', 'apps', 'cli', 'lib', 'bin.js'),
    path.resolve(fileURLToPath(import.meta.url), '../../../../nexus-harness/apps/cli/lib/bin.js'),
  ];

  let resolvedBin: string | null = null;
  for (const candidate of candidateBins) {
    if (await fs.pathExists(candidate)) {
      resolvedBin = candidate;
      break;
    }
  }

  const env = {
    ...process.env,
    NEXUS_PROJECT_ROOT: projectRoot,
  };

  let command: string;
  const args: string[] = [];

  if (resolvedBin) {
    command = process.execPath;
    args.push(resolvedBin);
  } else {
    command = 'npx';
    args.push('-y', '@nexus-framework/harness');
  }

  if (mode === 'web') {
    args.push('--profile', 'web', '--patch', patchPath, '--port', String(port));
    if (options.open === false) {
      args.push('--no-open');
    }
  } else if (mode === 'desktop') {
    args.push('--profile', 'desktop', '--patch', patchPath);
  } else if (mode === 'headless') {
    args.push('--profile', 'headless', '--patch', patchPath);
    if (options.task) {
      args.push(options.task);
    }
  } else {
    // tui mode
    args.push('--profile', 'default', '--patch', patchPath);
  }

  if (options.runner) {
    await options.runner(command, args, { cwd: projectRoot, env });
    return;
  }

  try {
    await execa(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      env,
    });
  } catch (err: unknown) {
    const error = err as { exitCode?: number; message?: string };
    if (typeof error.exitCode === 'number') {
      process.exit(error.exitCode);
    } else {
      logger.error(`Failed to launch harness: ${error.message ?? String(err)}`);
      process.exit(1);
    }
  }
}


/**
 * The testable core behind `nexus harness verify`, separated from the
 * Commander wiring so tests can call it directly with `process.cwd` mocked
 * and a fake client injected via `verifyHarness`, matching the rest of the
 * command suite (`runContextCommand`, `runWake`, ...).
 */
export async function runHarnessVerify(
  profileId: string,
  options: HarnessVerifyCliOptions = {},
): Promise<HarnessVerifyReport | undefined> {
  let ctx: BrainContext;
  try {
    ctx = resolveBrainContext(process.cwd());
  } catch (err) {
    logger.error(err instanceof McpToolError ? err.message : String(err));
    process.exit(1);
    return undefined;
  }

  const config = await loadHarnessesConfig(ctx.nexusDir);
  if (!config) {
    logger.error(
      `No .nexus/harnesses.yml found. Declare a "${profileId}" profile there before running ` +
        '`nexus harness verify`.',
    );
    process.exit(1);
    return undefined;
  }

  const profile = config.harnesses[profileId];
  if (!profile) {
    const known = Object.keys(config.harnesses).join(', ') || '(none declared)';
    logger.error(`No profile named "${profileId}" in .nexus/harnesses.yml. Declared: ${known}`);
    process.exit(1);
    return undefined;
  }

  const model = options.model ?? profile.model;
  if (!model) {
    logger.error(
      `"${profileId}" has no \`model:\` field in harnesses.yml, and --model was not given. ` +
        '`nexus harness verify` needs to know which Ollama model to query.',
    );
    process.exit(1);
    return undefined;
  }

  const report = await verifyHarness({
    ctx,
    harnessId: profileId,
    profile,
    model,
    baseUrl: options.baseUrl,
    toolCallAttempts: options.toolCallAttempts,
    task: options.task,
    client: options.client,
  });

  if (!report.reachable) {
    if (options.json) {
      console.log(JSON.stringify(report));
    } else {
      logger.error(`Could not verify "${profileId}": ${report.error ?? 'endpoint unreachable'}`);
    }
    process.exit(1);
    return report;
  }

  if (options.json) {
    console.log(JSON.stringify(report));
  } else {
    console.log(renderHarnessVerifyPretty(report, profileId));
  }

  if (!options.dryRun) {
    const updatedProfile = applyMeasuredValues(profile, report);
    const updatedConfig = {
      ...config,
      harnesses: { ...config.harnesses, [profileId]: updatedProfile },
    };
    await saveHarnessesConfig(ctx.nexusDir, updatedConfig);
    if (!options.json) {
      logger.success(
        `Measured values written back to .nexus/harnesses.yml (measured_at: ${report.measuredAt}).`,
      );
    }
  }

  return report;
}

function renderHarnessVerifyPretty(report: HarnessVerifyReport, profileId: string): string {
  const toolCallLine =
    report.toolCallSuccessRate !== null
      ? `Tool-call success rate: ${Math.round(report.toolCallSuccessRate * 100)}% ` +
        `(measured tool_calling: ${report.measuredToolCalling})`
      : 'Tool-call success rate: unmeasured (endpoint stopped responding mid-probe)';

  const truncationLine = report.truncation
    ? `Truncation probe: sent ${report.truncation.tokensSent} tokens, endpoint reports ` +
      `${report.truncation.promptEvalCount ?? 'unknown'} evaluated — ` +
      `${report.truncation.detected ? 'TRUNCATION DETECTED' : 'no truncation detected'}`
    : 'Truncation probe: not run';

  const lines: string[] = [
    `Harness: ${profileId} (model: ${report.model} @ ${report.baseUrl})`,
    '',
    `Declared window: ${report.declaredWindow}`,
    `Measured window: ${report.measuredWindow ?? 'unmeasured (recall failed at the smallest probed depth)'}`,
    toolCallLine,
    truncationLine,
    '',
  ];

  if (report.findings.length > 0) {
    lines.push('Findings:', ...report.findings.map((f) => `  - ${f}`));
  } else {
    lines.push('No disagreements found — measured reality matches the declared profile.');
  }

  return lines.join('\n');
}
