---
name: parallel-tasks
description: "Dispatch multiple independent tasks to parallel subagents in isolated git worktrees. Use when the user asks to work on several tasks at once, says \"parallel\", \"paralel çalış\", \"dispatch tasks\", or when the ledger has 2+ independent pending tasks and the user wants speed. Never use for tasks that touch the same module or depend on each other."
---

# Parallel Task Dispatch

Run independent tasks concurrently: one subagent per task, one worktree per subagent,
one branch per worktree. Git remains the only coordination substrate — subagents never
share mutable state files.

Use this only when it genuinely pays: 2–4 concurrent tasks is the sweet spot; more adds
coordination overhead without proportional gain, and token usage scales linearly with
agent count. For a single small task, plain `task-execution` is faster and cheaper.

---

## Step 1 — Select a safe batch

From `.agent/tasks/INDEX.md`, candidate tasks must ALL be true:
- `Status: pending` and every `Depends on` is `done`.
- **Different modules** — no two tasks in the batch touch the same module. Module
  CONTRACTs define the boundaries; if two tasks share files outside module dirs
  (e.g. both edit `app.module.ts` wiring), they are NOT parallel-safe — serialize them
  or split the shared edit into its own tiny task run first.
- Each has a CONTRACT.md for its module.

Present the batch to the human with the reasoning. Confirm before dispatching.

## Step 2 — Dispatch

For each task, spawn a subagent with **worktree isolation** so parallel agents never
edit the same checkout. Each subagent's brief must contain, verbatim:
- The task ID and full path to its TASK-NNN.md.
- Its module CONTRACT path and the relevant KNOWN_ISSUES file.
- The stack profile to load (from CLAUDE.md).
- The branch to create: `[type]/[module]-[slug]` off develop.
- Rules of engagement:
  - "You are a worktree subagent. Do NOT write `.agent/SESSION.md`."
  - "Set your TASK file to in_progress first; work only inside your module."
  - "Finish with session-end Path A (PR, no merge, no branch deletion) or Path B (wip
     push) — then report branch, commits, PR URL, and reviewer verdict."
  - "If you need a file outside your module, STOP and report back instead of editing."
- A budget: report back when ~80% of your context is used (Path B wip push first).

## Step 3 — Collect and integrate (main session)

As each subagent reports:
1. Verify its reviewer verdict is PASS (Path A) — if the subagent skipped review,
   dispatch `code-reviewer` on its branch diff now.
2. Merge PRs to develop **one at a time**, running the stack's build/lint/tests after
   each merge. Never bulk-merge parallel branches.
3. After each merge: delete the branch (local + remote) and remove the worktree.
4. Rebuild the ledger: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/reindex.sh"`.
5. When the whole batch is integrated, update `.agent/SESSION.md` (main session owns
   it) and give one combined summary.

## Failure handling
- A subagent reporting a boundary conflict: pause the batch, resolve the boundary
  (CONTRACT change is a human decision), then resume.
- A subagent dying mid-task: its wip commits are on its branch; recover via
  session-start Resume in a new dispatch.
- Merge conflict during integration: the conflicting later branch is rebased onto the
  fresh develop by a new subagent (or by the main session), then re-reviewed.

## Hard limits
- Max 4 concurrent subagents unless the human explicitly raises it.
- Never dispatch two tasks of the same module concurrently.
- Never let a subagent merge to develop or touch main. Integration is centralized here.
