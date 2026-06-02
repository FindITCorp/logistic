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

# ── Resumen de contexto para orientar al asistente ─────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  FINDIT Logistic — Contexto de sesión"
echo "════════════════════════════════════════════════════════════"

# Fecha y estado del repo
echo "  Fecha     : $(date '+%Y-%m-%d %H:%M UTC')"
echo "  Rama      : $(git branch --show-current 2>/dev/null || echo 'unknown')"
echo "  Último commit: $(git log -1 --format='%h %s' 2>/dev/null || echo 'N/A')"
echo ""

# Estado de MEMORIA.md
if [ -f "MEMORIA.md" ]; then
  LAST_LINE=$(grep -m1 "Última actualización" MEMORIA.md 2>/dev/null || echo "")
  echo "  MEMORIA.md: $LAST_LINE"
else
  echo "  MEMORIA.md: ⚠️  NO ENCONTRADA"
fi

# Flags activos (si hay acceso a DB — solo informativo)
echo ""
echo "  Feature flags (app_settings):"
echo "    notifications_enabled  — controla notificaciones ciclo de vida"
echo "    nurture_enabled        — secuencia follow-up a leads"
echo "    optimizer_auto_apply   — GA aplica sin confirmar"
echo "    pool_alerts_enabled    — alertas proactivas FCL"
echo "    Todos arrancan en FALSE. Toggle en /admin/autonomia"
echo ""

# Rutas clave
echo "  URLs:"
echo "    Live   : https://logistic-six-alpha.vercel.app"
echo "    Admin  : /admin/login  (enrique.eaguilarh@gmail.com)"
echo "    Cron   : /api/cron/advance-pools  (header: x-cron-secret)"
echo "    WA Bot : /api/whatsapp/webhook"
echo ""

# Cambios sin push
UNPUSHED=$(git rev-list "origin/$(git branch --show-current 2>/dev/null)..HEAD" --count 2>/dev/null) || UNPUSHED=0
if [ "$UNPUSHED" -gt 0 ]; then
  echo "  ⚠️  $UNPUSHED commit(s) locales sin push"
fi

DIRTY=$(git status --porcelain 2>/dev/null | wc -l)
if [ "$DIRTY" -gt 0 ]; then
  echo "  ⚠️  $DIRTY archivo(s) con cambios sin commit"
fi

echo "════════════════════════════════════════════════════════════"
echo ""
