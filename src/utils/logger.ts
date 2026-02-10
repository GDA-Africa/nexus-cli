/**
 * NEXUS CLI - Logger Utility
 *
 * Pretty, color-coded terminal output using Chalk, gradient-string, and boxen.
 */

import boxen from 'boxen';
import chalk from 'chalk';
import gradient from 'gradient-string';

/** NEXUS brand gradient (cyan → blue → purple) */
const nexusGradient = gradient(['#00f2ff', '#0090ff', '#7b61ff']);

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

/** Print the NEXUS banner with gradient */
export function banner(version: string): void {
  newline();
  const title = nexusGradient('  🔮 NEXUS CLI');
  console.log(title + COLORS.dim(` v${version}`));
  console.log(COLORS.dim('  AI-Native Project Scaffolding'));
  divider();
  newline();
}

/** Print final success with next steps */
export function complete(projectName: string, displayName?: string): void {
  const prettyName = displayName ?? projectName;
  newline();
  
  const message = [
    COLORS.success.bold('✅ Project created successfully!'),
    '',
    COLORS.bold(prettyName),
    '',
    COLORS.bold('Next steps:'),
    COLORS.primary(`  cd ${projectName}`),
    COLORS.primary('  npm run dev'),
    '',
    COLORS.dim('Open .nexus/docs/ to start filling in your project documentation.'),
    COLORS.dim('AI tools will use these files to understand your project.'),
  ].join('\n');

  console.log(boxen(message, {
    padding: 1,
    margin: 0,
    borderStyle: 'round',
    borderColor: 'cyan',
  }));
  
  newline();
}

/** Print adopt-mode completion with next steps */
export function adoptComplete(displayName: string): void {
  newline();
  
  const message = [
    COLORS.success.bold('✅ NEXUS adopted successfully!'),
    '',
    COLORS.bold(`"${displayName}" now has NEXUS documentation & AI config.`),
    '',
    COLORS.bold('What happens next:'),
    COLORS.primary('  1. Open your AI coding tool (Copilot, Cursor, Windsurf, etc.)'),
    COLORS.primary('  2. Ask it to do anything (e.g., "add a feature", "fix a bug")'),
    COLORS.primary('  3. It will detect the template docs and auto-populate them first'),
    COLORS.primary('  4. It will ask you questions for things it can\'t infer from code'),
    '',
    COLORS.dim('Files added:'),
    COLORS.dim('  .nexus/docs/   — 8 structured documentation files (status: template)'),
    COLORS.dim('  .nexus/ai/     — AI agent instructions (single source of truth)'),
    COLORS.dim('  .cursorrules, .windsurfrules, .clinerules, AGENTS.md — AI tool pointers'),
    COLORS.dim('  .github/copilot-instructions.md — GitHub Copilot config'),
  ].join('\n');

  console.log(boxen(message, {
    padding: 1,
    margin: 0,
    borderStyle: 'round',
    borderColor: 'cyan',
  }));
  
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
