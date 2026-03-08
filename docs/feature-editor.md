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

---

## Block B — OCR, Background Removal, PDF Editor (Sprint 2)

All Block B routes are gated behind `FEATURE_EDITOR=true`. Returns 403 when disabled.

### B1 — OCR (Optical Character Recognition)

**Backend:**
- Service: `app/services/ocr_service.py` — `ocr_image()`, `ocr_pdf()` using pytesseract
- Tasks: `app/tasks/ocr_tasks.py` — `ocr_image_task`, `ocr_pdf_task`
- Route: `app/routes/ocr.py` — Blueprint `ocr_bp` at `/api/ocr`

| Method | Path | Rate limit | Description |
|---|---|---|---|
| `POST` | `/api/ocr/image` | 10/min | Extract text from image |
| `POST` | `/api/ocr/pdf` | 5/min | Extract text from scanned PDF |
| `GET` | `/api/ocr/languages` | — | List supported OCR languages |

Supported languages: English (`eng`), Arabic (`ara`), French (`fra`).

**Frontend:** `src/components/tools/OcrTool.tsx` — `/tools/ocr`
- Mode selector (Image / PDF), language selector, text preview with copy, download.

### B2 — Background Removal

**Backend:**
- Service: `app/services/removebg_service.py` — `remove_background()` using rembg + onnxruntime
- Task: `app/tasks/removebg_tasks.py` — `remove_bg_task`
- Route: `app/routes/removebg.py` — Blueprint `removebg_bp` at `/api/remove-bg`

| Method | Path | Rate limit | Description |
|---|---|---|---|
| `POST` | `/api/remove-bg` | 5/min | Remove background (outputs transparent PNG) |

**Frontend:** `src/components/tools/RemoveBackground.tsx` — `/tools/remove-background`
- Upload image → AI processing → download PNG with transparency.

### B3 — PDF Editor (Text Annotations)

**Backend:**
- Service: `app/services/pdf_editor_service.py` — `apply_pdf_edits()` using ReportLab overlay + PyPDF2
- Task: `app/tasks/pdf_editor_tasks.py` — `edit_pdf_task`
- Route: `app/routes/pdf_editor.py` — Blueprint `pdf_editor_bp` at `/api/pdf-editor`

| Method | Path | Rate limit | Description |
|---|---|---|---|
| `POST` | `/api/pdf-editor/edit` | 10/min | Apply text annotations to PDF |

Accepts `file` (PDF) + `edits` (JSON array, max 500). Each edit: `{ type, page, x, y, content, fontSize, color }`.

### DevOps Changes

**Dependencies added** (`requirements.txt`):
- `pytesseract>=0.3.10,<1.0`
- `rembg>=2.0,<3.0`
- `onnxruntime>=1.16,<2.0`

**Dockerfile:** Added `tesseract-ocr`, `tesseract-ocr-eng`, `tesseract-ocr-ara`, `tesseract-ocr-fra` to apt-get.

**Celery task routing** (`extensions.py`):
- `ocr_tasks.*` → `image` queue
- `removebg_tasks.*` → `image` queue
- `pdf_editor_tasks.*` → `pdf_tools` queue

### Block B Test Coverage

| File | Tests | Status |
|---|---|---|
| `test_ocr.py` | 8 | ✅ Passed |
| `test_removebg.py` | 3 | ✅ Passed |
| `test_pdf_editor.py` | 7 | ✅ Passed |
| `test_ocr_service.py` | 4 | ✅ Passed |
| **Full suite** | **180** | **✅ All passed** |

### Block B Files Created

**Backend — New:**
- `app/services/ocr_service.py`
- `app/services/removebg_service.py`
- `app/services/pdf_editor_service.py`
- `app/tasks/ocr_tasks.py`
- `app/tasks/removebg_tasks.py`
- `app/tasks/pdf_editor_tasks.py`
- `app/routes/ocr.py`
- `app/routes/removebg.py`
- `app/routes/pdf_editor.py`
- `tests/test_ocr.py`
- `tests/test_removebg.py`
- `tests/test_pdf_editor.py`
- `tests/test_ocr_service.py`

**Frontend — New:**
- `src/components/tools/OcrTool.tsx`
- `src/components/tools/RemoveBackground.tsx`

**Backend — Modified:**
- `app/__init__.py` — registered 3 new blueprints (18 total)
- `app/extensions.py` — 3 new task routing rules
- `celery_worker.py` — 3 new task module imports
- `requirements.txt` — pytesseract, rembg, onnxruntime
- `Dockerfile` — tesseract-ocr packages

**Frontend — Modified:**
- `src/App.tsx` — 2 new lazy routes (`/tools/ocr`, `/tools/remove-background`)
- `src/pages/HomePage.tsx` — OCR + RemoveBG tool cards
- `src/utils/fileRouting.ts` — OCR + RemoveBG in tool arrays
- `src/i18n/en.json` — `tools.ocr` + `tools.removeBg` keys
- `src/i18n/ar.json` — Arabic translations
- `src/i18n/fr.json` — French translations
- `src/services/api.ts` — `text` + `char_count` added to `TaskResult`
- `src/i18n/en.json`, `ar.json`, `fr.json` — new keys

### Infrastructure
- `docker-compose.yml` — `celery_beat` service
