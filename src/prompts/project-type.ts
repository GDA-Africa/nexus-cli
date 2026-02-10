/**
 * NEXUS CLI - Project Type Prompt
 *
 * Asks the user what kind of project they're building.
 */

import { select } from '@inquirer/prompts';

import type { ProjectType } from '../types/config.js';

export async function promptProjectType(): Promise<ProjectType> {
  return select<ProjectType>({
    message: 'What are you building?',
    choices: [
      {
        value: 'web',
        name: '🌐 Web Application',
        description: 'Full-stack or frontend web app (React, Next.js, Svelte, etc.)',
      },
      {
        value: 'api',
        name: '⚡ API / Backend Service',
        description: 'REST or GraphQL API (Express, Fastify, NestJS, Spring Boot)',
      },
      {
        value: 'ui-library',
        name: '🎨 UI Component Library',
        description: 'Reusable component library with Storybook & documentation',
      },
      {
        value: 'monorepo',
        name: '📦 Monorepo',
        description: 'Multi-package workspace (Turborepo)',
      },
    ],
  });
}
