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

import { Command } from 'commander';

import { McpToolError, resolveBrainContext, type BrainContext } from '../mcp/context.js';
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

export interface HarnessVerifyCliOptions {
  baseUrl?: string;
  model?: string;
  task?: string;
  toolCallAttempts?: number;
  dryRun?: boolean;
  json?: boolean;
  /**
   * Not a CLI flag — no operator ever sets this. Lets tests exercise this
   * command's full validation/render/write-back path with a fake client
   * instead of a real network call, the same way `verifyHarness` itself
   * takes an injectable `client`.
   */
  client?: OllamaClient;
}

export function harnessCommand(): Command {
  const harness = new Command('harness').description(
    'Inspect and verify harness profiles declared in .nexus/harnesses.yml',
  );

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
