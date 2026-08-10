/**
 * NEXUS CLI — `nexus use` command
 *
 * The persisted UI-provider preference, at either scope:
 *
 *   nexus use chameleon            # this project    → .nexus/config.json
 *   nexus use chameleon --global   # every project   → ~/.config/nexus/config.json
 *   nexus use none                 # opt back out at either scope
 *   nexus use                      # show what's active and where it came from
 *
 * Setting it globally once is the "easy command" that makes NEXUS a
 * Chameleon-first tool for the people who want that, without making it one for
 * anyone else. `--ui none` is always one keystroke away, whatever this says.
 */

import { Command } from 'commander';

import type { UiProvider } from '../types/chameleon.js';
import { detectChameleon, hasCapability } from '../utils/chameleon/index.js';
import { logger } from '../utils/logger.js';
import {
  describeUiPreference,
  globalConfigPath,
  isUiProvider,
  projectConfigPath,
  resolveUiPreference,
  setUiPreference,
} from '../utils/ui-preference.js';

interface UseOptions {
  global?: boolean;
  json?: boolean;
  explain?: boolean;
}

export function useCommand(): Command {
  return new Command('use')
    .argument('[provider]', 'UI provider to use: chameleon | none')
    .description('Show or set the UI generator NEXUS delegates to (opt-in, remembered)')
    .option('--global', 'Write the preference for every project instead of this one', false)
    .option('--explain', 'Show which config file the active preference came from', false)
    .option('--json', 'Output as JSON', false)
    .action(async (provider: string | undefined, options: UseOptions) => {
      const cwd = process.cwd();

      if (provider === undefined) {
        await showPreference(cwd, options);
        return;
      }

      if (!isUiProvider(provider)) {
        logger.error(`Unknown UI provider: '${provider}'. Expected 'chameleon' or 'none'.`);
        process.exit(1);
      }

      await writePreference(provider, cwd, options);
    });
}

/* ──────────────────────────────────────────────────────────────
 * nexus use  — show
 * ────────────────────────────────────────────────────────────── */

async function showPreference(cwd: string, options: UseOptions): Promise<void> {
  const pref = await resolveUiPreference({ projectRoot: cwd });

  if (options.json) {
    console.log(JSON.stringify({
      ui: pref.provider,
      source: pref.source,
      path: pref.path ?? null,
      projectConfig: projectConfigPath(cwd),
      globalConfig: globalConfigPath(),
    }, null, 2));
    return;
  }

  logger.newline();
  logger.nexus(`UI: ${describeUiPreference(pref)}`);

  if (options.explain) {
    logger.info(`  resolved from: ${pref.path ?? (pref.source === 'default' ? 'built-in default' : pref.source)}`);
    logger.info(`  project config: ${projectConfigPath(cwd)}`);
    logger.info(`  global config:  ${globalConfigPath()}`);
  }

  if (pref.provider === 'chameleon') {
    await reportChameleonInstall(cwd);
  } else {
    logger.newline();
    logger.info('Enable Chameleon for this project with `nexus use chameleon`,');
    logger.info('or for every project with `nexus use chameleon --global`.');
  }

  logger.newline();
}

/**
 * When Chameleon is the active preference, say whether it is actually
 * resolvable — a preference that cannot be honoured should be visible here
 * rather than at generation time.
 */
async function reportChameleonInstall(cwd: string): Promise<void> {
  const install = await detectChameleon({ cwd });

  if (!install.available) {
    logger.warn('Chameleon is selected but not resolvable in this environment.');
    logger.info('  Install it with: npm install @chameleon-ui-lib/react');
    logger.info('  NEXUS will generate the UI itself until it is available.');
    return;
  }

  logger.success(`Chameleon ${install.cliVersion ?? 'unknown'} available (${install.resolvedFrom}).`);

  if (!hasCapability(install, 'init-framework-aware')) {
    logger.info('  Next.js projects: waiting on framework-aware `chameleon init` (CH-05).');
  }
}

/* ──────────────────────────────────────────────────────────────
 * nexus use <provider>  — set
 * ────────────────────────────────────────────────────────────── */

async function writePreference(provider: UiProvider, cwd: string, options: UseOptions): Promise<void> {
  const written = await setUiPreference(provider, {
    global: options.global,
    projectRoot: cwd,
  });

  if (options.json) {
    console.log(JSON.stringify({
      ui: provider,
      scope: options.global ? 'global' : 'project',
      path: written,
    }, null, 2));
    return;
  }

  const scope = options.global ? 'every project' : 'this project';

  logger.newline();
  if (provider === 'chameleon') {
    logger.success(`Chameleon is now the UI generator for ${scope}.`);
  } else {
    logger.success(`NEXUS will generate the UI itself for ${scope}.`);
  }
  logger.info(`  ${written}`);

  if (provider === 'chameleon') {
    await reportChameleonInstall(cwd);
  }

  logger.newline();
}
