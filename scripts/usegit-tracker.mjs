#!/usr/bin/env node

/**
 * use-git Tracker (PostToolUse hook)
 *
 * Silently tracks Edit/Write operations and test results.
 * Updates usegit-state.json with edit counts and file lists.
 * Zero LLM token cost — pure file I/O.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

const TRACKED_TOOLS = new Set(['Edit', 'Write']);
const TEST_COMMANDS = [
  /\bnpm\s+test\b/,
  /\bnpx\s+(jest|vitest|mocha)\b/,
  /\byarn\s+test\b/,
  /\bpnpm\s+test\b/,
  /\bpytest\b/,
  /\bpython\s+-m\s+pytest\b/,
  /\bgo\s+test\b/,
  /\bcargo\s+test\b/,
  /\bmake\s+test\b/,
];

const TEST_PASS_PATTERNS = [
  /Tests:.*passed/i,
  /\d+\s+passed/i,
  /test result: ok/i,
  /^PASS\s/m,
  /^ok\s+/m,
  /All tests passed/i,
];

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
    // Corrupted state — treat as inactive
  }
  return null;
}

function writeState(statePath, state) {
  const dir = join(statePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

function extractFilePath(toolInput) {
  // Try to extract file_path from the tool input
  if (!toolInput) return null;
  if (typeof toolInput === 'string') {
    try {
      const parsed = JSON.parse(toolInput);
      return parsed.file_path || parsed.filePath || null;
    } catch {
      return null;
    }
  }
  return toolInput.file_path || toolInput.filePath || null;
}

function isTestCommand(command) {
  if (!command) return false;
  return TEST_COMMANDS.some(pattern => pattern.test(command));
}

function didTestsPass(output) {
  if (!output) return false;
  return TEST_PASS_PATTERNS.some(pattern => pattern.test(output));
}

async function main() {
  try {
    const input = await readStdin();
    const data = JSON.parse(input);

    const directory = data.directory || process.cwd();
    const toolName = data.toolName || data.tool_name || '';
    const statePath = getStatePath(directory);
    const state = readState(statePath);

    // Exit early if use-git is not active
    if (!state || !state.active) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    let changed = false;

    // Track Edit/Write operations
    if (TRACKED_TOOLS.has(toolName)) {
      state.edits_since_commit = (state.edits_since_commit || 0) + 1;
      if (toolName === 'Write') {
        state.writes_since_commit = (state.writes_since_commit || 0) + 1;
      }
      state.last_edit_at = new Date().toISOString();

      // Track which files were touched
      const filePath = extractFilePath(data.toolInput || data.tool_input);
      if (filePath) {
        if (!state.files_touched) state.files_touched = [];
        if (!state.files_touched.includes(filePath)) {
          state.files_touched.push(filePath);
        }
      }
      changed = true;
    }

    // Track test results from Bash commands
    if (toolName === 'Bash') {
      const command = data.toolInput?.command || data.tool_input?.command || '';
      const output = data.toolOutput || data.tool_output || '';

      if (isTestCommand(command) && didTestsPass(output)) {
        state.tests_just_passed = true;
        changed = true;
      }
    }

    if (changed) {
      writeState(statePath, state);
    }

    console.log(JSON.stringify({ continue: true }));
  } catch {
    // Never block Claude on tracker failure
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
