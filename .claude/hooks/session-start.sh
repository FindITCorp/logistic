#!/bin/bash
set -euo pipefail

# Solo ejecutar en entorno remoto (Claude Code on the web)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# ── 1. Instalar dependencias Node ─────────────────────────────────────────────
if [ -f "package-lock.json" ]; then
  npm install --prefer-offline 2>/dev/null || npm install
fi

# ── 2. Cargar tokens ──────────────────────────────────────────────────────────
if [ -f "/root/.claude/.tokens" ]; then
  source /root/.claude/.tokens
  cat /root/.claude/.tokens >> "$CLAUDE_ENV_FILE"
  git remote set-url origin "https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git" 2>/dev/null || true
fi

# ── 3. Restaurar skills desde backup del repo ─────────────────────────────────
SKILLS_BACKUP="$CLAUDE_PROJECT_DIR/.claude/skills-backup"
SKILLS_DIR="$HOME/.claude/skills"

if [ -d "$SKILLS_BACKUP" ]; then
  mkdir -p "$SKILLS_DIR"
  for skill_dir in "$SKILLS_BACKUP"/*/; do
    skill_name=$(basename "$skill_dir")
    if [ ! -d "$SKILLS_DIR/$skill_name" ]; then
      cp -r "$skill_dir" "$SKILLS_DIR/$skill_name"
      echo "skill restaurada: $skill_name"
    fi
  done
fi

# ── 4. Asegurar skillOverrides en settings globales ──────────────────────────
GLOBAL_SETTINGS="$HOME/.claude/settings.json"
if [ ! -f "$GLOBAL_SETTINGS" ]; then
  mkdir -p "$HOME/.claude"
  echo '{}' > "$GLOBAL_SETTINGS"
fi

python3 - <<'PYEOF'
import json, os

path = os.path.expanduser("~/.claude/settings.json")
with open(path) as f:
    cfg = json.load(f)

cfg.setdefault("permissions", {}).setdefault("allow", [])
if "Skill" not in cfg["permissions"]["allow"]:
    cfg["permissions"]["allow"].append("Skill")

cfg.setdefault("skillOverrides", {})
for skill in ["find-skill", "claude-skill-find-skill", "nextjs-developer",
              "vercel-optimize", "debugger", "qa-expert", "deap", "playwright-skill"]:
    cfg["skillOverrides"][skill] = "on"

with open(path, "w") as f:
    json.dump(cfg, f, indent=4)
PYEOF

# ── 5. Resumen de contexto ────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         FINDIT LOGISTIC — CONTEXTO DE SESIÓN             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "desconocida")
LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null || echo "sin commits")
UNPUSHED=$(git rev-list "origin/${BRANCH}..HEAD" --count 2>/dev/null || echo "0")

echo "📁 Proyecto:    FINDIT Logistic (finditcorp/logistic)"
echo "🌿 Rama:        ${BRANCH}"
echo "📝 Último commit: ${LAST_COMMIT}"
if [ "$UNPUSHED" -gt "0" ]; then
  echo "⚠️  Commits sin push: ${UNPUSHED}"
fi

if [ -f "MEMORIA.md" ]; then
  MEMORIA_DATE=$(head -3 MEMORIA.md | grep "Última actualización" | sed 's/.*: //' || echo "desconocida")
  echo "🧠 MEMORIA.md:  ${MEMORIA_DATE}"
fi

echo ""
echo "🌐 Sitio live:  https://logistic-six-alpha.vercel.app"
echo "🔐 Admin:       /admin/login (enrique.eaguilarh@gmail.com)"
echo ""
echo "🚦 Feature flags (toggle en /admin/autonomia):"
echo "   • notifications_enabled  • nurture_enabled"
echo "   • optimizer_auto_apply   • pool_alerts_enabled"
echo ""
echo "🔑 Tokens:      $([ -f '/root/.claude/.tokens' ] && echo '✅ Cargados' || echo '❌ FALTAN — pedir al usuario')"
echo ""

# Listar skills restauradas/disponibles
SKILLS_OK=$(ls "$SKILLS_DIR" 2>/dev/null | wc -l || echo "0")
echo "🛠️  Skills disponibles: ${SKILLS_OK} (find-skill, nextjs-developer, debugger, qa-expert, vercel-optimize, deap)"
echo ""
echo "📌 Leer MEMORIA.md y CLAUDE.md para contexto completo."
echo "   Invocar la skill relevante ANTES de empezar cada tarea."
echo "══════════════════════════════════════════════════════════════"
echo ""
