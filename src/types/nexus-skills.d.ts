/**
 * Type declarations for @nexus-framework/skills
 *
 * The package ships plain JS (no TypeScript source).
 * These declarations let nexus-cli import it with full type safety.
 */

declare module '@nexus-framework/skills' {
  /**
   * Get the absolute path to a skill file.
   * Returns null if the framework/slug combination does not exist.
   */
  export function getSkillPath(framework: string, slug: string): string | null;

  /**
   * Read a skill file's content as a UTF-8 string.
   * Returns null if the framework/slug combination does not exist.
   */
  export function getSkillContent(framework: string, slug: string): string | null;

  /**
   * List all available skill slugs for a given framework directory.
   * Returns an empty array if the framework does not exist in the package.
   */
  export function listSkills(framework: string): string[];

  /**
   * List all framework directory names available in the package.
   * e.g. ['next.js', 'react-vite', 'sveltekit', 'shared', ...]
   */
  export function listFrameworks(): string[];
}
