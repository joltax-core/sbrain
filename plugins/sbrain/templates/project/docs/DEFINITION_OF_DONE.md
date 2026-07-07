# Definition of Done — Kernel

> Every task inherits this, PLUS the DoD additions of the stack profile named in
> CLAUDE.md. Skip lines for concerns not enabled in ARCHITECTURE.md.

- [ ] Every acceptance criterion in the TASK file is verified.
- [ ] The fresh-context code-reviewer agent returns PASS on the final diff.
- [ ] CONTRACT.md updated if the module boundary changed.
- [ ] The stack profile's lint/build/test commands pass. If the project has no test
      suite, the manual verification performed is recorded in the TASK file
      (never fake a green run).
- [ ] No secrets, no debug code, no commented-out blocks, no TODO without a task.
- [ ] TASK-NNN.md updated (Status, Branch, PR, Commit, Delivered), then the ledger
      rebuilt with the reindex script.
- [ ] .agent/SESSION.md reflects the new state (main session only).
- [ ] Any new dependency was approved by the human and added to ARCHITECTURE.md's
      approved list.
- [ ] Stack profile DoD additions checked (see the stack skill).
