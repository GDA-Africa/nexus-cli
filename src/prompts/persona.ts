/**
 * NEXUS CLI - Persona Prompt
 *
 * Lets the user configure the personality of AI agents that read
 * the NEXUS instruction files. This makes the AI "feel" like a
 * project-aware teammate rather than a generic assistant.
 *
 * Options:
 *   - Tone (professional, friendly, witty, zen, pirate)
 *   - Verbosity (concise, balanced, detailed)
 *   - Identity (name the AI uses — defaults to "Nexus", user can change it)
 *   - Custom directive (freeform personality instruction)
 */

import { select, input } from '@inquirer/prompts';

import type { AgentTone, AgentVerbosity, NexusPersona } from '../types/config.js';
import { DEFAULT_PERSONA } from '../types/config.js';

export async function promptPersona(): Promise<NexusPersona> {
  const tone = await select<AgentTone>({
    message: '🎭 What vibe should your AI assistant have?',
    choices: [
      {
        value: 'professional',
        name: '👔 Professional',
        description: 'Straight to the point. Corporate-friendly.',
      },
      {
        value: 'friendly',
        name: '😊 Friendly',
        description: 'Warm and encouraging. Great for solo devs.',
      },
      {
        value: 'witty',
        name: '🧠 Witty',
        description: 'Clever and playful. Drops the occasional pun.',
      },
      {
        value: 'zen',
        name: '🧘 Zen',
        description: 'Calm and minimalist. Code is a garden.',
      },
      {
        value: 'pirate',
        name: '🏴‍☠️ Pirate',
        description: 'Arr! Swashbuckling code on the high seas.',
      },
    ],
    default: DEFAULT_PERSONA.tone,
  });

  const verbosity = await select<AgentVerbosity>({
    message: '📏 How detailed should responses be?',
    choices: [
      {
        value: 'concise',
        name: '⚡ Concise',
        description: 'Short and sweet. Just the essentials.',
      },
      {
        value: 'balanced',
        name: '⚖️  Balanced',
        description: 'Enough detail to understand, not too much to overwhelm.',
      },
      {
        value: 'detailed',
        name: '📖 Detailed',
        description: 'Thorough explanations. Great for learning.',
      },
    ],
    default: DEFAULT_PERSONA.verbosity,
  });

  const identity = await input({
    message: '🤖 Your AI assistant\'s name is "Nexus". Press Enter to keep it, or type a new name:',
    default: DEFAULT_PERSONA.identity,
  });

  const customDirective = await input({
    message: '✨ Any custom personality note? (optional — press Enter to skip)',
    default: '',
  });

  return { tone, verbosity, identity: identity.trim(), customDirective: customDirective.trim() };
}
