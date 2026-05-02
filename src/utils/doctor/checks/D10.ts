import fs from 'node:fs/promises';
import path from 'node:path';

import { fileExists } from '../../file-system.js';
import type { DoctorCheck, DoctorContext, DoctorFinding } from '../types.js';

export const D10_skills_drift: DoctorCheck = {
  id: 'D10',
  name: 'Skills Drift',
  description: 'Checks if generated core skills metadata is out of sync with package version',
  async run(ctx: DoctorContext): Promise<DoctorFinding[]> {
    const packageJsonPath = path.join(ctx.cwd, 'package.json');
    const skillsReadmePath = path.join(ctx.cwd, '.nexus', 'skills', 'README.md');

    if (!(await fileExists(packageJsonPath)) || !(await fileExists(skillsReadmePath))) {
      return [];
    }

    const packageVersion = await readSkillsDependencyVersion(packageJsonPath);
    const readmeVersion = await readGeneratedSkillsVersion(skillsReadmePath);

    if (!packageVersion || !readmeVersion || packageVersion === readmeVersion) {
      return [];
    }

    return [{
      id: 'D10',
      severity: 'warn',
      description: `Skills metadata drift detected: dependency has ${packageVersion}, but .nexus/skills/README.md references ${readmeVersion}.`,
      fixHint: 'Run `nexus upgrade` (or regenerate skills) to align generated core skills with package version.',
    }];
  },
};

async function readSkillsDependencyVersion(packageJsonPath: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    };

    const dep = parsed.dependencies?.['@nexus-framework/skills'] ?? parsed.devDependencies?.['@nexus-framework/skills'];
    if (typeof dep !== 'string') return null;

    return normalizeSemver(dep);
  } catch {
    return null;
  }
}

async function readGeneratedSkillsVersion(readmePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(readmePath, 'utf8');
    const match = content.match(/@nexus-framework\/skills@([\d]+\.[\d]+\.[\d]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function normalizeSemver(input: string): string {
  const stripped = input.trim().replace(/^[~^]/, '');
  const match = stripped.match(/([\d]+\.[\d]+\.[\d]+)/);
  return match?.[1] ?? stripped;
}
