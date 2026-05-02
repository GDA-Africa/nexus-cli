import fs from 'node:fs/promises';
import path from 'node:path';

import { Command } from 'commander';
import { execa } from 'execa';

import { getNexusDir } from '../utils/brain.js';
import { buildDoctorContext } from '../utils/doctor/context.js';
import { runDoctor } from '../utils/doctor/index.js';
import type { DoctorReport } from '../utils/doctor/types.js';
import { logger } from '../utils/logger.js';
import { collectPlanSummaries } from '../utils/plans/index-builder.js';
import type { PlanSummary } from '../utils/plans/types.js';
import type { VitalSigns } from '../utils/sensors/index.js';

export interface BriefData {
  generatedAt: string;
  since: string;
  vitalSigns: VitalSigns | null;
  doctor: DoctorReport;
  plans: PlanSummary[];
  shippedLast7d: string[];
  suggestedNext: string[];
}

export function briefCommand(): Command {
  return new Command('brief')
    .description('Render a concise status digest (sync + doctor + plans + recent shipped commits)')
    .option('--md', 'Output markdown instead of terminal text', false)
    .option('--since <refOrDate>', 'Git reference or date expression used for shipped log window', '7 days ago')
    .option('--write <path>', 'Append rendered brief to a file path')
    .action(async (options: { md?: boolean; since?: string; write?: string }) => {
      const cwd = process.cwd();
      const nexusDir = getNexusDir(cwd);

      if (!nexusDir) {
        logger.error('No .nexus database found. Run `nexus init` first.');
        process.exit(1);
      }

      const data = await buildBriefData(cwd, nexusDir, options.since ?? '7 days ago');
      const output = options.md ? renderBriefMarkdown(data) : renderBriefPretty(data);

      if (options.write) {
        const outputPath = path.resolve(cwd, options.write);
        await appendBrief(outputPath, output);
        logger.success(`Brief appended to ${options.write}`);
      }

      console.log(output);
    });
}

export async function buildBriefData(cwd: string, nexusDir: string, since: string): Promise<BriefData> {
  const ctx = await buildDoctorContext(cwd, nexusDir);
  const doctor = await runDoctor(ctx, { minSeverity: 'info' });
  const plans = await collectPlanSummaries(path.join(nexusDir, 'plans'));
  const shippedLast7d = await collectRecentCommits(cwd, since);

  return {
    generatedAt: new Date().toISOString(),
    since,
    vitalSigns: ctx.vitalSigns,
    doctor,
    plans,
    shippedLast7d,
    suggestedNext: suggestNextActions(doctor, plans),
  };
}

export function renderBriefPretty(data: BriefData): string {
  const activePlans = data.plans.filter((plan) => plan.status === 'in_progress');
  const donePlans = data.plans.filter((plan) => plan.status === 'done');

  const lines: string[] = [
    '🧠 Nexus Brief',
    `Generated: ${data.generatedAt}`,
    `Since: ${data.since}`,
    '',
    `Shipped (${data.shippedLast7d.length}):`,
    ...(data.shippedLast7d.length > 0 ? data.shippedLast7d.map((item) => `  - ${item}`) : ['  - none in window']),
    '',
    `Active plans (${activePlans.length}):`,
    ...(activePlans.length > 0
      ? activePlans.map((plan) => `  - ${plan.id}: ${plan.title} [updated ${plan.updated}]`)
      : ['  - none']),
    '',
    `Drift: ${data.doctor.summary.error} error(s), ${data.doctor.summary.warn} warning(s), ${data.doctor.summary.info} info`,
    ...(data.doctor.findings.slice(0, 5).map((finding) => `  - [${finding.id}] ${finding.description}`)),
    '',
    `Suggested next (${data.suggestedNext.length}):`,
    ...data.suggestedNext.map((item) => `  - ${item}`),
    '',
    `Plans done total: ${donePlans.length}`,
    data.vitalSigns ? `Last sync: ${data.vitalSigns.capturedAt}` : 'Last sync: not available',
  ];

  return lines.join('\n');
}

export function renderBriefMarkdown(data: BriefData): string {
  const activePlans = data.plans.filter((plan) => plan.status === 'in_progress');

  return [
    `## Nexus Brief (${data.generatedAt})`,
    '',
    `**Since:** ${data.since}`,
    `**Last sync:** ${data.vitalSigns?.capturedAt ?? 'not available'}`,
    '',
    '### Shipped',
    ...(data.shippedLast7d.length > 0 ? data.shippedLast7d.map((item) => `- ${item}`) : ['- none in window']),
    '',
    '### Active Plans',
    ...(activePlans.length > 0
      ? activePlans.map((plan) => `- \`${plan.id}\` — ${plan.title} _(updated ${plan.updated})_`)
      : ['- none']),
    '',
    '### Drift',
    `- Errors: ${data.doctor.summary.error}`,
    `- Warnings: ${data.doctor.summary.warn}`,
    `- Info: ${data.doctor.summary.info}`,
    ...(data.doctor.findings.slice(0, 10).map((finding) => `- [${finding.id}] ${finding.description}`)),
    '',
    '### Suggested Next',
    ...data.suggestedNext.map((item) => `- ${item}`),
    '',
  ].join('\n');
}

async function appendBrief(outputPath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const stamped = `\n\n---\n${new Date().toISOString()}\n\n${content}\n`;
  await fs.appendFile(outputPath, stamped, 'utf8');
}

async function collectRecentCommits(cwd: string, since: string): Promise<string[]> {
  try {
    const { stdout } = await execa('git', ['log', `--since=${since}`, '--format=%h %s', '-n', '20'], { cwd });
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

function suggestNextActions(doctor: DoctorReport, plans: PlanSummary[]): string[] {
  const actions: string[] = [];

  if (doctor.summary.error > 0) {
    actions.push('Run `nexus doctor --severity=error --json` and resolve critical findings.');
  } else if (doctor.summary.warn > 0) {
    actions.push('Run `nexus doctor --severity=warn` and clean up warning-level drift.');
  }

  const stalePlan = plans.find((plan) => plan.status === 'in_progress');
  if (stalePlan) {
    actions.push(`Update plan progress: \`nexus plan note ${stalePlan.id} "status update"\`.`);
  }

  if (actions.length === 0) {
    actions.push('No urgent drift detected. Continue with the active implementation plan.');
  }

  return actions;
}
