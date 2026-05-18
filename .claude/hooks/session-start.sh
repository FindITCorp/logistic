#!/bin/bash
set -euo pipefail

# Solo ejecutar en entorno remoto (Claude Code on the web)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Instalar dependencias Node
if [ -f "$CLAUDE_PROJECT_DIR/package-lock.json" ]; then
  cd "$CLAUDE_PROJECT_DIR"
  npm install
fi

# Cargar tokens si existen
if [ -f "/root/.claude/.tokens" ]; then
  source /root/.claude/.tokens
fi

# Configurar git remote con token de GitHub (si está disponible)
if [ -n "${GITHUB_TOKEN:-}" ]; then
  cd "$CLAUDE_PROJECT_DIR"
  git remote set-url origin "https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git"
fi

# Exportar tokens al entorno de la sesión para que Claude los use
if [ -f "/root/.claude/.tokens" ]; then
  cat /root/.claude/.tokens >> "$CLAUDE_ENV_FILE"
fi
