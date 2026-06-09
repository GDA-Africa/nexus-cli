/**
 * NEXUS CLI — `nexus consolidate`
 *
 * Memory hygiene for the brain: rolls `.nexus/docs/knowledge.md` up into a
 * generated `knowledge-summary.md`, optionally archives entries older than
 * one year, and offers a CI gate (`--check`) that fails when the summary has
 * drifted from the raw file.
 *
 * Deterministic Markdown processing — no LLM calls (spec §5.4).
 */

import path from 'node:path';

import { Command } from 'commander';
import fs from 'fs-extra';

import { getNexusDir } from '../utils/brain.js';
import {
  normalizeSummaryForComparison,
  parseKnowledge,
  renderArchiveHeader,
  renderKnowledgeFile,
  renderKnowledgeSummary,
  splitForArchive,
} from '../utils/knowledge.js';
import { logger } from '../utils/logger.js';
import { version } from '../version.js';

export interface ConsolidateCommandOptions {
  /** Regenerate knowledge-summary.md (default behaviour) */
  write?: boolean;
  /** CI gate: exit non-zero if the summary is missing or out of date */
  check?: boolean;
  /** Move entries older than one year to knowledge-archive.md */
  archive?: boolean;
  /** Injectable clock for deterministic tests */
  now?: Date;
}

export function consolidateCommand(): Command {
  return new Command('consolidate')
    .description('Roll knowledge.md up into knowledge-summary.md (append-only stays append-only)')
    .argument('[path]', 'Project path (defaults to current directory)')
    .option('--check', 'Fail if knowledge-summary.md is out of date with knowledge.md (CI gate)', false)
    .option('--archive', 'Move entries older than 1 year to knowledge-archive.md', false)
    .action(async (targetPath: string | undefined, options: { check?: boolean; archive?: boolean }) => {
      await runConsolidate(targetPath, options);
    });
}

export async function runConsolidate(
  targetPath?: string,
  options: ConsolidateCommandOptions = {},
): Promise<void> {
  const cwd = targetPath ? path.resolve(targetPath) : process.cwd();
  const nexusDir = getNexusDir(cwd);

  if (!nexusDir) {
    logger.error('Could not find .nexus/ directory in this path or any parent directory.');
    logger.info('Run `nexus init` or `nexus adopt` first.');
    process.exit(1);
  }

  const docsDir = path.join(nexusDir, 'docs');
  const knowledgePath = path.join(docsDir, 'knowledge.md');
  const summaryPath = path.join(docsDir, 'knowledge-summary.md');
  const archivePath = path.join(docsDir, 'knowledge-archive.md');

  if (!(await fs.pathExists(knowledgePath))) {
    logger.error('No knowledge.md found in .nexus/docs/.');
    process.exit(1);
  }

  const now = options.now ?? new Date();
  const generatedAt = now.toISOString().slice(0, 10);

  let content = await fs.readFile(knowledgePath, 'utf-8');
  let parsed = parseKnowledge(content);

  if (parsed.entries.length === 0) {
    logger.warn('knowledge.md has no entries yet — nothing to consolidate.');
    return;
  }

  // ── --archive: move year-old entries to the archive file ──
  if (options.archive) {
    const cutoff = new Date(now);
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const { kept, archived } = splitForArchive(parsed.entries, cutoffDate);

    if (archived.length > 0) {
      const archiveExists = await fs.pathExists(archivePath);
      const archiveChunk = archived.map((entry) => [...entry.raw, ''].join('\n')).join('\n');
      if (archiveExists) {
        await fs.appendFile(archivePath, `\n${archiveChunk}`, 'utf-8');
      } else {
        await fs.writeFile(archivePath, `${renderArchiveHeader()}\n${archiveChunk}`, 'utf-8');
      }

      const rewritten = renderKnowledgeFile(parsed, kept);
      await atomicWrite(knowledgePath, rewritten);

      logger.success(
        `Archived ${archived.length} entr${archived.length === 1 ? 'y' : 'ies'} older than ${cutoffDate} to knowledge-archive.md.`,
      );

      content = rewritten;
      parsed = parseKnowledge(content);
    } else {
      logger.info(`No entries older than ${cutoffDate} — nothing to archive.`);
    }
  }

  const summary = renderKnowledgeSummary(parsed.entries, {
    generatedAt,
    currentVersion: version,
  });

  // ── --check: CI gate, no writes ──
  if (options.check) {
    if (!(await fs.pathExists(summaryPath))) {
      logger.error('knowledge-summary.md does not exist. Run `nexus consolidate` to generate it.');
      process.exitCode = 1;
      return;
    }

    const existing = await fs.readFile(summaryPath, 'utf-8');
    if (normalizeSummaryForComparison(existing) !== normalizeSummaryForComparison(summary)) {
      logger.error('knowledge-summary.md is out of date with knowledge.md. Run `nexus consolidate`.');
      process.exitCode = 1;
      return;
    }

    logger.success('knowledge-summary.md is up to date.');
    return;
  }

  // ── default: --write ──
  await atomicWrite(summaryPath, summary);
  logger.success(
    `knowledge-summary.md regenerated (${parsed.entries.length} entries across ${countCategories(parsed.entries)} categories).`,
  );
}

function countCategories(entries: { category: string }[]): number {
  return new Set(entries.map((entry) => entry.category)).size;
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, content, 'utf-8');
  await fs.move(tmpPath, filePath, { overwrite: true });
}
