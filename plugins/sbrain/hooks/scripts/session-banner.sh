#!/usr/bin/env bash
# sbrain SessionStart hook.
# If the current project is a sbrain project, inject a boot reminder into
# context so the session-start protocol runs without the human having to ask.

set -u

if [ -d "$PWD/.agent" ]; then
  cat <<'EOF'
This project uses sbrain. Before doing ANY work:
1. Run the sbrain:session-start skill (git-authoritative boot: fetch, drift check, mode detection, reconcile, summary).
2. Load the stack profile named in this project's CLAUDE.md ("Stack profile:" line).
Do not write code before the Session Start Summary is delivered and confirmed.
EOF
fi

exit 0
