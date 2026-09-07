/**
 * NEXUS CLI — Project Graph: markdown digest renderer
 *
 * Renders a `ProjectGraph` as a compact, human-readable document that shows
 * the Requirement → Feature → Task → Evidence spine rather than a bag of
 * nodes. Used by `nexus graph` (default output) and the MCP tool's `digest`.
 */

import type { ProjectGraph } from './types.js';

/** Render the whole graph as a compact markdown digest. */
export function renderGraphDigest(graph: ProjectGraph): string {
  const lines: string[] = [];

  lines.push(`# ${graph.project.name} — project graph`);
  lines.push('');
  lines.push(`**Project:** \`${graph.project.id}\` · path \`${graph.project.path}\``);
  lines.push(
    `**Stack:** ${graph.project.stack ?? 'unknown'}${
      graph.project.testFramework ? ` · tests: ${graph.project.testFramework}` : ''
    } · hasBrain: ${graph.project.hasBrain ? 'yes' : 'no'}`,
  );
  lines.push('');

  lines.push('## Counts');
  lines.push('');
  lines.push(
    `| requirements | features | tasks | evidence | files | testTargets | edges |`,
    `|---|---|---|---|---|---|---|`,
    `| ${graph.requirements.length} | ${graph.features.length} | ${graph.tasks.length} | ${graph.evidence.length} | ${graph.files.length} | ${graph.testTargets.length} | ${graph.edges.length} |`,
    '',
  );

  if (graph.requirements.length > 0) {
    lines.push('## Spine: Requirement → Feature → Task → Evidence');
    lines.push('');
    for (const req of graph.requirements) {
      lines.push(`### ${req.title}`);
      lines.push(`_source: \`${req.source}\` · status: ${req.status}_`);
      lines.push('');
      const reqFeatures = graph.features.filter((f) => f.requirementIds.includes(req.id) || req.featureIds.includes(f.id));
      if (reqFeatures.length === 0) {
        lines.push('- _no features linked yet (unimplemented requirement)_');
      }
      for (const feature of reqFeatures) {
        lines.push(`- **${feature.name}**`);
        for (const taskId of feature.taskIds) {
          const task = graph.tasks.find((t) => t.id === taskId);
          if (!task) continue;
          lines.push(`  - \`${task.id}\` — ${task.title} (${task.status})${task.type ? ` · ${task.type}` : ''}`);
          for (const evidenceId of task.evidenceIds) {
            const ev = graph.evidence.find((e) => e.id === evidenceId);
            if (ev) lines.push(`    - _evidence: ${ev.summary} (${ev.kind})_`);
          }
        }
      }
      lines.push('');
    }
  }

  if (graph.testTargets.length > 0) {
    lines.push('## Test targets');
    lines.push('');
    for (const t of graph.testTargets.slice(0, 25)) {
      lines.push(`- \`${t.path}\``);
    }
    if (graph.testTargets.length > 25) {
      lines.push(`- _…and ${graph.testTargets.length - 25} more_`);
    }
    lines.push('');
  }

  return lines.join('\n');
}