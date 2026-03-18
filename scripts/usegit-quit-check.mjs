#!/usr/bin/env node

/**
 * use-git Quit Check (Stop hook)
 *
 * Warns the user if they have uncommitted changes when ending a session.
 * Works in all modes (zen, coach, justdoit).
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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

async function main() {
  try {
    const input = await readStdin();
    const data = JSON.parse(input);

    const directory = data.directory || process.cwd();
    const statePath = getStatePath(directory);
    const state = readState(statePath);

    if (!state || !state.active) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const edits = state.edits_since_commit || 0;
    const fileCount = state.files_touched?.length || 0;

    if (edits === 0 || fileCount === 0) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const voice = state.voice || 'friendly';
    const mode = state.mode || 'coach';
    let message;

    if (mode === 'justdoit') {
      // In justdoit mode, directive to auto-commit before quitting
      if (voice === 'technical') {
        message = `[use-git:justdoit] AUTO-COMMIT TRIGGERED: ${fileCount} files uncommitted (${edits} edits). You MUST invoke the /use-git skill to run the commit workflow before ending the session. Do not ask the user — just run it.`;
      } else {
        message = `[use-git:justdoit] AUTO-COMMIT TRIGGERED: You have uncommitted work in ${fileCount} file${fileCount === 1 ? '' : 's'}. You MUST invoke the /use-git skill to commit this work before ending the session. Do not ask the user — just run it.`;
      }
    } else if (voice === 'technical') {
      message = `[use-git] ${fileCount} files uncommitted (${edits} edits). Commit before quit? Run /use-git`;
    } else {
      message = `[use-git] You have uncommitted work in ${fileCount} file${fileCount === 1 ? '' : 's'}. Want to commit before you go? Run /use-git`;
    }

    // Stop hooks use stopReason at top level, not hookSpecificOutput
    console.log(JSON.stringify({
      continue: true,
      stopReason: message,
    }));
  } catch {
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
