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
};
