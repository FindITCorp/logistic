#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code on the web sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Print CLAUDE.md so Claude has full project context from the first message
if [ -f "$CLAUDE_PROJECT_DIR/CLAUDE.md" ]; then
  echo "=== PROJECT CONTEXT (CLAUDE.md) ==="
  cat "$CLAUDE_PROJECT_DIR/CLAUDE.md"
  echo "=== END PROJECT CONTEXT ==="
fi

# Install dependencies if node_modules is missing or stale
cd "$CLAUDE_PROJECT_DIR"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  npm install
fi
