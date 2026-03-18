# use-git: Specification

## 1. Overview

`use-git` is a Claude Code plugin that automates local git best practices for vibe-coders. It operates as a persistent mode (similar to `/tdd`) that tracks edits, nudges at natural commit points, and executes git workflows when invoked.

## 2. Architecture

### 2.1 Plugin Structure

```
use-git/
├── skills/
│   └── use-git/
│       └── SKILL.md              # Skill definition, workflow rules, mode behaviors
├── commands/
│   └── use-git.md                # Command entry point for /use-git invocation
├── agents/
│   └── use-git-guide.md          # Agent that performs git analysis and operations
├── scripts/
│   ├── usegit-tracker.mjs        # PostToolUse hook: silent edit/write counter
│   ├── usegit-nudger.mjs         # Hook: context injection at commit points
│   └── usegit-init.mjs           # First-time setup and environment detection
├── hooks/
│   └── hooks.json                # Hook registration for tracker and nudger
└── .meta/
    ├── VISION.md                 # Design philosophy and roadmap
    └── SPECIFICATION.md          # This file
```

### 2.2 Layers

The plugin operates in three layers with increasing token cost:

| Layer | Mechanism | Token Cost | Always On? |
|-------|-----------|------------|------------|
| **Tracker** | PostToolUse shell hook, writes state to JSON | Zero | Yes (when mode active) |
| **Nudger** | PreToolUse hook, injects one-line context | Minimal | Coach + Autopilot modes |
| **Workflow** | Full skill invocation via `/use-git` | Moderate | On demand or auto-triggered |

### 2.3 State Management

State is persisted in `<project-root>/.use-git/state.json`:

```json
{
  "active": true,
  "mode": "coach",
  "voice": "friendly",
  "started_at": "2026-03-18T10:00:00Z",
  "edits_since_commit": 14,
  "writes_since_commit": 3,
  "files_touched": ["src/app.ts", "src/utils.ts", "test/app.test.ts"],
  "last_commit_at": "2026-03-18T10:30:00Z",
  "last_edit_at": "2026-03-18T11:15:00Z",
  "test_runner_detected": "vitest",
  "protected_branches": ["main", "master"],
  "current_branch": "feat/add-auth",
  "initialized": true
}
```

## 3. Modes and Voice

Mode and voice are **independent settings**. Mode controls *what the plugin does*. Voice controls *how it talks to you*. A professional can use autopilot with technical voice. A beginner can use coach with friendly voice. Any combination is valid.

### 3.1 Mode: Zen

Minimal intervention. Safety nets only.

**Behaviors:**
- Silent edit tracking (Layer 1)
- Block commits to protected branches
- Warn before `/quit` if uncommitted changes exist
- Warn before destructive commands (`rm`, `git checkout --`, `git reset`)

**Does NOT:**
- Nudge after tests pass
- Nudge after N edits
- Auto-invoke any git operations

### 3.2 Mode: Coach (Default)

Nudges at natural breakpoints. User always decides.

**Inherits all Zen behaviors, plus:**
- Nudge after tests pass (strongest commit signal)
- Nudge after 15+ edits without a commit
- Nudge after 30+ minutes of active edits without a commit
- Nudge when user language suggests a milestone ("done", "works", "that's it", "looks good")
- All nudges are questions, never actions

### 3.3 Mode: Autopilot

Maximum automation. Git becomes invisible.

**Inherits all Coach behaviors, plus:**
- Auto-invoke `/use-git` workflow after tests pass
- Auto-invoke `/use-git` workflow before session end
- Auto-create feature branch if on a protected branch (still asks for description)
- Still requires user confirmation before each commit (never fully silent)

### 3.4 Voice: Friendly (Default)

Plain language. Avoids git jargon or translates it inline. Uses metaphors like "save", "checkpoint", "snapshot" instead of "commit". Reassuring tone.

### 3.5 Voice: Technical

Terse, standard git terminology. No explanations of what git concepts mean. Output mirrors what a senior developer would see in their terminal.

### 3.6 Voice Comparison

| Situation | Friendly | Technical |
|-----------|----------|-----------|
| Branch creation | "I moved your work to its own branch called 'add-auth' so it's separate from the main codebase." | `Switched to new branch feat/add-auth` |
| Secrets detected | "I skipped .env.local because it contains private keys. I added it to .gitignore so it won't accidentally get shared." | `.env.local not staged — contains secrets. Added to .gitignore.` |
| .gitignore update | "I told git to ignore some folders (like node_modules) that don't need to be saved — they can be recreated anytime." | `Added node_modules/, dist/ to .gitignore` |
| Commit summary | "Saved your login form work — 3 files captured with the note 'add login form'." | `feat: add login form (3 files)` |
| Test-pass nudge | "Your tests are all passing — want me to save a checkpoint of your work?" | `Tests green. 4 files uncommitted. /use-git?` |
| Edit count nudge | "You've made a bunch of changes — want me to save a checkpoint?" | `15 edits uncommitted.` |
| Quit warning | "You have unsaved work in 4 files. Want me to save it before you go?" | `4 files uncommitted. Commit before quit?` |
| Not a git repo | "This project isn't set up for version tracking yet. Want me to set that up? It lets you save checkpoints of your work." | `Not a git repo. Run git init?` |
| On protected branch | "You're working directly on the main codebase. Let's create a safe space for your changes first. What are you working on?" | `On main. Create feature branch? Describe the work:` |

### 3.7 Voice Does NOT Affect Behavior

Voice only changes output text. It never changes:
- Which files are staged or ignored
- Commit message format (always Conventional Commits)
- Branch protection rules
- Nudge timing or thresholds
- Any git operations performed

## 4. Activation and Commands

### 4.1 Command Surface

```
/use-git                    → Run the commit workflow (or first-time init)
/use-git mode zen           → Switch automation level
/use-git mode coach         → Switch automation level (default)
/use-git mode autopilot     → Switch automation level
/use-git voice friendly     → Switch output tone (default)
/use-git voice technical    → Switch output tone
/use-git status             → Show current settings + tracking state
```

### 4.2 First-Time Initialization

On first invocation, `/use-git` runs an interactive init flow:

**Friendly voice init:**
```
Welcome to use-git! I'll help you save your work automatically.

Two quick questions:

1. How much should I do on my own?
   → zen:       I'll just watch for mistakes (you call the shots)
   → coach:     I'll nudge you when it's a good time to save [recommended]
   → autopilot: I'll handle it — just confirm when I ask

2. How should I talk to you about git?
   → friendly:  Plain language, no jargon [recommended]
   → technical: Standard git terminology, terse output

```

**Technical voice init:**
```
use-git init

Mode:  [zen | coach* | autopilot]   * = default
Voice: [friendly* | technical]

Select mode:
Select voice:
```

Settings are saved to state and persist across sessions. Can be changed anytime via `/use-git mode <x>` or `/use-git voice <x>`.

### 4.3 Keyword Detection

The keyword detector hook recognizes:
- `use-git` (exact)
- Phrases like "commit my work", "save my progress" (contextual, friendly voice keywords)

### 4.4 Session Persistence

On session start, the session-start hook checks for active state in `usegit-state.json` and restores mode and voice if the plugin was active in a previous session.

## 5. The `/use-git` Workflow

When `/use-git` is invoked (manually or via auto-trigger), the following steps execute in order.

### 5.1 Environment Check

```
1. Is this a git repo?
   NO  → Offer to run `git init`
   YES → Continue

2. Is .gitignore present?
   NO  → Generate one based on detected project type (Node, Python, Rust, etc.)
   YES → Continue

3. What branch are we on?
   PROTECTED (main/master) → Guide user to create a feature branch
   FEATURE BRANCH         → Continue

4. Is a test runner available?
   DETECTED → Record in state, enable test-pass nudges
   NONE     → Warn: "No test suite detected. Nudges after tests pass won't work.
               Consider /tdd to set one up."
```

### 5.2 Analysis

```
5. Run `git status` to get full picture

6. Analyze untracked files:
   For each untracked file:
   - Source code?        → Candidate for staging
   - Build artifact?     → Suggest adding to .gitignore (node_modules, dist, __pycache__, etc.)
   - Secret/credential?  → WARN. Do not stage. Suggest .gitignore.
   - Large binary?       → WARN. Suggest .gitignore or git-lfs.
   - Config file?        → Stage, but flag for user review

7. Analyze modified files:
   - Run `git diff --stat` for overview
   - Group changes by logical unit:
     a. Test files together
     b. Source files that changed together (same feature)
     c. Config/dependency changes separate
     d. Documentation changes separate
```

### 5.3 Staging and Committing

```
8. For each logical group:
   a. Present the group to the user:
      "Group 1: Login form feature
       - src/components/LoginForm.tsx (new)
       - src/hooks/useAuth.ts (modified)
       Suggested commit message: feat: add login form with auth hook"

   b. User confirms, edits message, or skips

   c. git add <files in group>
   d. git commit -m "<message>"

9. If .gitignore was updated:
   - Separate commit: "chore: update .gitignore"
```

### 5.4 Summary

```
10. Print summary:
    "Created 2 commits on feat/add-auth:
     - feat: add login form with auth hook (3 files)
     - test: add login form unit tests (2 files)
     Added to .gitignore: dist/, .env.local

     Your work is saved locally. Use /use-git push when ready to share."
```

## 6. Nudge Specifications

### 6.1 Test-Pass Nudge

**Trigger:** PostToolUse hook detects a Bash command whose output matches test-pass patterns.

**Detection patterns:**
| Runner | Success pattern |
|--------|----------------|
| Jest/Vitest | `Tests:.*passed` or `✓` with exit code 0 |
| Pytest | `passed` with exit code 0 |
| Go test | `PASS` or `ok` |
| Cargo test | `test result: ok` |

**Injected context (voice-dependent):**
```
friendly:  [use-git] Your tests are all passing — want me to save a checkpoint?
technical: [use-git] Tests green. 4 files uncommitted. /use-git?
```

### 6.2 Edit Count Nudge

**Trigger:** Tracker state shows `edits_since_commit >= 15`.

**Injected context:**
```
friendly:  [use-git] You've made a bunch of changes — want me to save a checkpoint?
technical: [use-git] 15 edits uncommitted.
```

**Cooldown:** Only nudge once per threshold crossing. Next nudge at 30 edits.

### 6.3 Time-Based Nudge

**Trigger:** `last_edit_at - last_commit_at > 30 minutes` AND `edits_since_commit > 0`.

**Injected context:**
```
friendly:  [use-git] It's been a while since your last save. Want to capture your progress?
technical: [use-git] 30+ min since last commit. /use-git?
```

**Cooldown:** Once per 30-minute window.

### 6.4 Quit Warning

**Trigger:** User types `/quit`, `exit`, or session end signal.

**Injected context:**
```
friendly:  [use-git] You have unsaved work in N files. Want me to save it before you go?
technical: [use-git] N files uncommitted. Commit before quit?
```

### 6.5 Destructive Command Warning

**Trigger:** Bash command matches: `rm -rf`, `git checkout -- .`, `git reset --hard`, `git clean`.

**Injected context:**
```
friendly:  [use-git] Careful — you have unsaved changes. This might erase them. Save first?
technical: [use-git] Uncommitted changes. This command may discard them. Commit first?
```

## 7. Branch Protection

### 7.1 Protected Branches

Default protected: `main`, `master`.

Configurable via state or future config file.

### 7.2 Branch Creation Flow

When the user is on a protected branch and `/use-git` is invoked:

```
Agent: "You're on main. Let's create a working branch first.
        What are you working on?"

User:  "adding user authentication"

Agent: git checkout -b feat/add-user-authentication
       "Created branch feat/add-user-authentication. Ready to commit."
```

**Branch naming convention:** `feat/`, `fix/`, `chore/`, `refactor/` prefixes, kebab-case description. The agent infers the prefix from the description.

## 8. Secrets Detection

### 8.1 Filename Patterns (Never Stage)

```
.env
.env.*
*.pem
*.key
*.p12
*.pfx
*credentials*
*secret*
service-account*.json
```

### 8.2 Content Patterns (Scan Before Staging)

```
API_KEY=
SECRET_KEY=
PRIVATE_KEY=
password\s*=\s*["'][^"']+
aws_access_key_id
aws_secret_access_key
-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----
ghp_[a-zA-Z0-9]{36}          # GitHub personal access token
sk-[a-zA-Z0-9]{48}           # OpenAI/Anthropic API key
```

### 8.3 Behavior on Detection

- Do NOT stage the file
- Warn the user clearly
- Suggest adding to .gitignore
- If the file was *already tracked* in a previous commit, warn that .gitignore alone won't help and suggest `git rm --cached`

## 9. .gitignore Intelligence

### 9.1 Project Type Detection

| Indicator | Project Type | .gitignore additions |
|-----------|-------------|---------------------|
| `package.json` | Node.js | `node_modules/`, `dist/`, `.env`, `.env.*` |
| `requirements.txt` / `pyproject.toml` | Python | `__pycache__/`, `*.pyc`, `.venv/`, `venv/` |
| `Cargo.toml` | Rust | `target/` |
| `go.mod` | Go | (Go has minimal ignores) |
| `*.sln` / `*.csproj` | .NET | `bin/`, `obj/`, `*.user` |
| `Gemfile` | Ruby | `vendor/bundle/` |

### 9.2 Universal Ignores

Always suggest if missing:
```
.DS_Store
*.swp
*.swo
*~
.idea/
.vscode/settings.json
*.log
```

## 10. Commit Message Format

### 10.1 Convention

Follow Conventional Commits:

```
<type>(<optional scope>): <description>

<optional body>
```

**Types:**
- `feat:` — New feature or functionality
- `fix:` — Bug fix
- `test:` — Adding or updating tests
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `chore:` — Tooling, config, dependencies
- `docs:` — Documentation only
- `style:` — Formatting, whitespace (no logic change)

### 10.2 Message Generation

The agent analyzes the diff to determine:
1. **Type** — from the nature of the changes
2. **Scope** — from the area of code changed (optional, used when clear)
3. **Description** — concise summary of *what* and *why*, not *how*

Messages should be under 72 characters for the first line.

## 11. Error Handling

| Situation | Behavior |
|-----------|----------|
| Not a git repo | Offer `git init` |
| No .gitignore | Generate one |
| On protected branch | Guide to feature branch |
| Merge conflict exists | Surface clearly, do not attempt resolution |
| Dirty working tree prevents branch switch | Commit or stash first |
| Pre-commit hook fails | Show error, suggest fix, do not `--no-verify` |
| Empty commit (no changes) | Skip, inform user |
| Detached HEAD | Warn, suggest creating a branch |

## 12. Token Budget Estimates

| Operation | Estimated Tokens |
|-----------|-----------------|
| Tracker hook (shell script) | 0 (no LLM) |
| Single nudge injection | ~20 tokens input |
| Full /use-git workflow (simple, 1-3 files) | ~2,000-4,000 tokens |
| Full /use-git workflow (complex, 10+ files, multiple groups) | ~5,000-10,000 tokens |
| Branch creation flow | ~1,000-2,000 tokens |

## 13. Future Considerations (v2+)

### 13.1 Remote Operations (v2)
- `/use-git push` — push current branch to remote
- `/use-git pr` — create PR with generated description
- Both always explicit, never automatic

### 13.2 Worktree Support (v3)
- `/use-git worktree start "description"` — create isolated worktree
- `/use-git worktree list` — show active worktrees
- `/use-git worktree finish` — merge/PR and clean up
- Opt-in only, with warnings about build-step friction (node_modules, native modules)

### 13.3 Potential Integrations
- Pair with `/tdd`: test pass → commit nudge is the golden path
- Pair with CI: detect if branch has a passing CI run before suggesting push
- Pair with issue trackers: link commits to issues via branch naming
