import { describe, expect, it } from 'vitest';

import { generateAiConfig } from '../../src/generators/ai-config.js';
import type { NexusConfig } from '../../src/types/config.js';
import { parseHarnessesConfig, type HarnessesConfig } from '../../src/utils/harnesses/index.js';

const config = {
  displayName: 'Demo',
  projectType: 'fullstack',
  frontendFramework: 'nextjs',
  dataStrategy: 'postgres',
  backendFramework: 'none',
  backendStrategy: 'api-routes',
  testFramework: 'vitest',
  packageManager: 'npm',
  appPatterns: ['auth'],
  persona: { name: 'Nexus', tone: 'friendly', verbosity: 'balanced', identity: 'AI dev partner' },
} as unknown as NexusConfig;

function bytes(content: string): number {
  return Buffer.byteLength(content, 'utf-8');
}

describe('generateAiConfig — absent-file behaviour is byte-identical', () => {
  it('produces identical output whether harnesses is omitted, undefined, or explicit null', () => {
    const omitted = generateAiConfig(config);
    const explicitUndefined = generateAiConfig(config, undefined, undefined);
    const explicitNull = generateAiConfig(config, null, null);

    expect(explicitUndefined).toEqual(omitted);
    expect(explicitNull).toEqual(omitted);
  });

  it('a harnesses.yml that declares no profile for a given file leaves that file untouched', () => {
    // Declares only `claude-code` — none of the other five tool files have a
    // matching harness, so they must fall back to the unbounded standard
    // content exactly as if harnesses.yml did not exist at all.
    const harnesses = parseHarnessesConfig(`
default: claude-code
harnesses:
  claude-code: { window: 200000, orientation_budget: 16000, tool_calling: native }
`);

    const withoutFile = generateAiConfig(config);
    const withPartialConfig = generateAiConfig(config, harnesses, null);

    for (const path of ['.cursorrules', '.windsurfrules', '.clinerules', '.github/copilot-instructions.md']) {
      const before = withoutFile.find((f) => f.path === path)!.content;
      const after = withPartialConfig.find((f) => f.path === path)!.content;
      expect(after, `${path} should be untouched by an unrelated harness declaration`).toBe(before);
    }
  });
});

describe('generateAiConfig — each variant lands within its declared budget', () => {
  it('a generous native budget keeps the standard variant, under budget', () => {
    const harnesses = parseHarnessesConfig(`
default: claude-code
harnesses:
  claude-code: { window: 200000, orientation_budget: 16000, tool_calling: native }
`);
    const files = generateAiConfig(config, harnesses, null);
    const claudeMd = files.find((f) => f.path === 'CLAUDE.md')!;
    expect(bytes(claudeMd.content)).toBeLessThanOrEqual(16000);
    expect(claudeMd.content).toContain('<!--nexus-reads:.nexus/docs/index.md,.nexus/docs/knowledge-summary.md-->');
  });

  it('a small native budget produces the native-pointer variant, under budget', () => {
    const harnesses = parseHarnessesConfig(`
default: windsurf
harnesses:
  windsurf: { window: 4096, orientation_budget: 700, tool_calling: native }
`);
    const files = generateAiConfig(config, harnesses, null);
    const windsurfRules = files.find((f) => f.path === '.windsurfrules')!;
    expect(bytes(windsurfRules.content)).toBeLessThanOrEqual(700);
  });

  it('matches the spec\'s own example: tool_calling native + small budget ≈ 600 bytes', () => {
    const harnesses = parseHarnessesConfig(`
default: cursor
harnesses:
  cursor: { window: 4096, orientation_budget: 900, tool_calling: native }
`);
    const files = generateAiConfig(config, harnesses, null);
    const cursorRules = files.find((f) => f.path === '.cursorrules')!;
    const size = bytes(cursorRules.content);
    expect(size).toBeGreaterThan(300);
    expect(size).toBeLessThan(900);
  });

  it('tool_calling unreliable produces the static fallback, under budget, with no knowledge summary', () => {
    const harnesses = parseHarnessesConfig(`
default: cline
harnesses:
  cline: { window: 4096, orientation_budget: 1500, tool_calling: unreliable }
`);
    const files = generateAiConfig(config, harnesses, null);
    const clineRules = files.find((f) => f.path === '.clinerules')!;
    expect(bytes(clineRules.content)).toBeLessThanOrEqual(1500);
  });

  it('tool_calling none produces the static fallback, under budget, with a knowledge summary inlined', () => {
    const harnesses = parseHarnessesConfig(`
default: copilot
harnesses:
  copilot: { window: 4096, orientation_budget: 1500, tool_calling: none }
`);
    const summary = '### [pattern] Use zod for validation\n**2026-08-01** — zod is already a dep.\n';
    const files = generateAiConfig(config, harnesses, summary);
    const copilotFile = files.find((f) => f.path === '.github/copilot-instructions.md')!;
    expect(bytes(copilotFile.content)).toBeLessThanOrEqual(1500);
    expect(copilotFile.content).toContain('Use zod for validation');
  });

  it('omits the knowledge summary entirely (all-or-nothing) when it would blow the budget', () => {
    const harnesses = parseHarnessesConfig(`
default: copilot
harnesses:
  copilot: { window: 4096, orientation_budget: 1500, tool_calling: none }
`);
    const hugeSummary = 'x'.repeat(5000);
    const files = generateAiConfig(config, harnesses, hugeSummary);
    const copilotFile = files.find((f) => f.path === '.github/copilot-instructions.md')!;
    expect(bytes(copilotFile.content)).toBeLessThanOrEqual(1500);
    expect(copilotFile.content).not.toContain('xxxxx');
  });

  it('the ollama-local example from the spec fits comfortably within its 1500-byte budget', () => {
    const harnesses: HarnessesConfig = {
      default: 'claude-code',
      harnesses: {
        'claude-code': { window: 200000, orientation_budget: 16000, tool_calling: 'native' },
        'ollama-local': { window: 4096, orientation_budget: 1500, tool_calling: 'unreliable', file: 'CLAUDE.md' },
      },
    };
    const files = generateAiConfig(config, harnesses, null);
    const claudeMd = files.find((f) => f.path === 'CLAUDE.md')!;
    expect(bytes(claudeMd.content)).toBeLessThanOrEqual(1500);
  });
});

describe('generateAiConfig — small variants are structurally different, not truncated', () => {
  it('the native-pointer variant is not a prefix of the standard variant', () => {
    const standard = generateAiConfig(config).find((f) => f.path === '.windsurfrules')!.content;

    const harnesses = parseHarnessesConfig(`
default: windsurf
harnesses:
  windsurf: { window: 4096, orientation_budget: 700, tool_calling: native }
`);
    const pointer = generateAiConfig(config, harnesses, null).find((f) => f.path === '.windsurfrules')!.content;

    expect(standard.startsWith(pointer.slice(0, 40))).toBe(false);
    expect(pointer).toContain('nexus_get_context');
    expect(pointer).toContain('Do NOT read .nexus/docs/index.md');
    expect(pointer).not.toContain('Onboarding Protocol');
    expect(pointer).not.toContain('Session Handshake');
  });

  it('the static-fallback variant is not a prefix of the standard variant either', () => {
    const standard = generateAiConfig(config).find((f) => f.path === '.clinerules')!.content;

    const harnesses = parseHarnessesConfig(`
default: cline
harnesses:
  cline: { window: 4096, orientation_budget: 1500, tool_calling: unreliable }
`);
    const fallback = generateAiConfig(config, harnesses, null).find((f) => f.path === '.clinerules')!.content;

    expect(standard.startsWith(fallback.slice(0, 40))).toBe(false);
    expect(fallback).not.toContain('nexus_get_context');
    expect(fallback).not.toContain('.nexus/docs/index.md');
    expect(fallback).not.toContain('.nexus/docs/knowledge.md');
  });

  it('the native-pointer variant does not pad itself with sections beyond the pointer and invariants', () => {
    const harnesses = parseHarnessesConfig(`
default: windsurf
harnesses:
  windsurf: { window: 4096, orientation_budget: 900, tool_calling: native }
`);
    const pointer = generateAiConfig(config, harnesses, null).find((f) => f.path === '.windsurfrules')!.content;

    for (const forbidden of ['## Project Identity', '## Code Rules', '## 🧠 Skills', '## Workflow', 'Agent Persona']) {
      expect(pointer, `native-pointer variant should not contain "${forbidden}"`).not.toContain(forbidden);
    }
  });
});

describe('generateAiConfig — reads marker matches what each variant actually instructs', () => {
  it('standard variant carries the full-reads marker', () => {
    const files = generateAiConfig(config);
    expect(files.find((f) => f.path === 'CLAUDE.md')!.content).toContain(
      '<!--nexus-reads:.nexus/docs/index.md,.nexus/docs/knowledge-summary.md-->',
    );
  });

  it('native-pointer and static-fallback variants carry the none-reads marker', () => {
    const harnesses = parseHarnessesConfig(`
default: cursor
harnesses:
  cursor: { window: 4096, orientation_budget: 700, tool_calling: native }
`);
    const pointer = generateAiConfig(config, harnesses, null).find((f) => f.path === '.cursorrules')!.content;
    expect(pointer).toContain('<!--nexus-reads:none-->');

    const staticHarnesses = parseHarnessesConfig(`
default: cursor
harnesses:
  cursor: { window: 4096, orientation_budget: 1500, tool_calling: none }
`);
    const fallback = generateAiConfig(config, staticHarnesses, null).find((f) => f.path === '.cursorrules')!.content;
    expect(fallback).toContain('<!--nexus-reads:none-->');
  });
});
