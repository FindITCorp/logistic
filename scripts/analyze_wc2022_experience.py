#!/usr/bin/env python3
"""
Analyze WC2022 player experience and identify veteran players in WC2026 squads.

This script:
1. Loads WC2022 player statistics from StatsBomb data
2. Cross-references with current 2026 squad data
3. Identifies players with World Cup experience
4. Provides detailed analysis by team and position
5. Shows comparison of veteran vs newcomer statistics
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
    return conn


def load_wc2022_data():
    """Load WC2022 player statistics from JSON file."""
    if not WC2022_DATA.exists():
        print(f"ERROR: {WC2022_DATA} not found")
        return None

    with open(WC2022_DATA) as f:
        return json.load(f)


def normalize_name(name):
    """Normalize player names for matching."""
    return name.lower().strip()


def find_wc2022_matches_in_squad(conn, wc2022_players):
    """Cross-reference WC2022 players with current squad data."""
    cur = conn.cursor()

    # Build a lookup of current squad players
    cur.execute("""
        SELECT p.id, p.name, p.team_id, t.name as team_name, p.position, p.caps, p.goals_as_nat
        FROM players p
        JOIN teams t ON p.team_id = t.id
    """)

    squad_players = {
        (normalize_name(row['name']), row['team_name'].lower()): {
            'player_id': row['id'],
            'name': row['name'],
            'team_id': row['team_id'],
            'team_name': row['team_name'],
            'position': row['position'],
            'caps': row['caps'],
            'goals_as_nat': row['goals_as_nat']
        }
        for row in cur.fetchall()
    }

    # Match WC2022 players with current squad
    matches = {}
    wc2022_by_team = defaultdict(list)

    for wc_player in wc2022_players:
        player_name = normalize_name(wc_player['name'])
        team_name = normalize_name(wc_player['team'])

        # Try exact match first
        key = (player_name, team_name)
        if key in squad_players:
            squad_info = squad_players[key]
            matches[wc_player['sb_player_id']] = {
                'wc2022_stats': wc_player,
                'squad_info': squad_info,
                'is_veteran': True
            }
            wc2022_by_team[wc_player['team']].append({
                'name': wc_player['name'],
                'position': wc_player.get('position', 'Unknown'),
                'matches_2022': wc_player.get('matches', 0),
                'goals_2022': wc_player.get('goals', 0),
                'xg_2022': wc_player.get('xg_total', 0),
                'key_passes_2022': wc_player.get('key_passes', 0),
                'progressive_carries_2022': wc_player.get('progressive_carries', 0),
                'passes_completed_2022': wc_player.get('passes_completed', 0),
                'tackles_2022': wc_player.get('tackles', 0),
                'interceptions_2022': wc_player.get('interceptions', 0),
                'squad_caps': squad_info['caps'],
                'squad_goals': squad_info['goals_as_nat']
            })

    return matches, wc2022_by_team


def generate_team_analysis(conn, veterans_by_team):
    """Generate analysis by team."""
    cur = conn.cursor()

    analysis = {}

    for team_name, veterans in veterans_by_team.items():
        # Get current squad size for this team
        cur.execute("""
            SELECT COUNT(*) as squad_size
            FROM squad_selections ss
            JOIN teams t ON ss.team_id = t.id
            WHERE t.name = ?
        """, (team_name,))
        squad_size_row = cur.fetchone()
        squad_size = squad_size_row['squad_size'] if squad_size_row else 0

        # Categorize veterans by position
        veterans_by_position = defaultdict(list)
        for vet in veterans:
            position = vet.get('position', 'Unknown').split()[0]  # Get first word of position
            veterans_by_position[position].append(vet)

        # Calculate aggregate statistics
        total_matches_2022 = sum(v['matches_2022'] for v in veterans)
        total_goals_2022 = sum(v['goals_2022'] for v in veterans)
        avg_xg_2022 = sum(v['xg_2022'] for v in veterans) / len(veterans) if veterans else 0

        analysis[team_name] = {
            'veteran_count': len(veterans),
            'squad_size': squad_size,
            'veteran_pct': (len(veterans) / squad_size * 100) if squad_size > 0 else 0,
            'veterans': veterans,
            'by_position': dict(veterans_by_position),
            'aggregate_stats': {
                'total_matches_2022': total_matches_2022,
                'total_goals_2022': total_goals_2022,
                'avg_xg_per_player': round(avg_xg_2022, 3),
                'avg_caps_per_veteran': round(sum(v['squad_caps'] for v in veterans) / len(veterans), 1) if veterans else 0,
                'avg_goals_per_veteran': round(sum(v['squad_goals'] for v in veterans) / len(veterans), 1) if veterans else 0,
            }
        }

    return analysis


def print_analysis(analysis):
    """Print formatted analysis report."""
    print("\n" + "=" * 100)
    print(" " * 30 + "WC2022 EXPERIENCE ANALYSIS FOR WC2026 SQUADS")
    print("=" * 100)

    # Summary statistics
    total_veterans = sum(a['veteran_count'] for a in analysis.values())
    total_squads = sum(a['squad_size'] for a in analysis.values())
    print(f"\nGLOBAL SUMMARY:")
    print(f"  Total veterans identified: {total_veterans}")
    print(f"  Total current squad players: {total_squads}")
    print(f"  Average veteran percentage: {(total_veterans/total_squads*100):.1f}%")

    print(f"\n{'-' * 100}")

    # Sort teams by veteran count (descending)
    sorted_teams = sorted(analysis.items(), key=lambda x: x[1]['veteran_count'], reverse=True)

    for rank, (team_name, data) in enumerate(sorted_teams, 1):
        if data['veteran_count'] == 0:
            continue

        print(f"\n[{rank}] {team_name.upper()} — {data['veteran_count']} veterans ({data['veteran_pct']:.1f}% of squad)")
        print(f"    Squad size: {data['squad_size']} | WC2022 stats: {data['aggregate_stats']['total_matches_2022']} matches, "
              f"{data['aggregate_stats']['total_goals_2022']} goals")

        # Show veterans by position
        if data['by_position']:
            print(f"    By position:")
            for position, vets in sorted(data['by_position'].items(), key=lambda x: len(x[1]), reverse=True):
                print(f"      {position}: {len(vets)} players")
                for vet in sorted(vets, key=lambda x: x['matches_2022'], reverse=True)[:3]:  # Top 3 per position
                    print(f"        • {vet['name']}: {vet['matches_2022']}m in 2022 | "
                          f"{vet['goals_2022']}G | xG={vet['xg_2022']:.2f} | "
                          f"Caps={vet['squad_caps']} in squad")

        # Show aggregate stats
        agg = data['aggregate_stats']
        print(f"    Aggregate: xG avg={agg['avg_xg_per_player']:.3f}/player | "
              f"caps={agg['avg_caps_per_veteran']:.1f}/veteran | "
              f"goals={agg['avg_goals_per_veteran']:.1f}/veteran")

    print(f"\n{'=' * 100}\n")


def export_to_json(analysis, output_path=None):
    """Export analysis to JSON file."""
    if output_path is None:
        output_path = Path(__file__).parent.parent / "data" / "processed" / "wc2022_experience_analysis.json"

    # Convert analysis to JSON-serializable format
    json_data = {}
    for team, data in analysis.items():
        json_data[team] = {
            'veteran_count': data['veteran_count'],
            'squad_size': data['squad_size'],
            'veteran_percentage': round(data['veteran_pct'], 2),
            'aggregate_stats': data['aggregate_stats'],
            'veterans': data['veterans'],
            'by_position': {pos: vets for pos, vets in data['by_position'].items()}
        }

    with open(output_path, 'w') as f:
        json.dump(json_data, f, indent=2)

    print(f"Analysis exported to {output_path}")
    return output_path


def main():
    print("Loading WC2022 data...")
    wc2022_players = load_wc2022_data()
    if not wc2022_players:
        return

    print(f"Loaded {len(wc2022_players)} WC2022 players from StatsBomb")

    print("Connecting to database...")
    conn = get_connection()

    print("Cross-referencing with current squads...")
    matches, wc2022_by_team = find_wc2022_matches_in_squad(conn, wc2022_players)

    print(f"Found {len(matches)} veterans across all teams")
    print(f"Teams represented: {len(wc2022_by_team)}")

    print("Generating team analysis...")
    analysis = generate_team_analysis(conn, wc2022_by_team)

    print_analysis(analysis)

    export_to_json(analysis)

    conn.close()
    print("Analysis complete!")


if __name__ == '__main__':
    main()
