export const PLAN_STATUSES = [
  'draft',
  'approved',
  'in_progress',
  'blocked',
  'done',
  'abandoned',
] as const;

export type PlanStatus = (typeof PLAN_STATUSES)[number];

export interface PlanFrontmatter {
  nexus_plan?: boolean;
  id: string;
  title: string;
  status: PlanStatus;
  created?: string;
  updated?: string;
  owner?: string;
  source?: string;
  parent?: string | null;
  estimate?: string;
  phase?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface PlanSection {
  heading: string;
  content: string;
}

export interface PlanDocument {
  frontmatter: PlanFrontmatter;
  preamble: string;
  sections: PlanSection[];
}

export interface PlanSummary {
  id: string;
  title: string;
  status: PlanStatus;
  owner: string;
  updated: string;
  phase: string;
  fileName: string;
}

export interface ActivePlansState {
  active: string[];
  set_at: string;
  by: string;
  note?: string;
  blockers?: string[];
  parallel?: boolean;
  target_version?: string;
}
