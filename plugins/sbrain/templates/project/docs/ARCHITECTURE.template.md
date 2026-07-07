# Architecture Overview

> The agent reads this at every session start. Update only by human decision; the
> agent proposes changes, never edits this file directly.
> Written by the sbrain bootstrap interview — no [FILL IN] should survive
> bootstrap; unresolved items go under "Deferred decisions" with a revisit trigger.

## Project overview

[From interview: what this system does and who consumes it.]

## Tech stack

| Layer     | Technology       | Notes |
| --------- | ---------------- | ----- |
| [layer]   | [from interview] |       |

## Optional concerns — DECLARE EXPLICITLY

> The stack profile's concern rules and the code-reviewer key off this table. A concern
> not enabled here is NOT checked and its rules do NOT apply. Be honest: declaring a
> concern you do not implement turns review into noise; omitting one you do implement
> removes its guardrail.

| Concern                 | Enabled? | Rules in            |
| ----------------------- | -------- | ------------------- |
| [per stack profile]     | [yes/no] | [stack skill §]     |

## Application structure

```
[from interview / stack profile conventions]
```

## Module classification

| Module | Responsibility |
| ------ | -------------- |
| [name] | [one line]     |

## Data strategy

[State the non-obvious facts explicitly so they match the concerns table.]

## Authentication flow

[From interview, or "none — all endpoints/screens public".]

## Approved dependency list

> The agent must not add a dependency that is not listed here without human approval.

| Package | Purpose |
| ------- | ------- |
| [pkg]   |         |

## Deferred decisions

| Topic | Status   | Trigger to revisit |
| ----- | -------- | ------------------ |
|       | deferred |                    |
