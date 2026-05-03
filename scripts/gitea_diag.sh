#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Gitea 500 Diagnostic Script
#  Run on server: bash gitea_diag.sh
#  Server: 178.104.57.123
# ═══════════════════════════════════════════════════════════════

BOLD='\033[1m'
RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[0;33m'
BLU='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "  ${GRN}✔${NC} $1"; }
fail() { echo -e "  ${RED}✘${NC} $1"; }
info() { echo -e "  ${BLU}ℹ${NC} $1"; }
warn() { echo -e "  ${YLW}⚠${NC} $1"; }
section() { echo -e "\n${BOLD}${BLU}══ $1 ══${NC}"; }

section "1. حالة حاويات Docker"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || fail "Docker غير متاح"

section "2. هل حاوية Gitea تعمل؟"
GITEA_STATUS=$(docker inspect --format='{{.State.Status}}' $(docker ps -q --filter name=gitea) 2>/dev/null)
if [ -z "$GITEA_STATUS" ]; then
  fail "حاوية Gitea غير موجودة أو لا تعمل!"
  echo ""
  echo "  الحاويات الموجودة:"
  docker ps -a --format "  {{.Names}} → {{.Status}}"
else
  info "حالة Gitea: $GITEA_STATUS"
  if [ "$GITEA_STATUS" = "running" ]; then
    ok "الحاوية تعمل"
  else
    fail "الحاوية ليست في حالة running"
  fi
fi

section "3. آخر سجلات Gitea (50 سطر)"
GITEA_ID=$(docker ps -q --filter name=gitea 2>/dev/null)
if [ -n "$GITEA_ID" ]; then
  docker logs "$GITEA_ID" --tail=50 2>&1
else
  GITEA_ID_ALL=$(docker ps -aq --filter name=gitea 2>/dev/null)
  if [ -n "$GITEA_ID_ALL" ]; then
    warn "الحاوية موجودة لكن متوقفة - آخر السجلات:"
    docker logs "$GITEA_ID_ALL" --tail=50 2>&1
  else
    fail "لا توجد حاوية Gitea بالإطلاق"
  fi
fi

section "4. اختبار الاتصال المباشر بـ Gitea (port 3000)"
GITEA_IP=$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -q --filter name=gitea) 2>/dev/null)
if [ -n "$GITEA_IP" ]; then
  info "IP الداخلي لـ Gitea: $GITEA_IP"
  HTTP_CODE=$(curl -s -o /tmp/gitea_response.html -w "%{http_code}" --max-time 10 "http://$GITEA_IP:3000" 2>/dev/null)
  info "HTTP Response Code من Gitea مباشرة: $HTTP_CODE"
  if [ "$HTTP_CODE" = "200" ]; then
    ok "Gitea يستجيب بشكل صحيح داخلياً"
  elif [ "$HTTP_CODE" = "500" ]; then
    fail "Gitea يعيد 500 حتى على الاتصال المباشر - المشكلة في التطبيق نفسه"
    echo ""
    echo "  أول 30 سطر من الاستجابة:"
    head -30 /tmp/gitea_response.html 2>/dev/null
  else
    warn "كود غير متوقع: $HTTP_CODE"
  fi
else
  fail "لا يمكن الحصول على IP الخاص بـ Gitea"
  # محاولة عبر Docker network
  info "محاولة عبر اسم الخدمة..."
  HTTP_CODE=$(curl -s -o /tmp/gitea_response.html -w "%{http_code}" --max-time 10 "http://localhost:3000" 2>/dev/null)
  info "HTTP Response Code على localhost:3000: $HTTP_CODE"
fi

section "5. اختبار Nginx → Gitea (عبر HTTPS)"
HTTP_CODE_HTTPS=$(curl -s -o /tmp/gitea_https.html -w "%{http_code}" --max-time 15 \
  -H "Host: git.dociva.io" "https://git.dociva.io" 2>/dev/null)
info "HTTP Code عبر Nginx (git.dociva.io): $HTTP_CODE_HTTPS"
if [ "$HTTP_CODE_HTTPS" = "200" ]; then
  ok "Nginx يمرر الطلب بنجاح"
else
  fail "مشكلة في Nginx → Gitea (كود: $HTTP_CODE_HTTPS)"
fi

section "6. ملفات بيانات Gitea (Volume)"
GITEA_VOL=$(docker inspect $(docker ps -aq --filter name=gitea) 2>/dev/null | \
  python3 -c "import sys,json; m=json.load(sys.stdin); [print(v['Source'],'→',v['Destination']) for c in m for v in c.get('Mounts',[])]" 2>/dev/null)
if [ -n "$GITEA_VOL" ]; then
  info "Volume مُثبتة:"
  echo "$GITEA_VOL"
else
  info "مسار Volume الافتراضي:"
  docker volume ls --filter name=gitea 2>/dev/null
fi

section "7. فحص إعدادات Gitea (app.ini)"
# البحث عن app.ini في مسارات شائعة
for path in \
  "/var/lib/docker/volumes/saas-pdf_gitea_data/_data/gitea/conf/app.ini" \
  "/var/lib/docker/volumes/saaspdf_gitea_data/_data/gitea/conf/app.ini" \
  "/opt/gitea/conf/app.ini"; do
  if [ -f "$path" ]; then
    ok "وجدنا app.ini في: $path"
    echo ""
    cat "$path"
    break
  fi
done

# محاولة عبر docker exec
GITEA_ID=$(docker ps -q --filter name=gitea 2>/dev/null)
if [ -n "$GITEA_ID" ]; then
  info "محتوى app.ini داخل الحاوية:"
  docker exec "$GITEA_ID" cat /data/gitea/conf/app.ini 2>/dev/null || \
  docker exec "$GITEA_ID" find / -name "app.ini" 2>/dev/null | head -5
fi

section "8. فحص قاعدة بيانات Gitea"
GITEA_ID=$(docker ps -q --filter name=gitea 2>/dev/null)
if [ -n "$GITEA_ID" ]; then
  info "نوع قاعدة البيانات المستخدمة:"
  docker exec "$GITEA_ID" cat /data/gitea/conf/app.ini 2>/dev/null | grep -A5 "\[database\]" || true
  
  info "فحص وجود SQLite:"
  docker exec "$GITEA_ID" ls -lh /data/gitea/*.db 2>/dev/null || info "لا يوجد SQLite أو المسار مختلف"
  
  info "اختبار الاتصال بـ PostgreSQL:"
  docker exec "$GITEA_ID" sh -c "PGPASSWORD=6x3PjV4ghRTQuZ3Q psql -h postgres -U dociva -d dociva -c '\l' 2>&1" || true
fi

section "9. متغيرات البيئة في Gitea"
GITEA_ID=$(docker ps -q --filter name=gitea 2>/dev/null)
if [ -n "$GITEA_ID" ]; then
  docker exec "$GITEA_ID" env | grep -E "^GITEA|^USER|^DB" 2>/dev/null | sort
fi

section "10. مساحة القرص والذاكرة"
echo "--- مساحة القرص ---"
df -h / /var/lib/docker 2>/dev/null | head -5
echo "--- الذاكرة ---"
free -h
echo "--- حمل النظام ---"
uptime

section "11. سجلات Nginx (أخطاء متعلقة بـ Gitea)"
NGINX_ID=$(docker ps -q --filter name=nginx 2>/dev/null)
if [ -n "$NGINX_ID" ]; then
  info "آخر 20 سطر من سجلات أخطاء Nginx:"
  docker logs "$NGINX_ID" --tail=20 2>&1 | grep -i "gitea\|git\|500\|error\|upstream" || \
  docker logs "$NGINX_ID" --tail=20 2>&1
fi

section "12. ملخص التشخيص"
echo ""
GITEA_ID=$(docker ps -q --filter name=gitea 2>/dev/null)
if [ -z "$GITEA_ID" ]; then
  fail "الحاوية لا تعمل ← الحل: docker compose -f docker-compose.prod.yml up -d gitea"
fi

HTTP_DIRECT=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
  "http://$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $GITEA_ID 2>/dev/null):3000" 2>/dev/null)
if [ "$HTTP_DIRECT" = "500" ]; then
  fail "الخطأ 500 قادم من Gitea نفسه - فحص الـ logs أعلاه للسبب الحقيقي"
elif [ "$HTTP_DIRECT" = "200" ]; then
  warn "Gitea يعمل داخلياً ← المشكلة ربما في Nginx أو SSL"
fi

echo ""
echo -e "${BOLD}انتهى التشخيص ✓${NC}"
