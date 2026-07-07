# ADR-001: Modular monolith architecture

## Status

Accepted

## Context

The project needs clear internal boundaries without the operational cost of
microservices early on. We want strong module isolation that could later be split
into services if scale demands it, but a single deployable unit for now.

## Decision

Build a modular monolith. Each business capability is a NestJS module under
`src/modules/` with its own controller/service/repository and a CONTRACT.md. Modules
communicate only through public service interfaces. A module never touches another
module's repository or tables. Shared concerns live in `src/core/`.

## Consequences

- Easier: one deployable, one DB, simple local dev, refactors across modules.
- Harder: discipline is required to keep boundaries honest; the agent enforces them via
  RULES §2 and CODE_REVIEW.
- A module can later be extracted into a service because its boundary is already explicit.

## Rejected alternatives

- Microservices from day one: too much operational overhead for the current scale.
- Unstructured monolith: boundaries erode, cross-module coupling becomes untraceable.
