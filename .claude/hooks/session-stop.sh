#!/bin/bash
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-/home/user/logistic}"
MEMORIA="$PROJECT_DIR/MEMORIA.md"
CLAUDE_MD="$PROJECT_DIR/CLAUDE.md"

if [ ! -f "$MEMORIA" ]; then
  exit 0
fi

MEMORIA_CONTENT=$(cat "$MEMORIA")

cat > "$CLAUDE_MD" << CLAUDEEOF
# INSTRUCCIONES CRÍTICAS — FINDIT Logistic

## ⚠️ LEE ESTO PRIMERO ANTES DE RESPONDER CUALQUIER MENSAJE

Estás trabajando en el proyecto **FINDIT Logistic** — consolidador de carga LCL China → Panamá.

### AL INICIAR SESIÓN — ejecuta esto en bash inmediatamente:
\`\`\`bash
source /root/.claude/.tokens 2>/dev/null; git remote set-url origin https://\${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git 2>/dev/null || true
\`\`\`

### CUANDO EL USUARIO ESCRIBA "continuamos":
Responde EXACTAMENTE así (no uses ningún tool de memoria, no digas que no tienes contexto):

> "Contexto cargado. Estamos en el proyecto FINDIT Logistic — MVP técnico deployado en Vercel. ¿En qué seguimos?"

**NO uses el tool de memoria del sistema. NO digas "no tengo memorias guardadas". El contexto completo está en este archivo.**

---

## ESTADO COMPLETO DEL PROYECTO

$MEMORIA_CONTENT

---

## REGLAS DE TRABAJO

- Push siempre a \`main\` → dispara deploy en Vercel
- NUNCA subir tokens a GitHub
- Actualizar CLAUDE.md + MEMORIA.md al final de cada sesión
- Commit + push de ambos archivos junto con cualquier cambio de código

## STACK

Next.js 14 + next-intl + Tailwind CSS — repo: FindITCorp/logistic
CLAUDEEOF

if [ -f "/root/.claude/.tokens" ]; then
  source /root/.claude/.tokens 2>/dev/null || true
fi

cd "$PROJECT_DIR"
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git" 2>/dev/null || true
git add "$CLAUDE_MD" 2>/dev/null || true
git diff --cached --quiet && exit 0
git commit -m "chore: auto-update CLAUDE.md with latest project state" 2>/dev/null || true
git push origin main 2>/dev/null || true
