#!/usr/bin/env bash
# sbrain reindex: regenerate .agent/tasks/INDEX.md from the TASK-*.md files.
# The task files are the source of truth; the index is a derived view. Running this
# makes index drift structurally impossible.

set -euo pipefail

# Find the project root (nearest parent containing .agent/)
DIR="$PWD"
while [ "$DIR" != "/" ]; do
  if [ -d "$DIR/.agent/tasks" ]; then break; fi
  DIR="$(dirname "$DIR")"
done
if [ ! -d "$DIR/.agent/tasks" ]; then
  echo "reindex: no .agent/tasks directory found from $PWD upward" >&2
  exit 1
fi

TASKS_DIR="$DIR/.agent/tasks"

python3 - "$TASKS_DIR" <<'PY'
import os, re, sys, glob

tasks_dir = sys.argv[1]
rows = []
counts = {"done": 0, "in_progress": 0, "pending": 0, "blocked": 0, "deferred": 0}

def field(text, name):
    m = re.search(r"\*\*%s:\*\*\s*(.*)" % re.escape(name), text)
    return m.group(1).strip() if m else "—"

files = sorted(glob.glob(os.path.join(tasks_dir, "TASK-[0-9]*.md")))
for path in files:
    fname = os.path.basename(path)
    m = re.match(r"TASK-(\d+)\.md$", fname)
    if not m:
        continue
    with open(path, encoding="utf-8") as f:
        text = f.read()
    tid = "TASK-" + m.group(1)
    title_m = re.search(r"^#\s*TASK-\d+:\s*(.+)$", text, re.M)
    title = title_m.group(1).strip() if title_m else "(untitled)"
    status_raw = field(text, "Status")
    status = re.split(r"\s|<", status_raw)[0].strip() or "pending"
    if status not in counts:
        status = "pending"
    counts[status] += 1
    rows.append((
        tid, title, status,
        field(text, "Module"), field(text, "Branch"),
        field(text, "PR"), field(text, "Commit"),
    ))

total = len(rows)
lines = []
lines.append("# Task Index")
lines.append("")
lines.append("> GENERATED FILE — do not edit by hand. Regenerate with the sbrain")
lines.append("> reindex script. Each `TASK-NNN.md` is the source of truth; this index")
lines.append("> is a derived view.")
lines.append("")
lines.append("## Counts")
lines.append("")
lines.append(
    f"Total: {total} | done: {counts['done']} | in_progress: {counts['in_progress']} "
    f"| pending: {counts['pending']} | blocked: {counts['blocked']} | deferred: {counts['deferred']}"
)
lines.append("")
lines.append("## Tasks")
lines.append("")
lines.append("| ID | Title | Status | Module | Branch | PR | Last commit |")
lines.append("| --- | ----- | ------ | ------ | ------ | --- | ----------- |")
for r in rows:
    lines.append("| " + " | ".join(r) + " |")
lines.append("")
lines.append("## Status legend")
lines.append("")
lines.append("pending · in_progress · blocked · done · deferred")
lines.append("")

with open(os.path.join(tasks_dir, "INDEX.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"reindex: {total} task(s) -> INDEX.md "
      f"(done {counts['done']}, in_progress {counts['in_progress']}, "
      f"pending {counts['pending']}, blocked {counts['blocked']}, deferred {counts['deferred']})")
PY
