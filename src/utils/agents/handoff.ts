/**
 * NEXUS Agents — Handoff chain
 *
 * Agents declare `handoff.after: <name>` to form a verification pipeline
 * (implementer → test-writer → reviewer → doc-keeper). Claude Code subagents
 * cannot invoke one another, so the chain is executed by the MAIN THREAD: it
 * dispatches each agent in order. This module turns the per-agent `after` links
 * into an ordered chain the main thread (and the `nexus_get_handoff` tool) can
 * follow deterministically.
 *
 * Spec: plan fix-agent-handoff-orchestration (Option A — main-thread driven).
 */

export interface HandoffNode {
  name: string;
  /** Name of the agent this one runs AFTER (empty/undefined = a chain root). */
  after?: string;
}

/**
 * Order agents into a linear chain by following `after` links.
 *
 * Roots (no `after`, or an `after` that names no known agent) come first, in
 * stable input order. Then each agent that runs after an already-placed agent
 * is appended. Cycles and orphans are tolerated: anything not reachable through
 * links is appended at the end in input order, so the result always contains
 * every agent exactly once and never loops forever.
 */
export function buildHandoffChain(nodes: HandoffNode[]): string[] {
  const names = nodes.map((n) => n.name);
  const known = new Set(names);
  // after -> the agent(s) that run after it
  const nextOf = new Map<string, string[]>();
  const roots: string[] = [];

  for (const node of nodes) {
    const after = node.after?.trim();
    if (after && known.has(after) && after !== node.name) {
      const list = nextOf.get(after) ?? [];
      list.push(node.name);
      nextOf.set(after, list);
    } else {
      roots.push(node.name);
    }
  }

  const ordered: string[] = [];
  const placed = new Set<string>();

  const walk = (name: string): void => {
    if (placed.has(name)) return; // cycle guard
    placed.add(name);
    ordered.push(name);
    for (const next of nextOf.get(name) ?? []) walk(next);
  };

  for (const root of roots) walk(root);
  // Anything left (unreachable / part of a cycle) — append in input order.
  for (const name of names) if (!placed.has(name)) walk(name);

  return ordered;
}

/** The agent that should run immediately after `name`, or null if it's last. */
export function nextInChain(chain: string[], name: string): string | null {
  const idx = chain.indexOf(name);
  if (idx === -1 || idx === chain.length - 1) return null;
  return chain[idx + 1] ?? null;
}
