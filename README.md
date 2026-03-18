# use-git

**Automated local git best practices for Claude Code.**

use-git makes version control invisible. It tracks your edits, nudges you at natural commit points, stages files intelligently, detects secrets, and generates meaningful commit messages — so you can focus on what you're building instead of git plumbing.

Whether you've never used git or you've been committing for a decade, use-git adapts to your level.

## Why

You're deep in a coding session. You've changed 15 files, tests are passing, everything works. Then your laptop crashes, or you `rm -rf` the wrong thing, or you just close the session and forget where you were.

use-git prevents that. It watches your work and reminds you to commit at the right moments — after tests pass, after a burst of edits, or before you quit. If you want, it can even trigger commits automatically.

**Nothing ever leaves your computer.** use-git only does local git operations. It will never push, create pull requests, or interact with remotes unless you explicitly ask (and v1 doesn't even support that yet).

## Install

```
/plugin marketplace add https://github.com/eckart/use-git-plugin
/plugin install use-git@use-git-plugin
```

## Quick Start

```
/use-git
```

That's it. On first run, use-git asks two questions:

1. **Mode** — how much automation you want
2. **Voice** — how it should talk to you

Then it detects your environment and starts tracking. If the project isn't a git repo yet, it sets one up.

## Modes

| Mode | What it does | Best for |
|------|-------------|----------|
| **zen** | Safety nets only — blocks commits to main, warns about secrets, alerts before quit | Experienced git users who want guardrails, not guidance |
| **coach** | Nudges at natural commit points (after tests pass, after 15+ edits, after 30+ minutes) | Most people (default) |
| **autopilot** | Auto-triggers the commit workflow after tests pass and before session end | People who want git to be completely invisible |

All modes still require you to confirm before each commit. Autopilot automates the *trigger*, not the *confirmation*.

## Voices

| Voice | Style | Example |
|-------|-------|---------|
| **friendly** | Plain language, no jargon | "Your tests are all passing — ready to commit?" |
| **technical** | Terse, standard git terminology | "Tests green. 4 files uncommitted. /use-git?" |

Voice only changes how use-git talks to you. It never changes what it does.

## Commands

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

1. **Checks your environment** — git repo? right branch? secrets?
2. **Analyzes changes** — groups related files into logical commits
3. **Presents a plan** — shows you what it wants to commit and why
4. **Asks what you want to do:**
   - **Commit all** — commit all groups as shown
   - **Commit one-by-one** — review each file individually
   - **Explain changes** — walk through what changed
   - **Skip** — not now

You can always edit commit messages. When you provide your own message, use-git uses it exactly as written.

## Test Detection

use-git can detect when your tests pass and use that as a commit signal — the strongest indicator that a unit of work is complete.

During setup, it scans your project for test frameworks (jest, vitest, pytest, cargo test, go test, etc.) and suggests a test command. You confirm, override, or say "no tests" if it's not a code project.

```
/use-git test-command "npm test"     Set your test command
/use-git test-command "make test"    Works with any command
/use-git test-command none           No tests? That's fine too
```

Projects without tests still get nudges based on edit count and time — test detection just adds one more signal.

## What It Protects You From

- **Committing to main/master** — always guides you to a feature branch
- **Accidentally tracking secrets** — scans filenames and file contents for API keys, private keys, tokens, passwords
- **Forgetting to commit** — nudges after tests pass, after many edits, before you quit
- **Losing work** — warns you about uncommitted changes before session end
- **Committing build artifacts** — suggests .gitignore entries for node_modules, dist, __pycache__, etc.
- **Destructive commands** — warns before `rm -rf`, `git reset --hard`, etc. when you have uncommitted work

## How It Works (For the Curious)

use-git runs as four lightweight hook scripts that fire on Claude Code lifecycle events:

| Script | Event | What it does | Token cost |
|--------|-------|-------------|-----------|
| **tracker** | After every tool use | Counts edits, tracks files, detects test passes | Zero |
| **nudger** | Before every tool use | Injects nudge if thresholds met | ~20 tokens when nudge fires |
| **init** | Session start | Restores state, re-detects environment | Zero |
| **quit-check** | Session end | Warns about uncommitted work | Zero |

The tracker and nudger together add less than 100ms to each tool call. The full commit workflow (when you run `/use-git`) uses an agent to analyze diffs, group files, and generate commit messages.

State is stored in `.use-git/state.json` in your project directory (automatically gitignored).

## Configuration

Everything is stored in `.use-git/state.json`. You can change settings anytime:

```
/use-git mode autopilot          Change how much it does
/use-git voice technical         Change how it talks
/use-git test-command "pytest"   Change the test command
```

## FAQ

**Does this push my code anywhere?**
No. All operations are local. use-git will never push, create PRs, or interact with any remote.

**Can I use this for non-code projects?**
Yes. Set `/use-git test-command none` and it will nudge based on edit count and time instead of test results. Works fine for writing, documentation, or any project where you want change tracking.

**Does it work with existing git repos?**
Yes. It detects your current branch, existing .gitignore, and test framework. It meets you where you are.

**What if I already know git well?**
Use zen mode. You get the safety nets (branch protection, secrets detection, quit warnings) without any nudging. Or just use it as a fast way to stage and commit — the grouping and message generation work regardless of mode.

**Does it conflict with other plugins?**
No. use-git has no dependencies on other plugins. It works standalone.

## License

MIT
