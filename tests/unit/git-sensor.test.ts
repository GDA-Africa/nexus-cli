import os from 'node:os';
import path from 'node:path';

import { execa } from 'execa';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { captureGitSensor } from '../../src/utils/sensors/git.js';

describe('git.ts sensor', () => {
  const tmpDir = path.join(os.tmpdir(), `nexus-git-sensor-test-${Date.now()}`);

  beforeEach(async () => {
    await fs.ensureDir(tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should return null values on non-git repos', async () => {
    const data = await captureGitSensor(tmpDir);
    expect(data.branch).toBeNull();
    expect(data.aheadOfMain).toBeNull();
    expect(data.lastCommit).toBeNull();
    expect(data.isDirty).toBeNull();
  });

  it('should return valid git info on a git repo', async () => {
    // Setup git repo
    await execa('git', ['init'], { cwd: tmpDir });
    // Config git locally
    await execa('git', ['config', 'user.name', 'Test User'], { cwd: tmpDir });
    await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpDir });
    // First commit (main)
    await fs.writeFile(path.join(tmpDir, 'file.txt'), 'hello');
    await execa('git', ['add', '.'], { cwd: tmpDir });
    await execa('git', ['commit', '-m', 'Initial commit'], { cwd: tmpDir });

    let data = await captureGitSensor(tmpDir);
    expect(data.branch).toBeTruthy(); // usually 'main' or 'master'
    expect(data.isDirty).toBe(false);
    expect(data.aheadOfMain).toBe(0);
    expect(data.lastCommit).toContain('Initial commit');
    expect(data.lastCommit).toContain('Test User');

    // Create a new branch and add commit
    await execa('git', ['checkout', '-b', 'feature-branch'], { cwd: tmpDir });
    await fs.writeFile(path.join(tmpDir, 'file2.txt'), 'world');
    await execa('git', ['add', '.'], { cwd: tmpDir });
    await execa('git', ['commit', '-m', 'Feature commit'], { cwd: tmpDir });

    data = await captureGitSensor(tmpDir);
    expect(data.branch).toBe('feature-branch');
    expect(data.isDirty).toBe(false);
    expect(data.aheadOfMain).toBe(1);
    expect(data.lastCommit).toContain('Feature commit');

    // Make dirty by editing file2
    await fs.writeFile(path.join(tmpDir, 'file2.txt'), 'dirty-world');
    data = await captureGitSensor(tmpDir);
    expect(data.isDirty).toBe(true);
  });
});
