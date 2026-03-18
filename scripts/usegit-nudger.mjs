#!/usr/bin/env node

/**
 * use-git Nudger (PreToolUse hook)
 *
 * Injects one-line nudge messages into conversation context
 * when commit-worthy conditions are detected.
 * Minimal token cost — only fires when thresholds are met.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const EDIT_THRESHOLD = 15;
const EDIT_THRESHOLD_NEXT = 30;
const TIME_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

const DESTRUCTIVE_PATTERNS = [
  /\brm\s+-rf\b/,
  /\bgit\s+checkout\s+--\s*\./,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+clean\s+-[fd]/,
  /\bgit\s+stash\s+drop\b/,
];

const NUDGES = {
  tests_passed: {
    friendly: '[use-git] Your tests are all passing — ready to commit? Run /use-git',
    technical: '[use-git] Tests green. Files uncommitted. /use-git?',
  },
  edit_threshold: {
    friendly: '[use-git] You\'ve made a bunch of changes — want to commit them? Run /use-git',
    technical: '[use-git] {count} edits uncommitted. /use-git?',
  },
  time_threshold: {
    friendly: '[use-git] It\'s been a while since your last commit. Want to record your progress? Run /use-git',
    technical: '[use-git] 30+ min since last commit. /use-git?',
  },
  destructive: {
    friendly: '[use-git] Careful — you have uncommitted changes. This might erase them. Commit first with /use-git?',
    technical: '[use-git] Uncommitted changes. This command may discard them. Commit first?',
  },
};

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

function getNudge(key, voice, replacements = {}) {
  let text = NUDGES[key]?.[voice] || NUDGES[key]?.friendly || '';
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

function isDestructiveCommand(command) {
  if (!command) return false;
  return DESTRUCTIVE_PATTERNS.some(p => p.test(command));
}

async function main() {
  try {
    const input = await readStdin();
    const data = JSON.parse(input);

    const directory = data.directory || process.cwd();
    const toolName = data.toolName || data.tool_name || '';
    const statePath = getStatePath(directory);
    const state = readState(statePath);

    // Exit early if not active or in zen mode (no nudges in zen)
    if (!state || !state.active || state.mode === 'zen') {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const voice = state.voice || 'friendly';
    let nudgeText = null;
    let stateChanged = false;

    // Priority 1: Destructive command warning (always, regardless of mode)
    if (toolName === 'Bash') {
      const command = data.toolInput?.command || data.tool_input?.command || '';
      if (isDestructiveCommand(command) && (state.edits_since_commit || 0) > 0) {
        nudgeText = getNudge('destructive', voice);
      }
    }

    // Priority 2: Tests just passed
    if (!nudgeText && state.tests_just_passed) {
      if (state.mode === 'autopilot') {
        nudgeText = getNudge('tests_passed', voice) +
          '\n[use-git:autopilot] AUTO-COMMIT TRIGGERED: Tests passed. You MUST immediately invoke the /use-git skill to run the commit workflow now. Do not ask the user — just run it.';
      } else {
        nudgeText = getNudge('tests_passed', voice);
      }
      state.tests_just_passed = false;
      stateChanged = true;
    }

    // Priority 3: Edit count threshold
    if (!nudgeText) {
      const edits = state.edits_since_commit || 0;
      const lastNudgeAt = state.last_edit_nudge_at || 0;

      if (edits >= EDIT_THRESHOLD && lastNudgeAt < EDIT_THRESHOLD) {
        nudgeText = getNudge('edit_threshold', voice, { count: String(edits) });
        state.last_edit_nudge_at = EDIT_THRESHOLD;
        stateChanged = true;
      } else if (edits >= EDIT_THRESHOLD_NEXT && lastNudgeAt < EDIT_THRESHOLD_NEXT) {
        nudgeText = getNudge('edit_threshold', voice, { count: String(edits) });
        state.last_edit_nudge_at = EDIT_THRESHOLD_NEXT;
        stateChanged = true;
      }
    }

    // Priority 4: Time threshold
    if (!nudgeText && state.last_commit_at && state.last_edit_at) {
      const lastCommit = new Date(state.last_commit_at).getTime();
      const lastEdit = new Date(state.last_edit_at).getTime();
      const now = Date.now();
      const timeSinceCommit = now - lastCommit;
      const lastTimeNudge = state.last_time_nudge_at
        ? new Date(state.last_time_nudge_at).getTime()
        : 0;

      if (
        timeSinceCommit > TIME_THRESHOLD_MS &&
        (state.edits_since_commit || 0) > 0 &&
        (now - lastTimeNudge) > TIME_THRESHOLD_MS
      ) {
        nudgeText = getNudge('time_threshold', voice);
        state.last_time_nudge_at = new Date().toISOString();
        stateChanged = true;
      }
    }

    if (stateChanged) {
      writeState(statePath, state);
    }

    if (nudgeText) {
      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: nudgeText,
        },
      }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }
  } catch {
    // Never block Claude on nudger failure
    console.log(JSON.stringify({ continue: true }));
  }
}

// Run when executed directly, not when imported for testing
const isDirectRun = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) main();

export { getNudge, isDestructiveCommand, NUDGES };
