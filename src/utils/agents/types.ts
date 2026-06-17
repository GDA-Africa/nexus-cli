/**
 * NEXUS Agents — Types
 *
 * Agents are brain-grounded role definitions living in `.nexus/agents/`.
 * Each agent has a context recipe (what gets composed in), a tool allowlist
 * (least privilege), and a handoff contract.
 *
 * Spec: v1_1_contextualized_agents.md §2
 */

export const AGENT_ROLES = ['build', 'verification', 'review', 'hygiene', 'custom'] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export const AGENT_SOURCES = ['custom', 'core', 'community'] as const;
export type AgentSource = (typeof AGENT_SOURCES)[number];

export interface AgentToolAllowlist {
  /** Read-only brain MCP tools (nexus_*) this agent may call. */
  read: string[];
  /** Mutating brain MCP tools (nexus_*) this agent may call. */
  write: string[];
  /**
   * Native client execution tools the agent needs to actually do its work
   * (e.g. Read, Edit, Write, Bash, Grep, Glob in Claude Code). Distinct from
   * the brain MCP tools above: without these, a generated subagent cannot edit
   * files. Empty/absent means "inherit role default" at render time.
   */
  exec: string[];
}

export interface AgentContextRecipe {
  /** Doc files (relative to .nexus/docs/) composed into this agent's context */
  docs: string[];
  /** Knowledge categories this agent should query */
  knowledge_categories: string[];
  /** Skill names (or framework-relative names) this agent reads */
  skills: string[];
  /** Plan visibility: active plan only, none, or all plans */
  plan_scope: 'active' | 'none' | 'all';
}

export interface AgentFrontmatter {
  nexus_agent: boolean;
  agent: string;
  version: string;
  role: AgentRole;
  triggers: string[];
  tools: AgentToolAllowlist;
  context: AgentContextRecipe;
  /** Agent name this one hands work to (or receives from via `after`) */
  handoff: { after?: string; to?: string };
  status: 'active' | 'draft' | 'deprecated';
}

export interface AgentDefinition {
  frontmatter: AgentFrontmatter;
  /** Markdown body (Mission, Working Agreement, Definition of Done, Anti-Patterns) */
  body: string;
}

export interface AgentSummary {
  name: string;
  source: AgentSource;
  role: AgentRole;
  status: string;
  triggers: string[];
  fileName: string;
}
