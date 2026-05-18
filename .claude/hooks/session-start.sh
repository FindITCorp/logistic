#!/bin/bash
set -euo pipefail

# Solo ejecutar en entorno remoto (Claude Code on the web)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Instalar dependencias Node
if [ -f "package-lock.json" ]; then
  npm install --prefer-offline 2>/dev/null || npm install
fi

# Cargar tokens si existen y exportarlos al entorno de la sesión
if [ -f "/root/.claude/.tokens" ]; then
  source /root/.claude/.tokens
  cat /root/.claude/.tokens >> "$CLAUDE_ENV_FILE"

  # Configurar git remote con token
  git remote set-url origin "https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git" 2>/dev/null || true
fi
