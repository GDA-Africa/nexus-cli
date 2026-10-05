#!/usr/bin/env node

// When @nexus-framework/harness is installed globally too, run whichever CLI is newer
// (see src/utils/bin-handoff.ts). The decision only reads two package.json files.
import { fileURLToPath, pathToFileURL } from 'node:url';

let handoff = { kind: 'self' };
try {
  const { resolveNexusHandoff } = await import('../dist/utils/bin-handoff.js');
  handoff = resolveNexusHandoff({
    cliRoot: fileURLToPath(new URL('..', import.meta.url)),
    argv: process.argv.slice(2),
    env: process.env,
  });
} catch {
  // The handoff is an optimisation; this install can always answer itself.
}
// A delegated run must not hand off again, but its child processes should decide afresh.
delete process.env.NEXUS_BIN_DELEGATED;

if (handoff.kind === 'version') {
  console.log(handoff.text);
} else if (handoff.kind === 'delegate') {
  process.env.NEXUS_BIN_DELEGATED = handoff.entry;
  process.argv[1] = handoff.entry;
  await import(pathToFileURL(handoff.entry).href);
} else {
  await import('../dist/cli.js');
}
