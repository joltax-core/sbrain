---
name: bootstrap
description: "Initialize a new project with the sbrain structure via a guided interview. Use when the user says \"bootstrap\", \"init project\", \"kurulum\", \"projeyi başlat\", when session-start finds no .agent/ directory, or when starting a brand-new backend/admin-dashboard/mobile project that should use the kernel. Interviews the human, then scaffolds .agent/, docs/, ARCHITECTURE.md, CLAUDE.md, .env.example/docker-compose.yml for stack-nestjs, and the first task — filled in, not [FILL IN]."
---

# Bootstrap — Project Initialization Interview

Turn an empty (or existing) repository into a sbrain project. The output of this
skill is a scaffold whose ARCHITECTURE.md is **filled from the interview**, not a
template full of `[FILL IN]`.

Never bootstrap silently. This is a conversation: ask, confirm, then write.

---

## Step 0 — Preconditions

- If `.agent/` already exists: stop. This project is initialized; offer `session-start`.
- Detect existing code: if `package.json`, `Package.swift`, `build.gradle(.kts)`, or
  `pubspec.yaml` exists, infer the stack and confirm it instead of asking cold.
- Templates live at `${CLAUDE_PLUGIN_ROOT}/templates/`.

## Step 1 — Core interview (all stacks)

Ask in one compact block; accept partial answers and follow up only on gaps:

1. **Project**: one sentence — what does it do, who consumes it?
2. **Stack**: nestjs / frontend (vue/react) / swift / kotlin / other?
   (If inferred in Step 0, just confirm.)
3. **Team size**: solo or team? (affects how strongly SESSION.md is trusted)
4. **Remote & branching**: is there an origin? Confirm main/develop model is wanted.
5. **Definition of quality**: is there (or will there be) a test suite from day one?

## Step 2 — Stack interview

Ask ONLY the block matching the chosen stack. These answers drive the Optional-concerns
table and ARCHITECTURE.md.

**nestjs** (full profile available — `stack-nestjs` skill):
- Primary DB (e.g. PostgreSQL 16)? Cache (Redis / none)? Queue (BullMQ / none)?
- Auth: none / JWT dual-token (kernel integration standard) / LDAP + breakglass local
  admin / other? (LDAP -> enables §L and §B; confirm the breakglass account exists on
  day one, not "added later" — it is the only login path if LDAP is ever unreachable.)
- Authorization model: **permission-keys (`module:action`) — recommended default** /
  role-enum / none? (Anything but "none" enables §A. If "none" is chosen, confirm it
  explicitly: every endpoint is reachable by any authenticated caller.)
- Multi-tenancy? Soft delete? i18n? File storage (MinIO self-hosted / S3-compatible
  cloud / none)? Observability (correlationId)?
- First business modules (names + one-line responsibility each)?
- Will a frontend consume this API? (yes -> copy the integration contract, Step 4;
  if it's an admin dashboard, see the frontend block below — `stack-frontend-vue`.)

**frontend — admin dashboard** (full profile available — `stack-frontend-vue` skill,
Vue 3 only; a non-admin or non-Vue frontend falls through to the "profile pending"
paragraph below):
- Confirm it consumes a `stack-nestjs` backend over `docs/INTEGRATION_STANDARD.md`.
- State management (Pinia / composables-only)?
- Design system: **Tailwind CSS + shadcn-vue — the default and only supported choice
  for this profile** (it is what Section 4c scaffolds and what `stack-frontend-vue`
  §1.1's component decision rule assumes). If the human wants something else, that is
  a real deviation — confirm explicitly and record it as an ADR; do not run Step 4c.
- Mirror the backend's enabled concerns — they must match, not be re-decided here:
  §L (LDAP status screen), §F (MinIO upload components), §A (permission-gated UI).
- SSR needed, or SPA is enough for an internal admin tool?

**swift / kotlin, or a non-admin / non-Vue frontend** (profiles pending — be explicit
about this):
Tell the human: "The [stack] profile is not written yet; I will scaffold the kernel
(sessions, tasks, memory, git rules) which is stack-agnostic, and we will grow the
stack rules in .agent/memory/STACK.md until a profile skill is promoted from them."
Then ask the minimum viable set:
- frontend: framework + state management? API client generated from backend OpenAPI
  schema (Scalar-served)? design system? SSR?
- swift: min iOS version? architecture (MVVM / TCA)? DI approach? offline strategy?
  distribution flow (TestFlight)?
- kotlin: min SDK? Compose? DI (Hilt/Koin)? offline strategy? Play distribution flow?
Record every answer in ARCHITECTURE.md even without a profile skill.

## Step 3 — Confirm the plan

Present a short summary: stack, enabled concerns table, first modules, first task.
Get an explicit "yes" before writing anything.

## Step 4 — Scaffold

1. Copy `${CLAUDE_PLUGIN_ROOT}/templates/project/` into the repo root (`.agent/`,
   `docs/`). Do not overwrite existing files without asking.
2. Write `docs/ARCHITECTURE.md` from the template **with every section filled from the
   interview** — project overview, stack table, Optional concerns (explicit yes/no per
   row), module classification, database strategy, auth flow, approved dependency list
   (if `stack-frontend-vue` with shadcn-vue: pre-approve `tailwindcss`, `radix-vue`,
   `class-variance-authority`, `tailwind-merge`, and the icon package shadcn-vue's
   `init` installs — choosing this design system in Step 2 already approved them; the
   list documents that so code-reviewer doesn't re-litigate each one as a new,
   unapproved dependency the first time a component pulls it in).
3. Write the project `CLAUDE.md` from `templates/project/CLAUDE.md.template`:
   - set the `Backend stack profile:` line (e.g. `stack-nestjs` or `none (growing)`)
     and the `Frontend stack profile:` line (e.g. `stack-frontend-vue` or `none`) —
     a project may legitimately set only one of the two,
   - keep it SHORT — it loads every session; details belong in skills and docs.
4. If backend with a frontend consumer (or a frontend consuming a kernel backend):
   copy `${CLAUDE_PLUGIN_ROOT}/templates/contracts/INTEGRATION_STANDARD.md` to
   `docs/INTEGRATION_STANDARD.md`.
4a. If the frontend stack is `stack-frontend-vue`: copy
    `${CLAUDE_PLUGIN_ROOT}/templates/contracts/COMPONENTS.md` to
    `docs/COMPONENTS.md` — it starts empty; do not pre-invent component rows that
    don't exist in the repo yet (see `stack-frontend-vue` §1.1).
4b. If the stack is `stack-nestjs`: fill `${CLAUDE_PLUGIN_ROOT}/templates/project/
    .env.example.template` and `docker-compose.template.yml` from the Step 2 answers —
    include a block (LDAP_*, MINIO_*, BREAKGLASS_*, the corresponding compose service)
    only for a concern the human enabled; set `COMPOSE_PROJECT_NAME` from the project
    name given in Step 1. Write the results as `.env.example` and `docker-compose.yml`
    at the repo root. This is config, not business code — writing it here does not
    violate "bootstrap never writes implementation."
4c. If the frontend stack is `stack-frontend-vue` (and shadcn-vue was not explicitly
    declined in Step 2): set up the design system that `stack-frontend-vue` §1.1
    assumes, once, in the frontend project root:
    ```bash
    pnpm dlx shadcn-vue@latest init
    pnpm dlx shadcn-vue@latest mcp init --client claude
    ```
    The first sets up Tailwind + `components.json` + `src/components/ui/`; the second
    registers the shadcn-vue MCP server for this client so every future session in
    this project can query/add components through it — this is what makes tier-1
    components (Section 1.1 of `stack-frontend-vue`) the default, not a manual step
    the human has to remember per project. Confirm with the human before running
    either command if a frontend project skeleton does not already exist to init into.
5. For each first module named in the interview: create
   `docs/modules/[module]/CONTRACT.md` from the template, filled as far as the
   interview allows; mark open questions explicitly.
6. Create `TASK-001` (usually: project skeleton / core setup) via the add-task flow,
   with acceptance criteria from the interview. Run
   `bash "${CLAUDE_PLUGIN_ROOT}/scripts/reindex.sh"`.
7. Git: if no repo, `git init`, create `main`, then `develop` from it. Initial commit
   on develop: `chore: initialize project with sbrain`. Remind the human to enable
   branch protection on the host (see git-workflow skill).

## Step 5 — Hand off

Report what was created, then: "Bootstrap complete. Say 'start' to run session-start,
or 'start TASK-001' to begin." Do not start implementing on your own.

---

## Quality bar
- No `[FILL IN]` left in ARCHITECTURE.md — every gap is either answered or listed
  under "Deferred decisions" with a trigger to revisit.
- The concerns table is honest: nothing enabled that is not implemented, nothing
  implemented that is not enabled.
- For `stack-nestjs`: every §L/§F/§B env var enabled in the concerns table has a
  matching placeholder in `.env.example`, and no var exists there for a disabled
  concern; the same holds for the corresponding `docker-compose.yml` service block.
- The human approved the plan before any file was written.
