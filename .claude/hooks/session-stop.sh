#!/bin/bash
# Al terminar cada sesión, regenera CLAUDE.md con el contenido actualizado de MEMORIA.md
# Así la próxima sesión tiene todo el contexto sin necesidad de leer archivos adicionales.

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-/home/user/logistic}"
MEMORIA="$PROJECT_DIR/MEMORIA.md"
CLAUDE_MD="$PROJECT_DIR/CLAUDE.md"

if [ ! -f "$MEMORIA" ]; then
  exit 0
fi

MEMORIA_CONTENT=$(cat "$MEMORIA")

cat > "$CLAUDE_MD" << CLAUDEEOF
# INSTRUCCIONES AUTOMÁTICAS — FINDIT Logistic

## ⚠️ CONTEXTO DEL PROYECTO — LEER ANTES DE RESPONDER CUALQUIER COSA

El usuario trabaja en este proyecto. Cuando escriba "continuamos", confirma que tienes este contexto y pregunta en qué seguimos.

### Configuración automática al iniciar:
Ejecuta esto en bash:
\`\`\`
source /root/.claude/.tokens 2>/dev/null && git remote set-url origin https://\${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git 2>/dev/null || true
\`\`\`
Si los tokens no existen, pídelos al usuario y guárdalos en /root/.claude/.tokens

---

## ESTADO ACTUAL DEL PROYECTO

$MEMORIA_CONTENT

---

## REGLAS DE TRABAJO:
- Push siempre a \`main\` → dispara deploy automático en Vercel vía GitHub Actions
- Nunca subir tokens a GitHub (push protection los bloquea)
- Actualizar \`MEMORIA.md\` al final de cada sesión con los cambios realizados
- Commit + push de MEMORIA.md junto con cualquier cambio de código

## STACK:
Next.js 14 + next-intl + Tailwind CSS — repo: FindITCorp/logistic
CLAUDEEOF

# Commit y push del CLAUDE.md actualizado
if [ -f "/root/.claude/.tokens" ]; then
  source /root/.claude/.tokens 2>/dev/null || true
fi

cd "$PROJECT_DIR"
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git" 2>/dev/null || true
git add "$CLAUDE_MD" 2>/dev/null || true
git diff --cached --quiet || git commit -m "chore: auto-update CLAUDE.md with latest project state" && git push origin main 2>/dev/null || true
