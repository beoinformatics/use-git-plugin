# use-git: Architecture

## 1. Component Overview

The plugin is composed of five component types, each with a distinct role:

```
┌─────────────────────────────────────────────────────────────────┐
│                        use-git plugin                           │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐              │
│  │  Skill   │  │  Agent   │  │    Scripts     │              │
│  │          │  │          │  │               │              │
│  │ use-git  │  │ use-git  │  │ tracker.mjs   │              │
│  │ SKILL.md │  │ -guide   │  │ nudger.mjs    │              │
│  │          │  │ .md      │  │ init.mjs      │              │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘              │
│       │              │                │                      │
│       │              │                │                      │
│  ┌────▼──────────────▼────────────────▼───────────────────┐  │
│  │                      hooks.json                           │  │
│  │  Registers scripts to Claude Code lifecycle events        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              .use-git/state.json                           │  │
│  │  Shared state: mode, voice, edit counts, file tracking    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Components at a Glance

| Component | Type | Purpose | Uses LLM? |
|-----------|------|---------|-----------|
| `skills/use-git/SKILL.md` | Skill | Entry point + workflow rules, mode behaviors, voice templates | Yes (loaded into context) |
| `agents/use-git-guide.md` | Agent | Performs git analysis, staging, committing | Yes (Sonnet) |
| `scripts/usegit-tracker.mjs` | Hook script | Counts edits/writes, tracks touched files | No (shell only) |
| `scripts/usegit-nudger.mjs` | Hook script | Injects nudge messages at commit points | No (shell only) |
| `scripts/usegit-init.mjs` | Hook script | Detects environment on first run | No (shell only) |
| `scripts/usegit-quit-check.mjs` | Hook script | Warns about uncommitted work on session end | No (shell only) |
| `hooks/hooks.json` | Config | Binds scripts to Claude Code lifecycle events | N/A |
| `.use-git/state.json` | State | Shared persistent state across all components | N/A |

## 2. Component Details

### 2.1 Skill: `skills/use-git/SKILL.md`

The brain. Loaded into Claude's context when the commit workflow is triggered. Contains:

- **Workflow steps**: the full environment-check → analysis → staging → commit → summary sequence
- **Mode rules**: what to do in zen vs coach vs justdoit
- **Voice templates**: how to phrase output in friendly vs technical
- **Branch protection rules**: never commit to main/master
- **Secrets detection patterns**: filename and content patterns to block
- **Commit message conventions**: conventional commits format and generation rules
- **.gitignore intelligence**: project type detection and universal ignores

The skill instructs Claude to use the `use-git-guide` agent for the heavy lifting (git commands, diff analysis, file grouping).

### 2.3 Agent: `agents/use-git-guide.md`

The hands. A Sonnet-class agent that executes git operations. It:

- Runs `git status`, `git diff`, `git log`
- Analyzes untracked/modified files
- Groups changes into logical commits
- Generates commit messages from diffs
- Executes `git add` and `git commit`
- Applies .gitignore updates
- Scans for secrets before staging

The agent receives the current voice setting and formats its output accordingly. It has access to Bash, Read, Grep, and Glob tools.

**Why a separate agent?** Two reasons:
1. **Token isolation**: The git analysis (reading diffs, scanning for secrets) can consume significant context. Running it as an agent keeps the main conversation window clean.
2. **Tool access control**: The agent has a defined set of tools. It cannot do things outside its scope (no web access, no file writes outside git operations).

### 2.4 Scripts (Hook Handlers)

All scripts are **pure shell/Node.js** — they never invoke the LLM. This is critical for the zero-token-cost guarantee of Layer 1 and minimal-cost guarantee of Layer 2.

#### `scripts/usegit-tracker.mjs` — The Counter

**Registered on:** `PostToolUse` (fires after every tool execution)

**What it does:**
```
1. Check: is use-git active? (read state.active)
   NO  → exit immediately (cost: one file read)

2. Check: was the tool an Edit, Write, or Bash tool?
   NO  → exit

3. If Edit or Write:
   - Increment state.edits_since_commit
   - Add file path to state.files_touched (deduplicated)
   - Update state.last_edit_at

4. If Bash and command matches test runner patterns:
   - Check exit code
   - If success: set state.tests_just_passed = true

5. Write updated state
```

**Performance:** Reads and writes a small JSON file. Sub-millisecond. No network, no LLM.

#### `scripts/usegit-nudger.mjs` — The Reminder

**Registered on:** `PreToolUse` (fires before every tool execution)

**What it does:**
```
1. Check: is use-git active? Is mode coach or justdoit?
   NO  → exit (no nudge in zen mode)

2. Read state. Evaluate nudge conditions:
   a. state.tests_just_passed == true?
   b. state.edits_since_commit >= threshold (15)?
   c. now - state.last_commit_at > 30 minutes AND edits > 0?
   d. Tool is Bash AND command matches destructive pattern?

3. If any condition met:
   - Select nudge text based on condition + state.voice
   - Return nudge as context injection string
   - Mark nudge as delivered (prevent re-firing until next threshold)
   - Clear state.tests_just_passed if that was the trigger

4. If justdoit mode AND tests_just_passed:
   - Instead of nudge text, return skill invocation instruction
     (tells Claude to run /use-git automatically)
```

**Output format:** The nudger returns a short string that Claude Code injects into the conversation context before the next tool executes. This is the same mechanism used by oh-my-claudecode's `pre-tool-enforcer.mjs`.

#### `scripts/usegit-init.mjs` — The Detector

**Registered on:** `SessionStart` (fires when a Claude Code session begins)

**What it does:**
```
1. Check: does .use-git/state.json exist with active: true?
   YES → Restore mode. Return session-restore message.
   NO  → exit (plugin not yet activated)

2. Re-detect environment (in case project changed):
   - Is this still a git repo?
   - What branch are we on?
   - Is the test runner still present?
   - Update state with current values
```

## 3. Hook Registration

### `hooks/hooks.json`

The actual `hooks.json` uses the Claude Code hook format with event-keyed objects and matchers. Four hooks are registered:

| Hook | Event | Purpose | Timeout |
|------|-------|---------|---------|
| `usegit-tracker.mjs` | PostToolUse | Count edits, track files, detect test passes | 3s |
| `usegit-nudger.mjs` | PreToolUse | Inject nudge messages at commit points | 3s |
| `usegit-init.mjs` | SessionStart | Restore state on session resume | 5s |
| `usegit-quit-check.mjs` | Stop | Warn about uncommitted work on quit | 3s |

**Design note:** Tracker and nudger run on every tool call but exit early (single JSON file read) when use-git is not active. The Stop hook uses `stopReason` (not `hookSpecificOutput`) per the Stop event schema.

## 4. Data Flow

### 4.1 Passive Tracking (every tool use, zero LLM tokens)

```
User edits code
       │
       ▼
Claude calls Edit tool
       │
       ▼
┌──────────────────┐
│ PostToolUse hook  │
│ usegit-tracker   │──→ reads/writes .use-git/state.json
│ (shell script)   │    (increment counter, track file)
└──────────────────┘
       │
       ▼
Edit completes normally
```

### 4.2 Nudge Injection (coach/justdoit, ~20 tokens)

```
User asks Claude to do something
       │
       ▼
Claude is about to call a tool
       │
       ▼
┌──────────────────┐
│ PreToolUse hook   │
│ usegit-nudger    │──→ reads .use-git/state.json
│ (shell script)   │    (check thresholds)
└──────────────────┘
       │
       ├─ threshold not met → exit, no injection
       │
       └─ threshold met → return nudge string
              │
              ▼
       Claude sees: "[use-git] Tests green. 4 files uncommitted. /use-git?"
       Claude may mention this to the user (or auto-invoke in justdoit)
```

### 4.3 Full Workflow (on /use-git invocation, moderate tokens)

```
User: /use-git
       │
       ▼
┌──────────────────┐
│ Skill             │
│ SKILL.md         │──→ loaded into Claude's context
│                  │    (parse args, route, workflow rules, voice templates)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐         ┌─────────────────────┐
│ Agent             │         │ Git Operations       │
│ use-git-guide    │────────→│ git status           │
│ (Sonnet)         │         │ git diff --stat      │
│                  │◄────────│ analyze files         │
│                  │────────→│ git add <files>       │
│                  │         │ git commit -m "..."   │
└──────────────────┘         └─────────────────────┘
       │
       ▼
┌──────────────────┐
│ State Update      │
│ usegit-tracker   │──→ reset edits_since_commit = 0
│                  │    reset files_touched = []
│                  │    update last_commit_at
└──────────────────┘
       │
       ▼
Summary displayed to user (in current voice)
```

### 4.4 First-Time Activation

```
User: /use-git (first time)
       │
       ▼
┌──────────────────┐
│ Skill             │
│ SKILL.md         │──→ no state file found → init workflow loaded
└──────┬───────────┘
       │
       ▼
Claude asks user: mode? voice?
       │
       ▼
┌──────────────────┐
│ Environment       │
│ Detection        │──→ git repo? .gitignore? test runner? branch?
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ State Created     │
│.use-git/state.json──→ { active: true, mode: "coach", voice: "friendly", ... }
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Hooks Active      │──→ tracker + nudger now fire on every tool use
└──────────────────┘
       │
       ▼
Ready. (If uncommitted work already exists, offer to commit it now.)
```

## 5. State File Location

```
<project-root>/.use-git/state.json
```

The state file lives in the project directory under `.use-git/` — the plugin's own namespace. No dependency on oh-my-claudecode or any other plugin's directory structure.

**Why project-local?** Different projects may have different modes, voices, and protected branch lists. A monorepo professional might want `voice: technical` while their side project uses `voice: friendly`.

**The state file is NOT committed to git.** `.use-git/` is added to `.gitignore` during the plugin's init flow.

## 6. What Each Component Does NOT Do

Clear boundaries prevent scope creep and bugs:

| Component | Does NOT |
|-----------|----------|
| **Skill** | Execute git commands directly. Delegates to agent. |
| **Skill** | Execute anything. It's a prompt document, not code. |
| **Agent** | Push, create PRs, or interact with remotes. |
| **Tracker** | Call the LLM. Invoke skills. Make decisions. |
| **Nudger** | Execute git commands. Commit on its own. Block tool execution. |
| **Init** | Change git state. Create branches. Modify files. |

## 7. Dependencies

### External
- `git` CLI (must be installed and in PATH)
- Node.js runtime (for hook scripts — provided by Claude Code's environment)

### Internal (Claude Code plugin system)
- Hook registration system (`hooks.json` format)
- Skill/agent loading infrastructure
- No dependency on oh-my-claudecode or any other plugin

### Optional
- A test runner (any — jest, vitest, pytest, go test, cargo test)
  - Required for test-pass nudges
  - Plugin works without it, just with fewer nudge triggers

## 8. Security Considerations

- **No remote operations in v1.** The plugin cannot exfiltrate code.
- **State file contains no secrets.** Only metadata (file names, timestamps, counts).
- **Secrets scanner runs before staging.** Defense in depth — even if .gitignore is misconfigured.
- **Hook scripts have no network access.** They read/write local JSON only.
- **Agent is scoped.** Cannot write arbitrary files, only execute git commands.

## 9. Performance Budget

| Event | Frequency | Max latency | Token cost |
|-------|-----------|-------------|------------|
| Tracker (PostToolUse) | Every tool call | <50ms | 0 |
| Nudger (PreToolUse) | Every tool call | <50ms | ~20 (when nudge fires) |
| Init (SessionStart) | Once per session | <500ms | 0 |
| Full workflow (/use-git) | On demand | 5-15s | 2,000-10,000 |

The tracker and nudger together add <100ms to every tool call. This is imperceptible to the user.
