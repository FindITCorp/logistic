# MUNDIAL 2026 — SISTEMA DE PREDICCION AVANZADO
# INSTRUCCIONES OBLIGATORIAS PARA CADA NUEVA SESION

> **LEER COMPLETO ANTES DE HACER CUALQUIER COSA.**
> Este archivo es la memoria permanente del proyecto. Todo lo que aquí dice
> debe mantenerse, actualizarse y NUNCA eliminarse sin agregar la versión nueva.

---

## ══════════════════════════════════════════════════
## PROTOCOLO DE ARRANQUE — EJECUTAR SIEMPRE AL INICIO
## ══════════════════════════════════════════════════

```bash
# PASO 1: Configurar identidad git (OBLIGATORIO para commits verificados)
git config user.email "noreply@anthropic.com"
git config user.name "Claude"

# PASO 2: Cargar token GitHub y sincronizar remote
source /root/.claude/.tokens 2>/dev/null
git remote set-url origin https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git

# PASO 3: Sincronizar con el branch de trabajo
git fetch origin claude/sleepy-bohr-PDVSt
git reset --hard origin/claude/sleepy-bohr-PDVSt

# PASO 4: Verificar integridad de la base de datos
cd /home/user/logistic
python3 -c "
import sqlite3, sys
conn = sqlite3.connect('data/mundial2026.db')
expected = {'teams':48,'team_matches':20000,'match_players':3000,'players':3000,
            'player_nat_stats':30000,'wc_group_draw':48,'team_elo':48}
ok = True
for t, min_rows in expected.items():
    n = conn.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
    status = '✅' if n >= min_rows else '❌'
    if n < min_rows: ok = False
    print(f'  {status} {t}: {n} rows')
sys.exit(0 if ok else 1)
"

# PASO 5: Verificar que el modelo funciona
python3 -c "
import sys; sys.path.insert(0,'.')
from models.match_predictor import predict_match
import sqlite3
conn = sqlite3.connect('data/mundial2026.db')
ids = {r[0]:r[1] for r in conn.execute('SELECT name,id FROM teams').fetchall()}
r = predict_match(ids['Argentina'], ids['France'], neutral=True, stage='knockout')
print(f'Test OK: {r[\"predicted_score\"]} | {r[\"prob_home_win\"]}%/{r[\"prob_draw\"]}%/{r[\"prob_away_win\"]}%')
print(f'Vet: {r[\"veteran_factor_home\"]} / {r[\"veteran_factor_away\"]}')
"
```

---

## ══════════════════════════════════════════════════
## DIRECTIVA PERMANENTE DE MEJORA AUTOMATICA
## ══════════════════════════════════════════════════

**Mejorar SIN pedir aprobación:**
- Integrar nuevos datos de partidos cuando el usuario los proporcione
- Recalibrar BASE_GOALS y pesos del modelo tras cada 20+ partidos nuevos
- Mejorar calidad de cualquier módulo si se detecta bug o ineficiencia
- Actualizar este CLAUDE.md con cada cambio importante
- Hacer commit y push de cada mejora a `claude/sleepy-bohr-PDVSt`

**Pedir aprobación SOLO para:**
- Cambiar arquitectura fundamental del modelo (reemplazar Poisson)
- Eliminar tablas de la DB
- Cambiar nombre del repositorio o branch principal

---

## REPOSITORIO Y ACCESO

| Parámetro | Valor |
|-----------|-------|
| GitHub repo | `FindITCorp/logistic` |
| Branch trabajo | `claude/sleepy-bohr-PDVSt` |
| Ruta local | `/home/user/logistic` |
| DB local | `/home/user/logistic/data/mundial2026.db` |
| Token GitHub | En `/root/.claude/.tokens` como `$GITHUB_TOKEN` |
| Token actual | `[en /root/.claude/.tokens]` ⚠️ puede expirar |

### Git — siempre así:
```bash
git config user.email "noreply@anthropic.com"
git config user.name "Claude"
git -c commit.gpgsign=false commit -m "mensaje"
git push https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git claude/sleepy-bohr-PDVSt
```

---

## CLAVES DE API — ESTADO COMPLETO

| Clave | Dónde | Valor | Estado |
|-------|-------|-------|--------|
| `GITHUB_TOKEN` | `/root/.claude/.tokens` | `[en /root/.claude/.tokens]` | ✅ Activa |
| `FOOTBALL_DATA_KEY` | GitHub Secret + env | `[ver GitHub Secret FOOTBALL_DATA_KEY]` | ✅ football-data.org |
| `APIFOOT` | GitHub Secret + env | `[ver GitHub Secret APIFOOT]` | ✅ RapidAPI |
| `APISPORTS_KEY` | GitHub Secret + env | `[ver GitHub Secret APISPORTS_KEY]` | ✅ 100 req/día |

> **⚠️ SI ALGUNA CLAVE FALLA: Notificar al usuario INMEDIATAMENTE.**
> APIs externas (Sofascore, Opta, ESPN) están BLOQUEADAS por política de red.
> Solo funcionan FOOTBALL_DATA_KEY, APIFOOT y APISPORTS_KEY via GitHub Actions.

### Verificar claves localmente:
```bash
source /root/.claude/.tokens
echo "GitHub token: ${GITHUB_TOKEN:0:20}..."
python3 -c "
import os, requests
key = '[ver GitHub Secret APISPORTS_KEY]'
r = requests.get('https://v3.football.api-sports.io/status',
    headers={'x-apisports-key': key}, timeout=10)
print('api-sports:', r.status_code, r.json().get('response',{}).get('requests',{}))
"
```

---

## BASE DE DATOS — ESTADO COMPLETO

**Archivo:** `/home/user/logistic/data/mundial2026.db` (SQLite, WAL mode)

| Tabla | Filas | Descripción |
|-------|-------|-------------|
| `teams` | 79 | 48 WC2026 + históricas; id, name, fifa_ranking, confederation |
| `team_matches` | 26,573 | Historial resultados; goals_for/against, result (W/D/L), venue |
| `team_elo` | 79 | Ratings Elo dinámicos por equipo |
| `team_tactics` | 63 | Formación, pressing, build_up_style por equipo |
| `players` | 3,273 | Jugadores; name, position, club, caps, goals_as_nat |
| `squad_selections` | 2,760 | Plantillas confirmadas (team_id, player_id) |
| `wc26_squad` | 1,587 | Plantilla oficial WC2026 (26 jugadores/equipo) |
| `projected_lineups` | 1,683 | XI titular proyectado; is_starter, formation_slot |
| `player_club_stats` | 3,904 | Stats 2024/25 en clubs; goals, assists, xG, minutes |
| `player_nat_stats` | 34,786 | Stats selección; StatsBomb WC2022+WC2018 |
| `player_ratings` | 1,048 | Ratings 1-10 calculados; context=club/nat |
| `match_players` | 3,476 | Por jugador por partido (WC2018: 1647, WC2022: 1829) |
| `wc_matches` | 72 | Calendario REAL fase de grupos (reconstruido 10-jun, ver abajo) |
| `wc_group_draw` | 48 | Sorteo oficial: team_id, grp (A-L) |
| `wc_history` | 181 | Historial WC 2014/2018/2022 |
| `match_lineups` | 0 | Alineaciones confirmadas (desde 11-jun-2026) |

---

## ARQUITECTURA DEL MODELO

### Motor Principal: `models/match_predictor.py`

```python
from models.match_predictor import predict_match
r = predict_match(home_id, away_id, neutral=True, stage="group")
# stage="knockout" para eliminatorias
# r["predicted_score"], r["prob_home_win"], r["lambda_home"]
# r["veteran_factor_home"], r["veteran_pct_home"]
```

**7 Factores → λ Poisson:**

| # | Factor | Peso | Módulo |
|---|--------|------|--------|
| 1 | Elo diferencial | 30% | `team_elo` table; K=60 WC, K=25 WCQ |
| 2 | xG blended | 25% | 40% club xG + 60% forma avg_gf |
| 3 | Forma reciente | 15% | Últimos 10 partidos ponderados |
| 4 | Rating XI titular | 18% | `player_ratings` + `projected_lineups` |
| 5 | Set pieces | 10% | Corner efficiency + set piece index |
| 6 | Posesión/pressing | 8% | Tácticas + pressing differential |
| 7 | **Experiencia WC** | ±4.5% | `veteran_experience.py` (WC2018+WC2022) |

**Parámetros calibrados (2-jun-2026):**
- `BASE_GOALS = 1.22`
- `LAMBDA_CAP = 0.045` (exp. mundialista máx ±4.5%)
- `STAGE_SENSITIVITY = {group: 0.05, knockout: 0.11}`

**Backtest (10-jun-2026, 491 partidos):**
- Accuracy: **67.4%** | Brier: **0.4649** | Draw recall: 64.6%

### Simulador Torneo: `models/tournament.py`
```python
from models.tournament import TournamentSimulator
result = TournamentSimulator().run(n_sims=5000)
```
- Monte Carlo grupos→final; ~1.2s/3000 sims
- Penales: cadena de Markov (MOMENTUM=-0.179, vet edge ±2.5pp)
- Fatiga acumulada + localía anfitriones (+6%)

### Factor Veterano: `models/veteran_experience.py`
```python
from models.veteran_experience import get_team_veteran_stats, veteran_lambda_factor
```
- 3-level matching: player_id → nombre normalizado → tokens subset
- WC2022 pesa 2x sobre WC2018
- Scores de referencia: Croatia 0.559, Argentina 0.447, Czechia 0.000

---

## FLUJO DE DATOS

```bash
# Diario (forma reciente)
python3 pipelines/full_update.py --scope form

# Semanal (todo)
python3 pipelines/full_update.py --scope all

# Durante torneo (11-jun a 19-jul-2026)
python3 pipelines/full_update.py --scope wc

# Backfill histórico
python3 pipelines/full_update.py --scope historical
```

### Cargar partido Sofascore (cuando usuario provea datos):
```python
from scripts.sofascore_intake import load_sofascore_match
load_sofascore_match({
    "home_team": "Czechia", "away_team": "Denmark",
    "date": "2026-03-31", "competition": "WCQ UEFA",
    "goals_home": 1, "goals_away": 1, "fixture_id": 9000001,
    "players": [
        {"team": "Czechia", "name": "Tomáš Souček",
         "started": 1, "minutes": 90, "goals": 0,
         "rating": 7.2, "tackles": 3, "interceptions": 1},
        # ...
    ]
})
```

---

## COMANDOS DE USO

```bash
# Predicción partido
python3 predict.py --home "Argentina" --away "France"
python3 predict.py --home "Argentina" --away "France" --expert

# Simulación completa
python3 simulate.py --match "Brazil" "Argentina"
python3 simulate.py --match "Brazil" "Argentina" --stage knockout

# Torneo
python3 simulate.py --tournament
python3 simulate.py --group A

# Backtest
python3 scripts/validate_model.py --days 365

# Calibración semanal
python3 scripts/weekly_calibration.py
```

---

## ERRORES CONOCIDOS Y SOLUCIONES

| Error | Causa | Solución |
|-------|-------|----------|
| `No module named 'models'` | CWD incorrecto | `cd /home/user/logistic` |
| `push rejected non-fast-forward` | Remote adelantado | `git fetch + git reset --hard FETCH_HEAD` |
| `NoneType has no attribute 'name'` | team_id no en tabla teams | Solo usar IDs de equipos WC2026 |
| `UNIQUE constraint failed` | Inserción duplicada | Usar `INSERT OR IGNORE` |
| Commits "Unverified" en GitHub | Email incorrecto | `git config user.email "noreply@anthropic.com"` |
| APIs externas 403 | Política de red | Solo via GitHub Actions con GitHub Secrets |
| wc_matches con fixtures ficticios | Sembrada antes del sorteo oficial (ej. Italy vs Germany — Italia NO clasificó) | CORREGIDO 10-jun: `python3 scripts/rebuild_wc_matches.py` reconstruye desde `data/static/schedule_wc2026.json` validando contra `wc_group_draw` |

---

## ESTADO ACTUAL DEL PROYECTO

**Última actualización:** 10 junio 2026 (noche — víspera del torneo)
**Rama activa:** `claude/sleepy-bohr-PDVSt`
**Torneo comienza:** 11 junio 2026

```
✅ DB: 26,569 partidos históricos (team_matches; último: 2026-06-03)
✅ Elo: 198 equipos
✅ Modelo: 7 factores integrados + veteranos WC
✅ Backtest reproducido 10-jun: 67.4% accuracy, Brier 0.4649 (491 partidos, A/B veterano +0.4pp)
✅ Simulador torneo: ~1.2s/3000 sims
✅ sofascore_intake.py: listo para recibir datos
⚠️  wc_matches: la DB committeada trae fixtures FICTICIOS pre-sorteo —
    EJECUTAR `python3 scripts/rebuild_wc_matches.py` y commitear la DB
    (la sesión web del 10-jun lo corrigió localmente pero no pudo pushear la DB binaria)
✅ Predicciones jornada inaugural 11–13 jun generadas (20 partidos, ver reporte sesión 10-jun)
⚠️  Squads oficiales: 10/48 equipos confirmados
⚠️  Sofascore: esperando datos (Czechia vs DEN/CRO)
🔴 match_lineups: vacío (desde 11-jun-2026)
🔴 Calibración: solo 2 partidos nuevos desde 2-jun → NO recalibrar aún (umbral 20+)
```

---

## ENTORNO "CLAUDE CODE ON THE WEB" — LÍMITES VERIFICADOS (10-jun-2026)

Cuando la sesión corre en la web (contenedor efímero), el entorno difiere del
contenedor local del usuario. Verificado empíricamente:

| Recurso | Estado | Detalle |
|---------|--------|---------|
| `/root/.claude/.tokens` | ❌ NO existe | Contenedor fresco; no pedir push con token, usar remote `origin` |
| Remote `origin` | ✅ Proxy de sesión | `http://local_proxy@127.0.0.1:<puerto>/git/FindITCorp/logistic` — push autorizado SOLO a este repo |
| Repo `FindITCorp/Mundial2026-` | ❌ BLOQUEADO | Proxy responde "repository not authorized" — hay que agregarlo al scope de la sesión al crearla |
| `/home/user/mundial2026` | ❌ NO existe | Solo se clona el repo de la sesión; trabajar en worktree de esta rama |
| `api.github.com` | ❌ 403 | APIs GitHub solo via tools MCP de la sesión |
| `pypi.org` | ✅ 200 | `pip install` funciona |
| APIs fútbol (api-sports, etc.) | ❌ Bloqueadas | Igual que local: solo via GitHub Actions |

**Implicación:** desde una sesión web SOLO se puede trabajar y pushear este branch
(`claude/sleepy-bohr-PDVSt` u otro `claude/*` de logistic). Para tocar el repo
principal `Mundial2026-`, el usuario debe incluirlo en el scope al crear la sesión.

---

## TAREAS PENDIENTES AL INICIAR NUEVA SESION

0. **`python3 scripts/rebuild_wc_matches.py`** si `SELECT home_team_name FROM wc_matches WHERE id=1`
   no devuelve "Mexico" (vs South Africa) — luego commitear `data/mundial2026.db`
1. Ejecutar protocolo de arranque completo
2. Verificar que el test del modelo pasa sin errores
3. Si el usuario provee datos de partidos → cargar con sofascore_intake.py
4. Si hay 20+ partidos nuevos desde última calibración → recalibrar BASE_GOALS
5. Durante torneo: `--scope wc` para actualizar resultados en tiempo real
6. Actualizar este CLAUDE.md con cualquier cambio relevante
