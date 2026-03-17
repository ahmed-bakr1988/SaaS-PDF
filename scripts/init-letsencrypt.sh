#!/bin/bash
# ────────────────────────────────────────────────────────────
# init-letsencrypt.sh
# Bootstrap Let's Encrypt certificates for dociva.io
#
# This script solves the chicken-and-egg problem:
#   Nginx needs SSL certs to start on 443,
#   but Certbot needs Nginx running on 80 to verify the domain.
#
# Solution: create a temporary self-signed cert → start Nginx →
#           obtain the real cert → reload Nginx.
#
# Usage:  chmod +x scripts/init-letsencrypt.sh
#         sudo ./scripts/init-letsencrypt.sh
# ────────────────────────────────────────────────────────────

set -euo pipefail

DOMAINS=(dociva.io www.dociva.io)
DATA_PATH="./certbot"
EMAIL="admin@dociva.io"          # ← replace with your real email
RSA_KEY_SIZE=4096
STAGING=0                        # Set to 1 to test against staging (no rate limits)

# ── colour helpers ──
info()  { echo -e "\n\033[1;34m▶ $*\033[0m"; }
ok()    { echo -e "\033[1;32m✔ $*\033[0m"; }
fail()  { echo -e "\033[1;31m✖ $*\033[0m"; exit 1; }

# ── Pre-flight checks ──
command -v docker > /dev/null 2>&1 || fail "docker is not installed"
command -v docker compose > /dev/null 2>&1 && COMPOSE="docker compose" || COMPOSE="docker-compose"

# ── Step 1: Create required directories ──
info "Creating certbot directories …"
mkdir -p "$DATA_PATH/conf" "$DATA_PATH/www"
ok "Directories ready"

# ── Step 2: Download recommended TLS parameters ──
if [ ! -e "$DATA_PATH/conf/options-ssl-nginx.conf" ]; then
  info "Downloading recommended TLS parameters …"
  curl -sSf https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o "$DATA_PATH/conf/options-ssl-nginx.conf"
  curl -sSf https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
    -o "$DATA_PATH/conf/ssl-dhparams.pem"
  ok "TLS parameters saved"
fi

# ── Step 3: Create temporary self-signed certificate ──
LIVE_DIR="$DATA_PATH/conf/live/dociva.io"
if [ ! -e "$LIVE_DIR/fullchain.pem" ]; then
  info "Creating temporary self-signed certificate …"
  mkdir -p "$LIVE_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$LIVE_DIR/privkey.pem" \
    -out "$LIVE_DIR/fullchain.pem" \
    -subj "/CN=dociva.io" 2>/dev/null
  ok "Temporary certificate created"
fi

# ── Step 4: Start Nginx (uses the temp cert) ──
info "Starting Nginx …"
$COMPOSE up -d nginx
ok "Nginx is running"

# ── Step 5: Remove the temporary certificate ──
info "Removing temporary certificate …"
rm -rf "$LIVE_DIR"
ok "Temporary certificate removed"

# ── Step 6: Request real certificate from Let's Encrypt ──
info "Requesting Let's Encrypt certificate …"

DOMAIN_ARGS=""
for d in "${DOMAINS[@]}"; do
  DOMAIN_ARGS="$DOMAIN_ARGS -d $d"
done

STAGING_ARG=""
if [ "$STAGING" -eq 1 ]; then
  STAGING_ARG="--staging"
fi

$COMPOSE run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  $DOMAIN_ARGS \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  $STAGING_ARG

ok "Certificate obtained successfully"

# ── Step 7: Reload Nginx with the real certificate ──
info "Reloading Nginx …"
$COMPOSE exec nginx nginx -s reload
ok "Nginx reloaded with Let's Encrypt certificate"

echo ""
ok "HTTPS is now active for ${DOMAINS[*]}"
echo "   Test: curl -I https://dociva.io"
