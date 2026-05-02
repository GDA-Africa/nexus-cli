import path from 'node:path';

import fs from 'fs-extra';

import { getNexusDir } from '../utils/brain.js';
import { logger } from '../utils/logger.js';
import { removeActivePlan, setActivePlan } from '../utils/plans/active.js';
import { rebuildPlansIndex, collectPlanSummaries } from '../utils/plans/index-builder.js';
import { transitionFrontmatter } from '../utils/plans/lifecycle.js';
import {
  appendSectionEntry,
  getSection,
  parsePlanContent,
  setSection,
  updateChecklistItem,
  writePlanFile,
} from '../utils/plans/parser.js';
import type { PlanStatus } from '../utils/plans/types.js';
import { toSlug } from '../utils/validator.js';

export interface PlanNewOptions {
  type?: 'feature' | 'bug' | 'refactor' | 'spike' | 'chore';
  owner?: string;
  phase?: string;
  estimate?: string;
}

export interface PlanListOptions {
  status?: PlanStatus;
}

export async function planNewCommand(title: string, options: PlanNewOptions = {}): Promise<void> {
  const { plansDir } = await resolvePlansContext();

  const id = toSlug(title);
  const filePath = path.join(plansDir, `${id}.md`);
  if (await fs.pathExists(filePath)) {
    logger.error(`Plan already exists: .nexus/plans/${id}.md`);
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0] ?? '';
  const planType = options.type ?? 'feature';
  const content = renderPlanTemplate({
    id,
    title,
    type: planType,
    owner: options.owner ?? 'unassigned',
    phase: options.phase ?? inferPhaseFromType(planType),
    estimate: options.estimate ?? inferEstimateFromType(planType),
    today,
  });

  await fs.writeFile(filePath, content, 'utf-8');
  await rebuildPlansIndex(plansDir);

  logger.success(`Plan created: .nexus/plans/${id}.md`);
  logger.info('Next: run `nexus plan start <id>` when you begin implementation.');
}

export async function planListCommand(options: PlanListOptions = {}): Promise<void> {
  const { plansDir } = await resolvePlansContext();
  const summaries = await collectPlanSummaries(plansDir);

  const filtered = options.status
    ? summaries.filter((summary) => summary.status === options.status)
    : summaries;

  if (filtered.length === 0) {
    logger.info('No plans found. Create one with `nexus plan new "<title>"`.');
    return;
  }

  logger.nexus('Plans');
  for (const plan of filtered) {
    logger.info(`${statusIcon(plan.status)} ${plan.id} — ${plan.title} (${plan.status})`);
  }
}

export async function planShowCommand(id: string): Promise<void> {
  const { plansDir } = await resolvePlansContext();
  const filePath = path.join(plansDir, `${id}.md`);

  if (!(await fs.pathExists(filePath))) {
    logger.error(`Plan not found: .nexus/plans/${id}.md`);
    process.exit(1);
  }

  const content = await fs.readFile(filePath, 'utf-8');
  console.log(content);
}

export async function planStartCommand(id: string): Promise<void> {
  const { plansDir } = await resolvePlansContext();
  const filePath = path.join(plansDir, `${id}.md`);
  const plan = await readPlanById(filePath, id);

  plan.frontmatter = transitionFrontmatter(plan.frontmatter, 'in_progress');
  await writePlanFile(filePath, plan);
  await setActivePlan(plansDir, id);
  await rebuildPlansIndex(plansDir);

  logger.success(`Plan started: ${id}`);
}

export async function planTickCommand(id: string, stepIndex: number, checked = true): Promise<void> {
  const { plansDir } = await resolvePlansContext();
  const filePath = path.join(plansDir, `${id}.md`);
  const plan = await readPlanById(filePath, id);

  const stepsSection = getSection(plan, 'Steps');
  if (!stepsSection) {
    logger.error('This plan has no "Steps" section.');
    process.exit(1);
  }

  const updatedSteps = updateChecklistItem(stepsSection.content, stepIndex, checked);
  const next = setSection(plan, 'Steps', updatedSteps);
  next.frontmatter.updated = new Date().toISOString().split('T')[0] ?? '';

  await writePlanFile(filePath, next);
  await rebuildPlansIndex(plansDir);

  logger.success(`Updated step ${stepIndex} in ${id}.`);
}

export async function planNoteCommand(id: string, message: string): Promise<void> {
  const { plansDir } = await resolvePlansContext();
  const filePath = path.join(plansDir, `${id}.md`);
  const plan = await readPlanById(filePath, id);

  const stamp = new Date().toISOString();
  const entry = `- ${stamp} — ${message}`;
  const next = appendSectionEntry(plan, 'Notes', entry);
  next.frontmatter.updated = stamp.split('T')[0] ?? '';

  await writePlanFile(filePath, next);
  await rebuildPlansIndex(plansDir);
  logger.success(`Note added to ${id}.`);
}

export async function planDoneCommand(id: string, summary?: string): Promise<void> {
  const { plansDir, nexusDir } = await resolvePlansContext();
  const filePath = path.join(plansDir, `${id}.md`);
  const plan = await readPlanById(filePath, id);

  let nextPlan = plan;
  if (plan.frontmatter.status !== 'done') {
    nextPlan = {
      ...plan,
      frontmatter: transitionFrontmatter(plan.frontmatter, 'done'),
    };
  }

  if (summary) {
    const entry = `- ${new Date().toISOString()} — ${summary}`;
    nextPlan = appendSectionEntry(nextPlan, 'Evidence', entry);
  }

  await writePlanFile(filePath, nextPlan);
  await removeActivePlan(plansDir, id);
  await rebuildPlansIndex(plansDir);
  await appendProgressLog(nexusDir, id, nextPlan.frontmatter.title);

  logger.success(`Plan marked done: ${id}`);
  logger.info('Tip: if you learned something non-obvious, append it to `.nexus/docs/knowledge.md`.');
}

async function resolvePlansContext(targetPath?: string): Promise<{ nexusDir: string; plansDir: string }> {
  const cwd = targetPath ? path.resolve(targetPath) : process.cwd();
  const nexusDir = getNexusDir(cwd);

  if (!nexusDir) {
    logger.error('Could not find .nexus/ directory in this path or any parent directory.');
    logger.info('Run `nexus init` or `nexus adopt` first.');
    process.exit(1);
  }

  const plansDir = path.join(nexusDir, 'plans');
  await fs.ensureDir(plansDir);
  return { nexusDir, plansDir };
}

async function readPlanById(filePath: string, id: string) {
  if (!(await fs.pathExists(filePath))) {
    logger.error(`Plan not found: .nexus/plans/${id}.md`);
    process.exit(1);
  }

  const raw = await fs.readFile(filePath, 'utf-8');
  return parsePlanContent(raw);
}

async function appendProgressLog(nexusDir: string, id: string, title: string): Promise<void> {
  const indexPath = path.join(nexusDir, 'docs', 'index.md');
  if (!(await fs.pathExists(indexPath))) {
    return;
  }

  const today = new Date().toISOString().split('T')[0] ?? '';
  const entry = `- ${today} — ✅ Completed plan \`${id}\`: ${title}`;

  const indexContent = await fs.readFile(indexPath, 'utf-8');
  const marker = '## ⏭️ What\'s Next';
  if (!indexContent.includes(entry) && indexContent.includes(marker)) {
    const updated = indexContent.replace(marker, `## ✅ Progress Log\n\n${entry}\n\n${marker}`);
    await fs.writeFile(indexPath, updated, 'utf-8');
    return;
  }

  if (!indexContent.includes(entry)) {
    await fs.writeFile(indexPath, `${indexContent.trimEnd()}\n\n${entry}\n`, 'utf-8');
  }
}

function renderPlanTemplate(input: {
  id: string;
  title: string;
  type: string;
  owner: string;
  phase: string;
  estimate: string;
  today: string;
}): string {
  return [
    '---',
    'nexus_plan: true',
    `id: "${input.id}"`,
    `title: "${input.title}"`,
    'status: "draft"',
    `created: "${input.today}"`,
    `updated: "${input.today}"`,
    `owner: "${input.owner}"`,
    `source: "manual:${input.type}"`,
    'parent: null',
    `estimate: "${input.estimate}"`,
    `phase: "${input.phase}"`,
    `tags: ["${input.type}"]`,
    '---',
    '',
    '## Goal',
    `Describe the desired outcome for "${input.title}".`,
    '',
    '## Why',
    'Explain why this work matters now.',
    '',
    '## Acceptance Criteria',
    '- [ ] Criterion 1',
    '- [ ] Criterion 2',
    '',
    '## Steps',
    '- [ ] Step 1',
    '- [ ] Step 2',
    '- [ ] Step 3',
    '',
    '## Notes',
    '- (none yet)',
    '',
    '## Evidence',
    '- (to be filled)',
    '',
  ].join('\n');
}

function inferPhaseFromType(type: string): string {
  const map: Record<string, string> = {
    feature: 'feature-delivery',
    bug: 'stabilization',
    refactor: 'refactor',
    spike: 'research',
    chore: 'maintenance',
  };

  return map[type] ?? 'feature-delivery';
}

function inferEstimateFromType(type: string): string {
  const map: Record<string, string> = {
    feature: '3d',
    bug: '1d',
    refactor: '2d',
    spike: '1d',
    chore: '0.5d',
  };

  return map[type] ?? '2d';
}

function statusIcon(status: PlanStatus): string {
  const icons: Record<PlanStatus, string> = {
    draft: '📝',
    approved: '📋',
    in_progress: '🟢',
    blocked: '⏸',
    done: '✅',
    abandoned: '🚫',
  };

  return icons[status];
}

export async function ensurePlansScaffold(cwd = process.cwd()): Promise<void> {
  const { plansDir } = await resolvePlansContext(cwd);

  if (!(await fs.pathExists(path.join(plansDir, '_active.json')))) {
    await fs.writeJson(
      path.join(plansDir, '_active.json'),
      {
        active: [],
        set_at: new Date().toISOString(),
        by: 'nexus plan scaffold',
      },
      { spaces: 2 },
    );
  }

  await rebuildPlansIndex(plansDir);
}
