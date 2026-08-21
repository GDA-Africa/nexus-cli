import fs from 'node:fs/promises';
import path from 'node:path';

import { parsePlanContent } from '../../plans/parser.js';
import { parseSkillFrontmatter } from '../../skills/frontmatter.js';
import {
  DEFAULT_GATED_PLAN_TYPES,
  DEFAULT_GATE_RECORD,
  collectGates,
  planIsGated,
  planTypeOf,
  recordIsSatisfied,
  type GateDeclaration,
} from '../../skills/gate.js';
import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

const SKILL_DIRS = ['custom', 'core', 'community'] as const;

/**
 * D13 — a gated plan with no alignment record.
 *
 * The v1.3 alignment gate makes `grilling` a precondition for feature,
 * refactor and spike plans (and for `bug` plans explicitly marked major). The
 * gate itself only *reports* — an MCP tool cannot compel an agent, and refusing
 * to start a plan would push the work outside the plan where nothing can see
 * it. D13 is what makes a skipped gate **visible after the fact**, which is the
 * same "visible, not impossible" posture as the wake handshake.
 *
 * Severity is `warn` by default and `error` under `--strict`, so brain-aware CI
 * can gate on it for teams that want that and stay advisory for teams that do
 * not.
 *
 * Only plans that have actually started are reported. A `draft` plan has not
 * committed to anything yet, and flagging it would train people to write
 * throwaway records just to clear the check.
 */
export const D13_gated_plan_unaligned: DoctorCheck = {
  id: 'D13',
  name: 'Alignment Gate',
  description: 'Checks whether gated plans carry the alignment record their gate requires',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const declarations = await resolveGates(ctx.cwd);
    if (declarations.length === 0) return [];

    const severity = ctx.strict ? 'error' : 'warn';
    const findings: DoctorFinding[] = [];
    const plansDir = path.join(ctx.cwd, '.nexus', 'plans');

    for (const summary of ctx.plans) {
      // Not yet committed, or already closed — nothing to enforce.
      if (summary.status !== 'in_progress' && summary.status !== 'blocked') continue;

      let plan;
      try {
        plan = parsePlanContent(await fs.readFile(path.join(plansDir, summary.fileName), 'utf8'));
      } catch {
        continue; // malformed plans are D01's problem, not ours
      }

      for (const declaration of declarations) {
        if (!planIsGated(plan.frontmatter, declaration.gate)) continue;
        if (recordIsSatisfied(plan, declaration.gate)) break;

        const type = planTypeOf(plan.frontmatter) ?? 'unknown';
        const major = plan.frontmatter.major === true ? ', major' : '';

        findings.push({
          id: 'D13',
          severity,
          description:
            `Plan "${summary.id}" (${type}${major}, ${summary.status}) has no ` +
            `${declaration.gate.record} record — implementation started without recorded alignment.`,
          fixHint:
            `Run the \`${declaration.skill}\` skill, then fill ${declaration.gate.record} in ` +
            `.nexus/plans/${summary.fileName} with the resolved branches and what is out of scope.`,
        });
        break;
      }
    }

    return findings;
  },
};

/**
 * Read gate declarations from the project's installed skills.
 *
 * Falls back to the built-in defaults when the skills directory is missing or
 * carries no gate — otherwise a project that has not yet upgraded its registry
 * would silently lose the check rather than being told it is unaligned.
 */
async function resolveGates(cwd: string): Promise<GateDeclaration[]> {
  const skillsBase = path.join(cwd, '.nexus', 'skills');
  const candidates: Array<Parameters<typeof collectGates>[0][number]> = [];
  const seen = new Set<string>();

  for (const dir of SKILL_DIRS) {
    let entries: string[];
    try {
      entries = await fs.readdir(path.join(skillsBase, dir));
    } catch {
      continue;
    }

    for (const fileName of entries) {
      if (!fileName.endsWith('.md') || fileName.toLowerCase() === 'readme.md') continue;
      const name = fileName.replace(/\.md$/, '');
      if (seen.has(name)) continue; // custom > core > community
      seen.add(name);

      try {
        const fm = parseSkillFrontmatter(
          await fs.readFile(path.join(skillsBase, dir, fileName), 'utf8'),
        );
        candidates.push({
          name,
          gate: fm.gate,
          invocation: fm.invocation,
          status: fm.status,
        });
      } catch {
        // Unreadable skill files are D10's problem.
      }
    }
  }

  const declared = collectGates(candidates);
  if (declared.length > 0) return declared;

  // No installed skill declares a gate — fall back to the built-in default so
  // the check still means something on a project with an older registry.
  if (!seen.has('grilling')) return [];

  return [
    {
      skill: 'grilling',
      gate: { planTypes: [...DEFAULT_GATED_PLAN_TYPES], record: DEFAULT_GATE_RECORD },
    },
  ];
}
