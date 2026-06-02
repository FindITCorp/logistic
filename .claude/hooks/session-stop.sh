#!/bin/bash
# Ensures no uncommitted changes remain at session end.
# Auto-updates MEMORIA.md last-updated date before committing.
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-/home/user/logistic}"

if [ -f "/root/.claude/.tokens" ]; then
  source /root/.claude/.tokens 2>/dev/null || true
fi

cd "$PROJECT_DIR"
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git" 2>/dev/null || true

# Actualizar la fecha en MEMORIA.md si hay cambios en el repo
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  TODAY=$(date '+%Y-%m-%d')
  if [ -f "MEMORIA.md" ]; then
    # Reemplaza la línea de fecha sin usar sed -i (compatible con todos los entornos)
    TMPFILE=$(mktemp)
    sed "s/^\*\*Última actualización:\*\* .*/\*\*Última actualización:\*\* $TODAY/" MEMORIA.md > "$TMPFILE"
    mv "$TMPFILE" MEMORIA.md
  fi

  git add -A
  git commit -m "chore: auto-commit session changes [$(date '+%Y-%m-%d %H:%M')]" 2>/dev/null || true
  git push origin "$(git branch --show-current 2>/dev/null || echo main)" 2>/dev/null || true
fi

# Push any unpushed commits
BRANCH=$(git branch --show-current 2>/dev/null || echo main)
UNPUSHED=$(git rev-list "origin/${BRANCH}..HEAD" --count 2>/dev/null) || UNPUSHED=0
if [ "$UNPUSHED" -gt 0 ]; then
  git push origin "$BRANCH" 2>/dev/null || true
fi
