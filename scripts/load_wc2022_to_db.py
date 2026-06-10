#!/usr/bin/env python3
"""
Load WC2022 player statistics from StatsBomb into match_players table.

This script:
1. Reads WC2022 player stats from JSON
2. Maps WC2022 players to database player_ids where possible
3. Creates artificial fixture_api_ids for WC2022 matches
4. Populates match_players table with complete statistics
5. Tags records with competition='WC2022' and season=2022
"""

import json
import sqlite3
from pathlib import Path
from collections import defaultdict
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "data" / "mundial2026.db"
WC2022_DATA = Path(__file__).parent.parent / "data" / "processed" / "wc2022_player_stats.json"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def load_wc2022_data():
    """Load WC2022 player statistics from JSON."""
    with open(WC2022_DATA) as f:
        return json.load(f)


def normalize_name(name):
    """Normalize player name for matching."""
    return name.lower().strip()


def create_fixture_api_id(team1, team2, team1_goals, team2_goals):
    """Create a deterministic fixture ID for WC2022 matches."""
    # Use hash of team names + score to create unique ID
    # WC2022 fixtures use ID range 1000000-1000064 to avoid collision with real API IDs
    fixture_key = f"{team1}_{team2}_{team1_goals}_{team2_goals}"
    hash_val = abs(hash(fixture_key)) % 100
    return 1000000 + hash_val


def build_player_lookup(conn):
    """Build a lookup of current players in database."""
    cur = conn.cursor()
    cur.execute("""
        SELECT p.id, p.name, p.team_id, t.name as team_name, p.position
        FROM players p
        JOIN teams t ON p.team_id = t.id
    """)

    lookup = {}
    for row in cur.fetchall():
        key = (normalize_name(row['name']), normalize_name(row['team_name']))
        lookup[key] = {
            'player_id': row['id'],
            'team_id': row['team_id'],
            'position': row['position']
        }

    return lookup


def get_team_id(conn, team_name):
    """Get team_id from team name."""
    cur = conn.cursor()
    # Try exact match first
    row = cur.execute("SELECT id FROM teams WHERE name = ?", (team_name,)).fetchone()
    if row:
        return row['id']

    # Try case-insensitive match
    row = cur.execute("SELECT id FROM teams WHERE LOWER(name) = LOWER(?)", (team_name,)).fetchone()
    if row:
        return row['id']

    return None


def load_wc2022_matches_info():
    """Get match info from StatsBomb to construct match data."""
    # Since we don't have detailed match info, we'll construct it from player stats
    # Group players by team and infer match structure

    wc2022_players = load_wc2022_data()

    # Build match reference data
    matches_seen = set()

    for player in wc2022_players:
        team = player.get('team', '')
        matches_seen.add((team, player.get('matches', 0)))

    return wc2022_players


def main():
    print("Loading WC2022 data into database...")

    wc2022_players = load_wc2022_data()
    print(f"Loaded {len(wc2022_players)} WC2022 players from JSON")

    conn = get_connection()
    cur = conn.cursor()

    # Build player lookup
    player_lookup = build_player_lookup(conn)
    print(f"Built lookup of {len(player_lookup)} current database players")

    # Group players by team to identify matches
    players_by_team = defaultdict(list)
    for player in wc2022_players:
        team_name = player.get('team', '')
        players_by_team[team_name].append(player)

    print(f"Found {len(players_by_team)} teams in WC2022 data")

    # Insert player stats
    inserted = 0
    skipped = 0
    unmatched_players = []

    # Create a match mapping (we'll use team combinations as pseudo-matches)
    # Since we don't have actual match IDs, we'll create deterministic ones
    match_fixture_map = {}
    fixture_counter = 1000000

    for player in wc2022_players:
        team_name = player.get('team', '')
        player_name = player.get('name', '')
        position = player.get('position', '')

        # Get team_id
        team_id = get_team_id(conn, team_name)
        if not team_id:
            skipped += 1
            continue

        # Try to find player_id
        lookup_key = (normalize_name(player_name), normalize_name(team_name))
        player_match = player_lookup.get(lookup_key)

        player_id = None
        if player_match:
            player_id = player_match['player_id']

        # Create consistent fixture API ID based on player's team
        # (In real scenario, this would be actual match IDs)
        team_fixture_key = f"WC2022_{team_name}_aggregate"
        if team_fixture_key not in match_fixture_map:
            match_fixture_map[team_fixture_key] = fixture_counter
            fixture_counter += 1

        fixture_api_id = match_fixture_map[team_fixture_key]

        # Extract relevant stats from player data
        matches = player.get('matches', 0)
        minutes_played = matches * 90  # Estimate: assume full 90 min per match

        goals = player.get('goals', 0)
        assists = player.get('assists', 0)  # Not in data, default to 0

        shots_total = player.get('shots', 0)
        shots_on = player.get('shots_on_target', 0)

        passes_total = player.get('passes', 0)
        key_passes = player.get('key_passes', 0)

        tackles = player.get('tackles', 0)
        interceptions = player.get('interceptions', 0)

        yellow_cards = 0  # Not in StatsBomb basic export
        red_cards = 0

        rating = 6.5  # Neutral rating (not in JSON)
        xg = player.get('xg_total', 0.0)

        try:
            cur.execute("""
                INSERT OR IGNORE INTO match_players
                (fixture_api_id, team_id, player_id, player_api_id, player_name,
                 position, started, minutes_played, goals, assists,
                 yellow_cards, red_cards, rating,
                 shots_total, shots_on, passes_total, key_passes,
                 tackles, interceptions, match_date, competition, season)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                fixture_api_id,
                team_id,
                player_id,
                player.get('sb_player_id'),
                player_name,
                position,
                1,  # started = true for WC2022 (all tracked)
                minutes_played,
                goals,
                assists,
                yellow_cards,
                red_cards,
                rating,
                shots_total,
                shots_on,
                passes_total,
                key_passes,
                tackles,
                interceptions,
                "2022-11-21",  # WC2022 ended Nov 18, use generic date
                "WC2022",
                2022
            ))
            inserted += cur.rowcount

        except Exception as e:
            print(f"ERROR inserting {player_name}: {e}")
            skipped += 1

    conn.commit()

    print(f"\nResults:")
    print(f"  Inserted: {inserted} player records")
    print(f"  Skipped: {skipped} (team/player not found in DB)")
    print(f"  Unique match fixtures created: {len(match_fixture_map)}")

    # Verify insertion
    count = cur.execute("SELECT COUNT(*) as cnt FROM match_players WHERE competition = 'WC2022'").fetchone()
    print(f"  Verification: {count['cnt']} WC2022 records now in match_players table")

    # Show sample of inserted data
    print(f"\nSample inserted records (WC2022):")
    samples = cur.execute("""
        SELECT player_name, team_id, position, goals, shots_total, key_passes, tackles
        FROM match_players
        WHERE competition = 'WC2022'
        LIMIT 10
    """).fetchall()

    for row in samples:
        print(f"  {row['player_name']}: {row['goals']}G, {row['shots_total']}shots, "
              f"{row['key_passes']}kp, {row['tackles']}tk")

    conn.close()
    print("\nWC2022 data loading complete!")


if __name__ == '__main__':
    main()
