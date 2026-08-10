import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_UI_PROVIDER,
  describeUiPreference,
  globalConfigPath,
  isUiProvider,
  projectConfigPath,
  resolveUiPreference,
  setUiPreference,
} from '../../src/utils/ui-preference.js';

describe('UI preference', () => {
  let tmpDir: string;
  let projectRoot: string;
  let originalConfigHome: string | undefined;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `nexus-ui-pref-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    projectRoot = path.join(tmpDir, 'project');
    await fs.mkdir(path.join(projectRoot, '.nexus'), { recursive: true });

    // Point the global config at the sandbox so tests never touch ~/.config.
    originalConfigHome = process.env.NEXUS_CONFIG_HOME;
    process.env.NEXUS_CONFIG_HOME = path.join(tmpDir, 'global');
  });

  afterEach(async () => {
    if (originalConfigHome === undefined) {
      delete process.env.NEXUS_CONFIG_HOME;
    } else {
      process.env.NEXUS_CONFIG_HOME = originalConfigHome;
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('resolution order', () => {
    it('defaults to none when nothing is configured', async () => {
      const pref = await resolveUiPreference({ projectRoot });

      expect(pref).toEqual({ provider: 'none', source: 'default' });
      expect(DEFAULT_UI_PROVIDER).toBe('none');
    });

    it('reads the global config when no project config exists', async () => {
      await setUiPreference('chameleon', { global: true });

      const pref = await resolveUiPreference({ projectRoot });

      expect(pref.provider).toBe('chameleon');
      expect(pref.source).toBe('global');
      expect(pref.path).toBe(globalConfigPath());
    });

    it('prefers the project config over the global one', async () => {
      await setUiPreference('chameleon', { global: true });
      await setUiPreference('none', { projectRoot });

      const pref = await resolveUiPreference({ projectRoot });

      expect(pref.provider).toBe('none');
      expect(pref.source).toBe('project');
      expect(pref.path).toBe(projectConfigPath(projectRoot));
    });

    it('lets --ui override every stored preference', async () => {
      await setUiPreference('chameleon', { global: true });
      await setUiPreference('chameleon', { projectRoot });

      const pref = await resolveUiPreference({ flag: 'none', projectRoot });

      expect(pref).toEqual({ provider: 'none', source: 'flag' });
    });

    it('ignores an unrecognised --ui value instead of failing', async () => {
      await setUiPreference('chameleon', { global: true });

      const pref = await resolveUiPreference({ flag: 'tailwind', projectRoot });

      expect(pref.provider).toBe('chameleon');
      expect(pref.source).toBe('global');
    });
  });

  describe('robustness', () => {
    it('falls through a corrupted project config to the global one', async () => {
      await setUiPreference('chameleon', { global: true });
      await fs.writeFile(projectConfigPath(projectRoot), '{ not json', 'utf8');

      const pref = await resolveUiPreference({ projectRoot });

      expect(pref.provider).toBe('chameleon');
      expect(pref.source).toBe('global');
    });

    it('ignores an unknown ui value in a config file', async () => {
      await fs.writeFile(projectConfigPath(projectRoot), JSON.stringify({ ui: 'bootstrap' }), 'utf8');

      const pref = await resolveUiPreference({ projectRoot });

      expect(pref.source).toBe('default');
    });
  });

  describe('writing', () => {
    it('preserves other keys in the config file', async () => {
      const configPath = projectConfigPath(projectRoot);
      await fs.writeFile(configPath, JSON.stringify({ telemetry: false, ui: 'none' }), 'utf8');

      await setUiPreference('chameleon', { projectRoot });

      const written = JSON.parse(await fs.readFile(configPath, 'utf8')) as Record<string, unknown>;
      expect(written).toEqual({ telemetry: false, ui: 'chameleon' });
    });

    it('creates the global config directory when it does not exist', async () => {
      const written = await setUiPreference('chameleon', { global: true });

      expect(written).toBe(globalConfigPath());
      await expect(fs.readFile(written, 'utf8')).resolves.toContain('"ui": "chameleon"');
    });
  });

  describe('helpers', () => {
    it('recognises only the two known providers', () => {
      expect(isUiProvider('chameleon')).toBe(true);
      expect(isUiProvider('none')).toBe(true);
      expect(isUiProvider('mui')).toBe(false);
      expect(isUiProvider(undefined)).toBe(false);
    });

    it('describes where the preference came from', () => {
      expect(describeUiPreference({ provider: 'chameleon', source: 'global' }))
        .toBe('Chameleon (from global config)');
      expect(describeUiPreference({ provider: 'none', source: 'default' }))
        .toBe('none (NEXUS generates the UI) (built-in default)');
    });
  });
});
