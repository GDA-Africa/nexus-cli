/**
 * Skill format types — SKILL_SPEC v2.0.0.
 *
 * v2 adds the invocation axis (`invocation: model | user`), the `procedure`
 * category, and the optional `gate` block. Everything is additive: a v1 skill
 * is a v2 skill with `invocation: model` implied.
 */

export const SKILL_CATEGORIES = [
  'ui',
  'routing',
  'data',
  'testing',
  'api',
  'config',
  'workflow',
  'procedure',
  'integration',
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SKILL_INVOCATIONS = ['model', 'user'] as const;
export type SkillInvocation = (typeof SKILL_INVOCATIONS)[number];

export const SKILL_STATUSES = ['active', 'draft', 'deprecated'] as const;
export type SkillStatus = (typeof SKILL_STATUSES)[number];

export const SKILL_FRAMEWORKS = [
  'next.js',
  'react-vite',
  'sveltekit',
  'nuxt',
  'astro',
  'remix',
  'go',
  'python',
  'rust',
  'shared',
] as const;

export type SkillFramework = (typeof SKILL_FRAMEWORKS)[number];

/**
 * Declares a skill as a precondition for a class of work.
 *
 * Only `invocation: model` skills may carry one — a gate is injected by the
 * brain, and by the composition invariant nothing but the human may invoke a
 * `user` skill.
 */
export interface SkillGate {
  /** Plan types this skill gates, e.g. ['feature', 'refactor', 'spike']. */
  planTypes: string[];
  /** The plan section whose presence satisfies the gate, e.g. '## Grilling'. */
  record: string;
}

export interface SkillFrontmatter {
  slug: string;
  version: string | null;
  framework: string | null;
  category: string | null;
  /** Defaults to 'model' when the field is absent — this is what keeps v1 skills valid. */
  invocation: SkillInvocation;
  triggers: string[];
  author: string | null;
  status: SkillStatus;
  updated: string | null;
  related: string[];
  requires: string[];
  gate: SkillGate | null;
  /** Human-facing one-liner. NEXUS skills rarely carry one; kept for interop. */
  description: string | null;
  /** The H1 title, or an explicit `title:`/`name:` field when present. */
  title: string | null;
}

export interface SkillValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warn';
}
