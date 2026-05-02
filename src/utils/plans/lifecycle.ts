import type { PlanFrontmatter, PlanStatus } from './types.js';

const TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  draft: ['approved', 'in_progress', 'abandoned'],
  approved: ['in_progress', 'abandoned'],
  in_progress: ['blocked', 'done', 'abandoned'],
  blocked: ['in_progress', 'abandoned'],
  done: [],
  abandoned: [],
};

export function canTransition(from: PlanStatus, to: PlanStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: PlanStatus, to: PlanStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid plan transition: ${from} -> ${to}`);
  }
}

export function transitionFrontmatter(
  frontmatter: PlanFrontmatter,
  nextStatus: PlanStatus,
): PlanFrontmatter {
  assertTransition(frontmatter.status, nextStatus);

  return {
    ...frontmatter,
    status: nextStatus,
    updated: todayIsoDate(),
  };
}

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}
