#!/usr/bin/env python3
"""
register_wc_jornada.py — Registra los resultados reales de una jornada del Mundial 2026
y EVOLUCIONA el modelo: actualiza Elo (via register_match) y marca played en wc_matches.

Flujo:
  1. Edita data/pending_results/<archivo>.json y pon el marcador final en
     home_goals / away_goals (deja null lo que aun no se jugo).
  2. Corre:
        python scripts/register_wc_jornada.py data/pending_results/2026-06-17_18.json
        python scripts/register_wc_jornada.py <archivo> --dry-run   # vista previa
  3. Re-predice los siguientes partidos: python predict.py --home X --away Y

Reutiliza register_match() de fetch_daily_results.py (team_matches + Elo, ambos sentidos).
Idempotente: re-correr no duplica (already_exists + played=1).
"""
import sys
import json
import sqlite3
import argparse
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
DB_PATH = ROOT / "data" / "mundial2026.db"

from scripts.fetch_daily_results import load_aliases, register_match, resolve_team


def update_wc_match(conn, home_id, away_id, hg, ag, dry_run):
    """Marca el fixture de wc_matches como jugado (empareja por par de equipos,
    en cualquier orientacion, solo si aun no esta jugado)."""
    row = conn.execute(
        """
        SELECT id, home_team_id, away_team_id FROM wc_matches
        WHERE played = 0 AND (
            (home_team_id = ? AND away_team_id = ?) OR
            (home_team_id = ? AND away_team_id = ?))
        LIMIT 1
        """,
        (home_id, away_id, away_id, home_id),
    ).fetchone()
    if not row:
        return None
    mid, stored_home, _stored_away = row
    # Orienta el marcador al home/away guardado en el fixture
    if stored_home == home_id:
        sh, sa = hg, ag
    else:
        sh, sa = ag, hg
    if not dry_run:
        conn.execute(
            "UPDATE wc_matches SET score_home = ?, score_away = ?, played = 1 WHERE id = ?",
            (sh, sa, mid),
        )
    return mid


def main():
    ap = argparse.ArgumentParser(description="Registra resultados de una jornada del Mundial y evoluciona el modelo")
    ap.add_argument("file", help="JSON de jornada (data/pending_results/*.json)")
    ap.add_argument("--dry-run", action="store_true", help="Solo muestra, no escribe")
    args = ap.parse_args()

    path = Path(args.file)
    if not path.is_absolute():
        path = ROOT / path
    data = json.loads(path.read_text())

    conn = sqlite3.connect(str(DB_PATH))
    aliases = load_aliases()

    print(f"\n{'[DRY RUN] ' if args.dry_run else ''}Jornada: {data.get('jornada', path.stem)}")
    done = skipped = 0
    for m in data.get("matches", []):
        hg, ag = m.get("home_goals"), m.get("away_goals")
        if hg is None or ag is None:
            print(f"  ⏳ pendiente: {m['home']} vs {m['away']} (sin marcador)")
            skipped += 1
            continue

        match = {
            "home_name":   m["home"],
            "away_name":   m["away"],
            "home_goals":  int(hg),
            "away_goals":  int(ag),
            "competition": m.get("competition", "FIFA World Cup"),
            "date":        m.get("date", data.get("date", "")),
        }
        ok = register_match(conn, aliases, match, dry_run=args.dry_run)
        if ok:
            hid = resolve_team(match["home_name"], aliases, conn)
            aid = resolve_team(match["away_name"], aliases, conn)
            if hid and aid:
                mid = update_wc_match(conn, hid, aid, match["home_goals"], match["away_goals"], args.dry_run)
                if mid:
                    print(f"     ↳ wc_matches#{mid} marcado played")
            done += 1

    if not args.dry_run:
        conn.commit()
    conn.close()

    print(f"\n{'[DRY RUN] ' if args.dry_run else ''}✨ {done} registrado(s), {skipped} pendiente(s)")
    if done and not args.dry_run:
        print("→ Elo actualizado. Re-predice con: python predict.py --home X --away Y")


if __name__ == "__main__":
    main()
