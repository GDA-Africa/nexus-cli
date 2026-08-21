/**
 * The alignment gate — SKILL_SPEC v2 `gate`, NEXUS v1.3.
 *
 * A gate makes a skill a **precondition** for a class of work rather than
 * something offered when a trigger happens to match.
 *
 * The load-bearing decision: the gate keys off **structural facts** — the
 * plan's type and whether its record section is filled — never off the wording
 * of the task. D11 v1 already shipped a keyword sniff over agent-written prose
 * and it was gameable by exactly the agent it targeted. A prose classifier for
 * "is this task complex?" repeats that defect one layer up: the agent that
 * would skip alignment is the agent that phrases the task to dodge the gate.
 *
 * `bug` is deliberately not gated by type. A major fix and a one-line typo are
 * both `bug` plans, and only the human creating the plan knows which — so
 * `nexus plan new --type=bug --major` opts in, writing `major: true` to the
 * plan's frontmatter.
 */

import type { PlanDocument, PlanFrontmatter } from '../plans/types.js';

import type { SkillGate, SkillInvocation } from './types.js';

/** Types gated by default when no installed skill declares its own gate. */
export const DEFAULT_GATED_PLAN_TYPES = ['feature', 'refactor', 'spike'] as const;

/** The default record section, and the heading the plan templates seed. */
export const DEFAULT_GATE_RECORD = '## Grilling';

/**
 * Marker written into a freshly scaffolded record section. Its presence means
 * the section exists but the procedure has not been run — the gate must not
 * treat an empty template as satisfied, or it would be trivially defeated by
 * the scaffolding itself.
 */
export const GRILLING_PENDING_MARKER = 'nexus:grilling-pending';

export interface GateStatus {
  required: boolean;
  reason: string;
  skill: string | null;
  satisfiedBy: string | null;
}

export interface GateDeclaration {
  skill: string;
  gate: SkillGate;
}

/** The slice of a skill the gate cares about. */
export interface GateCandidate {
  name: string;
  gate: SkillGate | null;
  invocation: SkillInvocation;
  status: string;
}

/**
 * Collect gate declarations from installed skills.
 *
 * Only `model` skills may gate: a gate is injected by the brain, and the
 * SKILL_SPEC v2 §6 invariant says nothing but the human may invoke a `user`
 * skill. A deprecated skill never gates.
 */
export function collectGates(skills: readonly GateCandidate[]): GateDeclaration[] {
  return skills
    .filter((entry): entry is GateCandidate & { gate: SkillGate } => entry.gate !== null)
    .filter((entry) => entry.invocation === 'model')
    .filter((entry) => entry.status !== 'deprecated')
    .map((entry) => ({ skill: entry.name, gate: entry.gate }));
}

/**
 * Derive a plan's type. Prefers the explicit `type` field; falls back to the
 * `source: "manual:feature"` / `"template:feature"` convention and then to the
 * first tag, so plans created before v1.3 still classify.
 */
export function planTypeOf(frontmatter: PlanFrontmatter): string | null {
  const explicit = typeof frontmatter.type === 'string' ? frontmatter.type.trim() : '';
  if (explicit) return explicit;

  const source = typeof frontmatter.source === 'string' ? frontmatter.source : '';
  const fromSource = source.match(/^(?:manual|template):(.+)$/)?.[1]?.trim();
  if (fromSource) return fromSource;

  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
  const firstTag = typeof tags[0] === 'string' ? tags[0].trim() : '';
  if (firstTag) return firstTag.replace(/-fix$/, '');

  return null;
}

export function isMajor(frontmatter: PlanFrontmatter): boolean {
  return frontmatter.major === true;
}

/**
 * Does this plan fall under the gate?
 *
 * A `bug` plan is gated only when it is explicitly marked major — see the
 * module note.
 */
export function planIsGated(frontmatter: PlanFrontmatter, gate: SkillGate): boolean {
  const type = planTypeOf(frontmatter);
  if (!type) return false;
  if (gate.planTypes.includes(type)) return true;
  return type === 'bug' && isMajor(frontmatter);
}

/**
 * Is the gate's record actually filled in?
 *
 * A section that exists but still carries the pending marker, or holds nothing
 * but blank lines and bullet stubs, does not satisfy the gate.
 */
export function recordIsSatisfied(plan: PlanDocument, gate: SkillGate): boolean {
  const heading = gate.record.replace(/^#+\s*/, '').trim().toLowerCase();
  const section = plan.sections.find((s) => s.heading.trim().toLowerCase() === heading);
  if (!section) return false;

  const content = section.content;
  if (content.includes(GRILLING_PENDING_MARKER)) return false;

  const substantive = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('<!--'))
    .filter((line) => !/^[-*]\s*$/.test(line))
    .filter((line) => !/^[-*]\s*\(none.*\)$/i.test(line));

  return substantive.length > 0;
}

/**
 * Evaluate the gate for a plan.
 *
 * Returns a status that is bounded by construction — four short fields — so
 * callers can charge it against a context budget without it ever being the
 * thing that gets dropped.
 */
export function evaluateGate(
  plan: PlanDocument | null,
  declarations: readonly GateDeclaration[],
  options: { taskLooksLikeBuild?: boolean } = {},
): GateStatus {
  const notRequired = (reason: string): GateStatus => ({
    required: false,
    reason,
    skill: null,
    satisfiedBy: null,
  });

  if (declarations.length === 0) {
    return notRequired('no installed skill declares a gate');
  }

  // No plan at all. The gate still fires, on a deliberately weak signal —
  // acceptable only because the remedy is harmless: "open a plan first" is the
  // standing rule for multi-step work anyway, so a false positive costs one
  // plan that should have existed. It never blocks or discards work.
  if (!plan) {
    if (!options.taskLooksLikeBuild) {
      return notRequired('no active plan, and the task does not look like build work');
    }
    const first = declarations[0];
    return {
      required: true,
      reason: 'no active plan for work that looks like a feature — open a plan, then align before building',
      skill: first?.skill ?? null,
      satisfiedBy: null,
    };
  }

  for (const declaration of declarations) {
    if (!planIsGated(plan.frontmatter, declaration.gate)) continue;

    const type = planTypeOf(plan.frontmatter) ?? 'unknown';
    const major = isMajor(plan.frontmatter) ? ', major' : '';

    if (recordIsSatisfied(plan, declaration.gate)) {
      return {
        required: false,
        reason: `plan "${plan.frontmatter.id}" (${type}${major}) has a ${declaration.gate.record} record`,
        skill: declaration.skill,
        satisfiedBy: `${plan.frontmatter.id}.md ${declaration.gate.record}`,
      };
    }

    return {
      required: true,
      reason: `plan "${plan.frontmatter.id}" is type=${type}${major} with no ${declaration.gate.record} record`,
      skill: declaration.skill,
      satisfiedBy: null,
    };
  }

  const type = planTypeOf(plan.frontmatter) ?? 'unknown';
  return notRequired(`plan "${plan.frontmatter.id}" is type=${type} — not a gated type`);
}

/**
 * The weak prose signal used only in the no-plan case above. Kept blunt and
 * obvious so nobody mistakes it for the gate's actual decision procedure.
 */
const BUILD_SIGNALS = [
  'add ', 'build ', 'implement', 'create ', 'new feature', 'refactor',
  'redesign', 'rewrite', 'migrate', 'introduce',
];

export function taskLooksLikeBuild(task: string): boolean {
  const normalized = task.toLowerCase();
  return BUILD_SIGNALS.some((signal) => normalized.includes(signal));
}
