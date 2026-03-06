/**
 * NEXUS CLI - Skills Generator Unit Tests
 */

import { describe, it, expect } from 'vitest';

import { generateSkills, getCoreSkillSlugs } from '../../src/generators/skills.js';
import type { NexusConfig } from '../../src/types/config.js';
import { DEFAULT_PERSONA } from '../../src/types/config.js';

const baseConfig: NexusConfig = {
  projectName: 'test-app',
  displayName: 'Test App',
  projectType: 'web',
  dataStrategy: 'cloud-first',
  appPatterns: [],
  frontendFramework: 'nextjs',
  backendStrategy: 'integrated',
  backendFramework: 'none',
  testFramework: 'vitest',
  packageManager: 'npm',
  git: true,
  installDeps: false,
  persona: DEFAULT_PERSONA,
  enableSkills: true,
};

/* ──────────────────────────────────────────────────────────────
 * generateSkills — output shape
 * ────────────────────────────────────────────────────────────── */

describe('generateSkills', () => {
  it('returns an empty array when enableSkills is false', () => {
    const files = generateSkills({ ...baseConfig, enableSkills: false });
    expect(files).toHaveLength(0);
  });

  it('generates files when enableSkills is true', () => {
    const files = generateSkills(baseConfig);
    expect(files.length).toBeGreaterThan(0);
  });

  it('generates files when enableSkills is undefined (default on)', () => {
    const config = { ...baseConfig };
    delete (config as Partial<NexusConfig>).enableSkills;
    const files = generateSkills(config);
    expect(files.length).toBeGreaterThan(0);
  });

  it('always generates .nexus/skills/README.md', () => {
    const files = generateSkills(baseConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/README.md');
  });

  it('always generates .nexus/skills/custom/README.md', () => {
    const files = generateSkills(baseConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/custom/README.md');
  });

  it('all generated file paths start with .nexus/skills/', () => {
    const files = generateSkills(baseConfig);
    for (const file of files) {
      expect(file.path).toMatch(/^\.nexus\/skills\//);
    }
  });
});

/* ──────────────────────────────────────────────────────────────
 * Framework-specific core skill generation
 * ────────────────────────────────────────────────────────────── */

describe('generateSkills — Next.js framework', () => {
  it('generates core skills for nextjs', () => {
    const files = generateSkills(baseConfig);
    const corePaths = files.filter((f) => f.path.startsWith('.nexus/skills/core/'));
    expect(corePaths.length).toBeGreaterThan(0);
  });

  it('generates component-creation skill for nextjs', () => {
    const files = generateSkills(baseConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/core/component-creation.md');
  });

  it('generates routing skill for nextjs', () => {
    const files = generateSkills(baseConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/core/routing.md');
  });

  it('generates api-routes skill for nextjs', () => {
    const files = generateSkills(baseConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/core/api-routes.md');
  });

  it('generates testing skill for nextjs', () => {
    const files = generateSkills(baseConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/core/testing.md');
  });

  it('generates shared skills regardless of framework', () => {
    const files = generateSkills(baseConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/core/git-workflow.md');
    expect(paths).toContain('.nexus/skills/core/knowledge-logging.md');
  });
});

describe('generateSkills — react-vite framework', () => {
  const config = { ...baseConfig, frontendFramework: 'react-vite' as const };

  it('generates core skills for react-vite', () => {
    const files = generateSkills(config);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/core/component-creation.md');
    expect(paths).toContain('.nexus/skills/core/routing.md');
    expect(paths).toContain('.nexus/skills/core/testing.md');
  });

  it('includes shared skills for react-vite', () => {
    const files = generateSkills(config);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/core/git-workflow.md');
  });
});

describe('generateSkills — sveltekit framework', () => {
  const config = { ...baseConfig, frontendFramework: 'sveltekit' as const };

  it('generates component-creation skill for sveltekit', () => {
    const files = generateSkills(config);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/core/component-creation.md');
  });

  it('generates routing skill for sveltekit', () => {
    const files = generateSkills(config);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/core/routing.md');
  });
});

describe('generateSkills — nuxt framework', () => {
  const config = { ...baseConfig, frontendFramework: 'nuxt' as const };

  it('generates skills for nuxt', () => {
    const files = generateSkills(config);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/core/component-creation.md');
    expect(paths).toContain('.nexus/skills/core/routing.md');
  });
});

describe('generateSkills — astro framework', () => {
  const config = { ...baseConfig, frontendFramework: 'astro' as const };

  it('generates skills for astro', () => {
    const files = generateSkills(config);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/core/component-creation.md');
    expect(paths).toContain('.nexus/skills/core/routing.md');
  });
});

describe('generateSkills — remix framework', () => {
  const config = { ...baseConfig, frontendFramework: 'remix' as const };

  it('generates skills for remix', () => {
    const files = generateSkills(config);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.nexus/skills/core/routing.md');
    expect(paths).toContain('.nexus/skills/core/component-creation.md');
  });
});

/* ──────────────────────────────────────────────────────────────
 * Skill file content validation
 * ────────────────────────────────────────────────────────────── */

describe('generateSkills — skill file content', () => {
  it('core skill files have valid YAML frontmatter', () => {
    const files = generateSkills(baseConfig);
    const coreSkills = files.filter(
      (f) => f.path.startsWith('.nexus/skills/core/') && f.path.endsWith('.md'),
    );

    for (const file of coreSkills) {
      expect(file.content).toMatch(/^---\n/);
      expect(file.content).toMatch(/\n---\n/);
    }
  });

  it('core skill files contain required frontmatter fields', () => {
    const files = generateSkills(baseConfig);
    const coreSkills = files.filter(
      (f) => f.path.startsWith('.nexus/skills/core/') && f.path.endsWith('.md'),
    );

    for (const file of coreSkills) {
      expect(file.content).toMatch(/^skill:/m);
      expect(file.content).toMatch(/^version:/m);
      expect(file.content).toMatch(/^framework:/m);
      expect(file.content).toMatch(/^category:/m);
      expect(file.content).toMatch(/^triggers:/m);
      expect(file.content).toMatch(/^author:/m);
      expect(file.content).toMatch(/^status:/m);
    }
  });

  it('core skill files contain required markdown sections', () => {
    const files = generateSkills(baseConfig);
    const componentSkill = files.find(
      (f) => f.path === '.nexus/skills/core/component-creation.md',
    );
    expect(componentSkill).toBeDefined();
    expect(componentSkill!.content).toContain('## When to Read This');
    expect(componentSkill!.content).toContain('## Steps');
    expect(componentSkill!.content).toContain('## Patterns We Use');
    expect(componentSkill!.content).toContain('## Anti-Patterns — Never Do This');
    expect(componentSkill!.content).toContain('## Example');
  });

  it('all core skills have status: active', () => {
    const files = generateSkills(baseConfig);
    const coreSkills = files.filter(
      (f) => f.path.startsWith('.nexus/skills/core/') && f.path.endsWith('.md'),
    );

    for (const file of coreSkills) {
      expect(file.content).toMatch(/^status: active$/m);
    }
  });

  it('custom README is never empty', () => {
    const files = generateSkills(baseConfig);
    const customReadme = files.find((f) => f.path === '.nexus/skills/custom/README.md');
    expect(customReadme).toBeDefined();
    expect(customReadme!.content.trim().length).toBeGreaterThan(0);
  });

  it('custom README instructs users and mentions nexus skill new', () => {
    const files = generateSkills(baseConfig);
    const customReadme = files.find((f) => f.path === '.nexus/skills/custom/README.md');
    expect(customReadme!.content).toContain('nexus skill new');
  });
});

/* ──────────────────────────────────────────────────────────────
 * Skills README index
 * ────────────────────────────────────────────────────────────── */

describe('generateSkills — README index', () => {
  it('README mentions core skill slugs', () => {
    const files = generateSkills(baseConfig);
    const readme = files.find((f) => f.path === '.nexus/skills/README.md');
    expect(readme).toBeDefined();
    expect(readme!.content).toContain('component-creation');
    expect(readme!.content).toContain('routing');
    expect(readme!.content).toContain('git-workflow');
  });

  it('README mentions framework name', () => {
    const files = generateSkills(baseConfig);
    const readme = files.find((f) => f.path === '.nexus/skills/README.md');
    expect(readme!.content).toContain('Next.js');
  });

  it('README mentions the precedence rule', () => {
    const files = generateSkills(baseConfig);
    const readme = files.find((f) => f.path === '.nexus/skills/README.md');
    expect(readme!.content).toContain('custom');
    expect(readme!.content).toContain('core');
    expect(readme!.content).toContain('community');
  });

  it('README varies by framework', () => {
    const nextFiles = generateSkills(baseConfig);
    const remixFiles = generateSkills({ ...baseConfig, frontendFramework: 'remix' });
    const nextReadme = nextFiles.find((f) => f.path === '.nexus/skills/README.md');
    const remixReadme = remixFiles.find((f) => f.path === '.nexus/skills/README.md');
    expect(nextReadme!.content).not.toEqual(remixReadme!.content);
  });
});

/* ──────────────────────────────────────────────────────────────
 * getCoreSkillSlugs helper
 * ────────────────────────────────────────────────────────────── */

describe('getCoreSkillSlugs', () => {
  it('returns skill slugs for nextjs', () => {
    const slugs = getCoreSkillSlugs('nextjs');
    expect(slugs).toContain('component-creation');
    expect(slugs).toContain('routing');
    expect(slugs).toContain('api-routes');
    expect(slugs).toContain('testing');
    expect(slugs).toContain('git-workflow');
    expect(slugs).toContain('knowledge-logging');
  });

  it('returns skill slugs for remix', () => {
    const slugs = getCoreSkillSlugs('remix');
    expect(slugs).toContain('routing');
    expect(slugs).toContain('component-creation');
    expect(slugs).toContain('git-workflow');
  });

  it('includes shared skills for every framework', () => {
    const frameworks = ['nextjs', 'react-vite', 'sveltekit', 'nuxt', 'astro', 'remix'] as const;
    for (const fw of frameworks) {
      const slugs = getCoreSkillSlugs(fw);
      expect(slugs).toContain('git-workflow');
      expect(slugs).toContain('knowledge-logging');
    }
  });

  it('slug count matches generated file count for each framework', () => {
    const frameworks = ['nextjs', 'react-vite', 'sveltekit', 'nuxt', 'astro', 'remix'] as const;
    for (const fw of frameworks) {
      const config = { ...baseConfig, frontendFramework: fw };
      const files = generateSkills(config).filter(
        (f) => f.path.startsWith('.nexus/skills/core/') && f.path.endsWith('.md'),
      );
      const slugs = getCoreSkillSlugs(fw);
      expect(files.length).toBe(slugs.length);
    }
  });
});
