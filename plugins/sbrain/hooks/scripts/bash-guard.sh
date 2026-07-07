#!/usr/bin/env bash
# sbrain PreToolUse guard for the Bash tool.
# Reads the hook JSON from stdin, inspects tool_input.command, and blocks
# rule-violating commands with exit code 2 (stderr becomes Claude's feedback).
#
# Active ONLY in sbrain projects (a .agent/ directory exists in cwd or a parent),
# so it never interferes with unrelated repositories.

set -u

INPUT="$(cat)"

# --- Extract the command from the hook JSON (python3 is standard on macOS/Linux) ---
CMD="$(printf '%s' "$INPUT" | python3 -c '
import json,sys
try:
    data = json.load(sys.stdin)
    print(data.get("tool_input", {}).get("command", ""))
except Exception:
    print("")
' 2>/dev/null)"

[ -z "$CMD" ] && exit 0

# --- Only enforce inside sbrain projects -------------------------------
DIR="$PWD"
KERNEL_PROJECT=0
while [ "$DIR" != "/" ]; do
  if [ -d "$DIR/.agent" ]; then KERNEL_PROJECT=1; break; fi
  DIR="$(dirname "$DIR")"
done
[ "$KERNEL_PROJECT" -eq 0 ] && exit 0

block() {
  echo "sbrain guard: $1" >&2
  exit 2
}

# --- Rule P: pnpm only -------------------------------------------------------
# Block npm/yarn package management (npm run/npx are allowed).
if printf '%s' "$CMD" | grep -qE '(^|[;&|[:space:]])npm[[:space:]]+(install|i|ci|add|remove|uninstall|update)([[:space:]]|$)'; then
  block "npm package management is forbidden in this project (RULES §P). Use pnpm: 'pnpm add <pkg>' / 'pnpm install --frozen-lockfile'."
fi
if printf '%s' "$CMD" | grep -qE '(^|[;&|[:space:]])yarn([[:space:]]+(add|install|remove|upgrade))?([[:space:]]|$)'; then
  block "yarn is forbidden in this project (RULES §P). Use pnpm instead."
fi

# --- Rule 12: never commit directly to main or develop ----------------------
if printf '%s' "$CMD" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+commit([[:space:]]|$)'; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
  case "$BRANCH" in
    main|master|develop)
      block "you are on '$BRANCH'. Direct commits to main/develop are forbidden (RULES §12). Create a task branch: git checkout -b feature/[module]-[slug]"
      ;;
  esac
fi

# --- No force-push to shared branches ---------------------------------------
if printf '%s' "$CMD" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+push[^;&|]*([[:space:]]--force([[:space:]]|$|-)|[[:space:]]-f([[:space:]]|$))'; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
  if printf '%s' "$CMD" | grep -qE '[[:space:]](main|master|develop)([[:space:]]|:|$)' \
     || [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ] || [ "$BRANCH" = "develop" ]; then
    block "force-push to a shared branch (main/develop) is forbidden (git-workflow rules)."
  fi
fi

# --- Never merge anything but develop into main ------------------------------
if printf '%s' "$CMD" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+merge([[:space:]]|$)'; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
  if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    if ! printf '%s' "$CMD" | grep -qE 'git[[:space:]]+merge[[:space:]]+(origin/)?develop([[:space:]]|$)'; then
      block "only 'develop' may be merged into main (RULES §12: develop -> main is one-way, via PR)."
    fi
  fi
fi

exit 0
