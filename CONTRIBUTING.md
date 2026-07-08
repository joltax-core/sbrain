# Contributing to sbrain

Thanks for helping build sbrain. This project grows the same way it tells
agents to work: git-authoritative, evidence-based, one change per branch.

## Ways to contribute

1. **Report a bug** — use the Bug Report issue template. Include the exact
   command/skill, what happened, and what you expected.
2. **Propose a feature** — use the Feature Request template. Explain the
   workflow problem first, the mechanism second.
3. **Submit a stack learning (the harvest cycle)** — the most valuable
   contribution. If a confirmed pattern accumulated in your project's
   `.agent/memory/STACK.md` (or you hit a trap worth a Known Issue), open a
   Stack Learning issue. Confirmed learnings get promoted into the relevant
   `stack-*` skill in the next release. This is how profiles for new stacks
   (frontend, Swift, Kotlin) are born.

## Pull requests

- Branch from `main`, one topic per PR.
- Run the validator locally before pushing:
  ```bash
  claude plugin validate .
  claude plugin validate plugins/sbrain
  ```
  CI runs the same checks; red CI will not be reviewed.
- If you touch `hooks/scripts/`, include the manual test output in the PR
  description (see "Verify the guards manually" in the plugin README).
- Skill descriptions are YAML frontmatter: keep them double-quoted (a bare
  `: ` inside an unquoted description silently breaks skill loading).
- Behavioral changes bump the plugin `version` in
  `plugins/sbrain/.claude-plugin/plugin.json` and add a CHANGELOG entry.
- English only in source and docs.

## Design principles (PRs are reviewed against these)

- **Plugin = behavior, project = state.** Nothing user/project-specific ships
  in the plugin; state scaffolds into the project repo.
- **Deterministic beats probabilistic.** If a machine can verify a rule, it
  belongs in a hook or script, not in prose.
- **The reviewer is not the author.** Anything that weakens fresh-context,
  read-only review will be rejected.
- **Stack knowledge is harvested, not invented.** New stack rules need a
  confirmed, real-world incident or pattern behind them.

## Releases

Maintainers tag releases from `main`. Users on the `joltax` marketplace get
updates on their next `marketplace update` (or automatically with auto-update
enabled); the Claude community directory syncs through Anthropic's review
pipeline.
