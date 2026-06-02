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

# ── Resumen de contexto para el asistente ────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         FINDIT LOGISTIC — CONTEXTO DE SESIÓN             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Estado del repo
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "desconocida")
LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null || echo "sin commits")
UNPUSHED=$(git rev-list "origin/${BRANCH}..HEAD" --count 2>/dev/null || echo "0")

echo "📁 Proyecto:    FINDIT Logistic (finditcorp/logistic)"
echo "🌿 Rama:        ${BRANCH}"
echo "📝 Último commit: ${LAST_COMMIT}"
if [ "$UNPUSHED" -gt "0" ]; then
  echo "⚠️  Commits sin push: ${UNPUSHED}"
fi

# Fecha de última actualización de MEMORIA.md
if [ -f "MEMORIA.md" ]; then
  MEMORIA_DATE=$(head -3 MEMORIA.md | grep "Última actualización" | sed 's/.*: //' || echo "desconocida")
  echo "🧠 MEMORIA.md:  ${MEMORIA_DATE}"
fi

echo ""
echo "🌐 Sitio live:  https://logistic-six-alpha.vercel.app"
echo "🔐 Admin:       /admin/login (enrique.eaguilarh@gmail.com)"
echo ""
echo "🚦 Feature flags (todos OFF por defecto, toggle en /admin/autonomia):"
echo "   • notifications_enabled  — notificaciones de ciclo de vida"
echo "   • nurture_enabled        — nurture automático de leads"
echo "   • optimizer_auto_apply   — GA optimizer aplica sin confirmar"
echo "   • pool_alerts_enabled    — alertas proactivas FCL a leads"
echo ""
echo "🔑 Tokens:      $([ -f '/root/.claude/.tokens' ] && echo '✅ Cargados' || echo '❌ FALTAN — pedir al usuario')"
echo ""
echo "🛠️  Skills activas para este proyecto (invocar con Skill tool):"
echo "   • nextjs-developer   — cambios en páginas/componentes/APIs"
echo "   • vercel-optimize    — deploy, performance, Core Web Vitals"
echo "   • debugger           — bugs y stack traces de producción"
echo "   • qa-expert          — tests, cobertura, plan QA"
echo "   • security-review    — RLS, auth, rate limiting"
echo "   • deap               — mejoras al algoritmo genético (poolOptimizer)"
echo "   • deep-research      — forwarders, regulación, competidores"
echo ""
echo "📌 Para contexto completo: leer MEMORIA.md y CLAUDE.md"
echo "   INSTRUCCIÓN: Invocar la skill relevante ANTES de empezar cada tarea."
echo "══════════════════════════════════════════════════════════════"
echo ""
