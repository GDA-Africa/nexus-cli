/**
 * NEXUS CLI - Adoption Interview Prompt
 *
 * Before adopting an existing project, we interview the user to gather
 * context that will help AI agents populate the template docs more intelligently.
 *
 * This is the "pre-adoption onboarding" — a brief conversation about:
 *   - What the project does (for vision doc)
 *   - Architecture type (monolith, microservices, serverless, etc.)
 *   - Main tech stack (if we couldn't auto-detect it)
 *   - Known pain points or areas needing docs
 *   - Whether NEXUS should be local-only or team-shared
 */

import { input, select, confirm } from '@inquirer/prompts';

import type { ProjectInfo } from '../utils/project-detector.js';

/** User answers from the pre-adoption interview */
export interface AdoptionContext {
  /** One-sentence description of what the project does */
  projectDescription: string;
  /** Architecture pattern */
  architectureType: 'monolith' | 'microservices' | 'serverless' | 'modular-monolith' | 'other';
  /** Main tech stack (if not auto-detected) */
  techStack: string;
  /** Areas that need documentation or are pain points */
  painPoints: string;
  /** Whether .nexus/ should be gitignored (local-only) */
  localOnly: boolean;
}

/**
 * Run the pre-adoption interview.
 *
 * @param projectInfo - Detected project information (used for smart defaults)
 * @returns User responses to guide doc generation
 */
export async function promptAdoption(projectInfo: ProjectInfo): Promise<AdoptionContext> {
  const displayName = projectInfo.name ?? 'this project';

  console.log('');
  console.log('🔮 Let\'s set up NEXUS for your existing project.');
  console.log('   Answer a few quick questions so AI agents understand your codebase.');
  console.log('');

  // 1. Project description
  const projectDescription = await input({
    message: `What does ${displayName} do? (One sentence for the vision doc)`,
    default: projectInfo.description ?? '',
    validate: (value) => {
      if (value.trim().length < 10) {
        return 'Please provide at least a 10-character description.';
      }
      return true;
    },
  });

  // 2. Architecture type
  const architectureType = await select<AdoptionContext['architectureType']>({
    message: 'What\'s the architecture pattern?',
    choices: [
      {
        value: 'monolith',
        name: '🏛️  Monolith',
        description: 'Single codebase, all features in one app',
      },
      {
        value: 'microservices',
        name: '🔗 Microservices',
        description: 'Multiple independent services communicating via APIs',
      },
      {
        value: 'serverless',
        name: '☁️  Serverless',
        description: 'Cloud Functions, Lambda, Vercel Functions, etc.',
      },
      {
        value: 'modular-monolith',
        name: '📦 Modular Monolith',
        description: 'Single deployment, organized into independent modules',
      },
      {
        value: 'other',
        name: '🔧 Other',
        description: 'Something else (explain in pain points)',
      },
    ],
    default: detectArchitectureType(projectInfo),
  });

  // 3. Tech stack (if we couldn't detect a framework)
  let techStack = projectInfo.framework ?? 'unknown';
  if (techStack === 'unknown' || techStack === 'node') {
    techStack = await input({
      message: 'What\'s the main tech stack? (e.g., "Express + MongoDB", "Go + PostgreSQL")',
      default: buildTechStackGuess(projectInfo),
      validate: (value) => {
        if (value.trim().length < 3) {
          return 'Please provide a valid tech stack description.';
        }
        return true;
      },
    });
  }

  // 4. Pain points
  const painPoints = await input({
    message: 'Any known pain points or areas that need better docs? (optional)',
    default: '',
  });

  // 5. Local-only mode
  const localOnly = await confirm({
    message: 'Keep NEXUS local-only? (adds .nexus/ to .gitignore - won\'t be shared with team)',
    default: false,
  });

  return {
    projectDescription: projectDescription.trim(),
    architectureType,
    techStack,
    painPoints: painPoints.trim(),
    localOnly,
  };
}

/* ──────────────────────────────────────────────────────────────
 * Smart Defaults
 * ────────────────────────────────────────────────────────────── */

/**
 * Guess architecture type based on detected dependencies.
 */
function detectArchitectureType(
  projectInfo: ProjectInfo,
): AdoptionContext['architectureType'] {
  const deps = projectInfo.dependencies.map((d) => d.toLowerCase());

  if (
    deps.includes('firebase-functions') ||
    deps.includes('@google-cloud/functions-framework') ||
    deps.includes('aws-lambda') ||
    deps.includes('@vercel/node')
  ) {
    return 'serverless';
  }

  if (
    deps.some((d) => d.includes('microservice') || d.includes('grpc') || d.includes('rabbitmq'))
  ) {
    return 'microservices';
  }

  return 'monolith';
}

/**
 * Build a tech stack guess from detected dependencies.
 */
function buildTechStackGuess(projectInfo: ProjectInfo): string {
  const deps = projectInfo.dependencies;
  const parts: string[] = [];

  // Backend framework
  if (deps.includes('express')) parts.push('Express');
  if (deps.includes('fastify')) parts.push('Fastify');
  if (deps.includes('koa')) parts.push('Koa');
  if (deps.includes('hapi')) parts.push('Hapi');
  if (deps.includes('nestjs')) parts.push('NestJS');

  // Database
  if (deps.includes('mongodb') || deps.includes('mongoose')) parts.push('MongoDB');
  if (deps.includes('pg') || deps.includes('postgres')) parts.push('PostgreSQL');
  if (deps.includes('mysql') || deps.includes('mysql2')) parts.push('MySQL');
  if (deps.includes('prisma')) parts.push('Prisma');

  // Frontend
  if (projectInfo.framework && projectInfo.framework !== 'node' && projectInfo.framework !== 'unknown') {
    parts.push(projectInfo.framework);
  }

  return parts.length > 0 ? parts.join(' + ') : 'Node.js';
}
