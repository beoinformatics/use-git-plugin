# use-git: Vision

## The Problem

Vibe-coders — people who build software with AI assistance but don't have deep engineering habits — consistently struggle with version control. They forget to commit. They commit everything to main. They accidentally track secrets and build artifacts. They lose work because they never pushed. They end a session with 200 changed files and no idea how to untangle them.

These aren't knowledge problems. Most vibe-coders *know* they should commit more often. They just don't think about it, because they're focused on what they're building, not on the plumbing underneath.

## The Insight

The `/tdd` skill proved that Claude Code can enforce a development discipline *without the user having to think about it*. You activate TDD mode once, and from that point on, the red-green-refactor cycle just happens. The user stays focused on their feature while the skill handles the methodology.

Git hygiene is the same kind of problem. The practices are well-known. The challenge is consistency, not knowledge.

## The Solution

`/use-git` is a Claude Code plugin that makes local git best practices automatic. Once activated, it:

- **Tracks your work silently** — counting edits, noting which files change
- **Nudges at natural commit points** — especially after tests pass (the strongest signal that a unit of work is complete)
- **Does the right thing when asked** — stages files intelligently, groups related changes, generates meaningful commit messages, suggests .gitignore additions
- **Guards against mistakes** — refuses to commit to main, warns about secrets, flags large binaries

## The Philosophy

### Reduce fear and surprise

Every design decision filters through this principle. The target user is someone who finds git intimidating or tedious. `/use-git` should make git feel safe and invisible, not add new sources of anxiety.

### Nothing leaves your laptop without explicit consent

This is a hard rule, not a preference. `/use-git` will never push, create PRs, or interact with remotes automatically. All remote operations require the user to explicitly ask. A vibe-coder should never end a session and discover their experimental code is on GitHub.

### Smart defaults, not configuration

The plugin should work well out of the box. Modes exist (zen, coach, justdoit) but the default (coach) should be right for 80% of users. Configuration is available but never required.

### Graceful degradation

No test suite? The plugin still works — it just can't nudge after tests pass. Not a git repo yet? It offers to initialize one. Already on a feature branch? Great, skip the branch-creation step. The plugin meets the user where they are.

## What This Is Not

- **Not a git tutorial.** We don't explain what branches are. We just use them correctly.
- **Not a CI/CD tool.** No deployments, no pipelines, no remote automation.
- **Not a conflict resolver.** We surface conflicts clearly but don't attempt smart merges.
- **Not a replacement for understanding git.** It's training wheels that follow best practices. Users who grow past it can turn it off.

## The Synergy

`/use-git` pairs naturally with `/tdd`. Test-driven development gives you a clear signal of "this unit of work is done" (tests pass). `/use-git` listens for that signal and says: "Good commit point." Together, they create a disciplined development flow that the user barely has to think about:

1. `/tdd` enforces: write test → watch it fail → make it pass
2. `/use-git` detects: tests passed → nudge to commit
3. The user just builds things. The methodology happens around them.

## Roadmap

### v1: Local Git Hygiene (MVP)
- Branch protection (never commit to main)
- Smart staging and logical commit grouping
- Commit message generation
- .gitignore suggestions and secrets detection
- Nudges after tests pass, after N edits, before quit
- Three modes: zen, coach, justdoit

### v2: Remote Operations (Opt-in)
- Explicit push support (`/use-git push`)
- PR creation on user request (`/use-git pr`)
- Remote tracking and sync status

### v3: Advanced Workflows (Opt-in)
- Git worktree support for parallel task isolation
- Multi-branch management
- Stash management with context preservation
