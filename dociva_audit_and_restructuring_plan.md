# Dociva.io SaaS-PDF Architecture Audit & Restructuring Plan

## A) تحليل المشروع الحالي بالكامل (Current Architecture Audit)

### 1. Backend (Flask & Python)
- **Controllers (Routes)**: التنظيم الحالي جيد ويعتمد على Blueprint لكل مجموعة من الأدوات (`app/routes/`). ومع ذلك، يجب التأكد من عدم وجود أي عمليات ثقيلة (Blocking) داخل مسارات HTTP.
- **Services**: يتم فصل العمليات المنطقية في مجلد `app/services/` مما يساعد في قابلية التوسع.
- **Jobs (Celery Tasks)**: يوجد نظام قوائم انتظار جيد (Isolated Queues) للتعامل مع العمليات الثقيلة (PDF, Image, Video, OCR, AI Heavy). لكن نحتاج لضمان آليات Retry، وإدارة الانهيارات (Crashes).
- **Middleware**: يتم استخدام `rate_limiter.py` ولكن نحتاج لتوسيع الـ Middleware للتعامل مع الصلاحيات (Feature Access Middleware) وفرض قيود الخطط (Plan Enforcement).
- **Storage & Memory**: هناك وظيفة دورية (`cleanup-expired-files`) لتنظيف الملفات، ولكن يجب التأكد من معالجة الملفات على هيئة Chunks لتجنب مشاكل الـ Memory Leaks عند رفع ملفات ضخمة.

### 2. Frontend (React & Vite)
- **UX & CTA**: واجهة المستخدم والـ Components موجودة ولكن تتطلب تحسينات كبيرة لزيادة الـ Conversion Rate (مثل: Live Counters, Trust Signals, Testimonials).
- **Pricing Visibility**: صفحة `PricingPage.tsx` تحتاج إلى إعادة بناء لتشمل خطط الشهر/السنة، وعلامات "Most Popular"، وخصومات لجذب المشتركين.
- **Performance**: يجب التأكد من عمل Lazy Loading وتحسين حجم الحزم (Bundle Size).

### 3. Infrastructure (Docker & DevOps)
- **Docker Setup**: ملف `docker-compose.prod.yml` منظم جيداً ومقسّم إلى Workers منفصلة (`worker_pdf`, `worker_image`, `worker_heavy`, إلخ).
- **Redis Usage**: يستخدم حالياً كـ Broker و Result Backend لـ Celery. نحتاج لتفعيله كـ Cache للبيانات السريعة وإدارة الجلسات.
- **Health Checks**: متواجدة، ولكن يجب ضمان سياسات Auto Recovery كاملة وتجنب 500 Errors عند تعذر الوصول لـ Redis.

---

## B) استخراج المشاكل الحرجة (Critical Issues)
1. **نظام التسعير الحالي**: لا يتطابق مع متطلبات السوق التنافسية (Free, Starter, Pro, Business)، ونظام الـ Micro الحالي غير كافٍ.
2. **الاستهلاك العالي للذاكرة**: معالجة بعض الـ PDFs والـ Images قد تتم بالكامل في الذاكرة (In-memory) بدلاً من الـ Streaming.
3. **نقص ميزات الذكاء الاصطناعي التفاعلية**: المنصة تفتقر إلى ميزات متقدمة مثل AI PDF Chat وتحليل السير الذاتية (Resume Analyzer).
4. **دعم اللغة العربية**: أداة الـ OCR لا تركز حالياً على الدقة العالية للغة العربية بشكل كافٍ.
5. **الاشتراكات والفوترة**: عدم وجود أنظمة مثل الـ Grace Period والمحاولة التلقائية للمدفوعات الفاشلة (Retry Failed Payments).

---

## C) خطة إعادة الهيكلة وترتيب الأولويات (Restructuring Plan & Priorities)

سيتم تنفيذ التعديلات وفقاً للمراحل التالية لضمان عدم كسر النظام (Zero Downtime / Safe Rollout):

### ✅ المرحلة الأولى: تحديث نظام التسعير والفوترة (Pricing System Rebuild) — **COMPLETED**

#### ما تم تنفيذه:
| الملف | التعديل |
|-------|----------|
| `backend/app/services/credit_config.py` | أُضيفت ثوابت `STARTER_CREDITS_PER_WINDOW`, `BUSINESS_CREDITS_PER_WINDOW`, `FREE/STARTER/PRO/BUSINESS_MAX_FILE_SIZE_MB`, `PLAN_PRICE_*`. أُعيد كتابة `get_credits_for_plan()` لدعم 4 خطط. أُضيف `get_max_file_size_for_plan()`, `plan_has_api_access()`, `plan_has_feature()`. |
| `backend/app/services/quota_service.py` | حُدّثت `QuotaLimits` بالأرقام الجديدة (Free/Starter/Pro/Business). خطة `micro` الموروثة تُرسم إلى `starter`. `get_user_plan()` ترجع `starter` للمستخدمين ذوي خطة `micro`. |
| `backend/app/services/paypal_service.py` | أُعيد كتابة الملف بالكامل. `get_paypal_plan_id(plan=...)` يدعم `starter` و`business`. Webhook handlers تستخدم `_resolve_plan_type_from_plan_id()`. |
| `backend/app/routes/paypal.py` | `create_subscription_route` يقبل `plan: starter\|pro\|business`. |
| `frontend/src/pages/PricingPage.tsx` | أُعيد البناء الكامل: 4 بطاقات خطط، جدول مقارنة كامل، FAQ accordion، Trust signals، CTA banner. |
| `.env` + `.env.example` | أُضيفت متغيرات `PAYPAL_PLAN_ID_STARTER_*`, `PAYPAL_PLAN_ID_BUSINESS_*`, `PAYPAL_PLAN_ID_PRO_MONTHLY_TRIAL`, `PAYPAL_PLAN_ID_PRO_YEARLY_TRIAL`. |

#### ما يجب فعله (على الخادم):
1. إنشاء خطط PayPal الجديدة في لوحة PayPal Sandbox ثم Production
2. تعبئة `PAYPAL_PLAN_ID_STARTER_MONTHLY` و`PAYPAL_PLAN_ID_BUSINESS_MONTHLY` في `.env` الإنتاج
3. `docker compose -f docker-compose.prod.yml up -d --build` لإعادة البناء

---

### المرحلة الثانية: تحسين البنية التحتية والموارد (Scalability & Queue Hardening)
1. مراجعة كل مسار مسجل في `app/routes/` للتأكد من عدم وجود عمليات Blocking.
2. تفعيل Stream Downloads وتقنية Chunk Processing للملفات الكبيرة.
3. التأكد من إعدادات Nginx لتحمل الضغط العالي (Rate Limits, Buffers).

### المرحلة الثالثة: دمج ميزات الذكاء الاصطناعي (AI Features Integration)
1. إضافة خدمة `AI PDF Chat` باستخدام نماذج لغوية قوية مدعومة بالـ Vector Database (إن لزم).
2. تفعيل `Arabic OCR` كخيار صريح وتثبيت الحزم اللازمة في الـ Dockerfile (`tesseract-ocr-ara`).
3. إدراج `Resume Analyzer` وأدوات التلخيص الذكي (Smart Summary).

### المرحلة الرابعة: تحسين التحويل وتجربة المستخدم (CRO & UX Optimization)
1. إعادة تصميم الـ Landing Page لعرض "Trust Signals" وسرعة المعالجة.
2. إضافة Live Usage Counters وعدادات التحويل.
3. دمج تتبع الأهداف (Analytics & Funnel Tracking).

### المرحلة الخامسة: تأمين النظام واستقراره (Security & Production Stability)
1. تطبيق تحقيقات الـ MIME بدقة أكثر لمنع Abuse.
2. إضافة Error Handling مركزي وتسجيل دقيق للعمليات الفاشلة.
3. تحسين سياسات Docker Recovery.

---

## D) قائمة الملفات الرئيسية المطلوب تعديلها مبدئياً
- `backend/app/services/quota_service.py` (لتعديل الخطط)
- `backend/app/services/credit_service.py` / `paypal_service.py` (للـ Billing)
- `frontend/src/pages/PricingPage.tsx` (واجهة المستخدم للأسعار)
- `frontend/src/pages/HomePage.tsx` (تحسين الـ CRO)
- `backend/Dockerfile` (لإضافة `tesseract-ocr-ara`)
- `backend/app/tasks/...` (لضمان معالجة الـ Chunks)
- إنشاء `backend/app/services/ai_pdf_chat_service.py` و `resume_analyzer_service.py`

---
*يتم الآن انتظار الموافقة للبدء في تنفيذ **المرحلة الأولى** تدريجياً لضمان سلامة المشروع الحالي.*
