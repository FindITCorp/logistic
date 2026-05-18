#!/usr/bin/env python3
"""Find Vercel project across personal + team scopes and create .vercel/project.json"""
import subprocess, json, os, sys

token = os.environ.get('VERCEL_TOKEN', '')
if not token:
    print("ERROR: VERCEL_TOKEN not set — check GitHub secret")
    sys.exit(1)

print(f"Token prefix: {token[:12]}...")

def api(path):
    r = subprocess.run(
        ["curl", "-s", "-H", f"Authorization: Bearer {token}",
         f"https://api.vercel.com{path}"],
        capture_output=True, text=True, timeout=20)
    print(f"  GET {path} → {r.stdout[:120]}")
    try:
        return json.loads(r.stdout)
    except Exception as e:
        print(f"  WARN parse error: {e}")
        return {}

def write_output(key, val):
    print(f"OUTPUT {key}={val}")
    gho = os.environ.get('GITHUB_OUTPUT', '')
    if gho:
        with open(gho, "a") as f:
            f.write(f"{key}={val}\n")

def try_create_project_json(proj_id, org_id, name):
    os.makedirs(".vercel", exist_ok=True)
    with open(".vercel/project.json", "w") as f:
        json.dump({"projectId": proj_id, "orgId": org_id}, f)
    print(f"Created .vercel/project.json: project={name} id={proj_id} org={org_id}")
    write_output("project_name", name)
    write_output("project_id", proj_id)

# 1. Try direct lookup by name
print("=== Trying direct project lookup: findit-logistic ===")
direct = api("/v9/projects/findit-logistic")
if direct.get("id"):
    p = direct
    org_id = p.get("accountId", p.get("id", ""))
    try_create_project_json(p["id"], org_id, p["name"])
    sys.exit(0)

# 2. User info
print("=== Fetching user info ===")
user_data = api("/v2/user")
user = user_data.get("user", {})
uid = user.get("id", "")
print(f"User: {user.get('username', 'UNKNOWN')} | id={uid}")

# 3. Teams
print("=== Fetching teams ===")
teams_data = api("/v2/teams")
teams = teams_data.get("teams", [])
print(f"Teams: {[t.get('name') for t in teams]}")

# 4. Search personal + all teams
scopes = [(None, uid)]
for t in teams:
    scopes.append((t["id"], t["id"]))

found_id = found_org = found_name = None
for team_id, org_id in scopes:
    url = "/v9/projects?limit=100" + (f"&teamId={team_id}" if team_id else "")
    data = api(url)
    projects = data.get("projects", [])
    names = [p['name'] for p in projects]
    print(f"  teamId={team_id}: {names}")
    for p in projects:
        if "logistic" in p["name"].lower():
            found_id = p["id"]
            found_org = org_id or uid
            found_name = p["name"]
            break
    if found_id:
        break

# 5. Fallback: first project of any scope
if not found_id:
    print("=== No logistic project found — using first available ===")
    for team_id, org_id in scopes:
        url = "/v9/projects?limit=5" + (f"&teamId={team_id}" if team_id else "")
        projects = api(url).get("projects", [])
        if projects:
            found_id = projects[0]["id"]
            found_org = org_id or uid
            found_name = projects[0]["name"]
            print(f"Fallback: using {found_name}")
            break

if found_id:
    try_create_project_json(found_id, found_org, found_name)
else:
    print("ERROR: No Vercel project found in any scope — token may be invalid")
    sys.exit(1)
