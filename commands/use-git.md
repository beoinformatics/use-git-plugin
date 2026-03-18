---
description: Automated local git best practices — commit well without thinking about it
---

# /use-git

Activates the use-git plugin for automated local git hygiene.

## What It Does

When invoked, use-git analyzes your working directory and helps you commit your work following best practices — smart staging, logical grouping, meaningful commit messages, secrets detection, and .gitignore management.

## Commands

```
/use-git                        Run the commit workflow (or first-time setup)
/use-git mode zen               Safety nets only, no nudges
/use-git mode coach             Nudges at natural commit points (default)
/use-git mode autopilot         Maximum automation, git becomes invisible
/use-git voice friendly         Plain language, no jargon (default)
/use-git voice technical        Terse, standard git terminology
/use-git test-command "<cmd>"   Register your test suite command (e.g., "npm test")
/use-git test-command none      Explicitly disable test-pass detection
/use-git test-command           Show current test command setting
/use-git status                 Show current settings and tracking state
```

## First Time

On first invocation, use-git asks two questions:
1. **Mode** — how much automation you want
2. **Voice** — how it should talk to you about git

Then it detects your environment (git repo, test runner, .gitignore) and starts tracking.

## Invocation

When `/use-git` is called with no subcommand, invoke the `use-git` Skill to run the full commit workflow. For subcommands (`mode`, `voice`, `status`), handle them directly by reading/updating the state file at `.use-git/state.json`.
