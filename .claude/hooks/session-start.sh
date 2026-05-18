#!/bin/bash
set -euo pipefail

# Install dependencies if node_modules is missing or stale
cd "${CLAUDE_PROJECT_DIR:-/home/user/logistic}"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  npm install
fi
