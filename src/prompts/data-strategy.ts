/**
 * NEXUS CLI - Data Strategy Prompt
 *
 * Asks the user about their data handling approach.
 */

import { select } from '@inquirer/prompts';

import type { DataStrategy } from '../types/config.js';

export async function promptDataStrategy(): Promise<DataStrategy> {
  return select<DataStrategy>({
    message: 'How will your app handle data?',
    choices: [
      {
        value: 'cloud-first',
        name: '☁️  Cloud First',
        description: 'Data lives on the server. Classic SaaS pattern — simple and proven.',
      },
      {
        value: 'local-first',
        name: '💾 Local First',
        description: 'Data lives on device, syncs to cloud. Offline-capable, fast UX.',
      },
      {
        value: 'local-only',
        name: '📱 Local Only',
        description: 'All data stays on the device. No server needed. Privacy-first.',
      },
      {
        value: 'hybrid',
        name: '🔄 Hybrid',
        description: 'Mix of local and cloud. Some data cached, some server-only.',
      },
    ],
  });
}
