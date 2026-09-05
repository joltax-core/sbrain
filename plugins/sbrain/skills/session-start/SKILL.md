---
name: session-start
description: "Boot protocol for sbrain projects. Use at the start of EVERY session in a project that contains a .agent/ directory, or when the user says \"start\", \"/init\", \"başla\", \"session start\", or asks to resume work. Establishes true state from git before any code is touched. Also use when the user asks \"where were we\" or \"what's the current state\"."
---

# Session Start

Boot the session. Establish true state from git before touching anything.

Git is the source of truth. `.agent/SESSION.md` and `.agent/tasks/INDEX.md` are caches.
This skill reconciles those caches against git and never trusts them blindly.

**Precondition:** the project must contain a `.agent/` directory. If it does not,
this project has not been initialized — offer to run the `bootstrap` skill instead.

**Stack profile:** read the `Backend stack profile:` and `Frontend stack profile:`
lines in the project's `CLAUDE.md`. Load the matching stack skill(s) (e.g.
`stack-nestjs`, `stack-frontend-vue`) before writing any code this session — a project
may have one, both, or neither set.

---

## Step 0 — Reconcile and detect mode (before reading any state file)

1. Sync with the remote:
```bash
git fetch origin --prune
```

2. Drift check — before anything else. Is `origin/main` ahead of `origin/develop`?
```bash
git log --oneline origin/develop..origin/main
```
If this returns commits, STOP and warn the human:
> "main contains commits not on develop ([hashes]). Someone committed to main
> directly. Back-port them to develop before starting new work, or the next
> develop -> main PR will silently lose changes."
Do not proceed to new work until this is resolved.

3. Detect work in progress. Unmerged work exists if EITHER is true:
- `.agent/SESSION.md` shows `Task status: in_progress`, OR
- a remote branch is not merged into develop:
```bash
git branch -r --no-merged origin/develop | grep -vE 'origin/(main|develop|HEAD)'
```
No unmerged work -> MODE = Clean Start (Step 1).
Unmerged work    -> MODE = Resume (Step 2).

If the repository has no remote yet (fresh project), skip fetch/drift and treat
local branches the same way.

---

## Step 1 — Clean Start

```bash
git checkout develop
git pull origin develop
```
Reconcile caches against git:
- Compare `SESSION.md` "Last commit" to `origin/develop` HEAD. If they differ, rewrite
  SESSION.md to match reality and note the correction in the summary.
- Run the reindex script to rebuild the task ledger from the task files (files are
  authority, the index is a derived view):
```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/reindex.sh"
```
- If any TASK file is `in_progress` in a Clean Start, that is stale; ask the human
  whether to mark it back to `pending` or investigate.

Read context for the next task:
- `docs/RULES.md`, `docs/ARCHITECTURE.md` (note which Optional concerns are enabled),
  `docs/KNOWN_ISSUES/INDEX.md`.
- The next pending task's file, if one is queued.

Go to Step 3.

---

## Step 2 — Resume (do NOT check out develop; that would strand the half-finished branch)

1. Identify the work branch(es):
```bash
git branch -r --no-merged origin/develop | grep -vE 'origin/(main|develop|HEAD)'
```
If there is more than one, list them all with their last commit and ask the human which
to resume. Never auto-pick.

2. Check out the chosen branch and sync:
```bash
git checkout [branch]
git pull origin [branch]
```

3. Reconstruct what was done:
```bash
git log origin/develop..HEAD   # commits since develop, including any wip(...)
git status                     # uncommitted remnants (same machine only)
```

4. Reconcile the cache against git. Three common cases:
- a. SESSION.md `in_progress` + branch open and not merged -> state is correct, proceed.
- b. SESSION.md says no work + an open branch exists -> SESSION.md is stale (likely a
     context-window death). Rebuild it from `git log` and the TASK file.
- c. SESSION.md `in_progress` + branch already merged -> the task actually shipped; clean
     SESSION.md, set the task done, run reindex, switch to Clean Start.

5. Load the active task's context: its `TASK-NNN.md`, the module's `CONTRACT.md`, the
   relevant `KNOWN_ISSUES/[module].md`, and `.agent/memory/STACK.md` if the area is
   tricky. Read the TASK file's "Next session — start here" note.

---

## Step 3 — Deliver the summary (mode visible in the first line)

Clean Start:
```
## Session Start Summary — Clean Start
Project / stack: ...
develop is up to date (HEAD [hash]). No unmerged work. Drift: none.
Reconciled: [what was corrected] / nothing.
Next up: [TASK-NNN: title] / nothing queued.
What I'll do now: [one sentence]. Proceed?
```

Resume:
```
## Session Start Summary — Resume
Active task: TASK-NNN: title (in_progress).
Branch [branch], [N] commits ahead of develop, last commit [hash] [wip?].
Stopping point: [from the TASK file's next-step note].
Drift: none / WARNING: ...
Reconciled: [what was corrected] / nothing.
Continue this task, or set it aside?
```

If MODE = Resume, always ask before continuing. The human may want to abandon the
half-finished branch and start something else. Do not write code before confirmation.

---

## Parallel-mode note

If this session is a worktree subagent dispatched by the `parallel-tasks` skill:
- Skip Steps 0–2 entirely; the dispatcher already reconciled state.
- Do NOT write to `.agent/SESSION.md` — it belongs to the main session only. Your
  state lives in your branch, your wip commits, and your TASK file.
- Read only your assigned TASK file, its module CONTRACT, and the relevant KI file.

## Quality bar
- The first line states the mode. No surprises.
- Git was consulted before any cache was trusted.
- Drift and any cache corrections are surfaced, not hidden.
- In Resume, the human chooses whether to continue. Never auto-resume.
