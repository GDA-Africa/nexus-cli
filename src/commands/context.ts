/**
 * NEXUS CLI — `nexus context`
 *
 * A thin CLI wrapper over the same composer `nexus_get_context` (MCP) uses —
 * no new composition logic lives here. This is what lets a harness that does
 * not speak MCP at all — a shell script, a CI job, a local-model wrapper —
 * get a bounded context pack: `nexus context "<task>" --json --max-tokens=N`
 * fetches the pack as one process call, and the caller prepends it to the
 * prompt. No MCP server required.
 *
 * Spec: nexus-harness-work.md §2.3, §7 step 4.
 */

import { Command } from 'commander';

import { resolveBrainContext, McpToolError, type BrainContext } from '../mcp/context.js';
import { getContextTool, type ComposedContext } from '../mcp/tools.js';
import { logger } from '../utils/logger.js';

/**
 * Default token budget when `--max-tokens` is not given. Matches the
 * `composeContext({ task, agent?, maxTokens? })` contract in
 * `nexus-harness-work.md` §7, which defaults to 3000.
 */
const DEFAULT_MAX_TOKENS = 3000;

/**
 * TODO(integration): workstream 1 owns `src/mcp/**` and is changing
 * `getContextTool`'s input/output contract in parallel — landing
 * `maxTokens` natively (replacing `maxChars`) and adding
 * `contract_version` / `evicted[]` / `budget{}` to `ComposedContext`
 * (nexus-harness-work.md §2.3, §7 step 5). Until that lands, this adapts a
 * token budget to today's `maxChars` contract with a fixed estimate rather
 * than inventing new composition logic here — `getContextTool` itself is
 * untouched. Reconcile this conversion (and the two additional input names,
 * `task`/`agent`, which already match) once `maxTokens` is native.
 *
 * The estimate is 4 bytes/token — consistent with the ~3.8 bytes/token
 * measured across this repo's own orientation files in
 * `nexus-assessment-v1.4.0.md` §2, rounded up so the byte cap this produces
 * is never tighter than the token budget the caller actually asked for.
 */
const BYTES_PER_TOKEN_ESTIMATE = 4;

export interface ComposeContextInput {
  task: string;
  agent?: string;
  maxTokens?: number;
}

/**
 * `composeContext({ task, agent?, maxTokens? })` — the composer NEXUS
 * exposes both to the MCP tool and to this command, coded against the
 * contract this command was specified against. See the TODO above for what
 * is and is not adapted today.
 */
export async function composeContext(
  ctx: BrainContext,
  input: ComposeContextInput,
): Promise<ComposedContext> {
  const maxTokens = input.maxTokens ?? DEFAULT_MAX_TOKENS;
  const maxChars = Math.round(maxTokens * BYTES_PER_TOKEN_ESTIMATE);

  return getContextTool(ctx, { task: input.task, agent: input.agent, maxChars });
}

export interface ContextCommandOptions {
  json?: boolean;
  maxTokens?: number;
  agent?: string;
}

export function contextCommand(): Command {
  return new Command('context')
    .description(
      'Compose a bounded context pack for a task — the same composer nexus_get_context uses, callable with no MCP server running',
    )
    .argument('<task>', 'Task description used for matching')
    .option('--json', 'Output the composed pack as JSON (for piping into a wrapper script)', false)
    .option('--max-tokens <n>', `Token budget for the composed pack (default ${DEFAULT_MAX_TOKENS})`, (value) => {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--max-tokens must be a positive integer, got "${value}"`);
      }
      return parsed;
    })
    .option('--agent <name>', 'Agent whose context recipe scopes the composition')
    .action(async (task: string, options: ContextCommandOptions) => {
      await runContextCommand(task, options);
    });
}

/**
 * The testable core behind `nexus context`. Separated from the Commander
 * wiring so tests can call it directly with `process.cwd` mocked, matching
 * the rest of the command suite (`runWake`, `planNewCommand`, ...).
 */
export async function runContextCommand(
  task: string,
  options: ContextCommandOptions = {},
): Promise<ComposedContext | undefined> {
  let ctx: BrainContext;
  try {
    ctx = resolveBrainContext(process.cwd());
  } catch (err) {
    logger.error(err instanceof McpToolError ? err.message : String(err));
    process.exit(1);
    return undefined;
  }

  const result = await composeContext(ctx, { task, agent: options.agent, maxTokens: options.maxTokens });

  if (options.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log(renderContextPretty(result));
  }

  return result;
}

function renderContextPretty(pack: ComposedContext): string {
  const lines: string[] = [
    `Task: ${pack.task}`,
    pack.agent ? `Agent: ${pack.agent}` : null,
    '',
  ].filter((line): line is string => line !== null);

  if (pack.gate?.required) {
    lines.push(`⚠️  Gate required: ${pack.gate.skill ?? 'unnamed skill'} — ${pack.gate.reason}`, '');
  }

  lines.push(
    pack.plan
      ? `Active plan: ${pack.plan.id} (${pack.plan.status})${pack.plan.nextStep ? ` — next: ${pack.plan.nextStep}` : ''}`
      : 'Active plan: none',
    `Skills matched: ${pack.skills.length}`,
    `Knowledge entries: ${pack.knowledge.length}`,
    `Docs included: ${pack.docs.map((d) => d.file).join(', ') || 'none'}`,
    `Truncated: ${pack.truncated ? 'yes — pack did not fully fit the budget' : 'no'}`,
  );

  return lines.join('\n');
}
