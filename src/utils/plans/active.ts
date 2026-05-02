import path from 'node:path';

import fs from 'fs-extra';

import type { ActivePlansState } from './types.js';

const ACTIVE_FILE = '_active.json';

export async function readActivePlans(plansDir: string): Promise<ActivePlansState> {
  const activePath = path.join(plansDir, ACTIVE_FILE);

  if (!(await fs.pathExists(activePath))) {
    return defaultActiveState();
  }

  try {
    const raw = await fs.readFile(activePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ActivePlansState>;

    return {
      active: Array.isArray(parsed.active) ? parsed.active.filter((v): v is string => typeof v === 'string') : [],
      set_at: typeof parsed.set_at === 'string' ? parsed.set_at : new Date().toISOString(),
      by: typeof parsed.by === 'string' ? parsed.by : 'nexus plan',
      note: typeof parsed.note === 'string' ? parsed.note : undefined,
      blockers: Array.isArray(parsed.blockers)
        ? parsed.blockers.filter((v): v is string => typeof v === 'string')
        : undefined,
      parallel: typeof parsed.parallel === 'boolean' ? parsed.parallel : undefined,
      target_version: typeof parsed.target_version === 'string' ? parsed.target_version : undefined,
    };
  } catch {
    return defaultActiveState();
  }
}

export async function writeActivePlans(plansDir: string, state: ActivePlansState): Promise<void> {
  const activePath = path.join(plansDir, ACTIVE_FILE);
  await fs.ensureDir(plansDir);
  await fs.writeJson(activePath, state, { spaces: 2 });
}

export async function setActivePlan(plansDir: string, planId: string, by = 'nexus plan start'): Promise<void> {
  const state = await readActivePlans(plansDir);

  if (!state.active.includes(planId)) {
    state.active = [...state.active, planId];
  }

  state.by = by;
  state.set_at = new Date().toISOString();
  await writeActivePlans(plansDir, state);
}

export async function removeActivePlan(plansDir: string, planId: string, by = 'nexus plan done'): Promise<void> {
  const state = await readActivePlans(plansDir);
  state.active = state.active.filter((id) => id !== planId);
  state.by = by;
  state.set_at = new Date().toISOString();
  await writeActivePlans(plansDir, state);
}

function defaultActiveState(): ActivePlansState {
  return {
    active: [],
    set_at: new Date().toISOString(),
    by: 'nexus plan',
  };
}
