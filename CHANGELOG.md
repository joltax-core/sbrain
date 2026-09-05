# Changelog

All notable changes to sbrain are documented here. Versions follow semver;
the plugin version lives in `plugins/sbrain/.claude-plugin/plugin.json`.

## [0.2.0] — 2026-09-05

Admin-dashboard stack + LDAP/MinIO/breakglass/RBAC concerns. Additive — no existing
behavior changes.

- Stack profile: stack-frontend-vue (Vue 3 admin dashboard: layer rules, generated
  API client discipline, the Query/Table/Actions/Filters list-page pattern, auth &
  breakglass screen rules, concern rules)
- stack-nestjs: new concerns §A (Authorization/RBAC — permission-keys enforced only
  in guards, `permissions.enum.ts`), §L (LDAP auth — env-only config, no silent
  fallback if the directory is unreachable), §B (Breakglass — exactly one local admin
  account, independent of LDAP, auditable); §F (File storage) now names MinIO as the
  reference implementation with its env contract
- bootstrap: nestjs interview now asks about LDAP+breakglass auth, MinIO vs
  S3-compatible storage, and a permission model with a recommended default;
  frontend interview branches into a real Vue admin-dashboard block instead of
  "profile pending"; Step 4 gained a config-only scaffold step that fills
  `.env.example` and `docker-compose.yml` from the interview's enabled concerns
- CLAUDE.md.template: `Stack profile:` split into `Backend stack profile:` /
  `Frontend stack profile:` so a project can declare both; session-start,
  task-execution, and code-reviewer updated to read both
- CONTRACT.template.md: new "Owned permission keys" section (§A)
- INTEGRATION_STANDARD.md: documented how `permissions` / `isBreakGlass` on
  `/auth/me` tie to §A/§B/§L; fixed a stray `npm run generate:api` example to
  `pnpm` (the standard was already pnpm-only elsewhere)
- New templates: `.env.example.template`, `docker-compose.template.yml`,
  `docs/COMPONENTS.md` (shared Vue component catalog, seeded empty by bootstrap for
  `stack-frontend-vue` projects; stack-frontend-vue §1.1 makes reading it — and
  choosing reuse vs. new-shared vs. module-local — a hard rule before writing any
  component; code-reviewer and task-execution both check/read it)

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
