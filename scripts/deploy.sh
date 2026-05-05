#!/bin/bash
# =============================================================================
# deploy.sh — Safe production deploy script for Dociva
# Usage: ~/deploy.sh
# =============================================================================
set -euo pipefail

DEPLOY_START=$(date +%s)
echo "══════════════════════════════════════"
echo " Dociva — Safe Deploy"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "══════════════════════════════════════"

cd ~/SaaS-PDF

# ── Pre-flight checks ────────────────────────────────────────────────────────
echo ""
echo "▶ Running pre-flight checks..."

# Check server secrets file
if [ ! -f /root/server-secrets.env ]; then
    echo "❌ /root/server-secrets.env not found!"
    echo "   Run: bash scripts/server-setup.sh"
    exit 1
fi

# Recreate override if missing (e.g., after docker compose down)
if [ ! -f docker-compose.override.yml ]; then
    echo "⚠️  docker-compose.override.yml missing — recreating..."
    cat > docker-compose.override.yml << 'OVERRIDE_EOF'
services:
  backend:
    env_file:
      - /root/server-secrets.env
    environment:
      - FLASK_ENV=production
  celery_worker:
    env_file:
      - /root/server-secrets.env
  celery_beat:
    env_file:
      - /root/server-secrets.env
OVERRIDE_EOF
fi

# Check redis.conf bind
if grep -q "^bind 127\.0\.0\.1" deploy/redis/redis.conf; then
    echo "⚠️  redis.conf has bind 127.0.0.1 — auto-fixing..."
    sed -i 's/^bind 127\.0\.0\.1.*/bind 0.0.0.0/' deploy/redis/redis.conf
fi

echo "✅ Pre-flight checks passed"

# ── Git: resolve conflicts and pull ─────────────────────────────────────────
echo ""
echo "▶ Updating code from repository..."

# Fix any lingering merge conflicts
if git status | grep -qE "needs merge|Unmerged paths|both modified"; then
    echo "⚠️  Merge conflict detected — resetting to HEAD"
    git merge --abort 2>/dev/null || true
    git checkout -- .
fi

# Stash any uncommitted local changes
if ! git diff --quiet HEAD 2>/dev/null; then
    STASH_MSG="auto-stash $(date +%Y%m%d-%H%M%S)"
    echo "⚠️  Stashing local changes: $STASH_MSG"
    git stash push -m "$STASH_MSG"
fi

# Pull latest
git fetch origin
git pull --ff-only origin main

echo "📋 Latest 3 commits:"
git log -3 --oneline --decorate

# ── Rebuild services ─────────────────────────────────────────────────────────
echo ""
echo "▶ Rebuilding services..."
docker compose up -d --build backend frontend celery_worker celery_beat

# ── Health check ─────────────────────────────────────────────────────────────
echo ""
echo "▶ Waiting for services to become healthy..."
sleep 15

echo ""
echo "════ Container Status ════"
docker ps --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "════ Health Check ════"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://dociva.io/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API /health: OK (200)"
else
    echo "⚠️  API /health returned: $HTTP_CODE"
    echo "   Check logs: docker logs saas-pdf-backend-1 --tail 30"
fi

# Check Redis connection from backend
REDIS_OK=$(docker exec saas-pdf-backend-1 python3 -c "
import redis, os, sys
try:
    r = redis.from_url(os.environ.get('REDIS_URL', 'redis://redis:6379/0'))
    r.ping()
    print('OK')
except Exception as e:
    print(f'FAIL: {e}')
    sys.exit(1)
" 2>/dev/null || echo "FAIL")

if [ "$REDIS_OK" = "OK" ]; then
    echo "✅ Redis connection: OK"
else
    echo "⚠️  Redis connection: $REDIS_OK"
    echo "   Check: grep '^bind' ~/SaaS-PDF/deploy/redis/redis.conf"
fi

DEPLOY_END=$(date +%s)
DEPLOY_TIME=$((DEPLOY_END - DEPLOY_START))

echo ""
echo "══════════════════════════════════════"
echo " ✅ Deploy completed in ${DEPLOY_TIME}s"
echo "══════════════════════════════════════"
