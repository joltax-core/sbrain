---
name: session-end
description: "Close a sbrain session cleanly and idempotently. Use when the user says \"end session\", \"wrap up\", \"close\", \"session bitti\", \"bitir\", or when the context window is filling up during active work. Commits state so the next session starts exactly where this one stopped. Never manufactures a commit when there is nothing to commit."
---

# Session End

Close the session cleanly and idempotently. The next session starts exactly where this
one stopped. This skill never manufactures a commit: if there is nothing to commit, it
commits nothing.

---

## Step 0 — Context-window trigger
If you notice the context window filling before the human ends the session, do not wait
to be asked:
> "Context is filling. Let me commit the current state as wip and push, so nothing is lost."
On agreement, run Path B. The goal: half-finished work never exists only as uncommitted
local changes.

---

## Step 1 — Classify the outcome
- Completed task, with changes -> Path A
- Incomplete task (or context trigger) -> Path B
- No changes (clean tree, task already committed and PR'd) -> Path C

---

## Path A — completed task

1. Dispatch the `code-reviewer` subagent on the staged diff. It must return PASS.
   The reviewer runs in a fresh context with read-only access; do not review your own
   code in this session's context. If it returns FAIL, fix the findings and re-dispatch.
2. Verify against `docs/DEFINITION_OF_DONE.md` (plus the stack skill's DoD additions).
3. Update the TASK file FIRST, then rebuild the index (the file is authority):
   - `.agent/tasks/TASK-NNN.md`: `Status: done`; fill Branch, PR (after it opens), Commit,
     Delivered, any KI-NNN, Discoveries.
   - Rebuild the ledger: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/reindex.sh"`
4. Update `.agent/SESSION.md` (current state, what was done, next step).
5. Update KNOWN_ISSUES / memory only if there was a real learning (Step 4 rules below).
6. Make ONE commit containing the code AND all bookkeeping (task file, index, SESSION,
   KI, memory). The bookkeeping is part of the PR, not a commit that leaks in afterward.
```bash
git add .
git diff --staged   # review
git commit -m "[type]([module]): [description]

Task: TASK-NNN"
```
7. Push and open a PR to develop. Report the PR URL.
8. After the PR is merged (with human confirmation), delete the branch:
```bash
git branch -d [branch]
git push origin --delete [branch]
```
A branch's life ends at merge. Branches never accumulate.

---

## Path B — incomplete (WIP)
1. Document the stopping point in `TASK-NNN.md` ("Next session — start here: [exact next
   action]"). Keep `Status: in_progress`. Run reindex.
2. Update `.agent/SESSION.md` with the same stopping point.
3. Commit as WIP and push. No PR (the task is not done). The code-reviewer is NOT
   dispatched for wip commits.
```bash
git commit -m "wip([module]): [short] — session end

Next: [exact next action]

Task: TASK-NNN"
git push origin [branch]
```

---

## Path C — no changes
Do not commit. Reconcile `.agent/SESSION.md` and the index with git (they should already
match), then report. Closing a session you only read in must not create a commit.

---

## Step 4 — Known Issues and memory (conditional)
Add a KI only if a real bug/trap was confirmed THIS session:
- Append to `docs/KNOWN_ISSUES/[module].md` and a one-line row to its INDEX.md table.
- KI numbers are never reused; a removed KI keeps its number as a tombstone.
- Do not record suspicions or "might happen" notes.
Memory: a confirmed transferable pattern -> `.agent/memory/STACK.md`; a project
discovery -> `PROJECT.md`; a decision -> `DECISIONS.md`.

---

## Step 5 — Session End Summary
State: committed hash + message (or "no commit — nothing to change"), branch + push
status, PR URL (Path A only), task status, KI added (or none), reviewer verdict
(Path A only), and the exact next-session starting point.

---

## Parallel-mode note
A worktree subagent finishing its task runs Path A or B inside its own worktree, but:
- It does NOT touch `.agent/SESSION.md` (main session owns it).
- It does NOT merge or delete branches; it reports its PR/branch back to the dispatcher.

## Quality bar
- No manufactured commits. Path C commits nothing.
- A completed task is one clean commit, with no leaked post-PR bookkeeping commit.
- The TASK file is updated before the index is rebuilt; git is treated as truth.
- The branch is deleted after merge (main session only).
- WIP work always exists in git before the session ends.
- Path A never ships without a fresh-context reviewer PASS.
