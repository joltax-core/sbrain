# Project Rules — Kernel (stack-agnostic)

> The single source of truth for development rules, together with the stack profile
> skill named in CLAUDE.md. No exception is valid without a corresponding ADR in
> docs/ADR/. Stack-specific rules (layers, ORM/DB discipline, API surface, package
> manager, concern sets) live in the stack profile skill and apply with the same force.

## 1. Language
- All code, names, comments, and file names in English. No other language in source.

## 2. Boundaries by contract
- The codebase is organized into modules/features with explicit boundaries.
- Every module has a `docs/modules/[module]/CONTRACT.md` written and approved before
  any code is written for it.
- A module never reaches into another module's internals (data access, private types);
  cross-module access goes only through the public interface declared in the contract.

## 3. Git & branching (hook-enforced where possible)
- Never commit directly to `main` or `develop`.
- develop -> main is one-way, via PR only. Even a hotfix goes to develop first.
- Every task gets its own branch off develop, PR back to develop.
- A branch is deleted (local + remote) after its PR is merged.
- No force-push to shared branches. Never commit secrets or `.env` files.

## 4. Tasks & state
- One task at a time per agent/worktree. Never start a new task while yours is
  in_progress.
- The TASK file is the source of truth for its status; `.agent/tasks/INDEX.md` is a
  generated view (reindex script) and is never edited by hand.
- Session start reconciles all state against git before any code is written.

## 5. Memory & Known Issues
- A Known Issue is recorded only after a real, confirmed incident — never a suspicion.
  KI numbers are never reused (tombstones).
- Confirmed transferable patterns go to `.agent/memory/STACK.md`; project discoveries
  to `PROJECT.md`; decisions to `DECISIONS.md` (or an ADR if they constrain
  architecture).

## 6. ADR
- Any deviation from these rules or the stack profile requires an ADR in docs/ADR/.
- An approved ADR takes precedence over the rules for its specific scope.

## 7. AI development guidelines
- Never generate code that violates module boundaries, even if asked.
- Never introduce a dependency without human approval.
- Ask when unsure: a ten-second question saves hours of wrong implementation.
- Every non-WIP commit passes the fresh-context code-reviewer agent before it is made.
