---
name: git-workflow
description: "Branch, commit, merge, and PR rules for sbrain projects. Use whenever branching, committing, merging, opening a PR, resolving drift between main and develop, or when the user asks about git strategy in a project with a .agent/ directory."
---

# Git Workflow

Keep a clean, readable history. Every commit tells a story; every branch has a purpose.

Note: the hard rules below (no commits to main/develop, no force-push to shared
branches) are ALSO enforced deterministically by the plugin's PreToolUse hook. If a
git command is blocked with a "sbrain guard" message, do not retry variations —
the block is intentional. Explain it to the human and follow this workflow instead.

---

## Branch strategy
```
main      <- production only, protected. Reached ONLY via PR from develop.
  develop <- active development, PR target
    feature/[module]-[slug]
    fix/[module]-[slug]
    chore/[slug]
    docs/[slug]
```

Rules:
- Never commit directly to main or develop.
- develop -> main is one-way. Never merge anything other than develop into main. Even a
  hotfix goes to develop first, then develop -> main. Direct commits to main create
  drift that 3-way merges silently lose.
- Every task gets its own branch off develop, PR back to develop.
- A branch's life ends at merge: delete it local + remote (session-end Path A). Branches
  must not accumulate.

## Branch lifecycle
```bash
git checkout develop && git pull origin develop
git checkout -b feature/[module]-[slug]
# ... wip commits are fine during implementation ...
git commit -m "[type]([module]): [desc]

Task: TASK-NNN"
git push origin feature/[module]-[slug]
# open PR -> develop; after it merges:
git branch -d feature/[module]-[slug]
git push origin --delete feature/[module]-[slug]
```

## Commit message format
```
[type]([module]): [imperative summary, <= 72 chars]

[optional body: what and why, not how]

Task: TASK-NNN
```
Types: `feat`, `fix`, `chore`, `docs`, `test`, `wip`.

## Pre-commit (non-WIP)
Run the stack skill's lint/build/test commands. Never commit if they fail. Review the
staged diff before committing:
```bash
git diff --staged
```

## Rules
- No force-push to shared branches (hook-enforced).
- No vague messages ("fix", "update", "wip2").
- Every non-WIP commit references a TASK.
- Never commit secrets or `.env` files.
- Session start verifies origin/main is not ahead of origin/develop; if it is, back-port
  to develop before new work.

## Recommended repo-side protection (tell the human once per project)
Prompt rules and hooks protect the local session; branch protection protects the repo
from everyone. Recommend enabling on the host (GitHub/GitLab):
- Protect `main` and `develop`: PRs required, direct pushes blocked, force-push blocked.
- `main` accepts PRs only from `develop` (via ruleset or CI check).
