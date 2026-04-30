#!/usr/bin/env bash
set -euo pipefail

# diag_nginx_tls.sh
# فحص سريع لإن وجود شهادات Let's Encrypt أو إنشاء شهادة self-signed
# ويقوم بربطها داخل مجلد المشروع (./certbot/conf) ثم يعيد تشغيل خدمة nginx

DOMAIN="dociva.io"
PROJECT_CERT_DIR="$(pwd)/certbot/conf/live/${DOMAIN}"
HOST_LETSENCRYPT_DIR="/etc/letsencrypt/live/${DOMAIN}"
SELF_CERT_DIR="/etc/ssl/${DOMAIN}"
NGINX_SERVICE="nginx"

echo "[diag] domain=${DOMAIN}"
echo "[diag] project cert dir=${PROJECT_CERT_DIR}"

if [ -f "${PROJECT_CERT_DIR}/fullchain.pem" ] && [ -f "${PROJECT_CERT_DIR}/privkey.pem" ]; then
  echo "[ok] Found project certs at ${PROJECT_CERT_DIR}"
  CERT_SRC="${PROJECT_CERT_DIR}"
elif [ -f "${HOST_LETSENCRYPT_DIR}/fullchain.pem" ] && [ -f "${HOST_LETSENCRYPT_DIR}/privkey.pem" ]; then
  echo "[info] Found host /etc/letsencrypt certs. Creating symlink into project..."
  sudo mkdir -p "$(pwd)/certbot/conf/live"
  sudo mkdir -p "$(pwd)/certbot/conf/archive"
  sudo ln -sf "${HOST_LETSENCRYPT_DIR}" "$(pwd)/certbot/conf/live/${DOMAIN}"
  CERT_SRC="${HOST_LETSENCRYPT_DIR}"
else
  echo "[warn] No Let's Encrypt certs found. Generating self-signed certs (for dev only)."
  sudo mkdir -p "${SELF_CERT_DIR}"
  sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "${SELF_CERT_DIR}/${DOMAIN}.key" \
    -out "${SELF_CERT_DIR}/${DOMAIN}.crt" \
    -subj "/CN=${DOMAIN}"

  mkdir -p "$(pwd)/certbot/conf/live/${DOMAIN}"
  sudo cp "${SELF_CERT_DIR}/${DOMAIN}.crt" "$(pwd)/certbot/conf/live/${DOMAIN}/fullchain.pem"
  sudo cp "${SELF_CERT_DIR}/${DOMAIN}.key" "$(pwd)/certbot/conf/live/${DOMAIN}/privkey.pem"
  CERT_SRC="$(pwd)/certbot/conf/live/${DOMAIN}"
fi

echo "[diag] Using certs from: ${CERT_SRC}"

echo "[diag] Restarting nginx service in compose..."
if command -v docker-compose >/dev/null 2>&1; then
  docker-compose restart "${NGINX_SERVICE}" >/dev/null 2>&1 || docker-compose up -d "${NGINX_SERVICE}"
else
  docker compose restart "${NGINX_SERVICE}" >/dev/null 2>&1 || docker compose up -d "${NGINX_SERVICE}"
fi

echo "[done] Restart issued. Check logs:"
echo "  docker logs ${NGINX_SERVICE} --tail 100"
echo "Verify HTTPS (accepting self-signed with -k):"
echo "  curl -I -k https://${DOMAIN}"
