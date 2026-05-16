# SaaS-PDF — القواعد الإلزامية لكل تعديل

> ⚠️ **يجب مراجعة هذا الملف قبل أي تعديل على المشروع**

## 1. قيود البنية التحتية
- **السيرفر:** Hetzner CPX22 — **2 vCPU / 4GB RAM / 80GB SSD**
- كل قرار هندسي يجب أن يراعي هذه القيود

## 2. قواعد إلزامية (غير قابلة للتفاوض)

### أ. عدم حظر HTTP Requests
- المعالجة الثقيلة **ممنوعة** داخل Flask request handlers
- استخدم دائماً: Celery tasks / background workers

### ب. عزل الـ Queues
- `default` | `light_tasks` | `pdf_processing` | `image_processing` | `ocr_tasks` | `video_processing` | `ai_heavy`
- المهام الثقيلة **ممنوعة** من حجز المهام الخفيفة

### ج. حماية CPU و RAM
- لا multiprocessing مفرط
- لا Celery concurrency غير محدود
- لا تحميل ملفات كبيرة كاملة في الذاكرة
- استخدم: streaming / chunk processing

### د. Timeouts إلزامية
- كل مهمة ثقيلة يجب أن يكون لها: soft limit + hard limit
- ممنوع: عمليات LibreOffice/FFmpeg معلقة

### هـ. أمان رفع الملفات
- MIME validation + extension validation + file size limits
- path sanitization + حماية من zip bombs

### و. تنظيف الملفات المؤقتة
- cleanup تلقائي + expiration handling + orphaned file removal

## 3. الـ Stack المعتمد
| الطبقة | التقنية |
|--------|---------|
| Backend | Flask + Python 3.12 + Gunicorn |
| Tasks | Celery + Redis |
| Database | PostgreSQL |
| Frontend | React + Vite + TypeScript |
| Infrastructure | Docker Compose + Nginx |

## 4. هيكل المشروع
```
backend/app/routes/    → Flask Blueprints
backend/app/services/  → Python classes
backend/app/tasks/     → Celery tasks
backend/tests/         → pytest
frontend/src/          → Vite + TypeScript + React
frontend/src/hooks/    → Custom React hooks
```

## 5. أوامر الاختبار (تشغيلها بعد كل تعديل)
```bash
# Backend
cd backend && python -m pytest tests/ -q

# Frontend
cd frontend && npx vitest run
cd frontend && npx tsc --noEmit
```

## 6. ممنوعات قاطعة
- ❌ معالجة ثقيلة متزامنة (synchronous)
- ❌ زيادة concurrency بدون حساب
- ❌ أنماط تستهلك RAM بكثرة
- ❌ إزالة حماية الـ timeouts
- ❌ تخطي التحقق من المدخلات
- ❌ هندسة مفرطة أو microservices قبل الحاجة

## 7. فلسفة التطوير
1. Stabilize → 2. Observe → 3. Optimize → 4. Scale

**لا تقدم:** Kubernetes / microservices / distributed orchestration قبل الحاجة الفعلية.

## 8. قائمة التحقق قبل كل commit
- [ ] التعديل يتبع القواعد أعلاه
- [ ] الاختبارات تمر
- [ ] لا تغييرات في ملفات غير مطلوبة
- [ ] لا أسرار أو مفاتيح في الكود
- [ ] الـ PR صغير ومركّز
