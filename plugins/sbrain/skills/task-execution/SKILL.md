---
name: task-execution
description: "Execute one task in a sbrain project, from reading the spec to hand-off. Use when starting work on a TASK-NNN, when the user says \"start task\", \"work on TASK\", \"implement\", or picks a task from the ledger. Enforces read-before-write, contract-first, branch-per-task, and fresh-context review."
---

# Task Execution

Execute one task. Read -> plan -> branch -> implement -> review -> hand off. In order.

This skill is stack-agnostic. The **implementation order and layer rules come from the
stack skill(s)** named in the project's `CLAUDE.md` (`Backend stack profile:` /
`Frontend stack profile:` lines). Load the skill matching the task's module (backend,
frontend, or both) before Step 4 if it is not already loaded.

---

## Step 1 — Read before writing
- The full `TASK-NNN.md`: every field, every acceptance criterion.
- Its `Depends on` — are dependencies done? (check `.agent/tasks/INDEX.md`)
- The module's `docs/modules/[module]/CONTRACT.md`. **Contract first: never write code
  for a module before its CONTRACT.md exists.**
- `docs/KNOWN_ISSUES/[module].md` for traps in this area.
- `.agent/memory/STACK.md` for relevant patterns.
- `docs/ARCHITECTURE.md` — which Optional concerns are enabled; they decide which rules
  apply to this code.
- If this task touches Vue frontend code: `docs/COMPONENTS.md`, in full, before writing
  any component (`stack-frontend-vue` §1.1 decides reuse vs. new vs. module-local).
If anything is ambiguous, ask before proceeding.

## Step 2 — Announce the plan
State: task, module, branch name, the approach in 2-3 sentences, the files you will
create/modify, the acceptance criteria you will verify, and any KI to watch. Then ask
to proceed.

## Step 3 — Open the branch and set status (file first, then index)
```bash
git checkout develop && git pull origin develop
git checkout -b [type]/[module]-[slug]
```
Then, in this order:
- `TASK-NNN.md`: `Status: in_progress`.
- Rebuild the ledger: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/reindex.sh"`
- `.agent/SESSION.md`: active task, status, branch, module (main session only —
  worktree subagents skip this).

## Step 4 — Implement (order defined by the stack skill)
Follow the stack skill's implementation order and conventions, plus the concern rules
enabled in ARCHITECTURE.md. Implement and verify one acceptance criterion at a time.
Where the project has a test suite, write tests as you go; otherwise record the manual
verification performed in the TASK file.

## Step 5 — Review (fresh context, not self-review)
Dispatch the `code-reviewer` subagent with: the staged diff, the TASK file, the module
CONTRACT, and the enabled-concerns list. Report its verdict before committing. A FAIL
is fixed and re-dispatched; never argue a FAIL away in this session's context.

## Step 6 — Hand off
On PASS: set `TASK-NNN.md` `Status: done`, then run the `session-end` skill (Path A).

---

## Escalation — stop and ask when
- A decision is not covered by ARCHITECTURE.md or CONTRACT.md.
- A new dependency is needed (human approval required, always).
- An acceptance criterion cannot be met as written.
- The task is much larger than expected (suggest splitting it).
- A module boundary must change (update CONTRACT.md first).
