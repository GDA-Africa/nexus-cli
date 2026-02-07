/**
 * NEXUS CLI - Application Patterns Prompt
 *
 * Asks the user which application patterns to include.
 */

import { checkbox } from '@inquirer/prompts';

import type { AppPattern } from '../types/config.js';

export async function promptPatterns(): Promise<AppPattern[]> {
  return checkbox<AppPattern>({
    message: 'Which application patterns do you need? (select all that apply)',
    choices: [
      {
        value: 'pwa',
        name: '📲 Progressive Web App (PWA)',
        description: 'Installable, works offline, push notifications',
      },
      {
        value: 'offline-first',
        name: '📡 Offline First',
        description: 'Full functionality without internet, smart sync',
      },
      {
        value: 'theming',
        name: '🎨 Theming / Dark Mode',
        description: 'CSS variable-based theme system with light/dark toggle',
      },
      {
        value: 'i18n',
        name: '🌍 Internationalization (i18n)',
        description: 'Multi-language support with translation files',
      },
      {
        value: 'white-label',
        name: '🏷️  White Label',
        description: 'Rebrandable app with configurable themes and logos',
      },
      {
        value: 'real-time',
        name: '⚡ Real-time',
        description: 'WebSocket or SSE for live updates',
      },
    ],
  });
}
