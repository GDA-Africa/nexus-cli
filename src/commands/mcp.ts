/**
 * NEXUS CLI — `nexus mcp`
 *
 * Starts the NEXUS brain MCP server on stdio so MCP clients (Claude Code,
 * Codex, Cursor, …) can query and update the project brain through
 * schema-validated tools.
 *
 * IMPORTANT: this command must keep stdout protocol-clean. cli.ts skips
 * the auto-invoke hooks and the update banner for `mcp`.
 */

import path from 'node:path';

import { Command } from 'commander';

import { startMcpServer } from '../mcp/server.js';
import { getNexusDir } from '../utils/brain.js';

export function mcpCommand(): Command {
  return new Command('mcp')
    .description('Start the NEXUS brain MCP server (stdio) for AI agents and editors')
    .argument('[path]', 'Project path (defaults to current directory)')
    .action(async (targetPath: string | undefined) => {
      const rootDir = targetPath ? path.resolve(targetPath) : process.cwd();

      // Fail fast with a human-readable message (stderr) if there is no brain.
      if (!getNexusDir(rootDir)) {
        console.error(
          `nexus mcp: no .nexus/ directory found at or above ${rootDir}.\n` +
            'Run `nexus init` or `nexus adopt` first.',
        );
        process.exit(1);
      }

      await startMcpServer({ rootDir });

      // Keep the process alive while the transport is open.
      await new Promise(() => {
        /* run until the client closes stdio */
      });
    });
}
