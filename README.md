# use-git

A Claude Code plugin that automates git best practices. It runs quietly in the background, tracking your edits and prompting you to commit at natural breaking points — when tests pass, after a batch of changes, or before you end a session. The commit workflow is the core feature: it analyzes your changes, stages them, and suggests meaningful commit messages without you having to think about it. It was inspired by the fabulous `/tdd` skill for test-driven development from the `oh-my-claudecode` plugin: once activated it encourages and performs best practices throughout. Indeed the `/use-git` skill provided here leverages test-suites that then (if completed without errors) trigger semi-automatic source code commits. That said, version control commands are preceded by asking for user approval and nothing from this plugin makes your code leave the computer you are working on. It is designed to save time and reduce repetetive work for both beginning and experienced developers including vibe coders.

**Status: Experimental.** This plugin was built quickly to and has not been battle-tested. Use at your own risk in production projects.

Feedback and contributions are welcome.

## Features

- Smart nudging: Detects when tests pass, after 15+ edits, or 30+ minutes of work
- Commit workflow: Stages files and suggests meaningful commit messages
- Secret detection: Warns before you accidentally commit API keys or passwords
- Branch protection: Blocks commits to main/master, guides you to feature branches
- Multiple modes: Zen for experts, coach for most people, justdoit for full automation
- Voice selection: Friendly plain language or terse technical output

## Installation

Requires Claude Code.

Add the plugin:

```
/plugin marketplace add git@github.com:beoinformatics/use-git-plugin.git
/plugin install use-git@use-git-plugin
```

Then run:

```
/use-git
```

First run asks for your preferred mode (zen/coach/justdoit) and voice (friendly/technical). Works with existing repos or creates one if needed.

## Modes

| Mode | What it does | Best for |
|------|-------------|----------|
| zen | Safety nets only - blocks commits to main, warns about secrets, alerts before quit | Experienced git users who want guardrails, not guidance |
| coach | Nudges at natural commit points (after tests pass, after 15+ edits, after 30+ minutes) | Most people (default) |
| justdoit | Auto-triggers the commit workflow after tests pass and before session end | People who want git to be completely invisible |

All modes still require you to confirm before each commit. Autopilot automates the trigger, not the confirmation.

## Voices

| Voice | Style | Example |
|-------|-------|---------|
| friendly | Plain language, no jargon | "Your tests are all passing - ready to commit?" |
| technical | Terse, standard git terminology | "Tests green. 4 files uncommitted. /use-git?" |

Voice only changes how use-git talks to you. It never changes what it does.

## Commands

All commands are issued within Claude Code:

```
/use-git                        Run the commit workflow
/use-git mode zen               Switch to zen mode
/use-git mode coach             Switch to coach mode (default)
/use-git mode justdoit         Switch to justdoit mode
/use-git voice friendly         Switch to friendly voice (default)
/use-git voice technical        Switch to technical voice
/use-git test-command "pytest"  Register your test suite command
/use-git test-command none      Disable test-pass detection
/use-git status                 Show current settings
```

## The Commit Workflow

When you run `/use-git` (or it auto-triggers in justdoit mode):

1. Checks your environment - git repo? right branch? secrets?
2. Analyzes changes - checks for secrets, suggests .gitignore entries
3. Presents a plan - shows you what it wants to commit and why
4. Asks what you want to do:
   - Commit all - commit all files as shown
   - Commit one-by-one - review each file individually
   - Explain changes - walk through what changed
   - Skip - not now

You can always edit commit messages. When you provide your own message, use-git uses it exactly as written.

## Test Detection

use-git can detect when your tests pass and use that as a commit signal - the strongest indicator that a unit of work is complete.

During setup, it scans your project for test frameworks (jest, vitest, pytest, cargo test, go test, etc.) and suggests a test command. You confirm, override, or say "no tests" if it's not a code project.

Within Claude Code:

```
/use-git test-command "npm test"     Set your test command
/use-git test-command "make test"    Works with any command
/use-git test-command none           No tests? That's fine too
```

Projects without tests still get nudges based on edit count and time - test detection just adds one more signal.

## Safety Features

- Branch guard: Prevents commits directly to main/master
- Secret detection: Blocks files that look like credentials (.env, *.pem, API keys)
- Quit reminder: Warns if you try to exit with uncommitted work
- Destructive command guard: Flags dangerous commands (rm -rf, git reset --hard) when you have unsaved changes
- Auto-gitignore: Suggests entries for build artifacts (node_modules, dist, __pycache__)

## How It Works (For the Curious)

use-git runs as four lightweight hook scripts that fire on Claude Code lifecycle events:

| Script | Event | What it does | Token cost |
|--------|-------|-------------|-----------|
| tracker | After every tool use | Counts edits, tracks files, detects test passes | Minimal |
| nudger | Before every tool use | Injects nudge if thresholds met | ~20 tokens when nudge fires |
| init | Session start | Restores state, re-detects environment, asks setup questions | Moderate (one-time per session) |
| quit-check | Session end | Warns about uncommitted work | ~20 tokens when uncommitted work exists |

The tracker and nudger together add minimal overhead to each tool call. The full commit workflow (when you run `/use-git`) uses an agent to analyze diffs, stage files, and generate commit messages.

State is stored in `.use-git/state.json` in your project directory (automatically gitignored).

## Configuration

Everything is stored in `.use-git/state.json`. Within Claude Code you can change settings anytime:

```
/use-git mode justdoit          Change how much it does
/use-git voice technical         Change how it talks
/use-git test-command "pytest"   Change the test command
```

## License

MIT - Copyright (c) 2026 Eckart Bindewald and contributors

