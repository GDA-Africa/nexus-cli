import { describe, it, expect } from 'vitest';

import { DEFAULT_PERSONA } from '../../src/types/config.js';
import { normalizeManifestConfig } from '../../src/utils/manifest.js';

describe('manifest.ts — normalizeManifestConfig', () => {
  it('fills every field with valid defaults from an empty config', () => {
    const config = normalizeManifestConfig({}, 'my-cool-api');

    expect(config.projectName).toBe('my-cool-api');
    expect(config.displayName).toBe('My Cool Api');
    expect(config.projectType).toBe('web');
    expect(config.dataStrategy).toBe('local-only');
    expect(config.appPatterns).toEqual([]);
    expect(config.frontendFramework).toBe('none');
    expect(config.backendStrategy).toBe('integrated');
    expect(config.backendFramework).toBe('none');
    expect(config.testFramework).toBe('none');
    expect(config.packageManager).toBe('npm');
    expect(config.git).toBe(true);
    expect(config.installDeps).toBe(false);
    expect(config.persona).toEqual(DEFAULT_PERSONA);
  });

  it('handles a null/undefined config (corrupt manifest)', () => {
    expect(normalizeManifestConfig(null).projectName).toBe('project');
    expect(normalizeManifestConfig(undefined).frontendFramework).toBe('none');
  });

  it('never produces the string "undefined" in any field (2026-06-11 bug)', () => {
    const config = normalizeManifestConfig({ projectName: 'legacy-app' });
    const rendered = `(${config.frontendFramework}, ${config.dataStrategy}) — ${config.displayName}`;
    expect(rendered).not.toContain('undefined');
  });

  it('preserves all explicitly set fields', () => {
    const config = normalizeManifestConfig({
      projectName: 'shop',
      displayName: 'Shop!',
      projectType: 'monorepo',
      dataStrategy: 'cloud-first',
      frontendFramework: 'sveltekit',
      packageManager: 'pnpm',
      git: false,
      localOnly: true,
      enableAgents: false,
    });

    expect(config.displayName).toBe('Shop!');
    expect(config.projectType).toBe('monorepo');
    expect(config.dataStrategy).toBe('cloud-first');
    expect(config.frontendFramework).toBe('sveltekit');
    expect(config.packageManager).toBe('pnpm');
    expect(config.git).toBe(false);
    expect(config.localOnly).toBe(true);
    expect(config.enableAgents).toBe(false);
  });

  it('merges a partial persona over the default persona', () => {
    const config = normalizeManifestConfig({ persona: { tone: 'pirate' } });
    expect(config.persona.tone).toBe('pirate');
    expect(config.persona.verbosity).toBe(DEFAULT_PERSONA.verbosity);
    expect(config.persona.identity).toBe(DEFAULT_PERSONA.identity);
  });

  it('omits optional flags that were not present rather than inventing them', () => {
    const config = normalizeManifestConfig({});
    expect('localOnly' in config).toBe(false);
    expect('enableSkills' in config).toBe(false);
    expect('enableAgents' in config).toBe(false);
  });
});
