#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/backup_and_pull.sh [branch] [backup-base]
# Defaults: branch=main, backup-base=/root/server-untracked-backup

BRANCH="${1:-main}"
BACKUP_BASE="${2:-/root/server-untracked-backup}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_BASE}-${TIMESTAMP}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not inside a git repository." >&2
  exit 1
fi

echo "Fetching origin/$BRANCH..."
git fetch origin "$BRANCH"

TMP_UNTRACKED=$(mktemp)
TMP_ORIGIN=$(mktemp)
TMP_CONFLICTS=$(mktemp)
trap 'rm -f "$TMP_UNTRACKED" "$TMP_ORIGIN" "$TMP_CONFLICTS"' EXIT

# List local untracked files
git ls-files --others --exclude-standard > "$TMP_UNTRACKED"
# List files in origin/branch
git ls-tree -r --name-only origin/"$BRANCH" > "$TMP_ORIGIN"

# Find intersection (files untracked locally that exist in origin)
grep -Fx -f "$TMP_UNTRACKED" "$TMP_ORIGIN" > "$TMP_CONFLICTS" || true

if [ ! -s "$TMP_CONFLICTS" ]; then
  echo "No untracked files conflict with origin/$BRANCH. Pulling..."
  git pull origin "$BRANCH"
  echo "Pull complete."
  exit 0
fi

echo "The following untracked files would be overwritten by merge:"
cat "$TMP_CONFLICTS"

echo "Backing up and moving these files to: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

while IFS= read -r f; do
  if [ -e "$f" ]; then
    mkdir -p "$(dirname "$BACKUP_DIR/$f")"
    mv -v -- "$f" "$BACKUP_DIR/$f"
  else
    echo "Warning: $f does not exist locally, skipping."
  fi
done < "$TMP_CONFLICTS"

echo "Files moved. Now running: git pull origin $BRANCH"
git pull origin "$BRANCH"

echo "Pull complete. Backup of moved files is at: $BACKUP_DIR"
echo "To restore files: rsync -av "$BACKUP_DIR/" ./ or mv them back individually."
