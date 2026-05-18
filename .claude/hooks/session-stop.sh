#!/bin/bash
# Ensures no uncommitted changes remain at session end.
# CLAUDE.md is updated manually during sessions, not auto-generated here.
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-/home/user/logistic}"

if [ -f "/root/.claude/.tokens" ]; then
  source /root/.claude/.tokens 2>/dev/null || true
fi

cd "$PROJECT_DIR"
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git" 2>/dev/null || true

# If there are uncommitted changes, commit and push them
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git add -A
  git commit -m "chore: auto-commit session changes" 2>/dev/null || true
  git push origin main 2>/dev/null || true
fi

# Push any unpushed commits
unpushed=$(git rev-list "origin/main..HEAD" --count 2>/dev/null) || unpushed=0
if [ "$unpushed" -gt 0 ]; then
  git push origin main 2>/dev/null || true
fi
