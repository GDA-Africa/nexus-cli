/**
 * NEXUS CLI — Type Definitions: Chameleon UI delegation
 *
 * NEXUS interviews, Chameleon generates. These types describe the boundary
 * between the two tools:
 *
 *   - `UiProvider`        — which UI generator a project uses (opt-in, remembered)
 *   - `AppSpecV2`         — the spec NEXUS builds and hands to `chameleon new`
 *   - `ChameleonEnvelope` — the `--json` envelope every Chameleon command returns
 *
 * Verified against `@chameleon-ui-lib/react@2.0.0-alpha.1`
 * (`bin/engine/app.mjs`, `bin/engine/spec.mjs`, `docs/CLI_JSON.md`).
 *
 * NEXUS takes NO hard dependency on Chameleon: nothing here imports it, and
 * every shape is redeclared locally so the CLI compiles and runs with
 * Chameleon absent.
 */

/** Which UI generator a project delegates to. `none` = NEXUS generates the UI. */
export type UiProvider = 'chameleon' | 'none';

/** Where a resolved UI preference came from — highest precedence first. */
export type UiPreferenceSource = 'flag' | 'project' | 'global' | 'default';

/** A resolved UI preference plus the provenance needed for `--explain`. */
export interface ResolvedUiPreference {
  provider: UiProvider;
  source: UiPreferenceSource;
  /** Config file the value came from — absent for `flag` and `default`. */
  path?: string;
}

/* ──────────────────────────────────────────────────────────────
 * AppSpec v2 — the NEXUS → Chameleon contract
 * ────────────────────────────────────────────────────────────── */

/** Chameleon's five design languages (`VALID_THEMES` in registry.mjs). */
export const CHAMELEON_THEMES = ['material', 'simple', 'minimalist', 'glassy', 'liquid'] as const;
export type ChameleonTheme = (typeof CHAMELEON_THEMES)[number];

/** Shell navigation styles accepted by `shell.nav`. */
export const CHAMELEON_NAV_STYLES = ['sidebar', 'topbar', 'none'] as const;
export type ChameleonNav = (typeof CHAMELEON_NAV_STYLES)[number];

/** Light/dark mode for the generated shell. */
export type ChameleonMode = 'light' | 'dark';

/**
 * The 14 template keys Chameleon ships (`TEMPLATES` in registry.mjs).
 *
 * A page spec may be nothing more than `{ version: 1, name, template }` —
 * `validateSpec` requires exactly one of `template` or `blocks`. That
 * template-only form is what makes the NEXUS interview tractable: ask which
 * pages the user wants, map answers to these keys, never touch block-level
 * composition.
 */
export const CHAMELEON_TEMPLATES = [
  'auth',
  'settings',
  'ecommerce',
  'analytics-dashboard',
  'landing-page',
  'blog-article',
  'pricing-page',
  'contact-support',
  'user-profile',
  'admin-dashboard',
  'ecommerce-product',
  'settings-panel',
  'auth-flow',
  'documentation',
] as const;
export type ChameleonTemplate = (typeof CHAMELEON_TEMPLATES)[number];

/** Shapes `dataSlots` can take. Mock-only by design — see the CHAMELEON-DATA seam. */
export const CHAMELEON_DATA_SHAPES = ['table', 'list', 'stats'] as const;
export type ChameleonDataShape = (typeof CHAMELEON_DATA_SHAPES)[number];

/** ChameleonSpec v1 — one page, described declaratively. */
export interface ChameleonSpecV1 {
  version: 1;
  /** kebab-case page name */
  name: string;
  /** EITHER a template key... */
  template?: string;
  /** ...OR flat composed blocks. Exactly one of the two. */
  blocks?: Array<{ component: string; props?: Record<string, unknown> }>;
  theme?: ChameleonTheme;
  mode?: ChameleonMode;
}

/** One route in the generated app. */
export interface AppSpecPage {
  /** Must start with `/` and be unique across the spec. */
  route: string;
  title: string;
  spec: ChameleonSpecV1;
}

/**
 * A marked data seam. Chameleon emits `src/data/<id>.ts` with a
 * `// CHAMELEON-DATA` marker and typed mock data; NEXUS wires the real
 * backend to that marker.
 */
export interface AppSpecDataSlot {
  /** kebab-case, unique */
  id: string;
  shape: ChameleonDataShape;
  mock: boolean;
}

/** AppSpec v2 — the whole application, as handed to `chameleon new`. */
export interface AppSpecV2 {
  version: 2;
  app: {
    /** kebab-case; enforced by Chameleon */
    name: string;
    brand?: { primaryColor: string };
  };
  shell: {
    nav: ChameleonNav;
    theme: ChameleonTheme;
    mode: ChameleonMode;
  };
  pages: AppSpecPage[];
  dataSlots?: AppSpecDataSlot[];
}

/* ──────────────────────────────────────────────────────────────
 * The `--json` envelope
 * ────────────────────────────────────────────────────────────── */

/** One error from a Chameleon command. `code` is stable from v1.2.0. */
export interface ChameleonError {
  code: string;
  message: string;
  validationErrors?: Array<{ path: string; message: string; suggestion?: string }>;
}

/**
 * The envelope every Chameleon command emits under `--json`.
 *
 * Stable contract from Chameleon v1.2.0: fields may be added, never renamed
 * or removed without a major bump. NEXUS treats it as the source of truth for
 * what happened, and records it as generation evidence.
 */
export interface ChameleonEnvelope<TData = unknown> {
  ok: boolean;
  command: string;
  version: string;
  data?: TData;
  warnings?: string[];
  errors?: ChameleonError[];
  filesWritten?: string[];
  filesDeleted?: string[];
  nextSteps?: string[];
}

/* ──────────────────────────────────────────────────────────────
 * Capabilities handshake
 * ────────────────────────────────────────────────────────────── */

/**
 * Capabilities NEXUS gates its integration on.
 *
 * `chameleon --version --json` returns only `{ cli, library }` today, so
 * NEXUS infers a baseline from the version and grows it when Chameleon starts
 * advertising `data.capabilities` (CH-11). Checking capabilities rather than
 * semver ranges is what lets NEXUS degrade instead of failing.
 */
export type ChameleonCapability =
  /** `chameleon new <dir> --app-spec <file>` exists */
  | 'appspec-v2'
  /** `--validate-only` pre-flight is supported */
  | 'validate-only'
  /** every command accepts `--json` and returns the stable envelope */
  | 'json-envelope'
  /** `appSpec.app.target: "none"` — UI sources only, no project shell (CH-02) */
  | 'target-none'
  /** `appSpec.app.target: "next"` — App Router output (CH-02) */
  | 'target-next'
  /** generating into a non-empty directory (CH-03) */
  | 'allow-existing'
  /** `chameleon agents init --fragment` writes `chameleon.agent.md` only (CH-04) */
  | 'agents-fragment'
  /** `chameleon init` detects Next.js and configures Tailwind correctly (CH-05) */
  | 'init-framework-aware'
  /** `chameleon schema` / exported JSON Schemas (CH-08) */
  | 'schema-export';

/** What NEXUS learned about the Chameleon install available in this environment. */
export interface ChameleonInstall {
  /** False when Chameleon is not resolvable — a normal, handled outcome. */
  available: boolean;
  cliVersion?: string;
  libraryVersion?: string;
  capabilities: ChameleonCapability[];
  /** How it was resolved: local `node_modules/.bin`, `npx`, or `NEXUS_CHAMELEON_BIN`. */
  resolvedFrom?: 'local' | 'npx' | 'env';
  /** Why it is unavailable, when it is. */
  reason?: string;
}
