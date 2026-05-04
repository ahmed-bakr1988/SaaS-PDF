#!/usr/bin/env bash
# =============================================================================
# smart_deploy.sh — سكريبت النشر الذكي لـ Dociva
# =============================================================================
# يحل مشكلة "Internal Server Error" التي تحدث عند استخدام docker compose down
# عن طريق إعادة تشغيل الخدمات بشكل متدرج دون إيقاف قاعدة البيانات أو Redis
#
# الاستخدام:
#   chmod +x scripts/smart_deploy.sh
#   ./scripts/smart_deploy.sh           # نشر عادي (بدون --build)
#   ./scripts/smart_deploy.sh --build   # إعادة بناء الصور أيضاً
#   ./scripts/smart_deploy.sh --full    # إعادة تشغيل كامل (مثل down && up)
# =============================================================================

set -euo pipefail

# --- الألوان ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

COMPOSE="docker compose -f docker-compose.prod.yml"
BUILD_FLAG=""
FULL_RESTART=false

# --- قراءة المعاملات ---
for arg in "$@"; do
    case "$arg" in
        --build) BUILD_FLAG="--build" ;;
        --full)  FULL_RESTART=true ;;
    esac
done

log_step() { echo -e "\n${CYAN}▶ $1${NC}"; }
log_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
log_err()  { echo -e "${RED}✗ $1${NC}"; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Dociva Smart Deploy — بدون 500 Errors   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"

# =============================================================================
# 1. سحب آخر الكود من Git
# =============================================================================
log_step "1/7 — سحب آخر التعديلات من Git..."
git pull origin main
log_ok "تم سحب الكود بنجاح"

# =============================================================================
# 2. تحقق من ملف .env
# =============================================================================
log_step "2/7 — التحقق من ملف .env..."
if [ ! -f ".env" ]; then
    log_err ".env غير موجود! انسخ .env.example وعدّله."
    exit 1
fi
log_ok "ملف .env موجود"

# =============================================================================
# 3. تشغيل قاعدة البيانات و Redis أولاً (إذا لم تكن تعمل)
# =============================================================================
log_step "3/7 — تشغيل قاعدة البيانات وRedis أولاً..."

if [ "$FULL_RESTART" = true ]; then
    log_warn "وضع الإعادة الكاملة: إيقاف كل الخدمات..."
    $COMPOSE down --remove-orphans
    log_warn "انتظار 3 ثواني للتأكد من التوقف..."
    sleep 3
fi

# تشغيل postgres وredis أولاً فقط
$COMPOSE up -d $BUILD_FLAG postgres redis
log_ok "تم تشغيل postgres و redis"

# =============================================================================
# 4. انتظار حتى تصبح قاعدة البيانات جاهزة تماماً
# =============================================================================
log_step "4/7 — انتظار جاهزية قاعدة البيانات..."

MAX_WAIT=60
WAITED=0
until $COMPOSE exec -T postgres pg_isready -U "${POSTGRES_USER:-dociva}" -d "${POSTGRES_DB:-dociva}" > /dev/null 2>&1; do
    if [ $WAITED -ge $MAX_WAIT ]; then
        log_err "انتهت مهلة انتظار قاعدة البيانات ($MAX_WAIT ثانية)"
        $COMPOSE logs postgres | tail -20
        exit 1
    fi
    echo -n "."
    sleep 2
    WAITED=$((WAITED + 2))
done
echo ""
log_ok "قاعدة البيانات جاهزة! (انتظرت ${WAITED} ثانية)"

# انتظار Redis
until $COMPOSE exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo ""
log_ok "Redis جاهز!"

# =============================================================================
# 5. بناء وإعادة تشغيل خدمات التطبيق فقط (بدون المساس بالـ DB)
# =============================================================================
log_step "5/7 — تحديث خدمات التطبيق..."

# بناء الصور إذا طُلب ذلك
if [ -n "$BUILD_FLAG" ]; then
    log_warn "إعادة بناء صور backend و celery و frontend..."
    $COMPOSE build backend celery_worker celery_beat frontend_build_step
    log_ok "تم بناء الصور"
fi

# إعادة تشغيل خدمات التطبيق فقط (ليس postgres وredis)
$COMPOSE up -d --remove-orphans \
    backend \
    celery_worker \
    celery_beat \
    frontend_build_step

log_ok "تم إطلاق خدمات التطبيق"

# انتظار اكتمال بناء الـ frontend قبل تشغيل nginx
log_warn "انتظار اكتمال بناء الـ frontend..."
FRONTEND_MAX=120
FRONTEND_WAITED=0
until $COMPOSE ps frontend_build_step | grep -q "Exit 0\|exited.*0"; do
    if [ $FRONTEND_WAITED -ge $FRONTEND_MAX ]; then
        log_warn "Frontend لم يكتمل بعد $FRONTEND_MAX ثانية، تشغيل nginx على أي حال..."
        break
    fi
    echo -n "."
    sleep 3
    FRONTEND_WAITED=$((FRONTEND_WAITED + 3))
done
echo ""

# تشغيل nginx بعد اكتمال الـ frontend
$COMPOSE up -d nginx
log_ok "Nginx يعمل"

# =============================================================================
# 6. فحص صحة التطبيق
# =============================================================================
log_step "6/7 — فحص صحة التطبيق..."

HEALTH_MAX=60
HEALTH_WAITED=0
until curl -sf http://localhost/api/health > /dev/null 2>&1; do
    if [ $HEALTH_WAITED -ge $HEALTH_MAX ]; then
        log_err "فشل فحص الصحة! عرض آخر سجلات الـ backend:"
        $COMPOSE logs --tail=50 backend
        echo ""
        log_err "يمكنك مراجعة السجلات بالكامل بـ:"
        echo "  $COMPOSE logs -f backend"
        exit 1
    fi
    echo -n "."
    sleep 2
    HEALTH_WAITED=$((HEALTH_WAITED + 2))
done
echo ""
log_ok "التطبيق يعمل بصحة جيدة! (انتظرت ${HEALTH_WAITED} ثانية)"

# =============================================================================
# 7. ملخص الحالة
# =============================================================================
log_step "7/7 — ملخص حالة الخدمات:"
$COMPOSE ps

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✓ النشر اكتمل بنجاح!              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo "  🌐 الموقع:  https://$(hostname -f 2>/dev/null || echo 'your-domain.com')"
echo "  📋 السجلات: $COMPOSE logs -f"
echo "  📊 الحالة:  $COMPOSE ps"
echo ""
