# sbrain

A Claude Code plugin that turns any repository into a git-authoritative, agent-operated
project: session boot/close protocols, a task ledger, layered memory, deterministic
enforcement hooks, a fresh-context code reviewer, parallel task dispatch, and stack
profiles (NestJS first; frontend/Swift/Kotlin grown from memory).

One idea underneath everything: **git is the source of truth, and every state file is
a cache reconciled against git at session start.**

## What's inside

| Component | Files | Role |
| --------- | ----- | ---- |
| Skills | `skills/session-start`, `session-end`, `task-execution`, `git-workflow`, `add-task`, `bootstrap`, `parallel-tasks`, `stack-nestjs` | The behavior. Loaded on demand; invokable as `/sbrain:<name>`. |
| Agent | `agents/code-reviewer.md` | Fresh-context, read-only reviewer. Runs before every non-WIP commit. |
| Hooks | `hooks/hooks.json` + `hooks/scripts/` | Deterministic enforcement: blocks npm/yarn, commits on main/develop, force-push to shared branches, non-develop merges into main. Injects the boot reminder at SessionStart. Guards activate **only** in projects containing `.agent/`. |
| UI mod | `hooks/mod/` + `tests/mod.test.ts` | Read-only ledger view inside Claude Code (v2.1.287+): a band above the prompt with the active task, branch, and status counts; a `/ledger` pane to browse tasks and start one; the active task id beside the spinner. Activates **only** in projects containing `.agent/tasks`. |
| Scripts | `scripts/reindex.sh` | Regenerates `.agent/tasks/INDEX.md` from TASK files — index drift becomes structurally impossible. |
| Templates | `templates/project/`, `templates/contracts/` | What `bootstrap` scaffolds into a new project (state files live in the project repo, behavior lives in this plugin). |

## Install (local development)

```bash
claude --plugin-dir /path/to/sbrain
```

Verify inside the session:
- `/plugin` — sbrain appears and is enabled
- `/hooks` — PreToolUse (Bash) and SessionStart entries from sbrain are listed
- `/agents` — code-reviewer is listed
- Type `/sbrain:` — the skills autocomplete
- `/plugin` shows `1 mod active · sbrain`; in a sbrain project the band above the
  prompt shows `◆ sbrain`, and `/ledger` opens the task pane
- `claude plugin validate plugins/sbrain` and `claude plugin test plugins/sbrain`
  check the mod without a session

## Install (marketplace)

This plugin ships inside the `joltax` marketplace repo (see the repo-root
README). Once that repo is on GitHub:

```bash
/plugin marketplace add joltax-core/sbrain
/plugin install sbrain@joltax
```

## Use

**New project:** open Claude Code in the repo and say `bootstrap` (or
`/sbrain:bootstrap`). Answer the interview; it scaffolds `.agent/`, `docs/`,
a filled ARCHITECTURE.md, CLAUDE.md, and TASK-001.

**Existing sbrain project:** the SessionStart hook injects the boot reminder
automatically; say `start` and the session-start skill reconciles state from git and
delivers the Session Start Summary. Close with `end session` / `session bitti`.

**Everyday commands** (natural language works; skills also respond to Turkish
triggers): `add task: ...`, `bug: ...`, `decision: ...`, `write adr: ...`,
`start [module] module`, `parallel: TASK-004 TASK-007`.

## Design decisions worth knowing

- **Plugin = behavior, project = state.** Skills/hooks/agents version centrally in the
  plugin; `.agent/` state and `docs/` decisions live in each project's git history,
  because git is the source of truth.
- **Deterministic beats probabilistic.** Rules a machine can verify live in hooks
  (100% enforcement), not prose (~70% compliance). Prose keeps only what machines
  can't check.
- **The reviewer is not the author.** code-reviewer runs in a fresh context with
  read-only tools; a reviewer that can write starts "fixing" and defeats isolation.
- **INDEX.md is generated.** Never hand-edit it; run `scripts/reindex.sh`.
- **Parallel = worktrees.** Independent tasks (different modules, deps done) dispatch
  to worktree-isolated subagents; integration is centralized and serial.
- **Stack knowledge is harvested, not invented.** New stack profiles start empty;
  confirmed learnings accumulate in each project's `.agent/memory/STACK.md` and get
  promoted into a `stack-*` skill at the next plugin version.

## Roadmap

- [ ] `stack-frontend` (Vue/React) profile — promote from STACK.md harvests
- [ ] `stack-swift`, `stack-kotlin` profiles (note: mobile release flows will need a
      git-workflow variant — release branches, TestFlight/Play tracks)
- [ ] PostToolUse hook: lockfile violation check (`package-lock.json` in diff)
- [x] Marketplace packaging (this repo)

## Verify the guards manually

Inside a sbrain project (a dir containing `.agent/`):

```bash
echo '{"tool_input":{"command":"npm install lodash"}}' | bash hooks/scripts/bash-guard.sh
# -> exit 2, "npm package management is forbidden..."
```
