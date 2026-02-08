/**
 * NEXUS CLI - Logger Utility
 *
 * Pretty, color-coded terminal output using Chalk.
 */

import chalk from 'chalk';

/** Brand colors */
const COLORS = {
  primary: chalk.cyan,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  dim: chalk.dim,
  bold: chalk.bold,
};

/** Log an informational message */
export function info(message: string): void {
  console.log(COLORS.info('ℹ'), message);
}

/** Log a success message */
export function success(message: string): void {
  console.log(COLORS.success('✔'), message);
}

/** Log a warning message */
export function warn(message: string): void {
  console.log(COLORS.warning('⚠'), message);
}

/** Log an error message */
export function error(message: string): void {
  console.log(COLORS.error('✖'), message);
}

/** Log a branded NEXUS message */
export function nexus(message: string): void {
  console.log(COLORS.primary('▸ NEXUS'), message);
}

/** Print a blank line */
export function newline(): void {
  console.log();
}

/** Print a horizontal rule */
export function divider(): void {
  console.log(COLORS.dim('━'.repeat(50)));
}

/** Print the NEXUS banner */
export function banner(version: string): void {
  newline();
  console.log(COLORS.primary.bold('  🔮 NEXUS CLI') + COLORS.dim(` v${version}`));
  console.log(COLORS.dim('  AI-Native Project Scaffolding'));
  divider();
  newline();
}

/** Print final success with next steps */
export function complete(projectName: string): void {
  newline();
  divider();
  newline();
  console.log(COLORS.success.bold('  ✅ Project created successfully!'));
  newline();
  console.log(COLORS.bold('  Next steps:'));
  console.log(COLORS.primary(`    cd ${projectName}`));
  console.log(COLORS.primary('    npm run dev'));
  newline();
  console.log(COLORS.dim('  Open .nexus/docs/ to start filling in your project documentation.'));
  console.log(COLORS.dim('  AI tools will use these files to understand your project.'));
  newline();
  divider();
  newline();
}

/** Print adopt-mode completion with next steps */
export function adoptComplete(projectName: string): void {
  newline();
  divider();
  newline();
  console.log(COLORS.success.bold('  ✅ NEXUS adopted successfully!'));
  newline();
  console.log(COLORS.bold(`  "${projectName}" now has NEXUS documentation & AI config.`));
  newline();
  console.log(COLORS.bold('  What happens next:'));
  console.log(COLORS.primary('    1. Open your AI coding tool (Copilot, Cursor, Windsurf, etc.)'));
  console.log(COLORS.primary('    2. Ask it to do anything (e.g., "add a feature", "fix a bug")'));
  console.log(COLORS.primary('    3. It will detect the template docs and auto-populate them first'));
  console.log(COLORS.primary('    4. It will ask you questions for things it can\'t infer from code'));
  newline();
  console.log(COLORS.dim('  Files added:'));
  console.log(COLORS.dim('    .nexus/docs/   — 8 structured documentation files (status: template)'));
  console.log(COLORS.dim('    .nexus/ai/     — AI agent instructions (single source of truth)'));
  console.log(COLORS.dim('    .cursorrules, .windsurfrules, .clinerules, AGENTS.md — AI tool pointers'));
  console.log(COLORS.dim('    .github/copilot-instructions.md — GitHub Copilot config'));
  newline();
  divider();
  newline();
}

export const logger = {
  info,
  success,
  warn,
  error,
  nexus,
  newline,
  divider,
  banner,
  complete,
  adoptComplete,
};
