#!/usr/bin/env node
/**
 * Release check — every number we advertise, measured against the code.
 *
 * The project rule is "stop asserting what we haven't measured." This applies
 * it to our own release surface. Every count on the npm README, the website,
 * and llms.txt is derived here from the source of truth and compared against
 * what each file claims. Drift fails the check.
 *
 * It exists because the drift is real and recurring: the site advertised
 * "456 tests" through two releases while the suite grew to 546, the site's
 * README mirror sat two edits behind the npm one, and a hand-run "homepage
 * drift sync" already appears in the progress log once — which guarantees a
 * next time.
 *
 *   npm run release:check            # human output, non-zero exit on drift
 *   npm run release:check -- --json  # machine output
 *   npm run release:check -- --fast  # skip the test-suite measurement
 *
 * Site checks are skipped when the homepage directory is absent, so this runs
 * unchanged in the nexus-cli repo (which does not contain it) and in the
 * monorepo (which does).
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.resolve(ROOT, '..', 'homepage', 'nexus-homepage');

const argv = process.argv.slice(2);
const JSON_MODE = argv.includes('--json');
const FAST = argv.includes('--fast');

const findings = [];
const facts = {};

const fail = (id, message, fix) => findings.push({ id, severity: 'error', message, fix });
const warn = (id, message, fix) => findings.push({ id, severity: 'warn', message, fix });

const read = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

const siteFile = (name) => (fs.existsSync(SITE) ? path.join(SITE, name) : null);

/* ──────────────────────────────────────────────────────────────
 * Measure — the source of truth for everything we claim
 * ────────────────────────────────────────────────────────────── */

const pkg = JSON.parse(read(path.join(ROOT, 'package.json')));
facts.version = pkg.version;
facts.name = pkg.name;

/** Tests actually passing. Measured, not remembered. */
function measureTests() {
  if (FAST) return null;
  try {
    const out = execFileSync('npx', ['vitest', 'run', '--reporter=basic'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300_000,
    });
    const match = out.match(/Tests\s+(\d+)\s+passed/);
    return match ? Number(match[1]) : null;
  } catch (err) {
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    const match = out.match(/Tests\s+(\d+)\s+passed/);
    if (match && !/failed/.test(out)) return Number(match[1]);
    fail('SUITE', 'The test suite did not pass, so no count can be advertised.');
    return null;
  }
}

/**
 * Top-level CLI commands, minus `help`.
 *
 * Asks the built CLI rather than parsing the source: `nexus skill new` and
 * `nexus plan list` are `.command()` calls too, so a source regex counts
 * subcommands and lands on 29 instead of 18. `--help` is what a user sees, so
 * it is what we should be advertising.
 */
function measureCommands() {
  const entry = path.join(ROOT, 'dist', 'cli.js');
  if (!fs.existsSync(entry)) {
    warn('R4', 'dist/ is not built, so the command count cannot be measured.', 'Run `npm run build` first.');
    return null;
  }

  try {
    const out = execFileSync('node', [entry, '--help'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000,
    });
    const section = out.slice(out.indexOf('Commands:'));
    const names = new Set(
      [...section.matchAll(/^\s{2}([a-z][a-z-]*)/gm)].map((m) => m[1]).filter((n) => n !== 'help'),
    );
    return names.size;
  } catch {
    warn('R4', 'Could not run the built CLI to measure the command count.');
    return null;
  }
}

/** Doctor checks wired into DEFAULT_CHECKS. */
function measureDoctorChecks() {
  const index = read(path.join(ROOT, 'src', 'utils', 'doctor', 'index.ts')) ?? '';
  const block = index.match(/DEFAULT_CHECKS[^=]*=\s*\[([\s\S]*?)\]/);
  if (!block) return null;
  return (block[1].match(/D\d+_/g) ?? []).length;
}

/** MCP tools registered on the server. */
function measureMcpTools() {
  const server = read(path.join(ROOT, 'src', 'mcp', 'server.ts')) ?? '';
  return (server.match(/server\.registerTool\(/g) ?? []).length;
}

facts.tests = measureTests();
facts.commands = measureCommands();
facts.doctorChecks = measureDoctorChecks();
facts.mcpTools = measureMcpTools();

/* ──────────────────────────────────────────────────────────────
 * R1 — Release state: version, changelog, tag, registry
 * ────────────────────────────────────────────────────────────── */

const changelog = read(path.join(ROOT, 'CHANGELOG.md')) ?? '';
const firstHeading = changelog.match(/^##\s+\[([^\]]+)\]/m)?.[1];

if (firstHeading && firstHeading !== facts.version && !/unreleased/i.test(firstHeading)) {
  fail('R1', `CHANGELOG's top entry is [${firstHeading}] but package.json is ${facts.version}.`,
    'Add a CHANGELOG section for this version before releasing.');
}

if (/unreleased/i.test(firstHeading ?? '')) {
  warn('R1', `CHANGELOG has an [Unreleased] section — its contents ship as ${facts.version} unless the version is bumped.`,
    `Fold it into a [${facts.version}] heading, or bump the version to match the change's scope.`);
}

let publishedVersion = null;
if (!FAST) {
  try {
    publishedVersion = execFileSync('npm', ['view', `${facts.name}`, 'version'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000,
    }).trim();
  } catch {
    warn('R2', 'Could not reach the npm registry — skipping the published-version comparison.');
  }
}
facts.published = publishedVersion;

let tags = [];
try {
  tags = execFileSync('git', ['tag', '-l'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
} catch { /* not a git repo — skip */ }

const tagged = tags.includes(`v${facts.version}`);
facts.tagged = tagged;

if (publishedVersion && publishedVersion !== facts.version && !tagged) {
  warn('R2', `${facts.version} is not on npm (latest is ${publishedVersion}) and has no v${facts.version} tag.`,
    'CI publishes and tags on push to main — this releases when the branch is pushed.');
}

if (publishedVersion === facts.version && !tagged) {
  fail('R2', `${facts.version} is published on npm but has no v${facts.version} git tag.`,
    `git tag -a v${facts.version} -m "Release v${facts.version}" && git push origin v${facts.version}`);
}

try {
  const ahead = execFileSync('git', ['rev-list', '--count', '@{u}..HEAD'], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  facts.unpushedCommits = Number(ahead);
  if (Number(ahead) > 0 && publishedVersion !== facts.version) {
    warn('R3', `${ahead} commit(s) are unpushed, so ${facts.version} has not been published, tagged, or released.`,
      'Push main — the publish job creates the npm release, git tag, and GitHub release.');
  }
} catch { /* no upstream — skip */ }

/* ──────────────────────────────────────────────────────────────
 * R4 — Advertised counts, everywhere they are advertised
 * ────────────────────────────────────────────────────────────── */

/** Each claim: where it lives, the pattern that finds it, the truth it must match. */
const claims = [
  { file: path.join(ROOT, 'README.md'), label: 'README badge (tests)', re: /tests-(\d+)_passing/, truth: () => facts.tests },
  { file: path.join(ROOT, 'README.md'), label: 'README badge (MCP tools)', re: /MCP-(\d+)_brain_tools/, truth: () => facts.mcpTools },
  { file: siteFile('NEXUS_CLI_README.md'), label: 'site README badge (tests)', re: /tests-(\d+)_passing/, truth: () => facts.tests },
  { file: siteFile('llms.txt'), label: 'llms.txt CLI commands', re: /(\d+) CLI commands/, truth: () => facts.commands },
  { file: siteFile('llms.txt'), label: 'llms.txt unit tests', re: /(\d+) unit tests/, truth: () => facts.tests },
  { file: siteFile('llms.txt'), label: 'llms.txt MCP tools', re: /(\d+) schema-validated tools/, truth: () => facts.mcpTools },
  // The homepage stat row has three counters that differ only by their label,
  // so each pattern has to reach through to the label it belongs to.
  { file: siteFile('index.html'), label: 'homepage stat: tests', truth: () => facts.tests,
    re: /data-count="(\d+)">0<\/div><div class="l">tests<\/div>/ },
  { file: siteFile('index.html'), label: 'homepage stat: MCP tools', truth: () => facts.mcpTools,
    re: /data-count="(\d+)">0<\/div><div class="l">MCP tools<\/div>/ },
  { file: siteFile('index.html'), label: 'homepage stat: commands', truth: () => facts.commands,
    re: /data-count="(\d+)">0<\/div><div class="l">commands<\/div>/ },
  { file: siteFile('index.html'), label: 'homepage vital-signs demo (tests)', truth: () => facts.tests,
    re: /Vital signs: (\d+) tests/ },
];

for (const claim of claims) {
  if (!claim.file || !fs.existsSync(claim.file)) continue;
  const truth = claim.truth();
  if (truth == null) continue;

  const found = read(claim.file)?.match(claim.re);
  if (!found) {
    warn('R4', `${claim.label}: expected claim not found — the wording may have changed.`,
      `Update the pattern in scripts/release-check.mjs, or restore the claim.`);
    continue;
  }

  if (Number(found[1]) !== truth) {
    fail('R4', `${claim.label} says ${found[1]}, actual is ${truth}.`,
      `Update ${path.relative(ROOT, claim.file)}.`);
  }
}

// Doctor check count is written as an English word, so it gets its own check.
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen'];
if (facts.doctorChecks != null) {
  for (const file of [path.join(ROOT, 'README.md'), siteFile('NEXUS_CLI_README.md')]) {
    if (!file || !fs.existsSync(file)) continue;
    const claimed = read(file)?.match(/Run (\w+) drift checks/);
    if (!claimed) continue;
    if (claimed[1] !== WORDS[facts.doctorChecks]) {
      fail('R4', `${path.relative(ROOT, file)} says "${claimed[1]} drift checks", actual is ${facts.doctorChecks} (${WORDS[facts.doctorChecks]}).`,
        'Update the doctor row in the command table.');
    }
  }
}

/* ──────────────────────────────────────────────────────────────
 * R5 — The README mirror, which is how the site went stale
 * ────────────────────────────────────────────────────────────── */

const mirror = siteFile('NEXUS_CLI_README.md');
if (mirror && fs.existsSync(mirror)) {
  if (read(path.join(ROOT, 'README.md')) !== read(mirror)) {
    fail('R5', 'The site\'s README copy has drifted from the npm README.',
      'cp nexus-cli/README.md homepage/nexus-homepage/NEXUS_CLI_README.md');
  }
}

/* ──────────────────────────────────────────────────────────────
 * R6 — SEO / AI-crawler surface
 * ────────────────────────────────────────────────────────────── */

if (fs.existsSync(SITE)) {
  const sitemap = read(path.join(SITE, 'sitemap.xml')) ?? '';

  // Every page an agent or crawler should find must be listed.
  const expected = ['/', '/mcp', '/agents', '/docs.html', '/llms.txt', '/llms-full.txt'];
  for (const url of expected) {
    if (!sitemap.includes(`nexus.glenhalton.com${url}<`)) {
      fail('R6', `sitemap.xml does not list ${url}.`, 'Add a <url> entry for it.');
    }
  }

  // The site's structured data must not advertise a version nobody can install.
  // The site's structured data feeds search engines and AI crawlers, so it
  // must not advertise a version nobody can install. Being ahead of npm but
  // level with package.json is the normal state between a bump and a push —
  // that's a warning. Matching neither is drift.
  const declared = read(path.join(SITE, 'index.html'))?.match(/"softwareVersion":\s*"([^"]+)"/)?.[1];
  if (declared && publishedVersion && declared !== publishedVersion) {
    if (declared === facts.version) {
      warn('R6', `index.html advertises ${declared}, which is not on npm yet (latest ${publishedVersion}).`,
        'Correct once this version is published — deploy the site after the npm release, not before.');
    } else {
      fail('R6', `index.html advertises softwareVersion ${declared}, which matches neither npm (${publishedVersion}) nor package.json (${facts.version}).`,
        'Set it to the version being released.');
    }
  }

  const robots = read(path.join(SITE, 'robots.txt')) ?? '';
  for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
    if (!robots.includes(bot)) warn('R6', `robots.txt does not mention ${bot}.`, 'Add an explicit Allow rule.');
  }
  if (!robots.includes('Sitemap:')) fail('R6', 'robots.txt has no Sitemap: line.', 'Point it at /sitemap.xml.');
}

/* ──────────────────────────────────────────────────────────────
 * Report
 * ────────────────────────────────────────────────────────────── */

const errors = findings.filter((f) => f.severity === 'error');
const warns = findings.filter((f) => f.severity === 'warn');

if (JSON_MODE) {
  console.log(JSON.stringify({ ok: errors.length === 0, facts, findings }, null, 2));
} else {
  const dim = (s) => `\x1b[2m${s}\x1b[0m`;
  console.log(`\n  Release check — ${facts.name} ${facts.version}\n`);
  console.log(dim(`  measured: ${facts.tests ?? '—'} tests · ${facts.commands} commands · ` +
    `${facts.mcpTools} MCP tools · ${facts.doctorChecks} doctor checks`));
  console.log(dim(`  npm latest: ${facts.published ?? '—'} · tagged: ${facts.tagged ? 'yes' : 'no'}` +
    (facts.unpushedCommits ? ` · unpushed: ${facts.unpushedCommits}` : '')));
  console.log(dim(`  site checks: ${fs.existsSync(SITE) ? 'on' : 'skipped (homepage not present)'}\n`));

  for (const f of [...errors, ...warns]) {
    console.log(`  ${f.severity === 'error' ? '\x1b[31m✖\x1b[0m' : '\x1b[33m⚠\x1b[0m'} [${f.id}] ${f.message}`);
    if (f.fix) console.log(dim(`      → ${f.fix}`));
  }

  console.log(errors.length === 0
    ? `\n  \x1b[32m✔\x1b[0m Release surface is accurate${warns.length ? ` (${warns.length} warning(s))` : ''}.\n`
    : `\n  \x1b[31m✖\x1b[0m ${errors.length} drift(s) to fix before releasing.\n`);
}

process.exit(errors.length === 0 ? 0 : 1);
