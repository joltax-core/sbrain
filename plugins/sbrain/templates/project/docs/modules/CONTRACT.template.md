# Module Contract — [Module]

> Defines the public boundary of this module.
> No code may be written for this module before this file exists.
> Any change to endpoints, inputs, or outputs is reflected here.

## Module responsibility

[One paragraph: what this module owns and does. If endpoints are role-protected, state
the role matrix explicitly here.]

| Endpoint group       | Roles               |
| -------------------- | ------------------- |
| `/api/v1/[module]/*` | [roles or "public"] |

## Owned tables

| Table   | Access   |
| ------- | -------- |
| [table] | [R / RW] |

## Public service interface

[The methods other modules may call. Everything else is private.]

- `findX(...)`: ...
- `createY(...)`: ...

## Dependencies

| Module          | What is used             |
| --------------- | ------------------------ |
| `core/database` | PrismaService            |
| [module]        | [public service / guard] |

## Events (if any)

- Emits: [event] when [condition]
- Consumes: [event] -> [action]

## Bans

- No direct access to another module's repository or tables.
- [Any module-specific constraint, e.g. "export endpoints bypass ResponseInterceptor"].
