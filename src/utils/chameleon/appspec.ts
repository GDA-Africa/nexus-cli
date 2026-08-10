/**
 * NEXUS CLI — AppSpec v2 builder + local validator
 *
 * `nexus init` is the interview; Chameleon is the generator. This module is
 * the hinge: it turns a resolved `NexusConfig` (plus whatever the interview
 * gathered about brand and pages) into the AppSpec v2 that
 * `chameleon new --app-spec` consumes.
 *
 * The validator here is a deliberate mirror of Chameleon's own
 * `validateAppSpec` / `validateSpec` (verified against
 * `@chameleon-ui-lib/react@2.0.0-alpha.1`). NEXUS commits to never handing
 * Chameleon a spec it hasn't already checked — a local check turns a
 * subprocess round-trip into an immediate, well-located error, and keeps the
 * failure ours when the spec is ours to fix.
 *
 * It is a mirror, not a replacement: `chameleon new --validate-only` still
 * runs before generation. When the two disagree, Chameleon wins.
 */

import type {
  AppSpecDataSlot,
  AppSpecPage,
  AppSpecV2,
  ChameleonDataShape,
  ChameleonMode,
  ChameleonNav,
  ChameleonTheme,
} from '../../types/chameleon.js';
import {
  CHAMELEON_DATA_SHAPES,
  CHAMELEON_NAV_STYLES,
  CHAMELEON_TEMPLATES,
  CHAMELEON_THEMES,
} from '../../types/chameleon.js';
import type { NexusConfig } from '../../types/config.js';
import { toSlug } from '../validator.js';

/** Chameleon's kebab-case rule, copied verbatim from `app.mjs`. */
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** One page as the interview describes it, before it becomes a spec. */
export interface PageRequest {
  /** Route path — must start with `/`. */
  route: string;
  title: string;
  /** One of Chameleon's 14 template keys. */
  template: string;
}

export interface BuildAppSpecOptions {
  theme?: ChameleonTheme;
  mode?: ChameleonMode;
  nav?: ChameleonNav;
  /** Hex brand colour; omitted entirely when not set. */
  primaryColor?: string;
  /** Pages the user asked for. Falls back to a sensible default per project type. */
  pages?: PageRequest[];
  /** Marked `// CHAMELEON-DATA` seams NEXUS will later wire a backend to. */
  dataSlots?: AppSpecDataSlot[];
}

/** Default page set when the interview hasn't gathered pages yet. */
function defaultPages(config: Pick<NexusConfig, 'projectType' | 'displayName'>): PageRequest[] {
  switch (config.projectType) {
    case 'ui-library':
      return [{ route: '/', title: 'Documentation', template: 'documentation' }];
    case 'web':
      return [
        { route: '/', title: config.displayName, template: 'landing-page' },
        { route: '/login', title: 'Sign in', template: 'auth' },
      ];
    default:
      return [{ route: '/', title: 'Dashboard', template: 'admin-dashboard' }];
  }
}

/** Turn a page title/route into the kebab-case name a ChameleonSpec requires. */
function pageName(page: PageRequest): string {
  const fromTitle = toSlug(page.title);
  if (KEBAB.test(fromTitle)) return fromTitle;

  const fromRoute = toSlug(page.route.replace(/^\//, '') || 'home');
  return KEBAB.test(fromRoute) ? fromRoute : 'page';
}

/**
 * Build an AppSpec v2 from a resolved NEXUS config.
 *
 * Every page is emitted in the template-only form
 * (`{ version: 1, name, template }`) — `validateSpec` accepts exactly one of
 * `template` or `blocks`, and the template form is what keeps the interview
 * tractable: map answers to the 14 template keys and never touch block-level
 * composition.
 */
export function buildAppSpec(
  config: Pick<NexusConfig, 'projectName' | 'displayName' | 'projectType'>,
  options: BuildAppSpecOptions = {},
): AppSpecV2 {
  const pages = options.pages?.length ? options.pages : defaultPages(config);
  const theme = options.theme ?? 'simple';
  const mode = options.mode ?? 'light';

  const spec: AppSpecV2 = {
    version: 2,
    app: {
      name: toSlug(config.projectName),
      ...(options.primaryColor ? { brand: { primaryColor: options.primaryColor } } : {}),
    },
    shell: {
      nav: options.nav ?? 'sidebar',
      theme,
      mode,
    },
    pages: pages.map<AppSpecPage>((page) => ({
      route: page.route,
      title: page.title,
      spec: {
        version: 1,
        name: pageName(page),
        template: page.template,
      },
    })),
  };

  if (options.dataSlots?.length) {
    spec.dataSlots = options.dataSlots;
  }

  return spec;
}

/* ──────────────────────────────────────────────────────────────
 * Local validation — mirrors Chameleon's validateAppSpec
 * ────────────────────────────────────────────────────────────── */

export interface AppSpecValidationError {
  path: string;
  message: string;
}

export interface AppSpecValidation {
  valid: boolean;
  errors: AppSpecValidationError[];
}

/**
 * Validate an AppSpec v2 the way Chameleon will, before shelling out.
 *
 * Error `path`s use the same `$.pages[0].spec.template` convention Chameleon
 * uses, so a NEXUS-reported error and a Chameleon-reported one point at the
 * same place in the same words.
 */
export function validateAppSpec(spec: unknown): AppSpecValidation {
  const errors: AppSpecValidationError[] = [];
  const err = (path: string, message: string): void => {
    errors.push({ path, message });
  };

  if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
    return { valid: false, errors: [{ path: '$', message: 'AppSpec must be an object.' }] };
  }

  const appSpec = spec as Partial<AppSpecV2>;

  if (appSpec.version !== 2) {
    err('$.version', `Unsupported app spec version: ${JSON.stringify(appSpec.version)}. Expected 2.`);
  }

  const appName = appSpec.app?.name;
  if (typeof appName !== 'string' || !KEBAB.test(appName)) {
    err('$.app.name', 'app.name must be kebab-case.');
  }

  if (appSpec.app?.brand !== undefined && typeof appSpec.app.brand?.primaryColor !== 'string') {
    err('$.app.brand.primaryColor', 'brand requires primaryColor.');
  }

  const nav = appSpec.shell?.nav ?? 'sidebar';
  if (!(CHAMELEON_NAV_STYLES as readonly string[]).includes(nav)) {
    err('$.shell.nav', `nav must be sidebar | topbar | none, got '${nav}'.`);
  }

  const theme = appSpec.shell?.theme;
  if (theme !== undefined && !(CHAMELEON_THEMES as readonly string[]).includes(theme)) {
    err('$.shell.theme', `Invalid theme '${theme}'.`);
  }

  if (!Array.isArray(appSpec.pages) || appSpec.pages.length === 0) {
    err('$.pages', 'pages must be a non-empty array.');
  } else {
    const routes = new Set<string>();
    appSpec.pages.forEach((page, i) => {
      if (typeof page?.route !== 'string' || !page.route.startsWith('/')) {
        err(`$.pages[${i}].route`, "route must start with '/'.");
      } else if (routes.has(page.route)) {
        err(`$.pages[${i}].route`, `duplicate route '${page.route}'.`);
      } else {
        routes.add(page.route);
      }

      if (typeof page?.title !== 'string' || !page.title) {
        err(`$.pages[${i}].title`, 'title is required.');
      }

      validatePageSpec(page?.spec, `$.pages[${i}].spec`, err);
    });
  }

  if (appSpec.dataSlots !== undefined) {
    if (!Array.isArray(appSpec.dataSlots)) {
      err('$.dataSlots', 'dataSlots must be an array.');
    } else {
      const ids = new Set<string>();
      appSpec.dataSlots.forEach((slot, i) => {
        if (typeof slot?.id !== 'string' || !KEBAB.test(slot.id)) {
          err(`$.dataSlots[${i}].id`, 'id must be kebab-case.');
        } else if (ids.has(slot.id)) {
          err(`$.dataSlots[${i}].id`, `duplicate id '${slot.id}'.`);
        } else {
          ids.add(slot.id);
        }

        if (slot?.shape && !(CHAMELEON_DATA_SHAPES as readonly string[]).includes(slot.shape as ChameleonDataShape)) {
          err(`$.dataSlots[${i}].shape`, 'shape must be table | list | stats.');
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/** ChameleonSpec v1 rules — exactly one of `template` or `blocks`. */
function validatePageSpec(
  spec: unknown,
  basePath: string,
  err: (path: string, message: string) => void,
): void {
  if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
    err(basePath, 'Spec must be a JSON object.');
    return;
  }

  const pageSpec = spec as Record<string, unknown>;

  if (pageSpec.version !== 1) {
    err(`${basePath}.version`, `Unsupported spec version: ${JSON.stringify(pageSpec.version)}. Expected 1.`);
  }

  if (typeof pageSpec.name !== 'string' || !KEBAB.test(pageSpec.name)) {
    err(`${basePath}.name`, 'Spec requires a kebab-case \'name\' (e.g. "team-dashboard").');
  }

  const hasTemplate = pageSpec.template !== undefined;
  const hasBlocks = pageSpec.blocks !== undefined;

  if (hasTemplate === hasBlocks) {
    err(basePath, "Spec must define exactly one of 'template' or 'blocks'.");
    return;
  }

  if (hasTemplate && !(CHAMELEON_TEMPLATES as readonly string[]).includes(pageSpec.template as string)) {
    err(`${basePath}.template`, `Unknown template: '${String(pageSpec.template)}'.`);
  }

  // Block-level composition is Chameleon's business — NEXUS only checks the
  // shape it is responsible for producing, and lets `--validate-only` catch
  // unknown component names against the live catalogue.
  if (hasBlocks && (!Array.isArray(pageSpec.blocks) || pageSpec.blocks.length === 0)) {
    err(`${basePath}.blocks`, "'blocks' must be a non-empty array.");
  }
}
