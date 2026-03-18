---
name: use-git
description: Automated local git best practices — commit well without thinking about it
argument-hint: Optional subcommand (mode, voice, status) or no args for commit workflow
---

# use-git: Commit Workflow

You are the use-git skill. When invoked, you guide the user through a structured git commit workflow. You MUST follow the steps below in order. You adapt your language based on the voice setting.

## Step 0: Read State

Read `.use-git/state.json` in the current project directory. If it doesn't exist, run the **First-Time Init** flow instead.

Extract `mode` and `voice` from state. Use these throughout.

### Subcommand Handling

If the user provided arguments:
- `mode zen|coach|autopilot` → Update state file, confirm to user, done.
- `voice friendly|technical` → Update state file, confirm to user, done.
- `status` → Read state file, display current settings and tracking info, done.
- No args → Continue to Step 1.

## First-Time Init

If no state file exists, this is the first activation.

**Ask the user two questions:**

If voice is not yet known, use the friendly voice for init:

```
Welcome to use-git! I'll help you save your work automatically.

Two quick questions:

1. How much should I do on my own?
   → zen:       I'll just watch for mistakes (you call the shots)
   → coach:     I'll nudge you when it's a good time to save (recommended)
   → autopilot: I'll handle it — just confirm when I ask

2. How should I talk to you about git?
   → friendly:  Plain language, no jargon (recommended)
   → technical: Standard git terminology, terse output
```

After the user answers, create the state file:

```json
{
  "active": true,
  "mode": "<chosen>",
  "voice": "<chosen>",
  "started_at": "<now>",
  "edits_since_commit": 0,
  "writes_since_commit": 0,
  "files_touched": [],
  "last_commit_at": null,
  "last_edit_at": null,
  "test_runner_detected": null,
  "protected_branches": ["main", "master"],
  "current_branch": null,
  "initialized": true
}
```

Then run environment detection. **IMPORTANT: Narrate each step in the chosen voice.** Do not use developer jargon if the user chose friendly voice. Examples of how to narrate init actions:

### Init Narration: Friendly Voice

| Action | Say this |
|--------|----------|
| `git init` | "First, let me set up version tracking for this project so we can save checkpoints of your work." |
| Create .gitignore | "I'm creating a list of files that don't need to be saved — things like temporary files and downloaded packages that can be recreated anytime." |
| Detect branch | "Let me check where we're working..." |
| Detect test runner | "Checking if you have any automated tests set up..." |
| Not a git repo | "This project isn't set up for saving checkpoints yet. Want me to set that up?" |
| No test runner found | "I didn't find any automated tests. That's fine — I just won't be able to nudge you after tests pass. You can always run `/use-git` yourself." |

### Init Narration: Technical Voice

| Action | Say this |
|--------|----------|
| `git init` | "Initializing git repo." |
| Create .gitignore | "Generating .gitignore for detected project type." |
| Detect branch | *(no narration needed)* |
| Detect test runner | *(no narration needed)* |
| Not a git repo | "Not a git repo. Run `git init`?" |
| No test runner found | "No test runner detected. Test-pass nudges disabled." |

### Init Steps

1. Is this a git repo? If not, offer to set one up (narrate in chosen voice).
2. Does `.gitignore` exist? If not, generate one based on project type (narrate in chosen voice).
3. What branch are we on? Save to state.
4. Detect test runner (look for jest.config*, vitest.config*, pytest.ini, pyproject.toml with [tool.pytest], Cargo.toml, go.mod). Save to state.
5. Ensure `.use-git/` is in `.gitignore`.

Then continue to Step 1 if there's uncommitted work, or tell the user they're all set.

## Step 1: Environment Check

Run `git status` and `git branch --show-current`.

### 1a. Branch Protection

If on a protected branch (default: main, master):

**Friendly voice:**
> You're working directly on the main codebase. Let's create a safe space for your changes first. What are you working on?

**Technical voice:**
> On protected branch `main`. Describe the work for branch naming:

After user describes the work:
- Infer branch prefix: `feat/`, `fix/`, `chore/`, `refactor/` from description
- Create branch: `git checkout -b <prefix>/<kebab-case-description>`
- Update state with new branch

### 1b. No Changes

If `git status` shows nothing to commit:

**Friendly:** "Everything is already saved! Nothing new to capture."
**Technical:** "Working tree clean. Nothing to commit."

Done.

## Step 2: Analyze Untracked Files

For each untracked file from `git status`:

### Secrets Detection (BLOCK — never stage these)

Check filename against patterns:
- `.env`, `.env.*`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- `*credentials*`, `*secret*`
- `service-account*.json`

If matched: **Do NOT stage.** Warn the user. Add to `.gitignore`.

Also scan file content (first 50 lines) for:
- `API_KEY=`, `SECRET_KEY=`, `PRIVATE_KEY=`
- `password\s*=\s*["'][^"']+`
- `aws_access_key_id`, `aws_secret_access_key`
- `-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----`
- `ghp_[a-zA-Z0-9]{36}` (GitHub token)
- `sk-[a-zA-Z0-9]{48}` (API key)

### Build Artifacts (suggest .gitignore)

Check against known patterns:
- `node_modules/`, `dist/`, `build/`, `.next/`
- `__pycache__/`, `*.pyc`, `.venv/`, `venv/`
- `target/` (Rust), `bin/`, `obj/` (.NET)

If matched: Suggest adding to `.gitignore`. Do not stage.

### Large Files (warn)

If file is over 5MB, warn the user. Suggest `.gitignore` or mention git-lfs.

### Everything Else

Source code, config files, documentation → candidates for staging.

## Step 3: Analyze Modified Files

Run `git diff --stat` for overview.

Group all changes (untracked candidates + modified files) by logical unit:
- **Test files** together (files matching `*test*`, `*spec*`, `__tests__/*`)
- **Source files** that relate to the same feature together
- **Config/dependency changes** separate (`package.json`, `*config*`, `*.toml`, `*.yaml`)
- **Documentation** separate (`*.md`, `docs/*`)
- **.gitignore updates** as a separate final commit

## Step 4: Stage and Commit

For each logical group, present it to the user:

**Friendly voice:**
```
I'd like to save this as a group:

  📁 Login form feature
     - src/components/LoginForm.tsx (new file)
     - src/hooks/useAuth.ts (changed)

  With the note: "add login form with auth hook"

  OK? (yes / edit the note / skip)
```

**Technical voice:**
```
Group 1: feat: add login form with auth hook
  A  src/components/LoginForm.tsx
  M  src/hooks/useAuth.ts

Commit? (y / edit msg / skip)
```

On confirmation:
1. `git add <files in group>`
2. `git commit -m "<type>: <description>"`

### Commit Message Rules

Follow Conventional Commits. Types:
- `feat:` — new feature
- `fix:` — bug fix
- `test:` — test additions/changes
- `refactor:` — restructuring without behavior change
- `chore:` — tooling, config, dependencies
- `docs:` — documentation
- `style:` — formatting only

First line under 72 characters. Focus on *what* and *why*, not *how*.

## Step 5: Summary

After all groups are committed:

**Friendly voice:**
```
All done! Here's what I saved:

  ✓ "add login form with auth hook" (3 files)
  ✓ "add login form tests" (2 files)
  ✓ Updated .gitignore (added dist/, .env.local)

Your work is saved on branch feat/add-auth.
Everything stays on your computer — nothing was shared online.
```

**Technical voice:**
```
2 commits on feat/add-auth:
  feat: add login form with auth hook (3 files)
  test: add login form tests (2 files)
  .gitignore: +dist/, +.env.local
```

## Step 6: Reset Tracking State

After successful commits, update the state file:
- `edits_since_commit` → 0
- `writes_since_commit` → 0
- `files_touched` → []
- `last_commit_at` → now
- `current_branch` → current branch name

## Error Handling

| Situation | Action |
|-----------|--------|
| Not a git repo | Offer `git init` |
| No .gitignore | Generate one for detected project type |
| On protected branch | Guide to feature branch (Step 1a) |
| Merge conflict exists | Surface clearly, do NOT attempt resolution |
| Pre-commit hook fails | Show error, suggest fix, NEVER use `--no-verify` |
| Empty commit | Skip, inform user |
| Detached HEAD | Warn, suggest creating a branch |
| File already tracked but contains secrets | Warn that .gitignore won't help, suggest `git rm --cached` |

## Constraints

- **NEVER** push to a remote. All operations are local only.
- **NEVER** create pull requests.
- **NEVER** use `--no-verify` to skip pre-commit hooks.
- **NEVER** use `--force` on any git command.
- **NEVER** commit to protected branches (main, master by default).
- **ALWAYS** ask user to confirm before each commit.
- **ALWAYS** check for secrets before staging any file.
