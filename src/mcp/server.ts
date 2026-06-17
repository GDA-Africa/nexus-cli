/**
 * NEXUS MCP — Server
 *
 * Exposes the project brain as MCP tools over stdio. This is the v1.0
 * headline: agents query and update the brain through schema-validated
 * tool calls instead of (only) reading markdown files.
 *
 * stdout is reserved for the MCP protocol — all diagnostics go to stderr.
 *
 * Tool surface (17):
 *   Read:   nexus_wake, nexus_get_vital_signs, nexus_query_knowledge,
 *           nexus_get_active_plan, nexus_list_plans, nexus_get_plan,
 *           nexus_brief, nexus_doctor, nexus_list_skills, nexus_get_skill,
 *           nexus_list_agents, nexus_get_agent, nexus_get_context (v1.1),
 *           nexus_get_handoff (main-thread orchestration)
 *   Write:  nexus_plan_tick, nexus_plan_note, nexus_add_knowledge_entry
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { PLAN_STATUSES } from '../utils/plans/types.js';
import { version } from '../version.js';

import { McpToolError, resolveBrainContext, type BrainContext } from './context.js';
import {
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
} from './tools.js';

export interface BuildMcpServerOptions {
  /** Directory to resolve the brain from (defaults to process.cwd()). */
  rootDir?: string;
}

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

/** Build the MCP server with all brain tools registered. Exported for tests. */
export function buildMcpServer(options: BuildMcpServerOptions = {}): McpServer {
  const rootDir = options.rootDir ?? process.cwd();

  const server = new McpServer({
    name: 'nexus-brain',
    version,
  });

  /** Wrap a handler: resolve brain context lazily, serialize result, map errors. */
  const wrap = <TInput>(handler: (ctx: BrainContext, input: TInput) => Promise<unknown>) => {
    return async (input: TInput): Promise<ToolResult> => {
      try {
        const ctx = resolveBrainContext(rootDir);
        const result = await handler(ctx, input);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message =
          error instanceof McpToolError
            ? error.message
            : `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
        return { content: [{ type: 'text', text: message }], isError: true };
      }
    };
  };

  // ── Read tools ─────────────────────────────────────────────

  server.registerTool(
    'nexus_wake',
    {
      title: 'Wake — session handshake',
      description:
        'Start of every session. Issues the NX-WAKE handshake token, returns the active plan, ' +
        'its next step, and doctor warn/error counts in one compact call. Echo the token in ' +
        'your first response to prove the brain was read.',
      inputSchema: {
        agent: z.string().optional().describe('Agent identity (e.g. nexus-implementer) recorded in session.json'),
      },
    },
    wrap(wakeTool),
  );

  server.registerTool(
    'nexus_get_vital_signs',
    {
      title: 'Vital Signs — live repo sensors',
      description:
        'Capture live repository state: git (branch, last commit, dirty), files, tests, packages. ' +
        'Fresher than the Vital Signs block in index.md — runs sensors on demand.',
      inputSchema: {},
    },
    wrap(async (ctx) => getVitalSignsTool(ctx)),
  );

  server.registerTool(
    'nexus_query_knowledge',
    {
      title: 'Query knowledge base',
      description:
        'Targeted retrieval over .nexus/docs/knowledge.md. Returns matching entries (newest first) ' +
        'instead of the whole file. Always check for relevant gotchas before architectural decisions ' +
        'or debugging.',
      inputSchema: {
        query: z.string().optional().describe('Space-separated keywords matched against category, title, and body'),
        category: z
          .enum(KNOWLEDGE_CATEGORIES)
          .optional()
          .describe('Restrict to one category tag'),
        limit: z.number().int().min(1).max(50).optional().describe('Max entries returned (default 10)'),
      },
    },
    wrap(queryKnowledgeTool),
  );

  server.registerTool(
    'nexus_get_active_plan',
    {
      title: 'Get active plan',
      description:
        'The current unit of work: active plan with full markdown, checklist steps, and the next ' +
        'unchecked step. Call this before starting any task instead of re-deriving a plan.',
      inputSchema: {},
    },
    wrap(async (ctx) => getActivePlanTool(ctx)),
  );

  server.registerTool(
    'nexus_list_plans',
    {
      title: 'List plans',
      description: 'List all plans in .nexus/plans/ with status, owner, and phase.',
      inputSchema: {
        status: z.enum(PLAN_STATUSES).optional().describe('Filter by lifecycle status'),
      },
    },
    wrap(listPlansTool),
  );

  server.registerTool(
    'nexus_get_plan',
    {
      title: 'Get plan',
      description: 'Full markdown of one plan by id.',
      inputSchema: {
        id: z.string().min(1).describe('Plan id (filename without .md)'),
      },
    },
    wrap(getPlanTool),
  );

  server.registerTool(
    'nexus_brief',
    {
      title: 'Brief — status digest',
      description:
        'Human-readable markdown digest: vital signs, doctor findings, plans, recently shipped ' +
        'commits, suggested next actions. Same output as `nexus brief --md`.',
      inputSchema: {
        since: z.string().optional().describe('Git date expression for the shipped window (default "7 days ago")'),
      },
    },
    wrap(briefTool),
  );

  server.registerTool(
    'nexus_doctor',
    {
      title: 'Doctor — drift report',
      description:
        'Run the D01–D10 drift checks (stale docs, knowledge bloat, orphan plans, missed handshakes…) ' +
        'and return the findings report.',
      inputSchema: {
        minSeverity: z.enum(['info', 'warn', 'error']).optional().describe('Minimum severity (default info)'),
      },
    },
    wrap(doctorTool),
  );

  server.registerTool(
    'nexus_list_skills',
    {
      title: 'List skills',
      description:
        'List installed NEXUS skills across custom/, core/, and community/ (precedence: custom > core ' +
        '> community). Skills are pre-read instructions for HOW to execute tasks in this project — ' +
        'match your task against their triggers before significant work.',
      inputSchema: {},
    },
    wrap(async (ctx) => listSkillsTool(ctx)),
  );

  server.registerTool(
    'nexus_get_skill',
    {
      title: 'Get skill',
      description: 'Read one skill file by name, honoring custom > core > community precedence.',
      inputSchema: {
        name: z.string().min(1).describe('Skill name (filename without .md)'),
      },
    },
    wrap(getSkillTool),
  );

  // ── Agents tools (v1.1) ────────────────────────────────────

  server.registerTool(
    'nexus_list_agents',
    {
      title: 'List agents',
      description:
        'List brain-grounded agent definitions in .nexus/agents/ (precedence: custom > core > ' +
        'community) with role, status, and triggers. Match your task against the triggers and ' +
        'adopt the matching agent\'s working agreement.',
      inputSchema: {},
    },
    wrap(async (ctx) => listAgentsTool(ctx)),
  );

  server.registerTool(
    'nexus_get_agent',
    {
      title: 'Get agent',
      description: 'Read one agent definition (frontmatter + working agreement) by name.',
      inputSchema: {
        name: z.string().min(1).describe('Agent name, e.g. nexus-test-writer'),
      },
    },
    wrap(getAgentTool),
  );

  server.registerTool(
    'nexus_get_handoff',
    {
      title: 'Get agent handoff — what to dispatch next',
      description:
        'Return the agent pipeline (implementer → test-writer → reviewer → doc-keeper, or the ' +
        "project's custom chain) and, given the current agent, the next one to dispatch. Handoffs " +
        'are MAIN-THREAD orchestrated: subagents cannot call subagents, so the main thread reads ' +
        '`next` and dispatches that agent itself. Call after finishing an agent\'s work.',
      inputSchema: {
        agent: z.string().optional().describe('The agent you are currently acting as (e.g. nexus-implementer)'),
      },
    },
    wrap(getHandoffTool),
  );

  server.registerTool(
    'nexus_get_context',
    {
      title: 'Get composed context',
      description:
        'THE context tool: composes one scoped pack for a task — active plan slice, matching ' +
        'knowledge entries, trigger-matched skills, live vitals digest, and (when an agent is ' +
        'named) the docs from its context recipe. Deterministic; call this instead of N ' +
        'piecemeal reads at task start.',
      inputSchema: {
        task: z.string().min(3).describe('Task description used for matching'),
        agent: z.string().optional().describe('Agent whose context recipe scopes the composition'),
        maxChars: z.number().int().min(2000).max(60000).optional().describe('Payload budget (default 12000)'),
      },
    },
    wrap(getContextTool),
  );

  // ── Write tools ────────────────────────────────────────────

  server.registerTool(
    'nexus_plan_tick',
    {
      title: 'Tick plan step',
      description:
        'Mark a checklist step done (or reopen it). Schema-validated — use this instead of editing ' +
        'plan markdown by hand. Returns the next unchecked step.',
      inputSchema: {
        id: z.string().min(1).describe('Plan id'),
        step: z.number().int().min(1).describe('1-based step index as shown by nexus_get_active_plan'),
        checked: z.boolean().optional().describe('false to reopen the step (default true)'),
      },
    },
    wrap(planTickTool),
  );

  server.registerTool(
    'nexus_plan_note',
    {
      title: 'Add plan note',
      description: 'Append a timestamped note to a plan’s Notes section.',
      inputSchema: {
        id: z.string().min(1).describe('Plan id'),
        message: z.string().min(1).describe('Note text'),
      },
    },
    wrap(planNoteTool),
  );

  server.registerTool(
    'nexus_add_knowledge_entry',
    {
      title: 'Add knowledge entry',
      description:
        'Append a validated entry to the append-only knowledge base. Use after discovering something ' +
        'non-obvious: a bug root cause, an architecture insight, a package quirk. Keep the body to ' +
        '1–3 sentences.',
      inputSchema: {
        category: z.enum(KNOWLEDGE_CATEGORIES).describe('Entry category tag'),
        title: z.string().min(3).describe('Short entry title'),
        body: z.string().min(10).describe('1–3 sentence insight'),
        why: z.string().optional().describe('Optional "Why" rationale line'),
        howToApply: z.string().optional().describe('Optional "How to apply" guidance line'),
      },
    },
    wrap(addKnowledgeEntryTool),
  );

  return server;
}

/** Start the server on stdio. Never returns until the transport closes. */
export async function startMcpServer(options: BuildMcpServerOptions = {}): Promise<void> {
  const server = buildMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Diagnostics must use stderr — stdout carries the protocol.
  console.error(`nexus-brain MCP server v${version} listening on stdio`);
}
