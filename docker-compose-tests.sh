#!/bin/bash

# 🧪 اختبارات سريعة للتحقق من نظام Docker Compose

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 اختبار Docker Compose - نظام الربط بين الحاويات"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# تحميل المتغيرات من .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ تم تحميل متغيرات البيئة من .env"
else
    echo "❌ لم يتم العثور على ملف .env"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣ فحص صحة ملف docker-compose.yml"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker-compose config --quiet 2>/dev/null; then
    echo "✅ ملف docker-compose.yml صحيح"
else
    echo "❌ أخطاء في ملف docker-compose.yml"
    docker-compose config
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣ حالة الخدمات"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "🔄 جاري الحصول على حالة الخدمات..."
docker-compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣ اختبار اتصال Redis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker-compose exec -T redis redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
    echo "✅ Redis يستجيب بـ PONG"
else
    echo "❌ فشل الاتصال بـ Redis"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣ اختبار اتصال PostgreSQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker-compose exec -T postgres psql -U dociva -d dociva -c "SELECT 1" 2>/dev/null | grep -q "1"; then
    echo "✅ PostgreSQL متصل وجاهز"
else
    echo "❌ فشل الاتصال بـ PostgreSQL"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣ اختبار Backend Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -s http://localhost:5000/api/health | grep -q "ok"; then
    echo "✅ Backend API يستجيب بنجاح"
    curl -s http://localhost:5000/api/health | grep -o '"[^"]*": "[^"]*"'
else
    echo "❌ Backend API لا يستجيب"
    echo "   تأكد من أن backend قيد التشغيل: docker-compose logs backend"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣ اختبار اتصال Celery Workers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WORKERS=$(docker-compose ps --services | grep celery_worker)
CONNECTED=0

for worker in $WORKERS; do
    if docker-compose logs "$worker" 2>/dev/null | grep -q "Connected to redis"; then
        echo "✅ $worker متصل بـ Redis"
        ((CONNECTED++))
    else
        echo "❌ $worker لم يتصل بـ Redis بعد"
    fi
done

echo "   ($CONNECTED/${#WORKERS[@]} workers متصلة)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣ اختبار Flower (Celery Monitoring)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -s http://localhost:5555/api/workers 2>/dev/null | grep -q "celery@"; then
    echo "✅ Flower يعرض workers"
    echo "   الوصول إلى: http://localhost:5555"
else
    echo "⏳ Flower قد لم يبدأ بعد، حاول بعد بضع ثوان"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣ معلومات الشبكة"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

NETWORK=$(docker-compose ps --services | head -1 | xargs -I {} docker inspect -f '{{.HostConfig.NetworkMode}}' $(docker-compose ps -q {} | head -1) 2>/dev/null || echo "default")
echo "🌐 Docker Network: $NETWORK"
echo ""

# عرض DNS Resolution
echo "🔍 اختبار DNS Resolution داخل Network:"
docker-compose exec -T backend nslookup postgres 2>/dev/null | grep -A2 "Name:" || echo "   (لم يتمكن من الاختبار)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9️⃣ سجلات الأخطاء (آخر 5 أسطر من كل خدمة)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for service in backend postgres redis; do
    if docker-compose logs --tail=5 "$service" 2>/dev/null | grep -i error; then
        echo "⚠️ وجدت أخطاء في $service:"
        docker-compose logs --tail=5 "$service" | grep -i error
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔟 الوصول للواجهات"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📱 Frontend:"
echo "   🔗 http://localhost:5173"
echo ""
echo "🔌 Backend API:"
echo "   🔗 http://localhost:5000"
echo "   📊 Health: http://localhost:5000/api/health"
echo ""
echo "🌱 Celery Flower:"
echo "   🔗 http://localhost:5555"
echo ""
echo "🗄️ PostgreSQL:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   User: dociva"
echo "   DB: dociva"
echo ""
echo "🔴 Redis:"
echo "   Host: localhost"
echo "   Port: 6379"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# الملخص النهائي
echo ""
echo "📊 ملخص الاختبارات:"
echo ""
echo "لتشغيل جميع الاختبارات مرة أخرى، استخدم:"
echo "   bash docker-compose-tests.sh"
echo ""
echo "لعرض السجلات في الوقت الفعلي:"
echo "   docker-compose logs -f"
echo ""
echo "لإيقاف جميع الخدمات:"
echo "   docker-compose down"
echo ""
echo "📝 للمزيد من المعلومات، اطلع على:"
echo "   - CONTAINER_CONNECTIVITY_DIAGNOSIS.md"
echo "   - CONTAINER_FIX_GUIDE.md"
echo "   - FIXED_DOCKER_COMPOSE.md"
echo ""
echo "✅ اختبارات الربط بين الحاويات - انتهت"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
