import fs from 'node:fs/promises';
import path from 'node:path';

import { fileExists } from './file-system.js';
import { collectPlanSummaries } from './plans/index-builder.js';

export interface BrainDetectionReason {
  code: 'sync-stale' | 'doctor-warn' | 'knowledge-bloat' | 'stale-plan' | 'vitals-missing';
  message: string;
}

export interface BrainDetectionResult {
  checkedAt: string;
  shouldSync: boolean;
  shouldDoctor: boolean;
  reasons: BrainDetectionReason[];
  lastSyncAt: string | null;
  doctorWarnOrHigher: number;
  knowledgeLines: number;
  knowledgeEntries: number;
  stalePlanCount: number;
  vitalsPresent: boolean;
}

export async function detectBrainNeeds(cwd: string): Promise<BrainDetectionResult> {
  const nexusDir = path.join(cwd, '.nexus');
  const reasons: BrainDetectionReason[] = [];

  const [lastSyncAt, doctorWarnOrHigher, knowledge, stalePlanCount, vitalsPresent] = await Promise.all([
    readLastSync(cwd),
    readDoctorWarnCount(cwd),
    readKnowledgeStats(cwd),
    readStalePlans(nexusDir),
    hasVitalSignsFence(cwd),
  ]);

  if (!lastSyncAt || isOlderThan(lastSyncAt, 60)) {
    reasons.push({
      code: 'sync-stale',
      message: 'Last sync is older than 60 minutes (or missing).',
    });
  }

  if (doctorWarnOrHigher > 0) {
    reasons.push({
      code: 'doctor-warn',
      message: `Doctor report has ${doctorWarnOrHigher} warning/error finding(s).`,
    });
  }

  if (knowledge.entries > 150 || knowledge.lines > 700) {
    reasons.push({
      code: 'knowledge-bloat',
      message: `Knowledge base is large (${knowledge.entries} entries, ${knowledge.lines} lines).`,
    });
  }

  if (stalePlanCount > 0) {
    reasons.push({
      code: 'stale-plan',
      message: `${stalePlanCount} active plan(s) appear stale (>14 days).`,
    });
  }

  if (!vitalsPresent) {
    reasons.push({
      code: 'vitals-missing',
      message: 'Vital Signs fence block is missing from .nexus/docs/index.md.',
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    shouldSync: reasons.some((reason) => reason.code === 'sync-stale' || reason.code === 'vitals-missing'),
    shouldDoctor: reasons.some((reason) => reason.code === 'doctor-warn' || reason.code === 'stale-plan'),
    reasons,
    lastSyncAt,
    doctorWarnOrHigher,
    knowledgeLines: knowledge.lines,
    knowledgeEntries: knowledge.entries,
    stalePlanCount,
    vitalsPresent,
  };
}

function isOlderThan(isoDate: string, minutes: number): boolean {
  const parsed = new Date(isoDate).getTime();
  if (Number.isNaN(parsed)) return true;
  const elapsedMs = Date.now() - parsed;
  return elapsedMs > minutes * 60 * 1000;
}

async function readLastSync(cwd: string): Promise<string | null> {
  const syncPath = path.join(cwd, '.nexus', 'state', 'last-sync.json');
  if (!(await fileExists(syncPath))) return null;

  try {
    const raw = await fs.readFile(syncPath, 'utf8');
    const parsed = JSON.parse(raw) as { capturedAt?: unknown };
    return typeof parsed.capturedAt === 'string' ? parsed.capturedAt : null;
  } catch {
    return null;
  }
}

async function readDoctorWarnCount(cwd: string): Promise<number> {
  const doctorPath = path.join(cwd, '.nexus', 'state', 'doctor.json');
  if (!(await fileExists(doctorPath))) return 0;

  try {
    const raw = await fs.readFile(doctorPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      summary?: { warn?: unknown; error?: unknown };
    };

    const warn = Number(parsed.summary?.warn ?? 0);
    const error = Number(parsed.summary?.error ?? 0);
    return (Number.isFinite(warn) ? warn : 0) + (Number.isFinite(error) ? error : 0);
  } catch {
    return 0;
  }
}

async function readKnowledgeStats(cwd: string): Promise<{ lines: number; entries: number }> {
  const knowledgePath = path.join(cwd, '.nexus', 'docs', 'knowledge.md');
  if (!(await fileExists(knowledgePath))) return { lines: 0, entries: 0 };

  try {
    const content = await fs.readFile(knowledgePath, 'utf8');
    const lines = content.split('\n').length;
    const entries = content
      .split('\n')
      .filter((line) => line.trim().startsWith('### ['))
      .length;

    return { lines, entries };
  } catch {
    return { lines: 0, entries: 0 };
  }
}

async function readStalePlans(nexusDir: string): Promise<number> {
  const plans = await collectPlanSummaries(path.join(nexusDir, 'plans')).catch(() => []);
  const threshold = Date.now() - (14 * 24 * 60 * 60 * 1000);

  return plans.filter((plan) => {
    if (plan.status !== 'in_progress') return false;
    const updatedAt = new Date(plan.updated).getTime();
    return !Number.isNaN(updatedAt) && updatedAt < threshold;
  }).length;
}

async function hasVitalSignsFence(cwd: string): Promise<boolean> {
  const indexPath = path.join(cwd, '.nexus', 'docs', 'index.md');
  if (!(await fileExists(indexPath))) return false;

  try {
    const content = await fs.readFile(indexPath, 'utf8');
    return content.includes('<!-- NEXUS:VITAL_SIGNS:START') && content.includes('<!-- NEXUS:VITAL_SIGNS:END -->');
  } catch {
    return false;
  }
}
