# MUNDIAL 2026 — Documento de Traspaso para Nuevo Agente
**Generado:** 16 de junio de 2026  
**Proyecto:** Sistema de Predicción Avanzado FIFA World Cup 2026  
**Repo:** finditcorp/logistic (rama `claude/sleepy-bohr-PDVSt`)  
**Dueño:** enrique.eaguilarh@gmail.com

---

## 1. QUÉ ES ESTE PROYECTO

Sistema de predicción de partidos del Mundial 2026 en Python. Usa un modelo estadístico con 7 factores (Elo, forma reciente, xG, calidad del XI, set pieces, pressing y experiencia mundialista) para predecir resultados vía distribución de Poisson. Incluye simulador de torneo completo (Monte Carlo, grupos → final).

**Accuracy actual:** 67.4% | Brier Score: 0.4649 (backtest 491 partidos, 10-jun-2026)

---

## 2. ACCESO Y CONFIGURACIÓN

### Repositorio
```
GitHub:  finditcorp/logistic
Rama:    claude/sleepy-bohr-PDVSt   ← TODOS los cambios van aquí
Local:   /home/user/logistic
DB:      /home/user/logistic/data/mundial2026.db   (SQLite)
```

### Configurar sesión nueva
```bash
# 1. Identidad git (OBLIGATORIO para commits verificados)
git config user.email "noreply@anthropic.com"
git config user.name "Claude"

# 2. Cargar token y configurar remote
source /root/.claude/.tokens 2>/dev/null
git remote set-url origin https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git

# 3. Sincronizar con la rama de trabajo
git fetch origin claude/sleepy-bohr-PDVSt
git reset --hard origin/claude/sleepy-bohr-PDVSt

# 4. Cambiar al directorio correcto
cd /home/user/logistic

# 5. Verificar DB
python3 -c "
import sqlite3
conn = sqlite3.connect('data/mundial2026.db')
for t in ['teams','team_matches','players','player_nat_stats','wc_matches','team_elo']:
    n = conn.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
    print(f'  {t}: {n}')
"

# 6. Test rápido del modelo
python3 -c "
import sys; sys.path.insert(0,'.')
from models.match_predictor import predict_match
import sqlite3
conn = sqlite3.connect('data/mundial2026.db')
ids = {r[0]:r[1] for r in conn.execute('SELECT name,id FROM teams').fetchall()}
r = predict_match(ids['Argentina'], ids['France'], neutral=True, stage='knockout')
print(f'Test OK: {r[\"predicted_score\"]}')
"
```

---

## 3. CLAVES DE API

| Clave | Dónde | Propósito | Estado |
|-------|-------|-----------|--------|
| `GITHUB_TOKEN` | `/root/.claude/.tokens` | Push al repo | Puede expirar — pedir al usuario |
| `FOOTBALL_DATA_KEY` | GitHub Secret | football-data.org (resultados diarios) | ✅ Activo |
| `APIFOOT` | GitHub Secret | RapidAPI / api-football | ✅ Activo |
| `APISPORTS_KEY` | GitHub Secret | api-sports.io (100 req/día) | ✅ Activo |

**IMPORTANTE:** Las APIs externas (Sofascore, Opta, ESPN) están **bloqueadas** por política de red del contenedor. Solo funcionan via GitHub Actions con sus GitHub Secrets. No intentar llamarlas directo desde la sesión.

---

## 4. ESTRUCTURA DEL PROYECTO

El código vive en la RAÍZ de `/home/user/logistic/` (no en subcarpeta):

```
/home/user/logistic/
├── predict.py              — Script principal de predicción (CLI)
├── simulate.py             — Simulación de torneo completo
├── requirements.txt        — Dependencias Python

├── models/                 — Módulos del motor de predicción
│   ├── match_predictor.py  — Motor principal (7 factores → Poisson)
│   ├── tournament.py       — Simulador Monte Carlo grupos→final
│   ├── veteran_experience.py — Factor experiencia mundialista
│   ├── elo.py              — Sistema Elo dinámico
│   ├── lineup_estimator.py — Estimación XI titular
│   ├── lineup_impact.py    — Impacto de alineación en lambda
│   ├── player_rating.py    — Rating por jugador (1–10)
│   ├── team_dna.py         — Identidad táctica / ADN del equipo
│   ├── team_similarity.py  — Equipos similares para H2H proxy
│   ├── team_scout.py       — Informe de scouting
│   ├── team_stats_analyzer.py
│   ├── goal_scorer.py      — Predicción de goleadores
│   ├── match_events.py     — Eventos en el partido
│   ├── full_match_sim.py   — Simulación minuto a minuto
│   ├── formation_engine.py — Análisis de formaciones
│   ├── venue_model.py      — Factor sede
│   ├── referee_model.py    — Factor árbitro
│   ├── predictor.py        — Interfaz de predicción de alto nivel
│   ├── simulator.py        — Simulador de partido
│   └── expert_analysis.py  — Modo experto (sin probabilidades)

├── pipelines/              — Ingesta y actualización de datos
│   ├── full_update.py      — Pipeline maestro (--scope form/all/wc/historical)
│   ├── fetch_data.py       — Descarga partidos históricos
│   ├── fetch_football_data_org.py — football-data.org
│   ├── fetch_api_football.py
│   ├── fetch_daily_form.py — Forma reciente
│   ├── fetch_players.py    — Datos de jugadores
│   ├── fetch_club_stats.py — Stats de clubs 2024/25
│   ├── fetch_nat_stats.py  — Stats de selecciones
│   ├── fetch_predictions.py — Señal externa de predicción
│   ├── update_lineup.py    — Actualizar alineaciones
│   ├── update_wc.py        — Actualizar datos del Mundial
│   ├── rebuild_squads.py
│   └── link_historical_data.py

├── scripts/                — Utilidades y mantenimiento
│   ├── setup_db.py         — Crear/resetear la DB desde cero
│   ├── fetch_daily_results.py — Descarga resultados diarios (usado por cron)
│   ├── register_wc_jornada.py — Registrar resultados reales de una jornada
│   ├── sofascore_intake.py — Cargar datos Sofascore que el usuario provea
│   ├── monte_carlo_wc2026.py — Simulación MC del torneo completo
│   ├── validate_model.py   — Backtest del modelo
│   ├── weekly_calibration.py — Recalibrar parámetros semanalmente
│   ├── rebuild_wc_matches.py — Reconstruir calendario desde schedule_wc2026.json
│   ├── seed_matches.py, seed_tactics.py, seed_wc_groups.py
│   ├── wc2026_squads.py, wc2026_squads_part2.py — Plantillas oficiales
│   └── update_official_squads_may2026.py
│   └── daily_pipeline.sh   — Script shell para pipeline diario

├── data/
│   ├── mundial2026.db      — Base de datos SQLite (FUENTE DE VERDAD)
│   ├── static/
│   │   ├── schedule_wc2026.json  — Calendario oficial del sorteo
│   │   ├── teams_wc2026.json     — 48 equipos clasificados
│   │   └── wc_history.json       — Historial de mundiales
│   ├── team_name_aliases.json    — Normalización de nombres de equipos
│   ├── lineups/                  — Alineaciones confirmadas por partido
│   │   └── mexico_vs_grupo_e.json
│   ├── processed/                — Análisis procesados (StatsBomb, etc.)
│   │   ├── statsbomb_wc2022.json
│   │   ├── statsbomb_euro2024.json
│   │   ├── wc2022_player_stats.json
│   │   └── ...
│   └── pending_results/          — Resultados pendientes de registrar
│       ├── jornada1_real.json
│       └── 2026-06-17_18.json

├── mundial2026/            — Datos de resultados diarios (cron de GitHub Actions)
│   └── data/
│       ├── daily_results/  — JSON por fecha (formato: YYYY-MM-DD.json)
│       └── mundial2026.db  — Copia separada (usar data/mundial2026.db para trabajo)

└── .github/workflows/
    ├── fetch-football-results.yml  — Cron 02:00 UTC, descarga resultados vía football-data.org
    ├── fetch_data.yml
    ├── fetch_players.yml
    ├── fetch_priority_players.yml
    └── match_day.yml
```

---

## 5. BASE DE DATOS — ESQUEMA COMPLETO

**Archivo:** `data/mundial2026.db` (SQLite, WAL mode)

### Tablas de equipos

#### `teams` — 79 equipos (48 WC2026 + históricas)
```sql
id              INTEGER PK
name            TEXT         -- nombre oficial FIFA
confederation   TEXT         -- CONMEBOL, UEFA, CONCACAF, CAF, AFC, OFC
wc_group        TEXT         -- A-L
fifa_ranking    INTEGER
formation       TEXT         -- "4-3-3", "4-2-3-1", etc.
tactical_style  TEXT         -- pressing, possession, counter
avg_goals_for   REAL         -- últimos N partidos
avg_goals_against REAL
home_boost      REAL         -- ventaja local
```

#### `team_elo` — Ratings Elo dinámicos
```sql
team_id         INTEGER FK→teams
elo             REAL         -- rating actual
matches_played  INTEGER
last_updated    TEXT
```
K-factor: K=60 para partidos WC · K=25 para WCQ

#### `team_tactics` — Identidad táctica (63 equipos)
```sql
team_id         INTEGER FK→teams
formation       TEXT
pressing_intensity REAL
build_up_style  TEXT
defensive_line  TEXT
corner_frequency REAL
set_piece_index REAL
```

#### `team_matches` — 26,573 partidos históricos
```sql
id              INTEGER PK
team_id         INTEGER FK→teams
opponent_id     INTEGER FK→teams
date            TEXT
goals_for       INTEGER
goals_against   INTEGER
result          TEXT    -- W/D/L
venue           TEXT    -- home/away/neutral
competition     TEXT
```

### Tablas de jugadores

#### `players` — 3,273 jugadores
```sql
id              INTEGER PK
name            TEXT
position        TEXT    -- GK/DEF/MID/FWD
club            TEXT
nationality     TEXT
caps            INTEGER
goals_as_nat    INTEGER
birth_year      INTEGER
availability    TEXT    -- available/doubt/out
```

#### `squad_selections` — 2,760 selecciones de plantilla
```sql
team_id         INTEGER FK→teams
player_id       INTEGER FK→players
call_up_date    TEXT
```

#### `wc26_squad` — 1,587 jugadores (plantilla oficial WC2026, 26/equipo)
```sql
team_id         INTEGER FK→teams
player_id       INTEGER FK→players
shirt_number    INTEGER
is_captain      BOOLEAN
```

#### `projected_lineups` — 1,683 jugadores (XI titular proyectado)
```sql
team_id         INTEGER FK→teams
player_id       INTEGER FK→players
formation_slot  TEXT    -- "GK", "LB", "CB1", "CM1", "CF", etc.
is_starter      BOOLEAN
confidence      REAL    -- 0-1
```

#### `player_club_stats` — 3,904 registros (stats 2024/25)
```sql
player_id       INTEGER FK→players
season          TEXT
goals           INTEGER
assists         INTEGER
xg              REAL
minutes_played  INTEGER
club_rating     REAL    -- rating en club
```

#### `player_nat_stats` — 34,786 registros (StatsBomb WC2022 + WC2018)
```sql
player_id       INTEGER FK→players
match_id        INTEGER
competition     TEXT
minutes         INTEGER
goals           INTEGER
shots           INTEGER
xg              REAL
progressive_passes INTEGER
dribbles_completed INTEGER
```

#### `player_ratings` — 1,048 ratings calculados
```sql
player_id       INTEGER FK→players
rating          REAL    -- 1.0 a 10.0
context         TEXT    -- club/nat
computed_at     TEXT
```

#### `match_players` — 3,476 registros (por jugador por partido)
```sql
match_id        INTEGER
player_id       INTEGER FK→players
team_id         INTEGER FK→teams
starter         BOOLEAN
minutes_played  INTEGER
goals           INTEGER
rating          REAL    -- Sofascore/similar
```

#### `match_lineups` — VACÍO (se llena desde 11-jun-2026)
```sql
match_id        INTEGER
player_id       INTEGER FK→players
team_id         INTEGER FK→teams
starter         BOOLEAN
position        TEXT
```

### Tablas del torneo

#### `wc_matches` — 72 partidos (fase de grupos, calendario REAL)
```sql
id              INTEGER PK
date            TEXT
time            TEXT
home_team_name  TEXT
away_team_name  TEXT
home_team_id    INTEGER FK→teams
away_team_id    INTEGER FK→teams
venue           TEXT
city            TEXT
wc_group        TEXT
stage           TEXT    -- group/round_of_32/quarter_final/semi_final/final
score_home      INTEGER -- NULL si no jugado
score_away      INTEGER
played          BOOLEAN
```
**IMPORTANTE:** Reconstruida el 10-jun-2026 con `scripts/rebuild_wc_matches.py` usando el calendario real del sorteo (eliminó fixtures ficticios como Italy vs Germany — Italia no clasificó).

#### `wc_group_draw` — 48 filas (sorteo oficial)
```sql
team_id         INTEGER FK→teams
grp             TEXT    -- A-L
```

#### `wc_history` — 181 registros (historial WC 2014/2018/2022)
```sql
team_id         INTEGER FK→teams
year            INTEGER
round_reached   TEXT
goals_scored    INTEGER
goals_conceded  INTEGER
matches_played  INTEGER
```

---

## 6. ARQUITECTURA DEL MODELO

### Motor Principal: `models/match_predictor.py`

```python
from models.match_predictor import predict_match

result = predict_match(
    home_id,           # team_id del equipo local
    away_id,           # team_id del equipo visitante
    neutral=True,      # siempre True en Mundial
    stage="group"      # "group" o "knockout"
)

# Campos clave del resultado:
result["predicted_score"]   # "2-1"
result["prob_home_win"]     # porcentaje
result["prob_draw"]
result["prob_away_win"]
result["lambda_home"]       # lambda Poisson home
result["lambda_away"]
result["veteran_factor_home"]  # ajuste veterano
result["predicted_scoreline"]  # "2-1"
result["confidence"]           # {"level": "high/medium/low"}
result["line_analysis"]        # GK/DEF/MID/FWD/Overall
result["squad_ratings"]        # top players por equipo
result["key_matchups"]         # duelos clave
result["form_analysis"]        # forma últimos 5-10 partidos
result["h2h"]                  # historial H2H o proxy
result["wc_history"]           # historial en mundiales
result["component_scores"]     # scores 0-1 por factor
```

### Los 7 Factores y sus pesos

| # | Factor | Peso | Módulo |
|---|--------|------|--------|
| 1 | **Elo diferencial** | 30% | tabla `team_elo`; K=60 WC, K=25 WCQ |
| 2 | **xG blended** | 25% | 40% club xG + 60% forma `avg_gf` |
| 3 | **Forma reciente** | 15% | últimos 10 partidos ponderados |
| 4 | **Rating XI titular** | 18% | `player_ratings` + `projected_lineups` |
| 5 | **Set pieces** | 10% | corner efficiency + set piece index |
| 6 | **Posesión/pressing** | 8% | tácticas + pressing differential |
| 7 | **Experiencia WC** | ±4.5% | `veteran_experience.py` (WC2018+2022) |

### Parámetros calibrados (2-jun-2026)
```python
BASE_GOALS = 1.22
LAMBDA_CAP = 0.045           # máximo ajuste veterano ±4.5%
STAGE_SENSITIVITY = {
    "group": 0.05,
    "knockout": 0.11
}
```

### Factor Veterano (`models/veteran_experience.py`)
```python
from models.veteran_experience import get_team_veteran_stats, veteran_lambda_factor

stats = get_team_veteran_stats("Argentina")
# stats["vet_score"], stats["pct_veterans"], stats["caps_veteran"]
```
- Matching en 3 niveles: player_id → nombre normalizado → tokens subset
- WC2022 pesa **2x** sobre WC2018
- Scores de referencia: Croatia 0.559 · Argentina 0.447 · Czechia 0.000

### Simulador de Torneo (`models/tournament.py`)
```python
from models.tournament import TournamentSimulator

sim = TournamentSimulator()
result = sim.run(n_sims=5000)
# ~1.2s para 3000 sims
```
- Monte Carlo: grupos completos → ronda de 32 → cuartos → semis → final
- Penales: cadena de Markov (MOMENTUM=-0.179, ventaja veterano ±2.5pp)
- Fatiga acumulada por partidos jugados
- Ventaja local anfitriones: +6%

---

## 7. COMANDOS PRINCIPALES

```bash
cd /home/user/logistic

# ── Predicciones ──────────────────────────────────────────
python3 predict.py --home "Argentina" --away "France"
python3 predict.py --home "Panama" --away "Croatia" --neutral
python3 predict.py --home "Mexico" --away "USA" --expert    # sin probabilidades
python3 predict.py --home "Brazil" --away "Germany" --json  # output JSON

# ── Ver calendario ────────────────────────────────────────
python3 predict.py --schedule              # torneo completo
python3 predict.py --group A               # solo grupo A
python3 predict.py --list-teams            # 48 equipos clasificados

# ── Simulación Monte Carlo ────────────────────────────────
python3 simulate.py --match "Brazil" "Argentina"
python3 simulate.py --match "Brazil" "Argentina" --stage knockout
python3 simulate.py --tournament           # simula todo el torneo
python3 simulate.py --group A

# ── Actualizar datos ──────────────────────────────────────
python3 pipelines/full_update.py --scope form       # forma reciente (diario)
python3 pipelines/full_update.py --scope wc         # durante torneo
python3 pipelines/full_update.py --scope all        # actualización completa
python3 pipelines/full_update.py --scope historical # backfill histórico

# ── Registrar resultados reales ───────────────────────────
python3 scripts/register_wc_jornada.py data/pending_results/jornada1_real.json

# ── Cargar datos Sofascore (cuando usuario los provea) ────
python3 scripts/sofascore_intake.py  # editar el archivo primero

# ── Mantenimiento ─────────────────────────────────────────
python3 scripts/validate_model.py --days 365   # backtest
python3 scripts/weekly_calibration.py          # recalibrar parámetros
python3 scripts/rebuild_wc_matches.py          # reconstruir calendario
```

---

## 8. FLUJO DE DATOS EN VIVO (DURANTE TORNEO)

### Cron automático (GitHub Actions, 02:00 UTC diario)
```yaml
# .github/workflows/fetch-football-results.yml
# Descarga partidos terminados de football-data.org
# Filtra solo internacionales (World Cup, Nations League, etc.)
# Guarda en: mundial2026/data/daily_results/YYYY-MM-DD.json
# Aplica a DB y actualiza Elo
# Hace commit y push automático a claude/sleepy-bohr-PDVSt
```

### Cargar resultados manualmente
```python
from scripts.sofascore_intake import load_sofascore_match

load_sofascore_match({
    "home_team": "Mexico",
    "away_team": "South Africa",
    "date": "2026-06-11",
    "competition": "FIFA World Cup 2026",
    "goals_home": 2,
    "goals_away": 0,
    "fixture_id": 9000100,
    "players": [
        {
            "team": "Mexico",
            "name": "Guillermo Ochoa",
            "started": 1,
            "minutes": 90,
            "goals": 0,
            "rating": 7.5,
            "tackles": 0,
            "interceptions": 1
        },
        # ... más jugadores
    ]
})
```

### Registrar jornada completa
```bash
# Formato del archivo:
# data/pending_results/jornada1_real.json
# Ver ejemplo en: data/pending_results/jornada1_real.json

python3 scripts/register_wc_jornada.py data/pending_results/jornada1_real.json
```

---

## 9. ESTADO ACTUAL DEL PROYECTO (16-jun-2026)

```
TORNEO EN CURSO — Jornada 1 completada (11-15 jun)

✅ DB: 26,573 partidos históricos (team_matches)
✅ Elo: 79 equipos con ratings actualizados
✅ Modelo: 7 factores + factor veterano integrado
✅ Backtest: 67.4% accuracy, Brier 0.4649 (491 partidos, 10-jun)
✅ Simulador: Monte Carlo grupos→final (~1.2s/3000 sims)
✅ sofascore_intake.py: listo para recibir datos
✅ wc_matches: 72 fixtures con calendario REAL del sorteo oficial
✅ Cron diario: activo, corriendo 02:00 UTC
✅ Jornada 1: registrada (14 partidos, 11-15 jun, Mexico 2-0 Sudáfrica)
✅ Ratings individuales jornada 1: calculados y guardados

⚠️ Squads oficiales: ~10/48 equipos confirmados (resto = proyectados)
⚠️ match_lineups: solo se llena con datos reales desde 11-jun
⚠️ Calibración pendiente: necesita 20+ partidos nuevos desde última (2-jun)
   → Solo hay ~14 jornada 1; esperar jornada 2 + 3 para recalibrar

🔴 Jornadas 2 y 3: pendientes de jugar y registrar
🔴 Fase eliminatoria: sin datos aún
```

---

## 10. RECALIBRACIÓN DEL MODELO

**Cuándo:** Cada vez que acumulen 20+ partidos nuevos desde la última calibración.

```bash
python3 scripts/weekly_calibration.py
```

Lo que hace:
1. Toma los partidos WC registrados como `played=1` en `wc_matches`
2. Compara pronóstico vs resultado real
3. Ajusta `BASE_GOALS` (típicamente entre 1.15 y 1.35 en WC)
4. Recalcula scores Brier y accuracy
5. Guarda los nuevos parámetros en el modelo

**Parámetros a monitorear:**
- `BASE_GOALS`: promedio de goles por partido en el torneo. Si el torneo es defensivo, baja.
- `LAMBDA_CAP`: no cambiar sin análisis — controla el efecto veterano máximo.

---

## 11. ERRORES CONOCIDOS Y SOLUCIONES

| Error | Causa | Solución |
|-------|-------|----------|
| `No module named 'models'` | CWD incorrecto | `cd /home/user/logistic` |
| `push rejected non-fast-forward` | Remote adelantado | `git fetch && git reset --hard origin/claude/sleepy-bohr-PDVSt` |
| `NoneType has no attribute 'name'` | team_id inválido | Solo usar IDs de equipos en tabla `teams` |
| `UNIQUE constraint failed` | Inserción duplicada | Usar `INSERT OR IGNORE` |
| Commits "Unverified" | Email incorrecto | `git config user.email "noreply@anthropic.com"` |
| APIs externas 403/blockeadas | Red del contenedor | Solo via GitHub Actions con GitHub Secrets |
| `wc_matches` con Italia, Alemania | Fixtures ficticios pre-sorteo | `python3 scripts/rebuild_wc_matches.py` (ya corregido 10-jun) |
| `/root/.claude/.tokens` no existe | Contenedor fresco | Pedir GitHub PAT al usuario y hacer push con `https://<PAT>@github.com/...` |
| Push a otra rama → 403 | Proxy de sesión solo autoriza rama designada | Pedir PAT al usuario para pushear a `claude/sleepy-bohr-PDVSt` desde otra sesión |

---

## 12. ARCHIVOS DE DATOS IMPORTANTES

### `data/static/schedule_wc2026.json`
Calendario oficial del sorteo. **Fuente de verdad** para `wc_matches`. Si la DB tiene fixtures incorrectos, ejecutar `scripts/rebuild_wc_matches.py`.

### `data/team_name_aliases.json`
Normalización de nombres: `"USA" → "United States"`, `"Czechia" → "Czech Republic"`, etc. Crítico para que el matching en `fetch_daily_results.py` funcione.

### `data/pending_results/`
Resultados reales listos para cargar a la DB pero aún no procesados:
- `jornada1_real.json` — resultados jornada 1 (ya cargados)
- `2026-06-17_18.json` — partidos 17-18 junio (pendientes)

### `data/processed/`
Análisis procesados, integrados a la DB:
- `statsbomb_wc2022.json` — stats WC2022 (WC2022 pesa 2x en factor veterano)
- `wc2022_player_stats.json` — rendimiento individual WC2022

---

## 13. FLUJO PARA NUEVO AGENTE — PROTOCOLO DE SESIÓN

### Al iniciar
1. Ejecutar el protocolo de arranque (sección 2)
2. Verificar que el test del modelo pasa
3. Revisar `data/pending_results/` — si hay archivos, cargarlos
4. Si hay 20+ partidos nuevos desde 2-jun → ejecutar `weekly_calibration.py`

### Cuando el usuario provee datos de un partido
1. Cargar con `sofascore_intake.py` o `register_wc_jornada.py`
2. Verificar que el Elo se actualizó: `SELECT * FROM team_elo WHERE team_id IN (...)`
3. Si se acumularon 20+ partidos → recalibrar
4. Hacer commit + push

### Cuando el usuario pide una predicción
```bash
# Forma rápida
python3 predict.py --home "Brasil" --away "Argentina"

# Con análisis completo de experto (sin probabilidades, más legible)
python3 predict.py --home "Brasil" --away "Argentina" --expert

# Simulación del torneo completo
python3 simulate.py --tournament
```

### Reglas de trabajo
- **Mejorar SIN pedir aprobación:** integrar datos, recalibrar, corregir bugs, actualizar CLAUDE.md
- **Pedir aprobación PARA:** cambiar arquitectura fundamental (reemplazar Poisson), eliminar tablas, cambiar nombre de repo
- Siempre commit + push al terminar
- Actualizar `CLAUDE.md` con cualquier cambio al modelo o arquitectura

---

## 14. GITHUB ACTIONS — WORKFLOWS

| Workflow | Schedule | Qué hace |
|----------|----------|----------|
| `fetch-football-results.yml` | 02:00 UTC diario | Descarga resultados internacionales de football-data.org, aplica a DB, hace commit automático |
| `fetch_data.yml` | Manual | Actualización de datos históricos |
| `fetch_players.yml` | Manual | Actualización de datos de jugadores |
| `fetch_priority_players.yml` | Manual | Jugadores prioritarios (con stats avanzados) |
| `match_day.yml` | Manual | Pipeline completo de día de partido |

---

## 15. PENDIENTES (para el nuevo agente)

### Inmediatos
- [ ] Verificar que jornada 1 quedó correctamente en la DB (14 partidos, Mexico 2-0 Sudáfrica)
- [ ] Cargar resultados de `data/pending_results/2026-06-17_18.json` cuando los partidos sean jugados
- [ ] Esperar jornada 2 + 3 (20+ partidos acumulados) → recalibrar `BASE_GOALS`

### Durante el torneo (jornada a jornada)
- [ ] Registrar resultados reales con `register_wc_jornada.py`
- [ ] Cargar alineaciones confirmadas a `match_lineups` cuando estén disponibles
- [ ] Recalibrar el modelo después de cada jornada completa (si 20+ partidos nuevos)
- [ ] Actualizar predicciones para siguiente jornada

### Backlog técnico
- [ ] Completar squads oficiales (10/48 confirmados actualmente)
- [ ] Mejorar H2H proxy para equipos sin historial directo
- [ ] Agregar modelo de lesiones durante torneo

---

**Este documento + `CLAUDE.md` en la rama `claude/sleepy-bohr-PDVSt` tienen TODO el contexto para administrar y continuar el proyecto.**
