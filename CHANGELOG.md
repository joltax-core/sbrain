# Changelog

All notable changes to sbrain are documented here. Versions follow semver;
the plugin version lives in `plugins/sbrain/.claude-plugin/plugin.json`.

## [0.1.0] — 2026-07-07

Initial release.

- Kernel skills: session-start, session-end, task-execution, git-workflow,
  add-task, bootstrap (interview-driven project init), parallel-tasks
  (worktree-isolated subagent dispatch)
- Stack profile: stack-nestjs
- Agent: code-reviewer (fresh-context, read-only, evidence-based verdicts)
- Hooks: bash-guard (blocks npm/yarn package management, commits on
  main/develop, force-push to shared branches, non-develop merges into main;
  active only in projects containing `.agent/`), session-banner (auto boot
  reminder)
- Scripts: reindex.sh (regenerates the task ledger from TASK files)
- Project templates scaffolded by bootstrap
