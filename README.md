# use-git

A Claude Code plugin for developers who forget to commit. Actually it is built for anyone who has ever lost work because they were "in the zone" and forgot to save their progress. The category of git tooling is decades old and yet has never been really re-thought from the perspective of AI-assisted coding. Here is a stab at it: If you are in a Claude session, making edits, running tests, the plugin detects natural commit points and nudges you to save your work. Except that feature is still being tuned. What works well though is the commit workflow. With AI generating code at lightning speed, having a helper that groups your changes and writes meaningful commit messages is a nice feature to have.

**Please note that this is a hobby project in an early stage. One cannot with confidence say this plugin is ready for mission-critical projects because it has not been thoroughly tested and contains AI-generated code!**

That said: it would be all the more helpful if you try it out and leave some feedback or maybe even contribute!

## Features

- Smart nudging: Detects when tests pass, after 15+ edits, or 30+ minutes of work
- Commit workflow: Groups related files and suggests meaningful commit messages
- Secret detection: Warns before you accidentally commit API keys or passwords
- Branch protection: Blocks commits to main/master, guides you to feature branches
- Multiple modes: Zen for experts, coach for most people, autopilot for full automation
- Voice selection: Friendly plain language or terse technical output

## Getting Started

### Prerequisites

- Claude Code installed and configured
- A git repository (existing or new)

### Install

Start Claude Code:

```
claude
```

Then within Claude Code, add the plugin using either SSH (recommended) or HTTPS:

SSH:
```
/plugin marketplace add git@github.com:beoinformatics/use-git-plugin.git
```

HTTPS (requires git credential helper configured):
```
/plugin marketplace add https://github.com/beoinformatics/use-git-plugin.git
```

Then install:
```
/plugin install use-git@use-git-plugin
```

### Run

Within Claude Code:

```
/use-git
```

That's it. On first run, use-git asks two questions:

1. Mode - how much automation you want
2. Voice - how it should talk to you

Then it detects your environment and starts tracking. If the project isn't a git repo yet, it sets one up.

## Modes

| Mode | What it does | Best for |
|------|-------------|----------|
| zen | Safety nets only - blocks commits to main, warns about secrets, alerts before quit | Experienced git users who want guardrails, not guidance |
| coach | Nudges at natural commit points (after tests pass, after 15+ edits, after 30+ minutes) | Most people (default) |
| autopilot | Auto-triggers the commit workflow after tests pass and before session end | People who want git to be completely invisible |

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
/use-git mode autopilot         Switch to autopilot mode
/use-git voice friendly         Switch to friendly voice (default)
/use-git voice technical        Switch to technical voice
/use-git test-command "pytest"  Register your test suite command
/use-git test-command none      Disable test-pass detection
/use-git status                 Show current settings
```

## The Commit Workflow

When you run `/use-git` (or it auto-triggers in autopilot mode):

1. Checks your environment - git repo? right branch? secrets?
2. Analyzes changes - groups related files into logical commits
3. Presents a plan - shows you what it wants to commit and why
4. Asks what you want to do:
   - Commit all - commit all groups as shown
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

## What It Protects You From

- Committing to main/master - always guides you to a feature branch
- Accidentally tracking secrets - scans filenames and file contents for API keys, private keys, tokens, passwords
- Forgetting to commit - nudges after tests pass, after many edits, before you quit
- Losing work - warns you about uncommitted changes before session end
- Committing build artifacts - suggests .gitignore entries for node_modules, dist, __pycache__, etc.
- Destructive commands - warns before `rm -rf`, `git reset --hard`, etc. when you have uncommitted work

## How It Works (For the Curious)

use-git runs as four lightweight hook scripts that fire on Claude Code lifecycle events:

| Script | Event | What it does | Token cost |
|--------|-------|-------------|-----------|
| tracker | After every tool use | Counts edits, tracks files, detects test passes | Zero |
| nudger | Before every tool use | Injects nudge if thresholds met | ~20 tokens when nudge fires |
| init | Session start | Restores state, re-detects environment | Zero |
| quit-check | Session end | Warns about uncommitted work | Zero |

The tracker and nudger together add less than 100ms to each tool call. The full commit workflow (when you run `/use-git`) uses an agent to analyze diffs, group files, and generate commit messages.

State is stored in `.use-git/state.json` in your project directory (automatically gitignored).

## Configuration

Everything is stored in `.use-git/state.json`. Within Claude Code you can change settings anytime:

```
/use-git mode autopilot          Change how much it does
/use-git voice technical         Change how it talks
/use-git test-command "pytest"   Change the test command
```

## FAQ

Does this push my code anywhere?
No. All operations are local. use-git will never push, create PRs, or interact with any remote.

Can I use this for non-code projects?
Yes. Within Claude Code set `/use-git test-command none` and it will nudge based on edit count and time instead of test results. Works fine for writing, documentation, or any project where you want change tracking.

Does it work with existing git repos?
Yes. It detects your current branch, existing .gitignore, and test framework. It meets you where you are.

What if I already know git well?
Use zen mode. You get the safety nets (branch protection, secrets detection, quit warnings) without any nudging. Or just use it as a fast way to stage and commit - the grouping and message generation work regardless of mode.

Does it conflict with other plugins?
No. use-git has no dependencies on other plugins. It works standalone.

## License

MIT - Copyright (c) 2026 Eckart Bindewald and contributors
