# Backend Integration Standard

> This document defines the backend requirements for any project that uses the shared frontend infrastructure.
> A backend that does not comply with this standard will break frontend components, error handling,
> authentication flows, and API client generation.
> Every backend developer must read this document before writing a single endpoint.

---

## 1. Response Envelope

All endpoints — without exception — must return responses wrapped in a standard envelope.
The frontend components, error handling utilities, and API client all depend on this structure.

### 1.1 Success Response

Single item or action result:

```json
{
  "success": true,
  "data": {}
}
```

Paginated list:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
    }
  }
}
```

### 1.2 Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "username",
        "errors": ["Username is required"]
      }
    ]
  }
}
```

`details` is optional — include it only for validation errors.
`message` must always be present and human-readable.
`code` must always be present and machine-readable (see Section 5).

### 1.3 Rules

- Never return a raw object without the envelope.
- Never return an array at the root level — always wrap in `{ success, data: [] }`.
- `success: false` must always be accompanied by an `error` object.
- `success: true` must never include an `error` key.
- HTTP status codes must still be semantically correct (200, 201, 400, 401, 403, 404, 422, 500).
  The envelope `success` field does not replace HTTP status codes.

---

## 2. Authentication Endpoints

The frontend authentication store (`useAuthStore`) and its token refresh interceptor depend on
the following endpoints existing with the exact request/response shapes defined below.
Internal implementation may vary (JWT + Redis, JWT + DB, session-based, etc.) but the
HTTP contract must not deviate.

### 2.0 Session & Token Architecture

The frontend uses a **dual-token pattern**: a short-lived `accessToken` and a long-lived
`refreshTokenId`. Understanding how these work together is required before implementing
any of the auth endpoints.

#### How it works

```
Login
  → Backend creates a session (userId, permissions, etc.)
  → Backend issues:
      accessToken   — JWT, short-lived (e.g. 15 minutes)
      refreshTokenId — opaque UUID, long-lived (e.g. 7 days)
  → Both stored on the frontend (localStorage)

Every API request
  → accessToken sent as Authorization: Bearer header

accessToken expires (401 received)
  → Frontend interceptor catches 401
  → Sends POST /api/v1/auth/refresh with { userId, tokenId }
  → Backend validates tokenId, issues new accessToken + new refreshTokenId
  → Old refreshTokenId is invalidated (token rotation)
  → Original request is retried with new accessToken

refreshTokenId also expired or invalid
  → Backend returns 401 on /api/v1/auth/refresh
  → Frontend interceptor catches this → calls logout → redirects to login
```

#### Token rotation is mandatory

Every refresh call must invalidate the old `refreshTokenId` and issue a new one.
This prevents replay attacks — a stolen refresh token becomes useless after first use.

#### Implementation options

The backend can store the `refreshTokenId` using any persistence layer:

| Option        | Description                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Redis**     | Preferred for performance. Key: `{userId}:{tokenId}` → value: sessionId or user data. TTL = refresh token lifetime. |
| **Database**  | Store token records in a `refresh_tokens` table with `userId`, `tokenId`, `expiresAt`, `revokedAt`.                 |
| **In-memory** | Only acceptable for development/testing. Not suitable for multi-instance deployments.                               |

Regardless of storage choice, the contract from the frontend's perspective is identical:
`refreshTokenId` is an opaque UUID — the frontend never inspects its contents.

#### Session validation on /me

`GET /api/v1/auth/me` must validate that the session is still active server-side — not just
that the JWT signature is valid. If the session has been revoked (e.g. via logout from
another device), `/me` must return `401` even if the `accessToken` JWT has not expired yet.

This is critical: the `bootstrapAuth` flow in the frontend calls `/me` on every page load
to verify the session is still alive. A JWT-only check without server-side session validation
would allow revoked sessions to continue working until the token expires naturally.

### 2.1 Login

```
POST /api/v1/auth/login
```

Request:

```json
{
  "username": "string",
  "password": "string"
}
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "tokenType": "bearer",
    "expiresIn": 900,
    "refreshTokenId": "uuid"
  }
}
```

- `accessToken` — JWT Bearer token used for all subsequent requests.
- `tokenType` — always `"bearer"`.
- `expiresIn` — seconds until `accessToken` expires.
- `refreshTokenId` — opaque ID used to obtain a new access token via the refresh endpoint.

Error `401 Unauthorized`:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "..."
  }
}
```

### 2.2 Logout

```
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
```

Request body: empty.

Response `200 OK`:

```json
{
  "success": true,
  "data": {}
}
```

- Must revoke the current session server-side.
- Must be idempotent — calling logout on an already-revoked session must not return an error.

### 2.3 Me

```
GET /api/v1/auth/me
Authorization: Bearer <accessToken>
```

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "username": "string",
    "permissions": ["admin:all"],
    "isBreakGlass": false
  }
}
```

- `userId` — unique identifier for the user.
- `username` — display name or login identifier.
- `permissions` — array of permission strings, `module:action` format. This is the ONE
  place the frontend learns what it may do — the frontend never re-derives permissions
  from a role name or an LDAP group locally. If the backend's `stack-nestjs` §A
  (Authorization/RBAC) is enabled, every string here must exist in that backend's
  `permissions.enum.ts` and in the owning module's CONTRACT ("Owned permission keys");
  if §A is disabled, return every permission the frontend might gate on, or an empty
  array with a project-level note that all authenticated actions are allowed.
- `isBreakGlass` — boolean. Set to `false` if the concept does not apply. If
  `stack-nestjs` §B (Breakglass) is enabled and this login used the breakglass
  account, this MUST be `true` — the frontend uses it to render a persistent "you are
  signed in as breakglass" indicator (`stack-frontend-vue` §5), not just for logging.

### 2.3.1 LDAP & Breakglass (if `stack-nestjs` §L is enabled)

The login/`me` contract above does not change shape when LDAP is enabled — `POST
/api/v1/auth/login` still takes `{ username, password }` and returns the same
envelope. What changes is only how the backend validates them:

1. Try the LDAP bind first. On success, resolve `permissions` from the LDAP group →
   role/permission mapping (`stack-nestjs` §A/§L); `isBreakGlass: false`.
2. If LDAP is unreachable (not just "this user failed to bind" — the directory itself
   is down), only the breakglass credential may succeed; every other login attempt
   gets `401 INVALID_CREDENTIALS`, never a silent fallback to a cached permission set.
3. A successful breakglass login returns `isBreakGlass: true` and the full permission
   set (breakglass is never partially privileged).

The frontend never talks to LDAP directly and never needs to know it exists beyond
reading `isBreakGlass` and handling a "directory unreachable" state surfaced through
normal error codes (Section 5) — LDAP is entirely a backend implementation detail.

Error `401 Unauthorized`:

```json
{
  "success": false,
  "error": {
    "code": "UnauthorizedException",
    "message": "..."
  }
}
```

### 2.4 Refresh Token

```
POST /api/v1/auth/refresh
```

Request:

```json
{
  "userId": "uuid",
  "tokenId": "uuid"
}
```

- `tokenId` — the `refreshTokenId` received from login or a previous refresh.

Response `200 OK`:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "tokenType": "bearer",
    "expiresIn": 900,
    "refreshTokenId": "uuid"
  }
}
```

- The old `refreshTokenId` must be invalidated after use (token rotation).
- The new `refreshTokenId` must be used for subsequent refresh calls.

Error `401 Unauthorized`:

```json
{
  "success": false,
  "error": {
    "code": "UnauthorizedException",
    "message": "..."
  }
}
```

---

## 3. Pagination

Every endpoint that returns a list must accept the following query parameters
and return the standard paginated envelope defined in Section 1.1.

### 3.1 Query Parameters

| Parameter   | Type    | Description                      |
| ----------- | ------- | -------------------------------- |
| `page`      | integer | Page number, 1-indexed           |
| `limit`     | integer | Number of items per page         |
| `query`     | string  | Optional full-text search string |
| `sortBy`    | string  | Field name to sort by            |
| `sortOrder` | string  | `asc` or `desc`                  |

- Parameter names must match exactly — the frontend does not alias these.
- `page` defaults to `1` if omitted.
- `limit` defaults to `10` if omitted.
- `sortBy` and `sortOrder` are optional. If omitted, apply a sensible default sort.
- `query` is optional. If omitted, return all records.

### 3.2 Response Shape

```json
{
  "success": true,
  "data": [],
  "meta": {
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
    }
  }
}
```

- `total` — total number of records matching the current filter/query, not just the current page.
- `totalPages` — `ceil(total / limit)`.
- `page` and `limit` — echo back the values used for this response.

---

## 4. CORS Configuration

The frontend runs on a different origin than the backend (e.g. `http://localhost:5173` in development).
CORS must be explicitly configured.

### 4.1 Required allowed headers

The following headers must always be in the `allowedHeaders` list:

| Header          | Reason                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| `Content-Type`  | All POST/PUT/PATCH requests                                            |
| `Authorization` | Bearer token on every authenticated request                            |
| `x-retry`       | Sent by the frontend retry interceptor on token-refresh retry requests |

### 4.2 Required allowed methods

`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

`OPTIONS` is mandatory — browsers send preflight requests before any cross-origin request
with custom headers.

### 4.3 Credentials

`credentials: true` must be set if cookies are used. If only Bearer tokens are used,
this is optional but recommended for future compatibility.

### 4.4 Example (NestJS)

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-retry"],
  credentials: true,
});
```

> **Warning:** Every time a new custom header is added to the frontend request interceptor,
> the backend `allowedHeaders` list must be updated in the same change.
> Failure to do so causes preflight CORS errors on all retried requests.

---

## 5. Error Codes

The `error.code` field must be a machine-readable string constant.
The frontend `extractErrorMessage()` utility reads this field for display logic.

### 5.1 Standard codes

| Code                    | HTTP Status | When to use                                        |
| ----------------------- | ----------- | -------------------------------------------------- |
| `INVALID_CREDENTIALS`   | 401         | Login failed — wrong username or password          |
| `USER_NOT_IN_SYSTEM`    | 401         | User authenticated but does not exist in local DB  |
| `USER_INACTIVE`         | 401         | User exists but `isActive` is false                |
| `UnauthorizedException` | 401         | Any other unauthenticated access                   |
| `FORBIDDEN`             | 403         | Authenticated but lacks permission                 |
| `VALIDATION_ERROR`      | 400         | Request body failed validation — include `details` |
| `NOT_FOUND`             | 404         | Requested resource does not exist                  |
| `CONFLICT`              | 409         | Duplicate resource or constraint violation         |
| `INTERNAL_ERROR`        | 500         | Unhandled server error                             |

### 5.2 Rules

- Never expose stack traces, internal error messages, or database error details in the response.
- `message` should be user-facing and safe to display — localize if the project supports i18n.
- Custom codes are allowed but must follow SCREAMING_SNAKE_CASE convention.

---

## 6. OpenAPI Schema & Documentation UI

The frontend API client is auto-generated from the backend's OpenAPI schema (produced by
`@nestjs/swagger` decorators) using `swagger-typescript-api`. This means the schema output
directly determines what the frontend can call and what types it works with — this
generation mechanic does not change based on which UI renders the schema for humans.

The human-facing documentation UI is **Scalar**, not the framework-default Swagger UI — see
`stack-nestjs` §4 for the full presentation, access-gate, and login-token-reuse rules. This
section (6.1–6.3) only covers the schema/generation contract, which those rules build on
top of.

### 6.1 Requirements

- Every endpoint must be documented with OpenAPI decorators (or equivalent).
- Every request body and response DTO must have a corresponding schema in the OpenAPI output.
- Paginated responses must use a generic wrapper DTO so the generated client reflects the
  correct type (e.g. `PaginatedResponseDto<MeetingDto>` not `any`).
- Bearer auth must be declared in the OpenAPI config so the generated client includes
  the security worker.

### 6.2 Client generation

After any schema change on the backend, the frontend client must be regenerated before
new composables that depend on the new endpoints are written:

```bash
# Run from the frontend project root
pnpm run generate:api
```

The generation script points to `VITE_API_BASE_URL/swagger-json` (or equivalent OpenAPI JSON URL).
Make sure the backend exposes its OpenAPI schema at a predictable path and that it is
accessible during development.

### 6.3 DTO naming conventions

- Use consistent, descriptive DTO names — they become TypeScript type names in the generated client.
- Response DTOs should be suffixed with `Dto` (e.g. `MeetingDto`, `LoginResponseDto`).
- Paginated response wrappers should be generic (e.g. `PaginatedResponseDto<T>`).
- Avoid anonymous inline schemas — they generate unreadable type names.

---

## 7. API Versioning

All endpoints must be prefixed with `/api/v1/`.

The frontend reads the base URL from the `VITE_API_BASE_URL` environment variable.
This variable should not include the version prefix — the `/api/v1/` prefix is part of
the endpoint path.

```
VITE_API_BASE_URL=http://localhost:3000
```

Endpoints:

```
POST http://localhost:3000/api/v1/auth/login
GET  http://localhost:3000/api/v1/meetings
```

---

## 8. Dates & Times

- The API returns all dates and times as UTC ISO 8601 strings (e.g. `2026-01-15T09:30:00Z`).
- Local-time display is the frontend's responsibility. Server-side, only generated documents
  (emails, exports, reports) convert to a target timezone, and only at the edge where the
  document is produced.
- Never return a naive local datetime without a timezone — it is ambiguous to the client.

---

## 9. Binary / File Responses

- Endpoints that return a file (download or export) set `Content-Type` and
  `Content-Disposition` and return the raw bytes. These are the only exception to the
  Section 1 response envelope.
- Such endpoints must declare their response `content` explicitly in the OpenAPI schema (an explicit
  content map, not `@ApiProduces` alone) so the generated client treats the response as a
  blob, not JSON.
- Flag every such endpoint in the module's `CONTRACT.md` so consumers know the response is
  unwrapped.

---

## 10. Checklist for New Backend Projects

Before connecting a new backend to the frontend, verify every item below:

```
[ ] Response envelope — all endpoints return { success, data } or { success, error }
[ ] Paginated endpoints return meta.pagination with total, page, limit, totalPages
[ ] POST /api/v1/auth/login — returns accessToken, tokenType, expiresIn, refreshTokenId
[ ] GET  /api/v1/auth/me   — returns userId, username, permissions, isBreakGlass
[ ] POST /api/v1/auth/logout — revokes session, idempotent
[ ] POST /api/v1/auth/refresh — rotates refreshTokenId, returns new accessToken
[ ] CORS — allowedHeaders includes Content-Type, Authorization, x-retry
[ ] CORS — allowedMethods includes OPTIONS
[ ] OpenAPI schema exposed at a predictable URL
[ ] Scalar reference mounted at /docs, behind Basic Auth (SCALAR_DOCS_USERNAME/PASSWORD) — stack-nestjs §4
[ ] All DTOs named and documented — no anonymous inline schemas
[ ] Paginated DTOs are generic — PaginatedResponseDto<T> not any
[ ] Error responses use standard error codes from Section 5
[ ] Dates returned as UTC ISO 8601 strings
[ ] File/download endpoints set Content-Type + Content-Disposition and are documented as raw (non-envelope) in the OpenAPI schema
[ ] All endpoints versioned under /api/v1/
[ ] VITE_API_BASE_URL set correctly in frontend .env
[ ] pnpm run generate:api run after backend schema is stable
[ ] If §A enabled: every `permissions` string returned by /me exists in permissions.enum.ts and in a module's "Owned permission keys"
[ ] If §L enabled: LDAP-unreachable state returns 401, never a silent fallback; breakglass login sets isBreakGlass: true
```
