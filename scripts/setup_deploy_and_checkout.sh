#!/usr/bin/env bash
set -euo pipefail

# setup_deploy_and_checkout.sh
# Usage:
#   GITHUB_API_TOKEN=ghp_xxx ./scripts/setup_deploy_and_checkout.sh <commit> [deploy-key-path] [backup-base]
# Example:
#   GITHUB_API_TOKEN=... ./scripts/setup_deploy_and_checkout.sh 6e8cf6f83ab6bf596c9db6fa30069a58819f068f /root/.ssh/github_deploy_key /root/server-untracked-backup

COMMIT="${1:-6e8cf6f83ab6bf596c9db6fa30069a58819f068f}"
KEY_PATH="${2:-/root/.ssh/github_deploy_key}"
BACKUP_BASE="${3:-/root/server-untracked-backup}"
BRANCH="${4:-main}"
GITHUB_REPO="aborayan2022/SaaS-PDF"
GITHUB_API_TOKEN="${GITHUB_API_TOKEN:-}"
RUN_LOAD_TEST="${RUN_LOAD_TEST:-false}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:5000/api/health}"

echo "Starting deploy helper: commit=$COMMIT key=$KEY_PATH backup=$BACKUP_BASE"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: please run this script from inside the repository root." >&2
  exit 1
fi

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

# 1) Generate deploy key if missing
if [ ! -f "$KEY_PATH" ]; then
  echo "Generating SSH deploy key at $KEY_PATH"
  mkdir -p "$(dirname "$KEY_PATH")"
  ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "deploy-$(hostname)-$(date +%Y%m%d%H%M%S)"
  chmod 600 "$KEY_PATH"
  chmod 644 "${KEY_PATH}.pub"
else
  echo "Deploy key already exists at $KEY_PATH"
fi

echo
echo "----- PUBLIC KEY (add this to your GitHub repo Settings → Deploy keys) -----"
cat "${KEY_PATH}.pub"
echo

# 2) Optionally add the key to GitHub via API if token provided
if [ -n "$GITHUB_API_TOKEN" ]; then
  echo "Attempting to add deploy key to GitHub via API..."
  PUBKEY=$(cat "${KEY_PATH}.pub")
  TITLE="deploy-$(hostname)-$(date +%Y%m%d%H%M%S)"

  # Create JSON payload safely
  PAYLOAD=$(printf '{"title":"%s","key":"%s","read_only":false}' "$TITLE" "$PUBKEY")

  HTTP_CODE=$(curl -s -o /tmp/_gh_deploy_resp.json -w "%{http_code}" \
    -X POST "https://api.github.com/repos/${GITHUB_REPO}/keys" \
    -H "Authorization: token ${GITHUB_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

  if [ "$HTTP_CODE" = "201" ]; then
    echo "Deploy key added to repo ${GITHUB_REPO}."
  else
    echo "GitHub API returned $HTTP_CODE. Response:" 
    cat /tmp/_gh_deploy_resp.json || true
    echo "If the response indicates 'key is already in use' or similar, you can ignore. Otherwise add the public key manually in the repository settings."
  fi
  rm -f /tmp/_gh_deploy_resp.json
fi

# 3) Ensure ssh config uses this key for github.com
SSH_CONFIG="/root/.ssh/config"
mkdir -p /root/.ssh
chmod 700 /root/.ssh
if ! grep -q "Host github.com" "$SSH_CONFIG" 2>/dev/null; then
  echo "Adding SSH config entry for github.com -> identityfile $KEY_PATH"
  cat >> "$SSH_CONFIG" <<EOF
Host github.com
  HostName github.com
  User git
  IdentityFile $KEY_PATH
  IdentitiesOnly yes
EOF
  chmod 600 "$SSH_CONFIG"
else
  echo "Note: $SSH_CONFIG already contains a github.com entry. Ensure it points to $KEY_PATH if you want to use this key."
fi

# 4) Set origin to SSH URL (if currently HTTPS)
ORIGIN_URL=$(git remote get-url origin || true)
if [ -z "$ORIGIN_URL" ]; then
  echo "No origin remote detected. Please add origin git@github.com:${GITHUB_REPO}.git and re-run." >&2
else
  if echo "$ORIGIN_URL" | grep -q "^https://github.com/"; then
    echo "Changing origin from HTTPS to SSH"
    git remote set-url origin git@github.com:${GITHUB_REPO}.git
  else
    echo "Origin is: $ORIGIN_URL"
  fi
fi

# 5) Move conflicting untracked files (use backup script if present)
if [ -f "./scripts/backup_and_pull.sh" ]; then
  echo "Using scripts/backup_and_pull.sh to back up conflicting untracked files and pull."
  chmod +x ./scripts/backup_and_pull.sh
  ./scripts/backup_and_pull.sh "$BRANCH" "$BACKUP_BASE"
else
  echo "No backup script found. Doing minimal safe backup of untracked files that exist in origin/branch."
  TMP_UNTRACKED=$(mktemp)
  TMP_ORIGIN=$(mktemp)
  TMP_CONFLICTS=$(mktemp)
  git ls-files --others --exclude-standard > "$TMP_UNTRACKED"
  git fetch origin "$BRANCH" --quiet || true
  git ls-tree -r --name-only origin/"$BRANCH" > "$TMP_ORIGIN" 2>/dev/null || true
  grep -Fx -f "$TMP_UNTRACKED" "$TMP_ORIGIN" > "$TMP_CONFLICTS" || true
  if [ -s "$TMP_CONFLICTS" ]; then
    echo "The following untracked local files conflict with origin/$BRANCH:" 
    cat "$TMP_CONFLICTS"
    TS=$(date +%Y%m%d%H%M%S)
    BACKUP_DIR="${BACKUP_BASE}-${TS}"
    mkdir -p "$BACKUP_DIR"
    while IFS= read -r f; do
      if [ -e "$f" ]; then
        mkdir -p "$(dirname "$BACKUP_DIR/$f")"
        mv -v -- "$f" "$BACKUP_DIR/$f"
      fi
    done < "$TMP_CONFLICTS"
    echo "Files moved to $BACKUP_DIR"
  else
    echo "No conflicting untracked files found. Proceeding to pull."
  fi
  rm -f "$TMP_UNTRACKED" "$TMP_ORIGIN" "$TMP_CONFLICTS"
  git pull origin "$BRANCH" || true
fi

# 6) Fetch and checkout the requested commit
echo "Fetching all remotes and tags"
git fetch --all --tags --prune
if git rev-parse --verify "$COMMIT" >/dev/null 2>&1; then
  echo "Commit $COMMIT exists locally. Checking out (detached HEAD)."
  git checkout -f "$COMMIT"
else
  echo "Commit $COMMIT not present locally. Attempting to fetch from origin."
  git fetch origin "$COMMIT" --depth=1 || true
  if git rev-parse --verify "$COMMIT" >/dev/null 2>&1; then
    git checkout -f "$COMMIT"
  else
    echo "Failed to find commit $COMMIT after fetch. Exiting." >&2
    exit 1
  fi
fi

# Create/update lightweight branch pointer for convenience
BRNAME="deployed-${COMMIT:0:8}"
echo "Updating branch pointer $BRNAME -> $COMMIT"
git branch -f "$BRNAME" "$COMMIT" || true

# 7) Restart services (docker-compose aware)
if command -v docker >/dev/null 2>&1; then
  echo "Restarting docker compose services (up -d --build)"
  if docker compose version >/dev/null 2>&1; then
    docker compose up -d --build --remove-orphans
    docker compose ps --all
  elif docker-compose version >/dev/null 2>&1; then
    docker-compose up -d --build --remove-orphans
    docker-compose ps --all
  else
    echo "Docker CLI present but unable to run compose. Please restart services manually." >&2
  fi
else
  echo "Docker not found. If you're not using docker, restart your service manager (systemd, supervisor, etc.) as needed." >&2
fi

# 8) Simple health check
echo "Waiting 6s for services to become ready..."
sleep 6
if command -v curl >/dev/null 2>&1; then
  echo "Health check: $HEALTH_URL"
  if curl -sS -f "$HEALTH_URL" -o /tmp/_health.json; then
    echo "Health OK:"
    cat /tmp/_health.json
  else
    echo "Health endpoint failed or returned error. Check container logs."
  fi
fi

# 9) Optional quick load test (disabled by default)
if [ "$RUN_LOAD_TEST" = "true" ]; then
  echo "Starting quick load test (1000 requests, concurrency 50) against $HEALTH_URL"
  if command -v hey >/dev/null 2>&1; then
    hey -n 1000 -c 50 "$HEALTH_URL"
  elif command -v ab >/dev/null 2>&1; then
    ab -n 1000 -c 50 "$HEALTH_URL"
  else
    echo "Load-testing tools not installed. Install 'hey' or 'ab' and re-run with RUN_LOAD_TEST=true to enable." >&2
  fi
fi

echo "Done. If you added the public key manually in GitHub, re-run the script (or run ./scripts/backup_and_pull.sh and then checkout the commit) if needed." 
