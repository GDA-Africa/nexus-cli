import { describe, expect, it } from 'vitest';

import { buildAppSpec, validateAppSpec } from '../../src/utils/chameleon/appspec.js';
import type { NexusConfig } from '../../src/types/config.js';

const baseConfig: Pick<NexusConfig, 'projectName' | 'displayName' | 'projectType'> = {
  projectName: 'bakery-crm',
  displayName: 'Bakery CRM',
  projectType: 'web',
};

describe('buildAppSpec', () => {
  it('produces a spec that passes validation', () => {
    const spec = buildAppSpec(baseConfig);

    expect(validateAppSpec(spec)).toEqual({ valid: true, errors: [] });
    expect(spec.version).toBe(2);
    expect(spec.app.name).toBe('bakery-crm');
  });

  it('kebab-cases the app name Chameleon enforces', () => {
    const spec = buildAppSpec({ ...baseConfig, projectName: 'Bakery CRM App' });

    expect(spec.app.name).toBe('bakery-crm-app');
    expect(validateAppSpec(spec).valid).toBe(true);
  });

  it('emits pages in the template-only form', () => {
    const spec = buildAppSpec(baseConfig, {
      pages: [{ route: '/team', title: 'Team Members', template: 'admin-dashboard' }],
    });

    expect(spec.pages).toHaveLength(1);
    expect(spec.pages[0]?.spec).toEqual({
      version: 1,
      name: 'team-members',
      template: 'admin-dashboard',
    });
    expect(spec.pages[0]?.spec.blocks).toBeUndefined();
  });

  it('derives a valid page name when the title cannot supply one', () => {
    const spec = buildAppSpec(baseConfig, {
      pages: [{ route: '/settings', title: '⚙️', template: 'settings' }],
    });

    expect(validateAppSpec(spec).valid).toBe(true);
    expect(spec.pages[0]?.spec.name).toBe('settings');
  });

  it('picks default pages from the project type', () => {
    const web = buildAppSpec(baseConfig);
    const library = buildAppSpec({ ...baseConfig, projectType: 'ui-library' });
    const other = buildAppSpec({ ...baseConfig, projectType: 'api' });

    expect(web.pages.map((p) => p.spec.template)).toEqual(['landing-page', 'auth']);
    expect(library.pages[0]?.spec.template).toBe('documentation');
    expect(other.pages[0]?.spec.template).toBe('admin-dashboard');
  });

  it('omits brand entirely when no colour was chosen', () => {
    expect(buildAppSpec(baseConfig).app.brand).toBeUndefined();
    expect(buildAppSpec(baseConfig, { primaryColor: '#166534' }).app.brand)
      .toEqual({ primaryColor: '#166534' });
  });

  it('includes data slots only when there are some', () => {
    const withSlots = buildAppSpec(baseConfig, {
      dataSlots: [{ id: 'customers', shape: 'table', mock: true }],
    });

    expect(buildAppSpec(baseConfig).dataSlots).toBeUndefined();
    expect(withSlots.dataSlots).toHaveLength(1);
    expect(validateAppSpec(withSlots).valid).toBe(true);
  });
});

describe('validateAppSpec', () => {
  const errorPaths = (spec: unknown): string[] => validateAppSpec(spec).errors.map((e) => e.path);

  it('rejects a non-object', () => {
    expect(validateAppSpec(null)).toEqual({
      valid: false,
      errors: [{ path: '$', message: 'AppSpec must be an object.' }],
    });
  });

  it('requires version 2', () => {
    const spec = { ...buildAppSpec(baseConfig), version: 1 };

    expect(errorPaths(spec)).toContain('$.version');
  });

  it('requires a kebab-case app name', () => {
    const spec = buildAppSpec(baseConfig);
    spec.app.name = 'Bakery CRM';

    expect(errorPaths(spec)).toContain('$.app.name');
  });

  it('rejects an unknown theme and nav style', () => {
    const spec = buildAppSpec(baseConfig);
    Object.assign(spec.shell, { theme: 'brutalist', nav: 'floating' });

    expect(errorPaths(spec)).toEqual(expect.arrayContaining(['$.shell.theme', '$.shell.nav']));
  });

  it('requires at least one page', () => {
    const spec = { ...buildAppSpec(baseConfig), pages: [] };

    expect(errorPaths(spec)).toContain('$.pages');
  });

  it('flags duplicate routes and routes without a leading slash', () => {
    const spec = buildAppSpec(baseConfig, {
      pages: [
        { route: '/', title: 'Home', template: 'landing-page' },
        { route: '/', title: 'Home again', template: 'landing-page' },
        { route: 'dashboard', title: 'Dashboard', template: 'admin-dashboard' },
      ],
    });

    expect(errorPaths(spec)).toEqual(expect.arrayContaining(['$.pages[1].route', '$.pages[2].route']));
  });

  it('rejects an unknown template with Chameleon\'s error path', () => {
    const spec = buildAppSpec(baseConfig, {
      pages: [{ route: '/', title: 'Home', template: 'marketing-splash' }],
    });

    const errors = validateAppSpec(spec).errors;
    expect(errors[0]?.path).toBe('$.pages[0].spec.template');
    expect(errors[0]?.message).toContain('marketing-splash');
  });

  it('requires exactly one of template or blocks', () => {
    const spec = buildAppSpec(baseConfig, {
      pages: [{ route: '/', title: 'Home', template: 'landing-page' }],
    });
    spec.pages[0]!.spec.blocks = [{ component: 'stat-card' }];

    expect(errorPaths(spec)).toContain('$.pages[0].spec');
  });

  it('validates data slot ids and shapes', () => {
    const spec = buildAppSpec(baseConfig, {
      dataSlots: [
        { id: 'Customers', shape: 'table', mock: true },
        { id: 'orders', shape: 'graph' as never, mock: true },
      ],
    });

    expect(errorPaths(spec)).toEqual(
      expect.arrayContaining(['$.dataSlots[0].id', '$.dataSlots[1].shape']),
    );
  });

  it('requires primaryColor when brand is present', () => {
    const spec = buildAppSpec(baseConfig);
    (spec.app as { brand?: unknown }).brand = { fontFamily: 'Sora' };

    expect(errorPaths(spec)).toContain('$.app.brand.primaryColor');
  });
});
