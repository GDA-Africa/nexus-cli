/**
 * NEXUS CLI - Framework Prompt
 *
 * Asks the user which frontend framework to use.
 * Options are filtered based on project type.
 */

import { select } from '@inquirer/prompts';

import type { FrontendFramework , ProjectType } from '../types/config.js';

export async function promptFramework(projectType: ProjectType): Promise<FrontendFramework> {
  if (projectType === 'api') {
    // API projects don't need a frontend framework — we return a sentinel
    return 'nextjs'; // will be ignored; backend prompt handles this
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
