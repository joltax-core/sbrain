---
name: stack-frontend-vue
description: "Vue 3 admin-dashboard stack profile for sbrain projects. Load before writing any Vue/TypeScript frontend code in a project whose CLAUDE.md declares \"Frontend stack profile: stack-frontend-vue\". Contains layer rules (view/composable/component), the two-tier component decision rule (shadcn-vue MCP for UI primitives, docs/COMPONENTS.md catalog for composite/business components), the generated-API-client discipline, the Query/Table/Actions/Filters list-page pattern, auth/breakglass screen rules, concern rules (LDAP status, storage/MinIO uploads, RBAC/permission gating), naming conventions, pnpm rules, and the per-page implementation order."
---

# Stack Profile — Vue 3 Admin Dashboard

Everything Vue-specific lives here. The kernel skills (sessions, tasks, git) are
stack-agnostic and reference this profile through the project's `CLAUDE.md`. This
profile assumes an admin-style dashboard consuming a sbrain `stack-nestjs` backend
over the contract in `docs/INTEGRATION_STANDARD.md` — it is not a general-purpose
Vue profile. It also assumes Tailwind CSS + shadcn-vue as the design system
(bootstrap sets both up); this is not a "your choice of component library" profile.

---

## 1. Layer rules (always)

- `view` (routed page): composes composables and components, no direct API calls.
- `composable` (`use*.ts`): all data fetching, mutation, and derived state; a view
  never calls the generated API client directly.
- `component`: presentation only; receives data/callbacks via props/emits, never
  imports a composable that fetches data itself (a "dumb" `AppTable` stays dumb).
- The generated API client (see Section 3) is the ONLY place that knows an HTTP path;
  a composable never constructs a URL by hand.
- A module's frontend code never imports another module's composables' internals —
  only what that module's `docs/modules/[module]/CONTRACT.md` exposes as public.

### 1.1 Which component to use — the decision rule

Two tiers. Never skip tier 1 to hand-roll something tier 1 already provides.

**Tier 1 — UI primitives (button, input, dialog, dropdown, table, sheet, tabs, form
field, toast, badge, ...): shadcn-vue, via its MCP server.** Every `stack-frontend-vue`
project has the shadcn-vue MCP registered by the `bootstrap` skill when this profile
is chosen (`pnpm dlx shadcn-vue@latest mcp init --client claude`) — its tools may be
deferred in the current session; if they don't appear yet, `ToolSearch` for
`shadcn-vue`/`registry` before assuming they're unavailable. Before writing a
primitive from raw HTML/CSS, query that MCP for a matching component and add it.
Added components land in `src/components/ui/` as owned source (shadcn-vue's model
copies code into the repo — it is not an npm dependency you import a black box from,
you may edit it after adding). A hand-rolled `<div>`-and-CSS reimplementation of
something shadcn-vue already provides is a defect, not a style choice — check the MCP
first, every time, even for something that looks trivial. If the MCP is genuinely not
registered in this project (an older project, or bootstrap step skipped), say so and
offer to run the init command rather than silently falling back to hand-rolled markup.

**Tier 2 — composite/business components built ON TOP of tier-1 primitives**
(`AppTable` wrapping shadcn-vue's Table with the pagination/sort wiring from Section 3,
`AppFilterDrawer` wrapping its Sheet with URL-synced filter state, `FormBuilder`
wrapping its Form components with the project's validation conventions): catalogued in
`docs/COMPONENTS.md`, under `src/components/core/` (kept separate from `ui/` so the
shadcn-vue CLI/MCP never has to reconcile with hand-maintained composites). This
catalog starts near-empty at bootstrap — these are built by whichever module needs
them first, not pre-built. Before writing ANY tier-2 component for a module:

1. **Read `docs/COMPONENTS.md` in full.** Not a grep for a name you're guessing at —
   read the responsibilities, because the component you need may be catalogued under
   a name you wouldn't have searched for.
2. **If an existing entry covers the need (even at ~80%): use it, extend it via
   props/slots.** Never fork a shared component into a module-local near-copy because
   the last 20% is inconvenient — that is how a project ends up with `AppTable` and
   `AppTable2`. If the existing component's API genuinely cannot accommodate the need,
   that is a real product decision (change a shared component's contract) — surface
   it to the human, don't silently duplicate.
3. **If nothing fits, ask: would a second, unrelated module plausibly want this exact
   shape?**
   - Yes -> it's a tier-2 shared component. Build it under `src/components/core/`,
     composing tier-1 primitives, add its entry to `docs/COMPONENTS.md` in the SAME
     change that introduces it — a shared component without a catalog entry does not
     exist as far as the next module is concerned.
   - No -> it's module-specific. Keep it local to that module's own `components/`
     folder, still composing tier-1 primitives where they fit; do NOT add it to
     `docs/COMPONENTS.md`.
4. Record which path was taken in the TASK file (added tier-1 `Dialog` via shadcn-vue
   MCP; reused tier-2 `AppTable`; added tier-2 `AppKanbanBoard`; or added module-local
   `UsersAvatarStack`) — the same discipline as recording a new dependency.

## 2. Implementation order (per page/module)

1. Regenerate the API client from the backend's current Swagger (Section 3).
2. `composables/use[Module]Query.ts` — list/detail fetching, loading/error state.
3. `composables/use[Module]Actions.ts` — create/update/delete mutations.
4. `composables/use[Module]Filters.ts` — filter state, synced to the URL query string.
5. `composables/use[Module]Table.ts` — column defs, pagination wiring (thin: composes
   the three above, holds no fetching logic of its own).
6. View + components (Section 4 pattern).
7. Tests (where a suite exists; otherwise record manual verification in the TASK file).

## 3. API client & data fetching (always)

- The client is generated (swagger-typescript-api or the project's chosen generator)
  from the backend's live Swagger JSON — never hand-written, never hand-edited after
  generation. Regenerate whenever the backend's Swagger bar (stack-nestjs §4) changes.
- Response envelope matches `docs/INTEGRATION_STANDARD.md`: success `{ success: true,
  data }`, list adds `meta.pagination`, error `{ success: false, error: { code,
  message, details } }` — composables unwrap this once, in one shared helper, not per
  call site.
- Every list composable exposes `page`, `limit`, `query`, `sortBy`, `sortOrder`
  matching the backend's shared `PaginationDto` — no ad-hoc pagination shape per page.

## 4. List-page pattern — Query / Table / Actions / Filters

The standard shape for every list page, so every module looks the same to a reader.
This is a shape, not a name list — the concrete components (`AppTable`,
`AppFilterDrawer`, ...) come from `docs/COMPONENTS.md` via the Section 1.1 decision
rule; the first module in a project to build a list page is the one that creates them.

- **Query**: fetch state (`data`, `loading`, `error`) for the current page/filter/sort.
- **Table**: column definitions + row-level render logic; renders through the
  catalogued table/pagination components — a module never rolls its own table markup
  once one exists in `docs/COMPONENTS.md`.
- **Actions**: create/update/delete/bulk-action handlers, including confirm dialogs;
  never inlined in the view or in Table.
- **Filters**: filter form state, synced to the URL via the catalogued filter-drawer
  component so a filtered view is shareable/bookmarkable and survives a reload.

Detail/edit views follow the same split: a Query composable for the record, an
Actions composable for save/delete, and a form built with the catalogued form-builder
component rather than hand-rolled `<form>` markup per module.

## 5. Auth & breakglass screens

- One login view, two visually distinct paths: the normal LDAP-backed login form, and
  an explicitly separate "sign in as breakglass" affordance — never the same form
  silently trying both. A user must not be able to mistake which path they used.
- On login, store only what `docs/INTEGRATION_STANDARD.md` puts in the session/token
  payload; the frontend never derives role/permission by inspecting the username or
  guessing from LDAP group names client-side.

## 6. Concern rules (apply ONLY if enabled in ARCHITECTURE.md)

**§L LDAP status:** a lightweight health indicator (checked at login-page load, and
on session refresh) shows when the backend reports LDAP unreachable; when down, the
normal login form is disabled with an explicit message and the breakglass path is the
only one offered — never a silent retry loop.

**§F File storage:** upload components request a presigned URL from the backend and
upload directly to storage (MinIO) — the app server is never a byte proxy in the
frontend's code path either. Client-side size/type validation mirrors the backend's
limits (stack-nestjs §8 §F) exactly; a mismatch here is a bug, not a "belt and
braces" duplication to shrug off.

**§A Authorization / RBAC:** the permission list from the login/`me` response
(`docs/INTEGRATION_STANDARD.md`) is fetched once and held in shared state; gating uses
a single `can('module:action')` helper, never a hand-rolled role string comparison
scattered across components. An action the user lacks permission for is not rendered
at all (not merely `disabled`) — this includes menu entries, table row actions, and
routes (a route guard, not just a hidden nav link). Permission key strings are never
invented on the frontend; they come from the same list the backend's
`permissions.enum.ts` defines (Section 3 of `docs/INTEGRATION_STANDARD.md`).

## 7. Naming

Files/folders kebab-case; components PascalCase (`AppTable.vue`); composables
camelCase prefixed `use` (`useUsersQuery.ts`); constants UPPER_SNAKE_CASE. All source
in English. Exception: `src/components/ui/` (tier-1, shadcn-vue) keeps whatever
layout/naming the shadcn-vue CLI/MCP generates — do not rename or restructure files
there to match this convention; that breaks re-running the CLI to update a component.

## 8. Package manager — pnpm only (hook-enforced)

- `npm install/i/ci/add` and `yarn add/install` are forbidden; the plugin hook blocks
  them. Use `pnpm add <pkg>` / `pnpm <script>`.
- Only `pnpm-lock.yaml` is committed; a `package-lock.json`/`yarn.lock` in a diff is a
  critical violation.
- shadcn-vue components are added via `pnpm dlx shadcn-vue@latest add <component>`
  (or the MCP tool, Section 1.1) — never `npx`/`yarn dlx`.

## 9. Pre-commit commands

```bash
pnpm lint
pnpm build
pnpm test   # if a suite exists — never fake a green run
```

## 10. DoD additions (on top of the kernel Definition of Done)

- The API client was regenerated against the backend's current Swagger for this
  change — a stale client (missing field, wrong type) is not "done".
- Every list/detail view has a rendered loading state and a rendered error state —
  "the happy path works" is NOT done.
- Section 1.1 followed: the shadcn-vue MCP was checked before any new tier-1 primitive
  was hand-rolled; `docs/COMPONENTS.md` was read before writing any tier-2 component;
  any new tier-2 shared component is documented there in this same change; no
  module-local component duplicates something already at tier 1 or tier 2.
- If §A is enabled: every new action/route this change adds has a permission check,
  and that permission key exists in the backend's `permissions.enum.ts` (Section 3 of
  `docs/INTEGRATION_STANDARD.md`) — a frontend-only permission key is a bug.
