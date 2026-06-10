#!/usr/bin/env python3
"""
rebuild_wc_matches.py — Reconstruye wc_matches desde el calendario oficial.

PROBLEMA QUE CORRIGE (detectado 10-jun-2026):
  wc_matches contenía 72 fixtures FICTICIOS sembrados antes del sorteo oficial
  (ej. "Italy vs Germany" grupo A — Italia ni siquiera clasificó), inconsistentes
  con wc_group_draw (el sorteo real). update_wc.py cruza resultados de API contra
  wc_matches por nombre+fecha, así que el flujo de actualización en vivo del
  torneo no habría cargado NINGÚN partido.

FUENTE DE VERDAD: data/static/schedule_wc2026.json (72 partidos de grupos,
consistente con wc_group_draw). La fase eliminatoria se agrega cuando se
conozcan los cruces reales.

Uso:
    python3 scripts/rebuild_wc_matches.py            # valida y reconstruye
    python3 scripts/rebuild_wc_matches.py --dry-run  # solo valida
"""

import sys
import json
import sqlite3
import argparse
from pathlib import Path

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / "data" / "mundial2026.db"
SCHEDULE = ROOT / "data" / "static" / "schedule_wc2026.json"


def load_schedule() -> list[dict]:
    data = json.loads(SCHEDULE.read_text())
    matches = data["group_stage"]["matches"]
    if len(matches) != 72:
        raise SystemExit(f"❌ schedule_wc2026.json tiene {len(matches)} partidos de grupos, esperaba 72")
    return matches


def resolve_teams(conn, matches: list[dict]) -> dict[str, int]:
    """Mapea nombre → team_id. Falla si algún equipo no resuelve."""
    ids = {r[0]: r[1] for r in conn.execute("SELECT name, id FROM teams").fetchall()}
    names = {m["home"] for m in matches} | {m["away"] for m in matches}
    missing = sorted(n for n in names if n not in ids)
    if missing:
        raise SystemExit(f"❌ Equipos sin resolver en tabla teams: {missing}")
    return {n: ids[n] for n in names}


def validate_against_draw(conn, matches: list[dict], team_ids: dict[str, int]) -> None:
    """Cada pareja del calendario debe pertenecer al mismo grupo del sorteo oficial."""
    draw = {r[0]: r[1] for r in conn.execute("SELECT team_id, grp FROM wc_group_draw").fetchall()}
    errors = []
    for m in matches:
        h, a = team_ids[m["home"]], team_ids[m["away"]]
        gh, ga = draw.get(h), draw.get(a)
        if gh != m["group"] or ga != m["group"]:
            errors.append(f"  match {m['id']}: {m['home']}({gh}) vs {m['away']}({ga}) ≠ grupo {m['group']}")
    if errors:
        raise SystemExit("❌ Calendario inconsistente con wc_group_draw:\n" + "\n".join(errors))
    # Cada equipo debe jugar exactamente 3 partidos de grupos
    from collections import Counter
    c = Counter()
    for m in matches:
        c[m["home"]] += 1
        c[m["away"]] += 1
    bad = {n: k for n, k in c.items() if k != 3}
    if bad:
        raise SystemExit(f"❌ Equipos sin 3 partidos de grupos: {bad}")


def rebuild(conn, matches: list[dict], team_ids: dict[str, int]) -> None:
    conn.execute("DELETE FROM wc_matches")
    conn.executemany(
        """INSERT INTO wc_matches
           (id, date, time, home_team_id, away_team_id, home_team_name,
            away_team_name, venue, city, wc_group, stage, score_home, score_away, played)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0)""",
        [(m["id"], m["date"], m.get("time"), team_ids[m["home"]], team_ids[m["away"]],
          m["home"], m["away"], m.get("venue"), m.get("city"), m["group"], m["stage"])
         for m in matches],
    )
    conn.commit()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    conn = sqlite3.connect(str(DB_PATH))
    matches = load_schedule()
    team_ids = resolve_teams(conn, matches)
    validate_against_draw(conn, matches, team_ids)
    print(f"✅ Validación OK: 72 fixtures, 48 equipos, consistente con wc_group_draw")

    if args.dry_run:
        print("(dry-run: no se escribió nada)")
        return

    rebuild(conn, matches, team_ids)
    n = conn.execute("SELECT COUNT(*) FROM wc_matches").fetchone()[0]
    first = conn.execute(
        "SELECT date, home_team_name, away_team_name, wc_group FROM wc_matches ORDER BY date, id LIMIT 4"
    ).fetchall()
    print(f"✅ wc_matches reconstruida: {n} partidos de grupos")
    for r in first:
        print(f"   {r[0]} grupo {r[3]}: {r[1]} vs {r[2]}")


if __name__ == "__main__":
    main()
