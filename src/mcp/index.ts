/**
 * NEXUS MCP — Public barrel
 *
 * Re-exports the brain context resolver and all 17 tool handlers as a
 * transport-agnostic API. `src/mcp/server.ts` wraps these same functions for
 * the stdio MCP protocol; this barrel lets an embedding host (e.g. a Cordis
 * plugin) call them directly and keep native return types and thrown errors
 * instead of the MCP text-content envelope.
 *
 * Every handler takes an explicit `BrainContext` — construct one with
 * `resolveBrainContext(startDir)`. Do not rely on its `process.cwd()`
 * default outside a CLI process; a host running against a different
 * project must always pass the target root explicitly.
 */

export { McpToolError, resolveBrainContext, type BrainContext } from './context.js';

export {
  addKnowledgeEntryTool,
  briefTool,
  doctorTool,
  getActivePlanTool,
  getAgentTool,
  getContextTool,
  getHandoffTool,
  getPlanTool,
  getSkillTool,
  getVitalSignsTool,
  KNOWLEDGE_CATEGORIES,
  listAgentsTool,
  listPlansTool,
  listSkillsTool,
  planNoteTool,
  planTickTool,
  queryKnowledgeTool,
  wakeTool,
  type ActivePlanResult,
  type AddKnowledgeInput,
  type ComposedContext,
  type GetContextInput,
  type HandoffResult,
  type KnowledgeMatch,
  type PlanTickInput,
  type QueryKnowledgeInput,
  type SkillSource,
  type SkillSummary,
  type WakeToolResult,
} from './tools.js';

export { buildMcpServer, type BuildMcpServerOptions } from './server.js';

// Re-exported alongside KNOWLEDGE_CATEGORIES: both are enums an embedding
// host needs to translate into its own tool-parameter schema (e.g. Cordis's
// ValueSchemaSpec `enum`), not just for internal validation.
export { PLAN_STATUSES } from '../utils/plans/types.js';
