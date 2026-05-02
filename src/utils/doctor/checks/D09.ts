import fs from 'node:fs/promises';
import path from 'node:path';

import { execa } from 'execa';

import { fileExists } from '../../file-system.js';
import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

export const D09_handshake_missed: DoctorCheck = {
  id: 'D09',
  name: 'Handshake Missed',
  description: 'Checks whether recent commit messages include the active wake token',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const sessionPath = path.join(ctx.cwd, '.nexus', 'state', 'session.json');
    if (!(await fileExists(sessionPath))) {
      return [];
    }

    const token = await readSessionToken(sessionPath);
    if (!token) {
      return [{
        id: 'D09',
        severity: 'info',
        description: 'Session file exists but has no wake token recorded.',
        fixHint: 'Refresh session metadata so commit verification can include wake-token checks.',
      }];
    }

    let commitsRaw = '';
    try {
      const { stdout } = await execa('git', ['log', '--format=%s', '-n', '20'], { cwd: ctx.cwd });
      commitsRaw = stdout;
    } catch {
      return [];
    }

    const subjects = commitsRaw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (subjects.length === 0) {
      return [];
    }

    const hasToken = subjects.some((subject) => subject.includes(token));
    if (hasToken) {
      return [];
    }

    return [{
      id: 'D09',
      severity: 'info',
      description: `No wake token (${token}) found in the last ${subjects.length} commit message(s).`,
      fixHint: 'Include the wake token in commit metadata when using strict handshake discipline.',
    }];
  },
};

async function readSessionToken(sessionPath: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(sessionPath, 'utf8');
    const parsed = JSON.parse(raw) as { token?: unknown };
    return typeof parsed.token === 'string' && parsed.token.trim().length > 0 ? parsed.token.trim() : null;
  } catch {
    return null;
  }
}
