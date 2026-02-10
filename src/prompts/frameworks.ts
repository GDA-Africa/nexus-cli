/**
 * NEXUS CLI - Framework Prompt
 *
 * Asks the user which frontend framework to use.
 * Options are filtered based on project type.
 */

import { select } from '@inquirer/prompts';

import type { FrontendFramework, ProjectType, BackendFramework } from '../types/config.js';

export async function promptFramework(projectType: ProjectType): Promise<FrontendFramework> {
  if (projectType === 'api') {
    // API projects don't need a frontend framework — we return a sentinel
    return 'nextjs'; // will be ignored; backend prompt handles this
  }

  if (projectType === 'ui-library') {
    // UI library projects use React + Vite as the base
    return select<FrontendFramework>({
      message: 'Which UI framework for your component library?',
      choices: [
        {
          value: 'react-vite',
          name: '⚛️  React + Vite + Storybook',
          description: 'Build, document, and publish React component library with Storybook.',
        },
        {
          value: 'sveltekit',
          name: '🔥 Svelte + SvelteKit',
          description: 'Build Svelte component library with SvelteKit for documentation.',
        },
      ],
    });
  }

  return select<FrontendFramework>({
    message: 'Which frontend framework?',
    choices: [
      {
        value: 'nextjs',
        name: '▲ Next.js 15 (App Router)',
        description: 'React meta-framework with SSR, Server Actions, and API routes built in.',
      },
      {
        value: 'react-vite',
        name: '⚡ React + Vite',
        description: 'Lightweight SPA. Lightning-fast dev server. Pair with a separate API.',
      },
      {
        value: 'sveltekit',
        name: '🔥 SvelteKit',
        description: 'Svelte meta-framework with SSR, filesystem routing, and adapters.',
      },
      {
        value: 'nuxt',
        name: '💚 Nuxt 3',
        description: 'Vue 3 meta-framework with auto-imports and Nitro server engine.',
      },
      {
        value: 'astro',
        name: '🚀 Astro',
        description: 'Content-focused framework. Ships zero JS by default. Island architecture.',
      },
    ],
  });
}

/**
 * Prompt for backend framework (for API projects)
 */
export async function promptBackendFramework(): Promise<BackendFramework> {
  return select<BackendFramework>({
    message: 'Which backend framework?',
    choices: [
      {
        value: 'spring-boot',
        name: '☕ Spring Boot',
        description: 'Java/Kotlin enterprise framework with auto-configuration and production-ready features.',
      },
      {
        value: 'express',
        name: '🚂 Express.js',
        description: 'Minimalist Node.js framework. Most popular, highly flexible.',
      },
      {
        value: 'fastify',
        name: '⚡ Fastify',
        description: 'Fast Node.js framework with schema validation and TypeScript support.',
      },
      {
        value: 'nestjs',
        name: '🐈 NestJS',
        description: 'TypeScript-first Node.js framework inspired by Angular. Great for large teams.',
      },
    ],
  });
}
