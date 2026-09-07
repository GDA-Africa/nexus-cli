/**
 * NEXUS CLI — Project Graph: type definitions
 *
 * The typed entity graph behind NEXUS 2.0's "project intelligence" layer
 * (`.nexus/docs/v2_project_graph.md`, derived from the §9 "Missing Data Model"
 * in `nexus_2_0_investigation.md`). Markdown stays the human-reviewed source
 * of truth; this graph is a generated, typed view over on-disk state so a
 * TPM / agent can answer "which requirements are unimplemented?", "which
 * tests prove this feature?", "which evidence backs this task?" as data.
 *
 * Spike #1 deliberately cuts the full §9 table down to the spine that can be
 * proven from real bytes today. The deferred entities (Spec, AcceptanceCriterion,
 * Ticket, Component, API, DataModel, ChangeSet, AgentRun, Release, Environment,
 * Deployment, KnowledgeEntry, Approval) are a later spike.
 */

import type { PlanStatus } from '../plans/types.js';

/** A project root: identity + stack + the brain location it was parsed from. */
export interface GraphProject {
  id: string;
  path: string;
  /** Display name when known (e.g. package.json `name`), else the dir id. */
  name: string;
  /** Primary language / framework evidence, when discoverable. */
  stack?: string;
  /** The test framework, when discoverable. */
  testFramework?: string;
  /** True when `.nexus/docs/index.md` exists under the root. */
  hasBrain: boolean;
}

/** Business intent with a source doc and a coarse lifecycle. */
export interface GraphRequirement {
  id: string;
  title: string;
  /** Where it derives from, e.g. "docs/01_vision.md". */
  source: string;
  status: 'backlog' | 'active' | 'done';
  featureIds: string[];
}

/** A product capability derived from one or more requirements. */
export interface GraphFeature {
  id: string;
  name: string;
  requirementIds: string[];
  taskIds: string[];
}

/** A human/agent work item — the plan slice. Reuses the plan lifecycle. */
export interface GraphTask {
  id: string;
  title: string;
  status: PlanStatus;
  /** Reuse the plan `type` vocabulary (feature | bug | refactor | spike | chore). */
  type?: string | null;
  /** Source plan filename when this task derived from a `.nexus/plans/*.md`. */
  sourcePlanId?: string;
  evidenceIds: string[];
}

/** A recorded verification / activity result backing a task. */
export interface GraphEvidence {
  id: string;
  kind: 'verify' | 'plan-note' | 'chameleon' | 'test' | 'unknown';
  summary: string;
  sourcePath?: string;
  verifiedAt?: string;
}

/** A file on disk, classified by role. */
export interface GraphFile {
  path: string;
  kind: 'source' | 'test' | 'doc' | 'config';
  sizeBytes: number;
}

/** A test target (a test file) that can be mapped to evidence. */
export interface GraphTestTarget {
  name: string;
  path: string;
  language: string;
}

/** One typed edge in the graph — the §9 spine, kept as plain arrays. */
export interface GraphEdge {
  from: string;
  to: string;
  kind: 'derives' | 'implements' | 'supports' | 'tests' | 'references';
}

/**
 * The whole derived graph. Entities keyed by id (the arrays above carry the
 * `id` field and are kept unique; `edges` are explicit, no graph library).
 */
export interface ProjectGraph {
  project: GraphProject;
  requirements: GraphRequirement[];
  features: GraphFeature[];
  tasks: GraphTask[];
  evidence: GraphEvidence[];
  files: GraphFile[];
  testTargets: GraphTestTarget[];
  edges: GraphEdge[];
}

/** Input knobs for the parser. */
export interface ParseProjectOptions {
  /** Only the default (no-op) shape so the API can extend without breaking. */
  capFiles?: number;
}