# Dociva — Tool Inventory & Competitive Gap Analysis

> Generated: March 7, 2026
> Branch: `feature/critical-maintenance-and-editor`

---

## 1. Platform Infrastructure

| Component | Technology | Status |
|---|---|---|
| Backend | Flask + Gunicorn | ✅ Production-ready |
| Frontend | React + Vite + TypeScript + Tailwind | ✅ Production-ready |
| Task Queue | Celery + Redis | ✅ 3 queues (default, image, pdf_tools) |
| Scheduler | Celery Beat | ✅ Expired-file cleanup every 30 min |
| Database | SQLite | ✅ Users, API keys, history, usage events |
| Storage | Local + S3 (optional) | ✅ Presigned URLs |
| Auth | Session-based + API Key (B2B) | ✅ Free & Pro plans |
| Security | Talisman CSP, rate limiting, CORS, input sanitization | ✅ |
| i18n | react-i18next (en, ar, fr) | ✅ All tools translated |
| Monetization | Google AdSense slots | ✅ Integrated |
| Email | SMTP (password reset) | ✅ |
| Docker | docker-compose (dev + prod) | ✅ |
| Nginx | Reverse proxy + SSL | ✅ |

### Plans & Quotas

| | Free | Pro |
|---|---|---|
| Web requests/month | 50 | 500 |
| API requests/month | — | 1,000 |
| Max file size | 50 MB | 100 MB |
| History retention | 25 | 250 |
| API key access | ❌ | ✅ |

### Registered Blueprints: 18

| Blueprint | Prefix | Purpose |
|---|---|---|
| `health_bp` | `/api` | Health check |
| `auth_bp` | `/api/auth` | Login, register, forgot/reset password |
| `account_bp` | `/api/account` | Profile, API keys, usage |
| `admin_bp` | `/api/internal/admin` | Plan management |
| `convert_bp` | `/api/convert` | PDF ↔ Word |
| `compress_bp` | `/api/compress` | PDF compression |
| `image_bp` | `/api/image` | Image convert & resize |
| `video_bp` | `/api/video` | Video to GIF |
| `history_bp` | `/api` | User history |
| `pdf_tools_bp` | `/api/pdf-tools` | Merge, split, rotate, watermark, etc. |
| `flowchart_bp` | `/api/flowchart` | AI flowchart extraction |
| `tasks_bp` | `/api/tasks` | Task status polling |
| `download_bp` | `/api/download` | Secure file download |
| `v1_bp` | `/api/v1` | B2B API (all tools) |
| `config_bp` | `/api/config` | Dynamic limits |
| `ocr_bp` | `/api/ocr` | OCR text extraction |
| `removebg_bp` | `/api/remove-bg` | Background removal |
| `pdf_editor_bp` | `/api/pdf-editor` | PDF text annotations |

---

## 2. Existing Tools — Complete Inventory (21 tools)

### 2.1 PDF Tools (14)

| # | Tool | Endpoint | Service | Task | Component | Route | i18n | B2B API |
|---|---|---|---|---|---|---|---|---|
| 1 | **Compress PDF** | `POST /api/compress/pdf` | `compress_service` | `compress_pdf_task` | `PdfCompressor.tsx` | `/tools/compress-pdf` | ✅ | ✅ |
| 2 | **PDF to Word** | `POST /api/convert/pdf-to-word` | `pdf_service` | `convert_pdf_to_word` | `PdfToWord.tsx` | `/tools/pdf-to-word` | ✅ | ✅ |
| 3 | **Word to PDF** | `POST /api/convert/word-to-pdf` | `pdf_service` | `convert_word_to_pdf` | `WordToPdf.tsx` | `/tools/word-to-pdf` | ✅ | ✅ |
| 4 | **Merge PDF** | `POST /api/pdf-tools/merge` | `pdf_tools_service` | `merge_pdfs_task` | `MergePdf.tsx` | `/tools/merge-pdf` | ✅ | ✅ |
| 5 | **Split PDF** | `POST /api/pdf-tools/split` | `pdf_tools_service` | `split_pdf_task` | `SplitPdf.tsx` | `/tools/split-pdf` | ✅ | ✅ |
| 6 | **Rotate PDF** | `POST /api/pdf-tools/rotate` | `pdf_tools_service` | `rotate_pdf_task` | `RotatePdf.tsx` | `/tools/rotate-pdf` | ✅ | ✅ |
| 7 | **PDF to Images** | `POST /api/pdf-tools/pdf-to-images` | `pdf_tools_service` | `pdf_to_images_task` | `PdfToImages.tsx` | `/tools/pdf-to-images` | ✅ | ✅ |
| 8 | **Images to PDF** | `POST /api/pdf-tools/images-to-pdf` | `pdf_tools_service` | `images_to_pdf_task` | `ImagesToPdf.tsx` | `/tools/images-to-pdf` | ✅ | ✅ |
| 9 | **Watermark PDF** | `POST /api/pdf-tools/watermark` | `pdf_tools_service` | `watermark_pdf_task` | `WatermarkPdf.tsx` | `/tools/watermark-pdf` | ✅ | ✅ |
| 10 | **Protect PDF** | `POST /api/pdf-tools/protect` | `pdf_tools_service` | `protect_pdf_task` | `ProtectPdf.tsx` | `/tools/protect-pdf` | ✅ | ✅ |
| 11 | **Unlock PDF** | `POST /api/pdf-tools/unlock` | `pdf_tools_service` | `unlock_pdf_task` | `UnlockPdf.tsx` | `/tools/unlock-pdf` | ✅ | ✅ |
| 12 | **Add Page Numbers** | `POST /api/pdf-tools/page-numbers` | `pdf_tools_service` | `add_page_numbers_task` | `AddPageNumbers.tsx` | `/tools/page-numbers` | ✅ | ✅ |
| 13 | **PDF Editor** | `POST /api/pdf-editor/edit` | `pdf_editor_service` | `edit_pdf_task` | `PdfEditor.tsx` | `/tools/pdf-editor` | ✅ | ❌ |
| 14 | **PDF Flowchart** | `POST /api/flowchart/extract` + 3 | `flowchart_service` | `extract_flowchart_task` | `PdfFlowchart.tsx` | `/tools/pdf-flowchart` | ✅ | ✅ |

### 2.2 Image Tools (4)

| # | Tool | Endpoint | Service | Task | Component | Route | i18n | B2B API |
|---|---|---|---|---|---|---|---|---|
| 15 | **Image Converter** | `POST /api/image/convert` | `image_service` | `convert_image_task` | `ImageConverter.tsx` | `/tools/image-converter` | ✅ | ✅ |
| 16 | **Image Resize** | `POST /api/image/resize` | `image_service` | `resize_image_task` | `ImageResize.tsx` | `/tools/image-resize` | ✅ | ✅ |
| 17 | **OCR** | `POST /api/ocr/image` + `/pdf` | `ocr_service` | `ocr_image_task` / `ocr_pdf_task` | `OcrTool.tsx` | `/tools/ocr` | ✅ | ❌ |
| 18 | **Remove Background** | `POST /api/remove-bg` | `removebg_service` | `remove_bg_task` | `RemoveBackground.tsx` | `/tools/remove-background` | ✅ | ❌ |

### 2.3 Video Tools (1)

| # | Tool | Endpoint | Service | Task | Component | Route | i18n | B2B API |
|---|---|---|---|---|---|---|---|---|
| 19 | **Video to GIF** | `POST /api/video/to-gif` | `video_service` | `create_gif_task` | `VideoToGif.tsx` | `/tools/video-to-gif` | ✅ | ✅ |

### 2.4 Text Tools — Client-Side Only (2)

| # | Tool | Backend | Component | Route | i18n |
|---|---|---|---|---|---|
| 20 | **Word Counter** | None (JS) | `WordCounter.tsx` | `/tools/word-counter` | ✅ |
| 21 | **Text Cleaner** | None (JS) | `TextCleaner.tsx` | `/tools/text-cleaner` | ✅ |

### Feature Flags

| Flag | Default | Controls |
|---|---|---|
| `FEATURE_EDITOR` | `false` | OCR, Remove Background, PDF Editor routes (403 when off) |

---

## 3. Test Coverage

| Category | Test Files | Tests |
|---|---|---|
| Auth | `test_auth.py` | 5 |
| Config | `test_config.py` | 3 |
| Password reset | `test_password_reset.py` | 8 |
| Maintenance | `test_maintenance_tasks.py` | 8 |
| Compress | `test_compress.py`, `test_compress_service.py`, `test_compress_tasks.py` | 6 |
| Convert | `test_convert.py`, `test_convert_tasks.py` | 6 |
| Image | `test_image.py`, `test_image_service.py`, `test_image_tasks.py` | ~18 |
| Video | `test_video.py`, `test_video_service.py`, `test_video_tasks.py` | ~12 |
| PDF tools | `test_pdf_tools.py`, `test_pdf_tools_service.py`, `test_pdf_tools_tasks.py` | ~50 |
| Flowchart | `test_flowchart_tasks.py` | ~6 |
| OCR | `test_ocr.py`, `test_ocr_service.py` | 12 |
| Remove BG | `test_removebg.py` | 3 |
| PDF Editor | `test_pdf_editor.py` | 7 |
| Infra | `test_download.py`, `test_health.py`, `test_history.py`, `test_rate_limiter.py`, `test_sanitizer.py`, `test_storage_service.py`, `test_file_validator.py`, `test_utils.py`, `test_tasks_route.py` | ~36 |
| **TOTAL** | **30 files** | **180 ✅** |

---

## 4. Missing Tools — Competitive Gap Analysis

Comparison against: iLovePDF, SmallPDF, TinyWow, PDF24, Adobe Acrobat Online.

### 4.1 HIGH PRIORITY — Core tools competitors all have

| # | Tool | Category | Complexity | Dependencies | Notes |
|---|---|---|---|---|---|
| 1 | **Compress Image** | Image | Low | Pillow (exists) | JPEG/PNG/WebP quality reduction + resize. Pillow already installed. |
| 2 | **PDF to Excel** | PDF → Office | Medium | `camelot-py` or `tabula-py` | Table extraction from PDFs — high user demand. |
| 3 | **PDF to PowerPoint** | PDF → Office | Medium | `python-pptx` | Convert PDF pages to PPTX slides (images per slide or OCR). |
| 4 | **Excel to PDF** | Office → PDF | Medium | LibreOffice CLI | Same pattern as Word to PDF. |
| 5 | **PowerPoint to PDF** | Office → PDF | Medium | LibreOffice CLI | Same pattern as Word to PDF. |
| 6 | **HTML to PDF** | Web → PDF | Low | `weasyprint` or `playwright` | Input URL or HTML snippet → PDF. |
| 7 | **Reorder / Rearrange Pages** | PDF | Low | PyPDF2 (exists) | Drag-and-drop page reorder UI → backend rebuilds PDF. |
| 8 | **Extract Pages** | PDF | Low | PyPDF2 (exists) | Similar to Split but with visual page picker. Already partially covered by Split tool. |
| 9 | **Sign PDF** | PDF | Medium | ReportLab + canvas | Draw/upload signature → overlay onto PDF page. |
| 10 | **PDF Repair** | PDF | Low | PyPDF2 (exists) | Read → rewrite to fix broken xref tables. |

### 4.2 MEDIUM PRIORITY — Differentiators present on 2–3 competitors

| # | Tool | Category | Complexity | Dependencies | Notes |
|---|---|---|---|---|---|
| 11 | **PDF to PDF/A** | PDF | Medium | Ghostscript (exists) | Archival format conversion. |
| 12 | **Flatten PDF** | PDF | Low | PyPDF2 (exists) | Remove form fields / annotations → flat page. |
| 13 | **Crop PDF** | PDF | Medium | PyPDF2 (exists) | Crop margins / adjust page boundaries. |
| 14 | **Compare PDFs** | PDF | High | `diff-match-patch` + PyPDF2 | Side-by-side visual diff of two documents. |
| 15 | **QR Code Generator** | Utility | Low | `qrcode` + Pillow | Text/URL → QR image. Client-side possible but backend for API. |
| 16 | **Barcode Generator** | Utility | Low | `python-barcode` | Generate Code128, EAN, UPC barcodes. |
| 17 | **Image Crop** | Image | Low | Pillow (exists) | Visual cropping UI → backend Pillow crop. |
| 18 | **Image Rotate / Flip** | Image | Low | Pillow (exists) | 90°/180°/270° + horizontal/vertical flip. |
| 19 | **Image Filters** | Image | Low | Pillow (exists) | Grayscale, sepia, blur, sharpen, brightness, contrast. |

### 4.3 LOW PRIORITY — Advanced / niche (1–2 competitors, premium features)

| # | Tool | Category | Complexity | Dependencies | Notes |
|---|---|---|---|---|---|
| 20 | **AI Chat with PDF** | AI | High | OpenRouter (exists) | Upload PDF → ask questions. Flowchart service has partial foundation. |
| 21 | **AI PDF Summarizer** | AI | Medium | OpenRouter (exists) | Extract text → prompt LLM for summary. |
| 22 | **AI PDF Translator** | AI | Medium | OpenRouter (exists) | Extract text → translate via LLM → overlay or return translated doc. |
| 23 | **PDF Form Filler** | PDF | High | ReportLab + PyPDF2 | Detect form fields → UI to fill → save. |
| 24 | **Redact PDF** | PDF | Medium | ReportLab + PyPDF2 | Blackout sensitive text regions. |
| 25 | **PDF Metadata Editor** | PDF | Low | PyPDF2 (exists) | Edit title, author, subject, keywords. |
| 26 | **eSign / Digital Signature** | PDF | High | `cryptography` + PKCS#7 | Cryptographic digital signatures (different from visual sign). |
| 27 | **Batch Processing** | All | Medium | Existing tasks | Upload multiple files → apply same operation to all. |
| 28 | **GIF to Video** | Video | Medium | ffmpeg (exists) | Reverse of Video to GIF. |
| 29 | **Video Compress** | Video | Medium | ffmpeg (exists) | Reduce video file size. |
| 30 | **Audio Extract** | Video | Low | ffmpeg (exists) | Extract audio track from video → MP3/WAV. |
| 31 | **Screenshot to PDF** | Utility | Low | Pillow (exists) | Paste screenshot → generate PDF (similar to Images to PDF). |
| 32 | **Markdown to PDF** | Utility | Low | `markdown` + WeasyPrint | Render Markdown → PDF. |
| 33 | **JSON / CSV Viewer** | Utility | Low | Client-side | Pretty-print structured data. |

---

## 5. Implementation Readiness Matrix

Tools grouped by effort required (backend dependencies already present in the project):

### Ready to build (dependencies exist: PyPDF2, Pillow, Ghostscript, ffmpeg)

| Tool | Effort | Reuses |
|---|---|---|
| Compress Image | ~2h | `image_service.py` + Pillow |
| Reorder Pages | ~3h | `pdf_tools_service.py` + PyPDF2 |
| Extract Pages | ~2h | Split tool pattern |
| PDF Repair | ~2h | PyPDF2 read/write |
| Flatten PDF | ~2h | PyPDF2 |
| Crop PDF | ~3h | PyPDF2 MediaBox |
| Image Crop | ~2h | Pillow |
| Image Rotate/Flip | ~2h | Pillow |
| Image Filters | ~3h | Pillow ImageFilter |
| PDF Metadata Editor | ~2h | PyPDF2 |
| PDF to PDF/A | ~2h | Ghostscript (exists in Dockerfile) |
| QR Code Generator | ~2h | `qrcode` pip package |
| AI PDF Summarizer | ~3h | `ai_chat_service.py` + OpenRouter |
| GIF to Video | ~2h | ffmpeg |
| Audio Extract | ~2h | ffmpeg |

### Need new dependencies (1 pip package)

| Tool | New Dependency | Effort |
|---|---|---|
| PDF to Excel | `camelot-py[cv]` or `tabula-py` | ~4h |
| PDF to PowerPoint | `python-pptx` | ~4h |
| Excel to PDF | LibreOffice CLI (exists) | ~3h |
| PowerPoint to PDF | LibreOffice CLI (exists) | ~3h |
| HTML to PDF | `weasyprint` or `playwright` | ~4h |
| Sign PDF | ReportLab (exists) + canvas overlay | ~6h |
| Barcode Generator | `python-barcode` | ~2h |
| Markdown to PDF | `markdown` + `weasyprint` | ~3h |

### Requires significant new architecture

| Tool | Complexity | Effort |
|---|---|---|
| AI Chat with PDF | RAG pipeline or full-doc prompt | ~8h |
| AI PDF Translator | OCR + LLM + overlay | ~8h |
| PDF Form Filler | Field detection + fill engine | ~10h |
| Redact PDF | Region detection + blackout overlay | ~6h |
| Compare PDFs | Diff algorithm + visual rendering | ~10h |
| eSign / Digital Signature | PKCS#7 cryptographic signing | ~10h |
| Batch Processing | Queue orchestration for multi-file | ~6h |
| Video Compress | ffmpeg transcoding | ~4h |

---

## 6. Summary

| Metric | Count |
|---|---|
| **Existing tools** | 21 |
| **Missing HIGH priority** | 10 |
| **Missing MEDIUM priority** | 9 |
| **Missing LOW priority** | 14 |
| **Total gap** | 33 |
| **Backend tests** | 180 ✅ |
| **Frontend build** | ✅ Clean |
| **Blueprints** | 18 |
| **Celery task modules** | 10 |
| **Service files** | 15 |
| **i18n languages** | 3 (en, ar, fr) |

### Competitor Parity Score

| Competitor | Their tools | We match | Coverage |
|---|---|---|---|
| iLovePDF | ~25 core | ~16 | 64% |
| SmallPDF | ~21 core | ~15 | 71% |
| TinyWow | ~50+ (many AI) | ~14 | 28% |
| PDF24 | ~30 core | ~17 | 57% |

### Recommended Next Sprint

**Highest ROI — 6 tools to reach 80%+ parity with SmallPDF/iLovePDF:**

1. Compress Image (Pillow — already installed)
2. PDF to Excel (`camelot-py`)
3. HTML to PDF (`weasyprint`)
4. Sign PDF (ReportLab overlay)
5. Reorder Pages (PyPDF2 — already installed)
6. PDF to PowerPoint (`python-pptx`)
