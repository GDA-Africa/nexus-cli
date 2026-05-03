import fs from 'node:fs/promises';
import path from 'node:path';

import type { BrainDetectionResult } from './brain-detector.js';
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

export function shouldPromptInteractively(
  mode: AutoInvokeMode,
  commandPath: string[],
  config: AutoInvokeConfig,
  detection: BrainDetectionResult,
): boolean {
  if (mode === 'interactive') return true;

  const root = commandPath[0] ?? '';
  const full = commandPath.join(' ');
  const forcedPrompt = config.always_prompt_for.includes(root) || config.always_prompt_for.includes(full);

  const syncVeryStale = detection.lastSyncAt
    ? Date.now() - new Date(detection.lastSyncAt).getTime() > 12 * 60 * 60 * 1000
    : true;

  return forcedPrompt || syncVeryStale;
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
