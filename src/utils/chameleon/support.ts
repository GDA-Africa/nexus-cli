/**
 * NEXUS CLI — Which projects Chameleon can actually generate for
 *
 * Two constraints decide this, and neither can be wished away:
 *
 *   1. **Chameleon's tree is DOM-bound** — Radix, MUI, `react-router`,
 *      `next-themes`, `embla-carousel-react`, Tailwind v4. None of it runs
 *      under Expo / React Native. A saved `chameleon` preference must be
 *      *silently and correctly skipped* for a native target, not honoured
 *      into a project that cannot boot.
 *
 *   2. **`scaffoldApp()` emits a Vite app and only a Vite app.** So
 *      `chameleon new` is the generator for React + Vite; everything else
 *      React-flavoured goes the other way round — NEXUS scaffolds the
 *      skeleton, then Chameleon fills `src/` via `init` + `add`/`template`.
 *
 * Path A = Chameleon generates the app, NEXUS overlays.
 * Path B = NEXUS generates the skeleton, Chameleon fills the UI.
 */

import type { NexusConfig } from '../../types/config.js';

/** How Chameleon gets invoked for a given project shape. */
export type ChameleonPath = 'new' | 'init';

export interface ChameleonSupport {
  supported: boolean;
  /** Which delegation path applies. Absent when unsupported. */
  path?: ChameleonPath;
  /** Human-readable explanation — always present, printed either way. */
  reason: string;
}

/**
 * Decide whether Chameleon applies to this project, and how.
 *
 * Deliberately keyed off the resolved config rather than a blueprint name, so
 * it holds for `init`, `adopt`, and anything downstream that has a config.
 */
export function chameleonSupport(config: Pick<NexusConfig, 'frontendFramework' | 'projectType'>): ChameleonSupport {
  // Native first — this is the case where honouring the preference produces a
  // broken project, so it gets checked before anything else.
  if (config.projectType === 'mobile') {
    return {
      supported: false,
      reason:
        'Chameleon is DOM-bound (Radix, MUI, react-router, Tailwind v4) and cannot run under React Native. ' +
        'A native adapter (@chameleon-ui-lib/native) would be needed.',
    };
  }

  switch (config.frontendFramework) {
    case 'react-vite':
      return {
        supported: true,
        path: 'new',
        reason: 'Chameleon generates the Vite app from an AppSpec; NEXUS overlays the brain, tooling, and gate.',
      };

    case 'nextjs':
      return {
        supported: true,
        path: 'init',
        reason: 'NEXUS scaffolds the Next.js skeleton; Chameleon fills the UI via `chameleon init` + `add`/`template`.',
      };

    case 'none':
      // A component library or design-system project: no app shell to
      // generate, but Chameleon's components are exactly the point.
      if (config.projectType === 'ui-library') {
        return {
          supported: true,
          path: 'init',
          reason: 'NEXUS scaffolds the library skeleton; Chameleon supplies components via `chameleon add`.',
        };
      }
      return {
        supported: false,
        reason: 'No frontend framework selected — there is no UI for Chameleon to generate.',
      };

    default:
      return {
        supported: false,
        reason: `Chameleon is a React component library; it does not support ${config.frontendFramework}.`,
      };
  }
}
