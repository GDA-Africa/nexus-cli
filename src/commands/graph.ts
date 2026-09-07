/**
 * NEXUS CLI — `nexus graph`
 *
 * Renders the derived project graph (NEXUS 2.0 Phase 2, spike #1). Parses the
 * current repo's on-disk state — plans, brain docs, verify/state JSON, and a
 * file walk — into a typed `ProjectGraph` and prints a compact digest, or the
 * full graph as JSON.
 *
 * Spec: `.nexus/docs/v2_project_graph.md` §3.
 */

import fs from 'node:fs';
import path from 'node:path';

import { Command } from 'commander';

import { getNexusDir } from '../utils/brain.js';
import { renderGraphDigest } from '../utils/graph/digest.js';
import { parseProject } from '../utils/graph/parser.js';
import type { ProjectGraph } from '../utils/graph/types.js';

export interface GraphCommandOptions {
  json?: boolean;
  file?: string;
  root?: string;
}

export function graphCommand(): Command {
  return new Command('graph')
    .description(
      'Parse the current project into the derived project graph — Requirement → Feature → Task → Evidence — and print a digest or JSON',
    )
    .option('--json', 'Output the full ProjectGraph as JSON (stdout only)', false)
    .option('-f, --file <path>', 'Write the JSON graph to a file (default project-graph.json)', undefined)
    .option('--root <dir>', 'Parse this directory instead of the current one', undefined)
    .action(async (options: GraphCommandOptions) => {
      await runGraphCommand(options);
    });
}

/**
 * Testable core behind `nexus graph`. Separate from the Commander wiring so
 * tests can call it with a fixed root, matching the rest of the command suite.
 */
export async function runGraphCommand(options: GraphCommandOptions = {}): Promise<ProjectGraph> {
  const root = resolveRoot(options.root);
  const graph = await parseProject(root);

  if (options.file) {
    fs.writeFileSync(options.file, JSON.stringify(graph, null, 2), 'utf-8');
  }

  if (options.json) {
    if (!options.file) {
      console.log(JSON.stringify(graph, null, 2));
    }
  } else {
    console.log(renderGraphDigest(graph));
  }

  return graph;
}

function resolveRoot(explicit: string | undefined): string {
  if (explicit) return explicit;
  // If we're inside a NEXUS project, parse the project root (the parent of
  // `.nexus`); otherwise parse the current directory.
  const nexusDir = getNexusDir(process.cwd());
  if (nexusDir) return path.dirname(nexusDir);
  return process.cwd();
}