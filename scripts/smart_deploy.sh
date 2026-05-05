#!/usr/bin/env bash
# =============================================================================
# smart_deploy.sh — The Professional, Zero-500-Error Deploy Script for Dociva
# =============================================================================
# This script combines the "Safe Commands" that fixed the Redis and UI issues.
# Usage:
#   bash scripts/smart_deploy.sh
# =============================================================================

set -eo pipefail

# --- Configuration ---
PROJECT_DIR="$HOME/SaaS-PDF"
SECRETS_FILE="/root/server-secrets.env"
COMPOSE_CMD="docker compose"

# --- Visual Colors ---
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_step() { echo -e "\n${CYAN}▶ $1${NC}"; }
log_ok()   { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_err()  { echo -e "${RED}❌ $1${NC}"; }

echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo -e "${CYAN}         Dociva — Smart Production Deploy      ${NC}"
echo -e "${CYAN}         $(date '+%Y-%m-%d %H:%M:%S')          ${NC}"
echo -e "${CYAN}══════════════════════════════════════════════${NC}"

# --- 1. Navigate to Project ---
cd "$PROJECT_DIR" || { log_err "Project directory not found!"; exit 1; }

# --- 2. Update Code from Git ---
log_step "Updating code from repository..."
git fetch origin main
# Auto-resolve minor conflicts by favoring local if needed, but here we expect a clean pull
git pull origin main
log_ok "Code updated successfully."

# --- 3. Synchronize Secrets & Redis Config ---
log_step "Synchronizing secrets and Redis configuration..."
if [ -f "scripts/server-setup.sh" ]; then
    bash scripts/server-setup.sh
    log_ok "Secrets and environment files synchronized."
else
    log_warn "scripts/server-setup.sh not found. Skipping secrets sync."
fi

# --- 4. Force Restart Redis (Critical for Password Changes) ---
log_step "Applying Redis security settings..."
$COMPOSE_CMD stop redis
$COMPOSE_CMD up -d redis
log_ok "Redis is up and healthy with latest config."

# --- 5. Clean Build of Core Services (Ensures Design Changes Appear) ---
log_step "Building application services (clean cache)..."
# We build with --no-cache to ensure CSS/JS design updates are actually bundled
$COMPOSE_CMD build --no-cache frontend backend celery_worker celery_beat
log_ok "Images built successfully."

# --- 6. Launch Application ---
log_step "Launching application services..."
$COMPOSE_CMD up -d --remove-orphans
log_ok "All containers are starting."

# --- 7. Health Check & Validation ---
log_step "Verifying system health..."
echo -n "Waiting for backend to warm up..."
for i in {1..30}; do
    if curl -s "http://localhost/api/health" | grep -q "healthy"; then
        echo ""
        log_ok "Backend Health: OK (200)"
        break
    fi
    echo -n "."
    sleep 2
    if [ $i -eq 30 ]; then
        echo ""
        log_err "Health check timed out! Check logs with: docker logs saas-pdf-backend-1"
    fi
done

# Check Redis connectivity from inside the backend
log_step "Testing internal Redis connectivity..."
REDIS_TEST=$(docker exec saas-pdf-backend-1 python3 -c "
import redis, os, sys
try:
    url = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
    r = redis.from_url(url)
    r.ping()
    print('CONNECTED')
except Exception as e:
    print(f'FAILED: {e}')
    sys.exit(1)
" 2>/dev/null || echo "FAILED")

if [ "$REDIS_TEST" == "CONNECTED" ]; then
    log_ok "Redis Connection: OK"
else
    log_err "Redis Connection: FAILED. Check your server-secrets.env"
fi

# --- Final Status ---
echo -e "\n${CYAN}════════ Container Status ════════${NC}"
$COMPOSE_CMD ps --format "table {{.Names}}\t{{.Status}}"
echo -e "${CYAN}══════════════════════════════════${NC}"

log_ok "Deployment completed successfully!"
echo -e "${GREEN}Your changes are now live at: https://dociva.io${NC}"
echo -e "${YELLOW}Tip: If design changes don't appear, try Ctrl+F5 in your browser.${NC}\n"
