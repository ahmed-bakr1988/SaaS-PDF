#!/bin/bash
# deploy.sh — Production deployment script for Dociva
set -euo pipefail

echo "========================================="
echo "  Dociva Production Deployment"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed.${NC}"
    exit 1
fi
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed.${NC}"
    exit 1
fi

# Check .env
if [ ! -f ".env" ]; then
    echo -e "${RED}.env file not found! Copy .env.example and configure it.${NC}"
    exit 1
fi

read_env_value() {
    local key="$1"
    local fallback="${2:-}"
    local shell_value="${!key-}"
    local file_value

    file_value="$(grep -E "^${key}=" .env 2>/dev/null | tail -n 1 | cut -d= -f2- || true)"

    if [ -n "$shell_value" ]; then
        printf '%s' "$shell_value"
    elif [ -n "$file_value" ]; then
        printf '%s' "$file_value"
    else
        printf '%s' "$fallback"
    fi
}

normalize_bool() {
    printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

INDEXNOW_AUTO_SUBMIT_VALUE="$(normalize_bool "$(read_env_value INDEXNOW_AUTO_SUBMIT 1)")"
INDEXNOW_STRICT_VALUE="$(normalize_bool "$(read_env_value INDEXNOW_STRICT false)")"

echo -e "${YELLOW}1/8 — Pulling latest code...${NC}"
git pull origin main 2>/dev/null || echo "Not a git repo or no remote, skipping pull."

echo -e "${YELLOW}2/8 — Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}3/8 — Stopping old containers...${NC}"
docker compose -f docker-compose.prod.yml down --remove-orphans

echo -e "${YELLOW}4/8 — Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d

if [ "${SKIP_AI_RUNTIME_CHECKS:-0}" != "1" ]; then
    echo -e "${YELLOW}5/8 — Verifying AI runtime in backend + worker...${NC}"
    for service in backend celery_worker; do
        if ! docker compose -f docker-compose.prod.yml exec -T "$service" python - <<'PY'
import importlib.util
import os
import sys

issues = []
api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
if not api_key or api_key.startswith("replace-with-"):
    issues.append("OPENROUTER_API_KEY is missing or still set to a placeholder")
if importlib.util.find_spec("vtracer") is None:
    issues.append("vtracer is not installed in this container")

if issues:
    print("; ".join(issues))
    sys.exit(1)

print("AI runtime OK")
PY
        then
            echo -e "${RED}✗ AI runtime check failed in ${service}.${NC}"
            echo "  Fix the container env/dependencies, then redeploy backend and celery_worker."
            echo "  Do not redeploy the frontend alone when backend routes, Celery tasks, or AI dependencies changed."
            exit 1
        fi
    done
else
    echo -e "${YELLOW}5/8 — Skipping AI runtime checks (SKIP_AI_RUNTIME_CHECKS=1).${NC}"
fi

echo -e "${YELLOW}6/8 — Waiting for health check...${NC}"
sleep 10

# Health check
if curl -sf http://localhost/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Deployment successful! Service is healthy.${NC}"
else
    echo -e "${RED}✗ Health check failed. Check logs:${NC}"
    echo "  docker compose -f docker-compose.prod.yml logs backend"
    exit 1
fi

if [ "${INDEXNOW_AUTO_SUBMIT_VALUE:-1}" = "1" ] || [ "${INDEXNOW_AUTO_SUBMIT_VALUE:-true}" = "true" ]; then
    echo -e "${YELLOW}7/8 — Submitting URLs to IndexNow...${NC}"
    if docker compose -f docker-compose.prod.yml run --rm frontend_build_step node scripts/submit-indexnow.mjs; then
        echo -e "${GREEN}✓ IndexNow notification completed.${NC}"
    else
        if [ "$INDEXNOW_STRICT_VALUE" = "1" ] || [ "$INDEXNOW_STRICT_VALUE" = "true" ]; then
            echo -e "${RED}✗ IndexNow notification failed and INDEXNOW_STRICT is enabled.${NC}"
            exit 1
        fi

        echo -e "${YELLOW}! IndexNow notification failed; deployment will continue.${NC}"
    fi
else
    echo -e "${YELLOW}7/8 — Skipping IndexNow notification (INDEXNOW_AUTO_SUBMIT=0).${NC}"
fi

echo -e "${YELLOW}8/8 — Current containers:${NC}"
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo "  App:  http://localhost"
echo "  Logs: docker compose -f docker-compose.prod.yml logs -f"
