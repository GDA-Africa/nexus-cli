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
  /** Plan type: feature | bug | refactor | spike | chore. Explicit since v1.3. */
  type?: string;
  /** Marks a `bug` plan as a major fix, opting it into the alignment gate. */
  major?: boolean;
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
  /** Derived plan type — used by the v1.3 alignment gate (D13). */
  type?: string | null;
  /** True when a `bug` plan is explicitly marked a major fix. */
  major?: boolean;
  /** True when the plan's gate record section is filled in. */
  gateRecordSatisfied?: boolean;
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
