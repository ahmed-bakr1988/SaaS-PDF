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

echo -e "${YELLOW}1/5 — Pulling latest code...${NC}"
git pull origin main 2>/dev/null || echo "Not a git repo or no remote, skipping pull."

echo -e "${YELLOW}2/5 — Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}3/5 — Stopping old containers...${NC}"
docker compose -f docker-compose.prod.yml down --remove-orphans

echo -e "${YELLOW}4/5 — Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d

echo -e "${YELLOW}5/5 — Waiting for health check...${NC}"
sleep 10

# Health check
if curl -sf http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Deployment successful! Service is healthy.${NC}"
else
    echo -e "${RED}✗ Health check failed. Check logs:${NC}"
    echo "  docker compose -f docker-compose.prod.yml logs backend"
    exit 1
fi

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo "  App:  http://localhost"
echo "  Logs: docker compose -f docker-compose.prod.yml logs -f"
