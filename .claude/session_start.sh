#!/usr/bin/env bash
# session_start.sh — Protocolo de arranque automático WC2026
# Se ejecuta al inicio de cada nueva sesión de Claude Code

set -e
cd /home/user/logistic

echo "════════════════════════════════════════════════"
echo "  MUNDIAL 2026 — Iniciando sesión"
echo "════════════════════════════════════════════════"

# ── 1. Identidad git ──────────────────────────────────────────────────────────
git config user.email "noreply@anthropic.com"
git config user.name "Claude"
echo "✅ Git identity: noreply@anthropic.com"

# ── 2. Token GitHub ───────────────────────────────────────────────────────────
if [ -f /root/.claude/.tokens ]; then
    source /root/.claude/.tokens 2>/dev/null
    git remote set-url origin "https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git"
    echo "✅ GitHub token cargado"
else
    echo "⚠️  AVISO: /root/.claude/.tokens no encontrado — push/pull pueden fallar"
fi

# ── 3. Sincronizar branch ─────────────────────────────────────────────────────
BRANCH="claude/sleepy-bohr-PDVSt"
if git fetch origin "$BRANCH" 2>/dev/null; then
    LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "none")
    REMOTE=$(git rev-parse FETCH_HEAD 2>/dev/null || echo "none")
    if [ "$LOCAL" != "$REMOTE" ]; then
        git reset --hard FETCH_HEAD
        echo "✅ Branch sincronizado con remote (actualizado)"
    else
        echo "✅ Branch al día (sin cambios remotos)"
    fi
else
    echo "⚠️  No se pudo sincronizar con remote (sin conexión o token expirado)"
fi

# ── 4. Verificar DB ───────────────────────────────────────────────────────────
DB_STATUS=$(python3 - << 'PYEOF'
import sqlite3, sys
try:
    conn = sqlite3.connect('data/mundial2026.db')
    checks = {
        'teams': 48,
        'team_matches': 20000,
        'match_players': 3000,
        'wc_group_draw': 48,
        'team_elo': 48,
    }
    all_ok = True
    msgs = []
    for t, min_n in checks.items():
        n = conn.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
        if n < min_n:
            msgs.append(f'WARN:{t}={n}(min={min_n})')
            all_ok = False
        else:
            msgs.append(f'OK:{t}={n}')
    if all_ok:
        print('OK|' + '|'.join(msgs))
    else:
        print('WARN|' + '|'.join(msgs))
except Exception as e:
    print(f'ERROR|{e}')
PYEOF
)

if echo "$DB_STATUS" | grep -q "^OK"; then
    echo "✅ DB íntegra — $(echo $DB_STATUS | tr '|' ' ' | awk '{print $2, $3, $4, $5}')"
elif echo "$DB_STATUS" | grep -q "^WARN"; then
    echo "⚠️  DB: algunas tablas por debajo del mínimo esperado"
    echo "$DB_STATUS" | tr '|' '\n' | grep "WARN:" | sed 's/^/   /'
else
    echo "❌ DB ERROR: $DB_STATUS"
    echo "   → Ejecutar: python3 scripts/setup_db.py"
fi

# ── 5. Test del modelo ────────────────────────────────────────────────────────
MODEL_STATUS=$(python3 - 2>&1 << 'PYEOF'
import sys
sys.path.insert(0, '.')
try:
    from models.match_predictor import predict_match
    import sqlite3
    conn = sqlite3.connect('data/mundial2026.db')
    ids = {r[0]: r[1] for r in conn.execute('SELECT name, id FROM teams').fetchall()}
    if 'Argentina' not in ids or 'France' not in ids:
        print('WARN:equipos no encontrados en DB')
        sys.exit(0)
    r = predict_match(ids['Argentina'], ids['France'], neutral=True)
    print(f"OK:{r['predicted_score']}|vet_h={r['veteran_factor_home']:.4f}|vet_a={r['veteran_factor_away']:.4f}")
except Exception as e:
    print(f'ERROR:{e}')
PYEOF
)

if echo "$MODEL_STATUS" | grep -q "^OK"; then
    SCORE=$(echo "$MODEL_STATUS" | cut -d: -f2 | cut -d'|' -f1)
    VET=$(echo "$MODEL_STATUS" | grep -o 'vet_h=[0-9.]*')
    echo "✅ Modelo OK — Test Argentina vs France: $SCORE | $VET"
else
    echo "❌ Modelo ERROR: $MODEL_STATUS"
fi

# ── 6. Resumen de estado ──────────────────────────────────────────────────────
TODAY=$(date +%Y-%m-%d)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Sesión lista — $TODAY"
echo "  Branch: claude/sleepy-bohr-PDVSt"
echo "  El Mundial 2026 comenzó el 11-jun-2026"
echo "  Instrucciones completas en CLAUDE.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Salida con JSON para que Claude reciba el contexto
cat << JSONEOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "PROYECTO: Sistema de predicción WC2026 (FindITCorp/logistic, branch claude/sleepy-bohr-PDVSt). DB cargada con 26,573 partidos, 3,476 match_players WC2018/22, 79 equipos con Elo. Modelo: 7 factores Poisson, backtest 67.4% accuracy. DIRECTIVA: mejorar todo automáticamente, hacer commit+push de cada mejora. Lee CLAUDE.md para instrucciones completas. Si alguna clave de API falla, notificar al usuario de inmediato."
  }
}
JSONEOF
