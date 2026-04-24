# خطة تنفيذ الأشهر الثلاثة — Dociva

## الهدف
تنفيذ خطة العمل المقترحة في التقييم الشامل، مقسّمة على 3 أشهر: تثبيت الربح → تحسين الجودة → النمو.

---

## الشهر الأول: تثبيت الربح 💰 — ✅ مُكتمل

### ✅ UpgradeModal + ربط مع CostEstimatePanel
- [x] [UpgradeModal.tsx](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/components/shared/UpgradeModal.tsx) — مودال ترقية premium
- [x] [CostEstimatePanel.tsx](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/components/shared/CostEstimatePanel.tsx) — ربط soft-sell عند نفاد الرصيد
- [x] ترجمة `en.json` + `ar.json` — مفاتيح `upgrade.*`

### ✅ PayPal Trial Period
- [x] [paypal_service.py](file:///c:/xampp/htdocs/SaaS-PDF/backend/app/services/paypal_service.py) — 7-day free trial للمشتركين الجدد
- [x] [.env.example](file:///c:/xampp/htdocs/SaaS-PDF/.env.example) — `PAYPAL_TRIAL_DAYS=7`
- [x] [.env](file:///c:/xampp/htdocs/SaaS-PDF/.env) — إضافة PayPal config block (placeholders)

### ✅ تحسين صفحة التسعير
- [x] [PricingPage.tsx](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/pages/PricingPage.tsx) — Crown icon, trial badge, FAQ جديد

### ⏳ بانتظار أحمد
- [ ] استبدال placeholder values في `.env` بمفاتيح PayPal الحقيقية
- [ ] اختبار PayPal subscription flow end-to-end

---

## الشهر الثاني: تحسين الجودة 🔧 — ✅ مُكتمل

### ✅ تقسيم `api.ts` (34KB → 8 ملفات)
| الملف | الحجم | المحتوى |
|-------|-------|---------|
| [apiClient.ts](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/services/apiClient.ts) | 7.8KB | Axios client + CSRF + interceptors + error codes |
| [apiTypes.ts](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/services/apiTypes.ts) | 5.7KB | كل TypeScript interfaces |
| [authApi.ts](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/services/authApi.ts) | 1.8KB | Register, login, logout, session |
| [toolsApi.ts](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/services/toolsApi.ts) | 4.0KB | File upload, task polling, health |
| [accountApi.ts](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/services/accountApi.ts) | 2.6KB | History, usage, API keys, credits |
| [assistantApi.ts](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/services/assistantApi.ts) | 4.9KB | Chat + SSE streaming |
| [adminApi.ts](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/services/adminApi.ts) | 9.1KB | Admin endpoints |
| [api.ts](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/services/api.ts) | 2.5KB | Barrel re-export (backward compat) |

> ✅ TypeScript compilation passed — zero errors

### ✅ تنظيف المستودع
- [x] حذف 14 ملف لوغ/اختبار من `backend/`
- [x] [.gitignore](file:///c:/xampp/htdocs/SaaS-PDF/.gitignore) — إضافة `test_*.txt`, `pytest_*.txt`, `pytest_*.log`
- [x] [requirements.txt](file:///c:/xampp/htdocs/SaaS-PDF/backend/requirements.txt) — إزالة pytest المكرر + إصلاح تعليق

### ✅ CI/CD Pipeline
- [x] [ci.yml](file:///c:/xampp/htdocs/SaaS-PDF/.github/workflows/ci.yml) — Frontend lint/type-check/build + Backend tests + i18n key parity
- [x] [deploy.yml](file:///c:/xampp/htdocs/SaaS-PDF/.github/workflows/deploy.yml) — SSH deploy + Docker rebuild + health check

### 📋 تقسيم ملفات إضافية (اختياري — يمكن تأجيلها)
- [ ] `InternalAdminPage.tsx` (99KB) → 8-10 ملفات admin components
- [ ] `AccountPage.tsx` (45KB) → 5-8 ملفات account components

> [!NOTE]
> تم تأجيل تقسيم InternalAdminPage و AccountPage لأنهما يعملان بشكل جيد حالياً.
> التقسيم يمكن تنفيذه لاحقاً عند الحاجة لصيانة أو إضافة ميزات جديدة.

---

## الشهر الثالث: النمو 📈 — لم يبدأ بعد

### المرحلة 3.1: إطلاق API for Developers
- [ ] تحسين [DevelopersPage.tsx](file:///c:/xampp/htdocs/SaaS-PDF/frontend/src/pages/DevelopersPage.tsx) (Swagger, code examples)
- [ ] توثيق API كامل `docs/api-reference.md`

### المرحلة 3.2: حملة SEO عربية
- [ ] كلمات مفتاحية عربية في `build_keyword_portfolio.py`
- [ ] مقالات Blog عربية

### المرحلة 3.3: أدوات جديدة
- [ ] PDF Annotation
- [ ] PDF Comparison
- [ ] PDF Form Filler

### المرحلة 3.4: بناء المجتمع
- [ ] تحسين صفحة المدونة
- [ ] RSS feed

---

## ملخص الإنجاز

| المرحلة | الحالة | الملفات المُعدّلة/المُنشأة |
|---------|--------|---------------------------|
| الشهر 1: UpgradeModal | ✅ | 6 ملفات |
| الشهر 1: PayPal Trial | ✅ | 3 ملفات |
| الشهر 1: PricingPage | ✅ | 1 ملف |
| الشهر 2: تقسيم api.ts | ✅ | 8 ملفات |
| الشهر 2: تنظيف repo | ✅ | 16 ملف محذوف + 2 معدّل |
| الشهر 2: CI/CD | ✅ | 2 ملف |
| **الإجمالي** | **✅** | **~36 ملف** |
