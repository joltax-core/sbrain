# ADR Index

> Read when an architectural question arises. Load only the relevant ADR.
> ADRs take precedence over RULES.md for their specific scope.

## How to use

1. When an architectural question arises, scan this index.
2. If a relevant ADR exists, read it before deciding.
3. If none exists and a decision is needed: stop, create an ADR, get human approval,
   then write the code.

## ADR list

| ID      | Title                         | Status   | Scope  |
| ------- | ----------------------------- | -------- | ------ |
| ADR-001 | Modular monolith architecture | Accepted | Global |

## Adding a new ADR (`write adr: ...`)

1. Next sequential number; create `docs/ADR/NNN-slug.md`.
2. Add a row here.
3. Update any RULES.md / CONTRACT.md the ADR overrides.
4. Commit: `docs(adr): add ADR-NNN — short title`.

## Format

```
# ADR-NNN: Title
## Status
Proposed / Accepted / Deferred / Superseded by ADR-NNN
## Context
Why was this decision needed?
## Decision
What was decided. Be specific.
## Consequences
Trade-offs. What gets easier, what gets harder.
## Rejected alternatives
What else was considered and why it lost.
```
