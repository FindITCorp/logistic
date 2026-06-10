#!/usr/bin/env python3
"""
sofascore_intake.py — Load Sofascore match data into match_players table.

Accepts player-level stats dict/list and inserts into the DB.
Also supports loading team-level stats into team_matches.

Usage:
    from scripts.sofascore_intake import load_sofascore_match
    load_sofascore_match(match_data, db_path="data/mundial2026.db")

Or as CLI:
    python scripts/sofascore_intake.py --file match_data.json
"""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / "data" / "mundial2026.db"

# Team name aliases for matching
TEAM_ALIASES: dict[str, str] = {
    "Czech Republic": "Czechia",
    "Czech republic": "Czechia",
    "CZE": "Czechia",
    "DEN": "Denmark",
    "DAN": "Denmark",
    "CRO": "Croatia",
    "KOR": "South Korea",
    "Republic of Korea": "South Korea",
    "Ivory Coast": "Ivory Coast",
    "Cote d'Ivoire": "Ivory Coast",
    "Côte d'Ivoire": "Ivory Coast",
}


def _resolve_team(conn: sqlite3.Connection, name: str) -> int | None:
    canonical = TEAM_ALIASES.get(name, name)
    row = conn.execute("SELECT id FROM teams WHERE name=?", (canonical,)).fetchone()
    if row:
        return row[0]
    # Fuzzy: case-insensitive
    row = conn.execute(
        "SELECT id FROM teams WHERE lower(name)=lower(?)", (canonical,)
    ).fetchone()
    return row[0] if row else None


def _resolve_player(conn: sqlite3.Connection, name: str, team_id: int) -> int | None:
    """Try to resolve a player by name within a team's squad."""
    import unicodedata

    def norm(s):
        return (
            unicodedata.normalize("NFKD", s)
            .encode("ascii", "ignore")
            .decode()
            .lower()
            .strip()
        )

    n = norm(name)
    row = conn.execute(
        """
        SELECT p.id FROM players p
        JOIN wc26_squad sq ON sq.player_id = p.id
        WHERE sq.team_id = ? AND lower(p.name) = ?
        """,
        (team_id, name.lower()),
    ).fetchone()
    if row:
        return row[0]

    # Try normalised
    rows = conn.execute(
        """
        SELECT p.id, p.name FROM players p
        JOIN wc26_squad sq ON sq.player_id = p.id
        WHERE sq.team_id = ?
        """,
        (team_id,),
    ).fetchall()
    for r in rows:
        if norm(r[1]) == n:
            return r[0]

    # Token subset
    n_tokens = frozenset(t for t in n.split() if len(t) > 1)
    if len(n_tokens) >= 2:
        for r in rows:
            r_tokens = frozenset(t for t in norm(r[1]).split() if len(t) > 1)
            if n_tokens <= r_tokens or r_tokens <= n_tokens:
                return r[0]

    return None


def load_sofascore_match(
    match_data: dict,
    db_path: str | Path = DB_PATH,
    dry_run: bool = False,
) -> dict:
    """
    Load a single Sofascore match into the DB.

    Expected match_data format:
    {
        "home_team": "Czechia",
        "away_team": "Denmark",
        "date": "2026-03-31",
        "competition": "WCQ UEFA",
        "season": 2026,
        "goals_home": 1,
        "goals_away": 1,
        "fixture_id": 9000001,     # unique ID (use 9xxxxxxx range for Sofascore)
        "players": [
            {
                "team": "Czechia",
                "name": "Lukas Provod",
                "position": "Midfielder",
                "started": 1,
                "minutes": 90,
                "goals": 0,
                "assists": 0,
                "yellow_cards": 0,
                "red_cards": 0,
                "rating": 7.1,
                "shots_total": 1,
                "shots_on": 0,
                "passes_total": 34,
                "key_passes": 0,
                "tackles": 2,
                "interceptions": 1
            },
            ...
        ]
    }

    Returns: {"inserted": N, "skipped": N, "errors": [...]}
    """
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    home_id = _resolve_team(conn, match_data["home_team"])
    away_id = _resolve_team(conn, match_data["away_team"])

    if home_id is None or away_id is None:
        conn.close()
        raise ValueError(
            f"Could not resolve teams: {match_data['home_team']!r}, {match_data['away_team']!r}"
        )

    fixture_id = match_data.get("fixture_id") or int(
        match_data["date"].replace("-", "") + str(home_id)[:2]
    )
    competition = match_data.get("competition", "WCQ")
    season = match_data.get("season", 2026)
    match_date = match_data["date"]

    inserted = 0
    skipped = 0
    errors = []

    for p in match_data.get("players", []):
        team_name = p.get("team", "")
        team_id = _resolve_team(conn, team_name)
        if team_id is None:
            errors.append(f"Unknown team: {team_name!r}")
            skipped += 1
            continue

        player_name = p.get("name", "")
        player_id = _resolve_player(conn, player_name, team_id)

        row = {
            "fixture_api_id": fixture_id,
            "team_id": team_id,
            "player_id": player_id,
            "player_api_id": None,
            "player_name": player_name,
            "position": p.get("position", ""),
            "started": p.get("started", 1),
            "minutes_played": p.get("minutes", p.get("minutes_played", 90)),
            "goals": p.get("goals", 0),
            "assists": p.get("assists", 0),
            "yellow_cards": p.get("yellow_cards", 0),
            "red_cards": p.get("red_cards", 0),
            "rating": p.get("rating"),
            "shots_total": p.get("shots_total", 0),
            "shots_on": p.get("shots_on", 0),
            "passes_total": p.get("passes_total", 0),
            "key_passes": p.get("key_passes", 0),
            "tackles": p.get("tackles", 0),
            "interceptions": p.get("interceptions", 0),
            "match_date": match_date,
            "competition": competition,
            "season": season,
        }

        if not dry_run:
            try:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO match_players
                    (fixture_api_id, team_id, player_id, player_api_id, player_name,
                     position, started, minutes_played, goals, assists, yellow_cards,
                     red_cards, rating, shots_total, shots_on, passes_total, key_passes,
                     tackles, interceptions, match_date, competition, season)
                    VALUES
                    (:fixture_api_id, :team_id, :player_id, :player_api_id, :player_name,
                     :position, :started, :minutes_played, :goals, :assists, :yellow_cards,
                     :red_cards, :rating, :shots_total, :shots_on, :passes_total, :key_passes,
                     :tackles, :interceptions, :match_date, :competition, :season)
                    """,
                    row,
                )
                inserted += 1
            except Exception as e:
                errors.append(f"{player_name}: {e}")
                skipped += 1
        else:
            inserted += 1

    # Also update team_matches if goals provided
    goals_home = match_data.get("goals_home")
    goals_away = match_data.get("goals_away")
    if goals_home is not None and not dry_run:
        for tid, opp_id, gf, ga, venue in [
            (home_id, away_id, goals_home, goals_away, "home"),
            (away_id, home_id, goals_away, goals_home, "away"),
        ]:
            result = "W" if gf > ga else ("L" if gf < ga else "D")
            conn.execute(
                """
                INSERT OR IGNORE INTO team_matches
                (team_id, opponent_id, opponent_name, date, competition,
                 goals_for, goals_against, result, venue)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    tid, opp_id,
                    conn.execute("SELECT name FROM teams WHERE id=?", (opp_id,)).fetchone()[0],
                    match_date, competition, gf, ga, result, venue,
                ),
            )

    if not dry_run:
        conn.commit()
    conn.close()

    summary = {"inserted": inserted, "skipped": skipped, "errors": errors}
    print(
        f"[sofascore_intake] {match_data['home_team']} vs {match_data['away_team']} "
        f"({match_date}): inserted={inserted}, skipped={skipped}"
    )
    if errors:
        for e in errors[:5]:
            print(f"  ⚠️  {e}")
    return summary


def load_from_file(path: str, db_path: str | Path = DB_PATH) -> None:
    with open(path) as f:
        data = json.load(f)
    if isinstance(data, list):
        for match in data:
            load_sofascore_match(match, db_path=db_path)
    else:
        load_sofascore_match(data, db_path=db_path)


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True, help="JSON file with match data")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if args.dry_run:
        print("[DRY RUN — nothing will be written]")
    load_from_file(args.file)
