# Known Issues — Index

> Read this index at session start. Load only the relevant module file, not all of them.
> Every entry was discovered during a real, confirmed incident.

## How to use

1. Read this index at session start.
2. Identify which module file is relevant to the current task.
3. Load only that file.
4. Before working a known-tricky area, re-read the relevant KI.

## Policy

- A KI is added only after a real, confirmed bug or trap THIS session. Never record a
  suspicion or a "might happen" note.
- KI numbers are sequential and never reused. A removed KI keeps its number as a
  tombstone line so old references stay valid.
- Each KI is owned by exactly one module file; no number collisions across files.

## Format

```
## KI-NNN — Short title
**Symptom:** what the developer sees
**Root cause:** why it happens
**Rule:** what to always do instead
**Discovered:** YYYY-MM-DD
[wrong vs correct code example]
```

## Adding an entry

1. Append to the relevant `KNOWN_ISSUES/[module].md`.
2. Add a one-line row to the table below.
3. Include in the session-end commit: `docs(known-issues): add KI-NNN — short title`.

---

## core.md — bootstrap, infrastructure, shared concerns

| ID         | Title | Quick rule |
| ---------- | ----- | ---------- |
| _none yet_ |       |            |

## Tombstones (retired numbers — never reuse)

| ID         | Retired because |
| ---------- | --------------- |
| _none yet_ |                 |
