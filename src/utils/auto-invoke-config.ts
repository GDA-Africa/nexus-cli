import fs from 'node:fs/promises';
import path from 'node:path';

import { fileExists } from './file-system.js';

export type AutoInvokeMode = 'silent' | 'interactive' | 'disabled';

export interface AutoInvokeConfig {
  enabled: boolean;
  mode: AutoInvokeMode;
  sync_interval_minutes: number;
  auto_fix_doctor: boolean;
  disabled_for_commands: string[];
  always_prompt_for: string[];
}

export interface AutoInvokeCliOptions {
  brainCheck?: boolean;
  noBrainCheck?: boolean;
}

export const DEFAULT_AUTO_INVOKE_CONFIG: AutoInvokeConfig = {
  enabled: true,
  mode: 'silent',
  sync_interval_minutes: 60,
  auto_fix_doctor: false,
  disabled_for_commands: ['help'],
  always_prompt_for: ['plan'],
};

export async function loadAutoInvokeConfig(projectRoot: string): Promise<AutoInvokeConfig> {
  const configPath = path.join(projectRoot, '.nexus', 'auto-invoke.config.json');

  if (!(await fileExists(configPath))) {
    return { ...DEFAULT_AUTO_INVOKE_CONFIG };
  }

  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AutoInvokeConfig>;

    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_AUTO_INVOKE_CONFIG.enabled,
      mode: isMode(parsed.mode) ? parsed.mode : DEFAULT_AUTO_INVOKE_CONFIG.mode,
      sync_interval_minutes: normalizePositiveInt(parsed.sync_interval_minutes, DEFAULT_AUTO_INVOKE_CONFIG.sync_interval_minutes),
      auto_fix_doctor: typeof parsed.auto_fix_doctor === 'boolean'
        ? parsed.auto_fix_doctor
        : DEFAULT_AUTO_INVOKE_CONFIG.auto_fix_doctor,
      disabled_for_commands: normalizeStringArray(parsed.disabled_for_commands, DEFAULT_AUTO_INVOKE_CONFIG.disabled_for_commands),
      always_prompt_for: normalizeStringArray(parsed.always_prompt_for, DEFAULT_AUTO_INVOKE_CONFIG.always_prompt_for),
    };
  } catch {
    return { ...DEFAULT_AUTO_INVOKE_CONFIG };
  }
}

export async function saveAutoInvokeConfig(projectRoot: string, config: AutoInvokeConfig): Promise<void> {
  const configPath = path.join(projectRoot, '.nexus', 'auto-invoke.config.json');
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

export function resolveAutoInvokeMode(config: AutoInvokeConfig, options: AutoInvokeCliOptions): AutoInvokeMode {
  if (options.noBrainCheck) {
    return 'disabled';
  }

  if (options.brainCheck) {
    return 'interactive';
  }

  if (!config.enabled) {
    return 'disabled';
  }

  return config.mode;
}

export function shouldSkipAutoInvoke(
  commandPath: string[],
  config: AutoInvokeConfig,
): boolean {
  if (commandPath.length === 0) return true;

  const rootCommand = commandPath[0] ?? '';
  const fullPath = commandPath.join(' ');

  if (rootCommand === 'init' || rootCommand === 'adopt') {
    return true;
  }

  if (rootCommand === 'sync' || rootCommand === 'doctor' || rootCommand === 'brain') {
    return true;
  }

  return config.disabled_for_commands.some((entry) => entry === rootCommand || entry === fullPath);
}

/**
 * Whether the auto-invoke layer is allowed to put an interactive prompt on
 * screen. ONLY `interactive` mode prompts — `silent` and `disabled` never do.
 *
 * This is deliberately strict: a stale repo or an `always_prompt_for` command
 * must NOT escalate `silent` mode into a prompt, because that prompt crashes
 * (ExitPromptError) the moment there is no TTY — i.e. every AI agent / CI / pipe
 * session. Staleness now drives *silent* auto-actions instead (see
 * `runSilentAutoActions` in cli.ts), never a prompt.
 */
export function shouldPromptInteractively(mode: AutoInvokeMode): boolean {
  return mode === 'interactive';
}

/**
 * True only when it is actually safe to render an interactive prompt: a real
 * TTY on both stdin and stdout, not under CI, and not explicitly opted out via
 * `NEXUS_NONINTERACTIVE=1`. Callers must gate every prompt on this so the CLI
 * degrades gracefully instead of throwing in non-interactive environments.
 */
export function isInteractiveEnvironment(): boolean {
  if (process.env.NEXUS_NONINTERACTIVE === '1') return false;
  if (process.env.CI) return false;
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function isMode(value: unknown): value is AutoInvokeMode {
  return value === 'silent' || value === 'interactive' || value === 'disabled';
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function normalizePositiveInt(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.round(numeric);
}
