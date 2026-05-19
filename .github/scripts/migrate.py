#!/usr/bin/env python3
"""
FINDIT Logistic — Supabase Migration Runner
Uses the Supabase Management API to run SQL migrations via HTTPS.
This bypasses the database IP allowlist entirely.

Required environment variables:
  SUPABASE_ACCESS_TOKEN  — Personal Access Token from supabase.com/dashboard/account/tokens
  PROJECT_ID             — Supabase project reference ID
  MGMT_API               — Supabase Management API base URL
  DRY_RUN                — 'true' to print SQL without executing (default: 'false')
  MIGRATIONS_DIR         — Directory containing .sql migration files (default: supabase/migrations)
"""

import os
import sys
import json
import glob
import hashlib
from urllib import request, error


# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_ID = os.environ.get("PROJECT_ID", "fvefwnojcqbdkcmfngnu")
MGMT_API = os.environ.get("MGMT_API", "https://api.supabase.com/v1")
PAT = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"
MIGRATIONS_DIR = os.environ.get("MIGRATIONS_DIR", "supabase/migrations")
GITHUB_STEP_SUMMARY = os.environ.get("GITHUB_STEP_SUMMARY", "")


# ── Helper: run SQL via Management API ────────────────────────────────────────
def run_sql(sql: str, label: str = "query") -> tuple[bool, object]:
    """Execute SQL via Supabase Management API /database/query endpoint.
    Uses curl subprocess to avoid Cloudflare's Python-urllib UA block.
    """
    import subprocess, tempfile, os as _os
    payload = json.dumps({"query": sql})

    result = subprocess.run(
        [
            "curl", "-s",
            "--max-time", "60",
            "-X", "POST",
            f"{MGMT_API}/projects/{PROJECT_ID}/database/query",
            "-H", f"Authorization: Bearer {PAT}",
            "-H", "Content-Type: application/json",
            "-d", payload,
        ],
        capture_output=True,
        text=True,
        timeout=65,
    )

    if result.returncode != 0:
        return False, f"curl error {result.returncode}: {result.stderr}"

    body = result.stdout.strip()
    try:
        parsed = json.loads(body)
        # Supabase returns an error object with 'message' on failure
        if isinstance(parsed, dict) and "message" in parsed:
            return False, f"API error: {parsed.get('message', body)}"
        return True, parsed
    except json.JSONDecodeError:
        if body.startswith("error code:"):
            return False, f"Cloudflare/CDN block: {body}"
        return True, body


def write_summary(text: str) -> None:
    if GITHUB_STEP_SUMMARY:
        with open(GITHUB_STEP_SUMMARY, "a") as f:
            f.write(text + "\n")


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> int:
    if not PAT:
        print("ERROR: SUPABASE_ACCESS_TOKEN is not set.")
        print("Add a personal access token secret at:")
        print("  https://github.com/FindITCorp/logistic/settings/secrets/actions")
        print("  Get a PAT from: https://supabase.com/dashboard/account/tokens")
        return 1

    # Verify API access
    print("Verifying Supabase Management API access...")
    ok, result = run_sql("SELECT current_database() AS db, now() AS ts;", "verify")
    if not ok:
        print(f"ERROR: Cannot query database. {result}")
        print("Ensure SUPABASE_ACCESS_TOKEN is a valid PAT that owns this project.")
        return 1
    if isinstance(result, list) and result:
        print(f"Connected: db={result[0].get('db')}")

    print(f"\n=== FINDIT Logistic — Migration Runner ===")
    print(f"Project: {PROJECT_ID}")
    print(f"Dry run: {DRY_RUN}")
    print()

    # Create tracking table
    if not DRY_RUN:
        ok, result = run_sql(
            """
            CREATE TABLE IF NOT EXISTS _migrations (
                id          serial PRIMARY KEY,
                filename    text UNIQUE NOT NULL,
                applied_at  timestamptz NOT NULL DEFAULT now(),
                checksum    text
            );
            """,
            "create_migrations_table",
        )
        if not ok:
            print(f"ERROR creating _migrations table: {result}")
            return 1
        print("Migrations tracking table ready.")

    # Get migration files in order
    files = sorted(glob.glob(f"{MIGRATIONS_DIR}/*.sql"))
    if not files:
        print(f"No .sql files found in {MIGRATIONS_DIR}/")
        return 0

    success = skipped = failed = 0

    for filepath in files:
        basename = os.path.basename(filepath)
        with open(filepath, "r", encoding="utf-8") as f:
            sql_content = f.read()
        checksum = hashlib.sha256(sql_content.encode()).hexdigest()

        # Check if already applied
        if not DRY_RUN:
            safe_name = basename.replace("'", "''")
            ok, result = run_sql(
                f"SELECT COUNT(*) AS cnt FROM _migrations WHERE filename = '{safe_name}';",
                f"check_{basename}",
            )
            if ok and isinstance(result, list) and result:
                count = int(result[0].get("cnt", 0))
                if count > 0:
                    print(f"  SKIP  {basename} (already applied)")
                    skipped += 1
                    continue

        print(f"  RUN   {basename}")

        if DRY_RUN:
            print("--- DRY RUN: would execute ---")
            preview = sql_content[:300] + ("..." if len(sql_content) > 300 else "")
            print(preview)
            print("------------------------------")
            success += 1
        else:
            ok, result = run_sql(sql_content, basename)
            safe_name = basename.replace("'", "''")
            if ok:
                run_sql(
                    f"INSERT INTO _migrations (filename, checksum) VALUES ('{safe_name}', '{checksum}') ON CONFLICT (filename) DO NOTHING;",
                    f"record_{basename}",
                )
                print(f"  OK    {basename}")
                success += 1
            else:
                err_str = str(result)
                # PG error codes for "already exists" — treat as already applied
                already_exists = any(code in err_str for code in [
                    "42710",  # duplicate_object (type/enum already exists)
                    "42P07",  # duplicate_table (relation already exists)
                    "42701",  # duplicate_column
                    "42723",  # duplicate_function
                    "already exists",
                ])
                if already_exists:
                    run_sql(
                        f"INSERT INTO _migrations (filename, checksum) VALUES ('{safe_name}', '{checksum}') ON CONFLICT (filename) DO NOTHING;",
                        f"record_{basename}",
                    )
                    print(f"  OK    {basename} (objects already existed — recorded as applied)")
                    success += 1
                else:
                    print(f"  FAIL  {basename}: {result}")
                    failed += 1

    print()
    print("=== Migration Summary ===")
    print(f"  Applied : {success}")
    print(f"  Skipped : {skipped}")
    print(f"  Failed  : {failed}")

    write_summary(
        f"## Migration Results\n"
        f"- Applied: {success}\n"
        f"- Skipped: {skipped}\n"
        f"- Failed: {failed}\n"
    )

    if failed > 0:
        print(f"\nERROR: {failed} migration(s) failed!")
        return 1

    print("\nAll migrations completed successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
