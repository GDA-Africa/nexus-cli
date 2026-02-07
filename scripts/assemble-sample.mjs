import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateProject } from '../dist/generators/index.js';

// Build a minimal NexusConfig-like object matching the generator expectations
const config = {
  projectName: 'nexus-sample',
  projectType: 'web',
  dataStrategy: 'cloud-first',
  appPatterns: ['PWA'],
  frontendFramework: 'nextjs',
  backendStrategy: 'none',
  backendFramework: 'none',
  testFramework: 'vitest',
  packageManager: 'npm',
  git: false,
  installDeps: false,
};

async function run() {
  try {
    // generateProject will write into ./nexus-sample
    await generateProject(config);
    console.log('nexus-sample generated successfully.');
  } catch (err) {
    console.error('Generation failed:', err);
    process.exit(1);
  }
}

run();
