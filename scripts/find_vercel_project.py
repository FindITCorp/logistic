#!/usr/bin/env python3
"""Find Vercel project across personal + team scopes and create .vercel/project.json"""
import subprocess, json, os, sys

token = os.environ.get('VERCEL_TOKEN', '')
if not token:
    print("ERROR: VERCEL_TOKEN not set")
    sys.exit(1)

def api(path):
    r = subprocess.run(
        ["curl", "-s", "-H", f"Authorization: Bearer {token}",
         f"https://api.vercel.com{path}"],
        capture_output=True, text=True, timeout=15)
    try:
        return json.loads(r.stdout)
    except Exception as e:
        print(f"WARN: parse error for {path}: {r.stdout[:300]} — {e}")
        return {}

def write_output(key, val):
    print(f"{key}={val}")
    gho = os.environ.get('GITHUB_OUTPUT', '')
    if gho:
        with open(gho, "a") as f:
            f.write(f"{key}={val}\n")

# User info
user_data = api("/v2/user")
user = user_data.get("user", {})
uid = user.get("id", "")
print(f"User: {user.get('username', 'UNKNOWN')} | id={uid}")

# Teams
teams_data = api("/v2/teams")
teams = teams_data.get("teams", [])
print(f"Teams: {[t.get('name') for t in teams]}")

# Search personal + all teams
scopes = [(None, uid)]
for t in teams:
    scopes.append((t["id"], t["id"]))

found_id = found_org = found_name = None
for team_id, org_id in scopes:
    url = "/v9/projects?limit=20" + (f"&teamId={team_id}" if team_id else "")
    data = api(url)
    projects = data.get("projects", [])
    print(f"  scope teamId={team_id}: {[p['name'] for p in projects]}")
    for p in projects:
        if "logistic" in p["name"].lower():
            found_id = p["id"]
            found_org = org_id
            found_name = p["name"]
            break
    if found_id:
        break

if not found_id:
    # fallback: first project of any scope
    for team_id, org_id in scopes:
        url = "/v9/projects?limit=5" + (f"&teamId={team_id}" if team_id else "")
        projects = api(url).get("projects", [])
        if projects:
            found_id = projects[0]["id"]
            found_org = org_id
            found_name = projects[0]["name"]
            break

if found_id:
    print(f"Selected: {found_name} | id={found_id} | org={found_org}")
    os.makedirs(".vercel", exist_ok=True)
    with open(".vercel/project.json", "w") as f:
        json.dump({"projectId": found_id, "orgId": found_org}, f)
    print("Created .vercel/project.json")
    write_output("project_name", found_name)
    write_output("project_id", found_id)
else:
    print("ERROR: No Vercel project found in any scope")
    sys.exit(1)
