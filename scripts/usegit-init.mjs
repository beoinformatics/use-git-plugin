#!/usr/bin/env node

/**
 * use-git Init (SessionStart hook)
 *
 * Restores use-git state when a session resumes.
 * Detects environment changes (branch, git repo status).
 * Zero LLM token cost.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function getStatePath(directory) {
  return join(directory, '.use-git', 'state.json');
}

function readState(statePath) {
  try {
    if (existsSync(statePath)) {
      return JSON.parse(readFileSync(statePath, 'utf-8'));
    }
  } catch {
    // Corrupted state
  }
  return null;
}

function writeState(statePath, state) {
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

function gitCommand(cmd, directory) {
  try {
    return execSync(cmd, { cwd: directory, encoding: 'utf-8', timeout: 3000 }).trim();
  } catch {
    return null;
  }
}

function detectTestRunner(directory) {
  const indicators = [
    { files: ['jest.config.js', 'jest.config.ts', 'jest.config.mjs'], runner: 'jest' },
    { files: ['vitest.config.js', 'vitest.config.ts', 'vitest.config.mjs'], runner: 'vitest' },
    { files: ['pytest.ini', '.pytest.ini'], runner: 'pytest' },
    { files: ['Cargo.toml'], runner: 'cargo-test' },
    { files: ['go.mod'], runner: 'go-test' },
  ];

  for (const { files, runner } of indicators) {
    for (const file of files) {
      if (existsSync(join(directory, file))) {
        return runner;
      }
    }
  }

  // Check pyproject.toml for pytest section
  const pyproject = join(directory, 'pyproject.toml');
  if (existsSync(pyproject)) {
    try {
      const content = readFileSync(pyproject, 'utf-8');
      if (content.includes('[tool.pytest') || content.includes('[tool.pytest.ini_options]')) {
        return 'pytest';
      }
    } catch {
      // ignore
    }
  }

  // Check package.json for test script
  const packageJson = join(directory, 'package.json');
  if (existsSync(packageJson)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJson, 'utf-8'));
      if (pkg.scripts?.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1') {
        // Try to detect from devDependencies
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.vitest) return 'vitest';
        if (deps.jest) return 'jest';
        if (deps.mocha) return 'mocha';
        return 'npm-test';
      }
    } catch {
      // ignore
    }
  }

  return null;
}

async function main() {
  try {
    const input = await readStdin();
    const data = JSON.parse(input);

    const directory = data.directory || process.cwd();
    const statePath = getStatePath(directory);
    const state = readState(statePath);

    // No active state — nothing to restore
    if (!state || !state.active) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // Re-detect environment
    const isGitRepo = gitCommand('git rev-parse --is-inside-work-tree', directory) === 'true';

    if (isGitRepo) {
      const branch = gitCommand('git branch --show-current', directory);
      if (branch) {
        state.current_branch = branch;
      }

      // Re-detect test runner in case project changed
      const testRunner = detectTestRunner(directory);
      if (testRunner) {
        state.test_runner_detected = testRunner;
      }
    }

    writeState(statePath, state);

    // Build restore message
    const voice = state.voice || 'friendly';
    const mode = state.mode || 'coach';
    const edits = state.edits_since_commit || 0;
    const branch = state.current_branch || 'unknown';

    let message;
    if (voice === 'technical') {
      message = `[use-git] Restored. Mode: ${mode}, voice: ${voice}, branch: ${branch}`;
      if (edits > 0) {
        message += `, ${edits} edits uncommitted`;
      }
    } else {
      message = `[use-git] Welcome back! use-git is active (${mode} mode).`;
      if (edits > 0) {
        message += ` You have ${edits} unsaved changes from last session.`;
      }
      message += ` Working on branch "${branch}".`;
    }

    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: message,
      },
    }));
  } catch {
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
