---
name: add-task
description: "Create a new task, bug-fix task, decision record, or ADR in a sbrain project. Use when the user says \"add task\", \"task ekle\", \"bug:\", \"bug var\", \"decision:\", \"karar:\", \"write adr\", \"adr yaz\", or \"start [module] module\" / \"[modül] modülünü başlat\"."
---

# Add Task / Bug / Decision / ADR

One skill for the four ledger-entry commands.

## `add task: [description]`
1. Find the next task number: highest existing `TASK-NNN` in `.agent/tasks/` + 1.
2. Copy `.agent/tasks/TASK.template.md` to `TASK-NNN.md`; fill What, Module, Depends on,
   Acceptance criteria (draft from the description; confirm with the human), Technical
   notes (link relevant CONTRACT / KI / RULES sections).
3. Rebuild the ledger: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/reindex.sh"`
4. Report the task ID and summary. Do NOT start implementing — that is `task-execution`,
   and it begins only when the human says so.

## `bug: [description]`
Same as add task, but:
- Type is `fix`; title starts with "Fix:".
- Acceptance criteria must include a reproduction step and the expected behavior.
- If the human wants to start immediately, hand off to `task-execution` (which opens
  the `fix/[module]-[slug]` branch).
- When the fix confirms a real trap, session-end records the KI.

## `start [module] module`
1. Verify `docs/modules/[module]/CONTRACT.md` does not already exist.
2. Copy `docs/modules/CONTRACT.template.md` to `docs/modules/[module]/CONTRACT.md`.
3. Interview the human briefly: responsibility, owned tables/data, public interface,
   dependencies, bans. Fill the contract; get explicit approval.
4. Propose a task breakdown (typically 2–6 tasks) and create each via the add-task flow,
   with `Depends on` chains set. Confirm before creating.

## `decision: [description]`
Append to `.agent/memory/DECISIONS.md` using its format (date, context, decision,
alternatives rejected, reversal cost). Never delete entries. If the decision is big
enough to constrain architecture, suggest an ADR instead.

## `write adr: [description]`
1. Next sequential number; create `docs/ADR/NNN-slug.md` using the format in
   `docs/ADR/INDEX.md` (Status / Context / Decision / Consequences / Rejected
   alternatives).
2. Add a row to `docs/ADR/INDEX.md`.
3. Update any RULES/CONTRACT the ADR overrides, noting "per ADR-NNN".
4. Commit message: `docs(adr): add ADR-NNN — short title` (on a `docs/` branch, PR to
   develop — never directly).
