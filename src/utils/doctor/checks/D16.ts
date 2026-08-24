import fs from 'node:fs/promises';
import path from 'node:path';

import { fileExists } from '../../file-system.js';
import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

/**
 * D16 — Generated Artifact Drift.
 *
 * Several `.nexus/` files are rollups of other `.nexus/` files: the plans
 * dashboard summarises the plan files, `_active.json` names plans whose own
 * frontmatter should agree, and the index's release history should track the
 * package version. Each is generated once and then rots, because nothing
 * compares the rollup against its source.
 *
 * This is the failure NEXUS.md §19 names as recurring ("counts in prose
 * rot"), and it had recurred inside NEXUS's own brain: `_active.json` still
 * pointed at target_version 1.1.2 and the index still described the project
 * as "v1.2, design drafted" while v1.4.0 was published.
 *
 * Every comparison here is a deterministic diff of a generated artifact
 * against its input. No prose parsing, no model.
 */
export const D16_artifact_drift: DoctorCheck = {
  id: 'D16',
  name: 'Artifact Drift',
  description: 'Checks generated rollups (plans dashboard, active plans, release history) against their sources',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const findings: DoctorFinding[] = [];
    // NB: fileExists() asserts isFile(), so it is the wrong probe for a
    // directory. Each sub-check guards its own files instead.
    const nexusDir = path.join(ctx.cwd, '.nexus');

    findings.push(...(await checkActivePlansResolve(nexusDir)));
    findings.push(...(await checkPlansDashboard(nexusDir)));
    findings.push(...(await checkReleaseHistory(ctx, nexusDir)));

    return findings;
  },
};

/** Every id in `_active.json` must name a plan file that exists and is open. */
async function checkActivePlansResolve(nexusDir: string): Promise<DoctorFinding[]> {
  const activePath = path.join(nexusDir, 'plans', '_active.json');
  if (!(await fileExists(activePath))) return [];

  let active: string[];
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(activePath, 'utf8'));
    const raw = parsed && typeof parsed === 'object' ? (parsed as { active?: unknown }).active : undefined;
    active = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [{
      id: 'D16',
      severity: 'warn',
      description: '.nexus/plans/_active.json is not valid JSON, so no plan can be resolved as active.',
      fixHint: 'Repair the file, or reset it to {"active": []}.',
    }];
  }

  const findings: DoctorFinding[] = [];
  for (const id of active) {
    const planPath = path.join(nexusDir, 'plans', `${id}.md`);
    if (!(await fileExists(planPath))) {
      findings.push({
        id: 'D16',
        severity: 'warn',
        description: `_active.json names "${id}" as active, but .nexus/plans/${id}.md does not exist.`,
        fixHint: 'Run `nexus plan done <id>`, or remove the stale id from _active.json.',
      });
      continue;
    }
    const status = await readFrontmatterField(planPath, 'status');
    if (status === 'done') {
      findings.push({
        id: 'D16',
        severity: 'warn',
        description: `_active.json still names "${id}" as active, but that plan's frontmatter says status: done.`,
        fixHint: 'Run `nexus plan done ' + id + '` so the active list and the plan agree.',
      });
    }
  }
  return findings;
}

/** The plans dashboard should mention every open plan on disk. */
async function checkPlansDashboard(nexusDir: string): Promise<DoctorFinding[]> {
  const plansDir = path.join(nexusDir, 'plans');
  const indexPath = path.join(plansDir, 'index.md');
  if (!(await fileExists(indexPath))) return [];

  let entries: string[];
  try {
    entries = (await fs.readdir(plansDir)).filter((f) => f.endsWith('.md') && f !== 'index.md');
  } catch {
    return [];
  }

  const dashboard = await fs.readFile(indexPath, 'utf8');
  const missing: string[] = [];
  for (const file of entries) {
    const id = file.replace(/\.md$/, '');
    const status = await readFrontmatterField(path.join(plansDir, file), 'status');
    if (status === 'done') continue; // closed plans need not stay on the board
    if (!dashboard.includes(id)) missing.push(id);
  }

  if (missing.length === 0) return [];
  const shown = missing.slice(0, 5).join(', ');
  return [{
    id: 'D16',
    severity: 'warn',
    description:
      `.nexus/plans/index.md does not list ${missing.length} open plan(s) that exist on disk: ${shown}` +
      `${missing.length > 5 ? ', …' : ''}.`,
    fixHint: 'Regenerate the plans dashboard so it reflects the plan files, rather than a past snapshot.',
  }];
}

/** The brain's release history should not trail the shipped package version. */
async function checkReleaseHistory(ctx: DoctorContext, nexusDir: string): Promise<DoctorFinding[]> {
  const indexPath = path.join(nexusDir, 'docs', 'index.md');
  const pkgPath = path.join(ctx.cwd, 'package.json');
  if (!(await fileExists(indexPath)) || !(await fileExists(pkgPath))) return [];

  let version: string | null = null;
  try {
    const parsed = JSON.parse(await fs.readFile(pkgPath, 'utf8')) as { version?: unknown };
    version = typeof parsed.version === 'string' ? parsed.version : null;
  } catch {
    return [];
  }
  if (!version) return [];

  const index = await fs.readFile(indexPath, 'utf8');
  if (index.includes(version)) return [];

  return [{
    id: 'D16',
    severity: 'warn',
    description:
      `package.json is at ${version}, but .nexus/docs/index.md never mentions that version — ` +
      'the brain describes an older state of the project than the one being shipped.',
    fixHint:
      'Update the release history / current phase in .nexus/docs/index.md. Agents trust what they read there, ' +
      'so a brain that trails the code sends them to work on the wrong thing.',
  }];
}

/** Read a single scalar frontmatter field. Tolerates CRLF and missing frontmatter. */
async function readFrontmatterField(filePath: string, field: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
    if (!match) return null;
    const line = new RegExp(`^${field}:\\s*(.+?)\\s*$`, 'm').exec(match[1]);
    return line ? line[1].replace(/^["']|["']$/g, '') : null;
  } catch {
    return null;
  }
}
