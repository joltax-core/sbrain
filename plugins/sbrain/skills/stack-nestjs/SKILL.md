---
name: stack-nestjs
description: "NestJS stack profile for sbrain projects. Load before writing any NestJS/TypeScript backend code in a project whose CLAUDE.md declares \"Backend stack profile: stack-nestjs\" (or the legacy \"Stack profile: stack-nestjs\"). Contains layer rules (controller/service/repository), Prisma discipline, Swagger bar, concern rules (multi-tenancy, soft delete, worker, i18n, storage/MinIO, observability, LDAP auth, breakglass, RBAC/permissions), naming conventions, pnpm rules, and the per-module implementation order."
---

# Stack Profile — NestJS

Everything NestJS-specific lives here. The kernel skills (sessions, tasks, git) are
stack-agnostic and reference this profile through the project's `CLAUDE.md`.

---

## 1. Layer rules (always)

- controller: HTTP only, no business logic.
- service: business logic, **no Prisma imports**.
- repository (`*.repository.ts`): the ONLY place PrismaClient is used; returns DTOs or
  typed shapes, never raw Prisma entities.
- dto: request validation + Swagger schema. guard: auth only. interceptor:
  cross-cutting. middleware: request-level.
- A module never imports another module's repository, entity, or Prisma model, and
  never queries tables owned by another module. Cross-module access goes only through
  the target module's public service interface (its CONTRACT.md).
- Prisma model fields are camelCase even when DB columns are snake_case; snake_case in
  queries throws at runtime.
- Raw SQL only in a dedicated reporting module or with ADR approval.

## 2. Implementation order (per module)

1. Prisma schema + migration (if any)
2. repository
3. service
4. controller + Swagger decorators
5. module wiring
6. DTOs
7. tests (where a suite exists; otherwise record manual verification in the TASK file)

## 3. API & response format (always)

- Standard envelope, enforced via `ResponseInterceptor` / `GlobalExceptionFilter`
  (see `docs/INTEGRATION_STANDARD.md` if present):
  success `{ success: true, data }`; list adds `meta.pagination`; error
  `{ success: false, error: { code, message, details } }`.
- Every endpoint versioned under `/api/v1/`. Manual response shaping is forbidden;
  `@Res()` only for streams, documented in the module CONTRACT.
- Pagination: shared `PaginationDto` (page, limit, query, sortBy, sortOrder); module
  filter DTOs extend it; `sortBy` whitelisted in the repository (default `createdAt`).
- FK fields in response DTOs include referenced display fields
  (`unit: { id, name }`), not the raw id alone.
- Route order: fixed-segment routes (`@Get('export')`) before `:param` routes.

## 4. Swagger bar — "endpoint done"

An endpoint is done only when the generated client (swagger-typescript-api) is fully
typed and self-explanatory:
- `@ApiOperation` with summary AND a description that explains the workflow.
- Every possible status code declared (`400/401/403/404/500` where they can occur);
  errors use named DTOs (`ErrorResponseDto`), never anonymous inline schemas.
- Every DTO property: realistic `example`, `description`, correct constraints.
  Nullable strings declare `type: String` (else the client generates `object | null`).
- Paginated responses use `PaginatedResponseDto<T>`.
- Binary/stream endpoints declare `content` explicitly (not `@ApiProduces` alone).
- "It shows in the UI" is NOT done. This bar is part of the Definition of Done.

## 5. Security & bootstrap (always)

- JWT access tokens short-lived (<= 15 min); refresh tokens server-side with rotation.
- Required env validated at startup; app refuses to start if missing; no unsafe
  production fallbacks; no secrets in code.
- Authorization enforced in guards, never inline in services; permission/role strings
  in a constants file.
- `main.ts` binds to `0.0.0.0` (container localhost breaks health checks).
- Enums: UPPER_SNAKE_CASE values, in `*.enum.ts` files.

## 6. Package manager — pnpm only (hook-enforced)

- `npm install/i/ci/add` and `yarn add/install` are forbidden; the plugin hook blocks
  them. Use `pnpm add <pkg>` / `pnpm <script>`.
- Only `pnpm-lock.yaml` is committed; a `package-lock.json`/`yarn.lock` in a diff is a
  critical violation.
- Dockerfiles and CI use `pnpm install --frozen-lockfile`.

## 7. Naming

Files/folders kebab-case; classes PascalCase; variables/functions camelCase; constants
UPPER_SNAKE_CASE; enum names PascalCase, values UPPER_SNAKE_CASE. All source in English.

## 8. Concern rules (apply ONLY if enabled in ARCHITECTURE.md)

**§M Multi-tenancy:** every table has `tenant_id` (UUID); all queries scoped via
BaseRepository; unique constraints are `(field, tenant_id)`; `update` scopes by id AND
tenantId (`updateMany` for compound where); `scopedWhere()` uses camelCase `tenantId`;
cache keys namespaced `{tenantId}:{resource}:{id}`.

**§S Soft delete:** deletable tables have `is_active` + `deleted_at`; delete sets
`isActive:false` + `deletedAt:now`; lists exclude inactive unless an approved
`includeInactive` is passed.

**§W Worker/queue:** cron only in the worker process, never the api process; BullMQ
queue names use `-` never `:` (colon throws at startup); job payloads are typed
interfaces and idempotent; `defaultJobOptions` set (attempts >= 3, exponential backoff,
removeOnComplete/Fail); `@Processor` and `@Cron` on separate classes.

**§I i18n:** no static user-facing strings; every key exists in all locales; i18n path
uses `process.cwd()`, never `__dirname` (points to dist/ at runtime).

**§F File storage:** all writes via `StorageService` in `core/storage`; key format
`{folder}/{uuid}.{ext}` (prefix `{tenantId}/` if §M); size/type limits at proxy AND app.
Reference implementation is MinIO — env contract `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`,
`MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_USE_SSL`; downloads go through a presigned
URL with a fixed, short TTL (define the value in `ARCHITECTURE.md`, not scattered
across call sites) — the app never proxies file bytes itself.

**§O Observability:** `correlationId` assigned in middleware, propagated to logs, job
payloads, outgoing calls; structured JSON logging; `console.log` forbidden in
production code.

**§A Authorization / RBAC:** authorization is enforced only in a guard
(`@RequirePermission('module:action')` or equivalent), never inline in a service or
controller method body; permission strings live in a single `permissions.enum.ts`,
always `module:action` pairs (`users:read`, `storage:delete`, ...) — one file, not one
per module, so `docs/modules/[module]/CONTRACT.md`'s "Owned permission keys" section can
be diffed against it. The breakglass account (§B) holds every permission unconditionally
and is never subject to the role/group mapping below. If §L is enabled, permission
resolution derives from the LDAP group→role mapping documented in `ARCHITECTURE.md`'s
Data strategy section; if §L is not enabled, roles/permissions are owned by a
user-role table in this service's own database. Disabling §A entirely (ARCHITECTURE.md
`Enabled? = no`) is a valid, explicit choice — it means every endpoint is reachable by
any authenticated (or anonymous, per §5) caller, and the code-reviewer will not flag
missing permission checks.

**§L LDAP auth:** connection config is env-only —
`LDAP_URL`, `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`, `LDAP_BASE_DN`, `LDAP_USER_FILTER`,
`LDAP_GROUP_ATTR` — never hardcoded, never logged. Group membership read at login is
mapped to §A permissions via the table in `ARCHITECTURE.md`, not via inline `if`
branches. If the LDAP server is unreachable, LDAP users **cannot** log in — there is no
silent fallback to a cached or default role; the only account that can still log in is
the breakglass account (§B). A health check (e.g. a lightweight bind attempt) surfaces
LDAP reachability so the frontend (`stack-frontend-vue` §L) can show the outage state.

**§B Breakglass:** exactly one local admin account, independent of LDAP, seeded at
first boot from an env-provided credential (or generated once and surfaced a single
time — never stored in plaintext logs thereafter). It never appears in the `users`
module's list/search endpoints. Every breakglass login is logged distinctly from
normal logins (structured, if §O is enabled) so its use is auditable. Credential
rotation policy is a project decision — record it as an ADR; the only fixed rule is
that using it is never silent.

## 9. Pre-commit commands

```bash
pnpm lint
pnpm build
pnpm test   # if a suite exists — never fake a green run
```

## 10. DoD additions (on top of the kernel Definition of Done)

- Swagger bar (Section 4) met for every new/changed endpoint.
- Deployment artifacts updated if runtime config / dependency / env changed:
  `docker-compose.yml`, `docker-compose.dev.yml`, `.env.example`, `docs/DEPLOYMENT.md`.
- Prisma migration committed alongside schema changes; production uses
  `prisma migrate deploy` (never `migrate dev`).
- If §L, §F, or §B are enabled, every env var their rules require exists in
  `.env.example` with a safe placeholder — and no var appears in `.env.example` for a
  concern that is `Enabled? = no` in `ARCHITECTURE.md`. Same check for the
  corresponding service block in `docker-compose.yml` (minio, an LDAP dev server under
  `docker-compose.dev.yml` if used).
- If §A is enabled, every new/changed endpoint declares its `@RequirePermission(...)`
  guard and the permission key exists in `permissions.enum.ts` and in its module's
  CONTRACT "Owned permission keys" list — all three or none.

## Version notes (dated — verify before relying on them)

- Prisma v5 pinned historically because v7 broke the NestJS CommonJS build (2026-06).
  Re-verify against current Prisma/NestJS releases before starting a new project, and
  record the outcome in `.agent/memory/STACK.md`.
