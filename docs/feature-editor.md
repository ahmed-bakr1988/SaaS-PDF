# Feature: Critical Maintenance & Editor Foundation

Branch: `feature/critical-maintenance-and-editor`

---

## Block A — Critical Maintenance (Sprint 1)

### A1 — Dynamic Upload Limits (`/api/config`)

**Backend:**
- `GET /api/config` returns plan-aware file-size limits and usage summary.
- Registered as `config_bp` at `/api/config`.
- Anonymous users receive free-tier limits; authenticated users receive limits according to their plan plus a usage summary.

**Frontend:**
- `useConfig` hook (`src/hooks/useConfig.ts`) fetches limits from the config endpoint with a fallback to the hardcoded `TOOL_LIMITS_MB`.
- `HeroUploadZone` and `PdfEditor` consume dynamic limits via `useConfig`.

### A2 — Image Resize Tool

**Frontend page:** `src/components/tools/ImageResize.tsx`  
**Route:** `/tools/image-resize`  
**Backend endpoint:** `POST /api/image/resize` (already existed)

Features:
- Width / height inputs with lock-aspect-ratio toggle.
- Quality slider (1–100, default 85).
- Accepts files from the homepage smart-upload handoff (via `fileStore`).
- i18n keys added for `en`, `ar`, `fr`.

### A3 — SMTP & Forgot / Reset Password

**Config keys** (set via environment variables):

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | `""` | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | `""` | SMTP login |
| `SMTP_PASSWORD` | `""` | SMTP password |
| `SMTP_FROM` | `"noreply@example.com"` | Sender address |
| `SMTP_USE_TLS` | `true` | Use STARTTLS |
| `FRONTEND_URL` | `http://localhost:5173` | Used in reset-email link |

**Endpoints:**

| Method | Path | Rate limit | Description |
|---|---|---|---|
| `POST` | `/api/auth/forgot-password` | 5/hour | Sends reset email (always returns 200) |
| `POST` | `/api/auth/reset-password` | 10/hour | Consumes token, sets new password |

**Database tables added:**
- `password_reset_tokens` — stores hashed tokens with 1-hour expiry.
- `file_events` — audit log for file-lifecycle events (see A4).

**Frontend pages:**
- `/forgot-password` — email form
- `/reset-password?token=…` — new-password form

### A4 — Celery Beat Cleanup Task

**Task:** `app.tasks.maintenance_tasks.cleanup_expired_files`  
**Schedule:** Every 30 minutes via Celery Beat (`crontab(minute="*/30")`).  
**Behaviour:** Scans `UPLOAD_FOLDER` and `OUTPUT_FOLDER` for sub-directories older than `FILE_EXPIRY_SECONDS` (default 1800 s). Deletes them and logs a cleanup event to `file_events`.

**Docker:** A `celery_beat` service was added to `docker-compose.yml`.

---

## Feature Flag

| Variable | Default | Description |
|---|---|---|
| `FEATURE_EDITOR` | `false` | Gates Block-B editor features (OCR, Remove BG, PDF Editor). Not used by Block-A features. |

---

## Test Coverage

| File | Tests | Status |
|---|---|---|
| `test_config.py` | 3 | ✅ Passed |
| `test_password_reset.py` | 8 | ✅ Passed |
| `test_maintenance_tasks.py` | 8 | ✅ Passed |
| **Full suite** | **158** | **✅ All passed** |

---

## Files Changed / Created

### Backend — New
- `app/routes/config.py`
- `app/services/email_service.py`
- `app/tasks/maintenance_tasks.py`
- `tests/test_config.py`
- `tests/test_password_reset.py`
- `tests/test_maintenance_tasks.py`

### Backend — Modified
- `app/__init__.py` — registered `config_bp`
- `config/__init__.py` — SMTP settings, `FRONTEND_URL`, `FEATURE_EDITOR`
- `app/extensions.py` — Celery Beat schedule
- `app/routes/auth.py` — forgot/reset password endpoints
- `app/services/account_service.py` — reset-token & file-event helpers, new tables
- `celery_worker.py` — imports `maintenance_tasks`

### Frontend — New
- `src/hooks/useConfig.ts`
- `src/components/tools/ImageResize.tsx`
- `src/pages/ForgotPasswordPage.tsx`
- `src/pages/ResetPasswordPage.tsx`

### Frontend — Modified
- `src/App.tsx` — 3 new routes
- `src/components/shared/HeroUploadZone.tsx` — uses `useConfig`
- `src/components/tools/PdfEditor.tsx` — uses `useConfig`
- `src/pages/HomePage.tsx` — Image Resize tool card
- `src/pages/AccountPage.tsx` — "Forgot password?" link
- `src/utils/fileRouting.ts` — imageResize in tool list
- `src/i18n/en.json`, `ar.json`, `fr.json` — new keys

### Infrastructure
- `docker-compose.yml` — `celery_beat` service
