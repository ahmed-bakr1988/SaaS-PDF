# Dociva — Current Tool Inventory & Competitive Gap Analysis

> Updated: March 25, 2026
> Source of truth: current code in `frontend/src/App.tsx`, `frontend/src/pages/HomePage.tsx`, `backend/app/routes`, and `backend/app/routes/v1/tools.py`

---

## 1. Current Platform Snapshot

| Area | Current state |
|---|---|
| Backend | Flask + Gunicorn + Celery + Redis |
| Frontend | React + Vite + TypeScript + Tailwind |
| Storage | Local filesystem + optional S3 |
| Accounts | Session auth + usage history + API keys |
| Monetization | Ad slots + pricing page + Stripe subscription plumbing |
| API | `/api/v1/*` B2B surface for a significant subset of tools |
| i18n | English, Arabic, French |
| SEO | Tool landing pages + structured data + generated public SEO files |

### Operational counts

| Metric | Count |
|---|---|
| Registered blueprints | 33 |
| Backend route modules | 33 |
| Backend service modules | 32 |
| Backend task modules | 20 |
| Frontend tool components | 44 |
| Direct frontend tool routes | 44 |
| Homepage tool cards surfaced | 33 |
| Backend test files | 38 |
| Frontend test files | 6 |

### Plans & quotas

From `backend/app/services/policy_service.py`:

| Plan | Web requests/month | API requests/month | History retention | Effective upload limits |
|---|---:|---:|---:|---|
| Free | 50 | — | 25 | Base file-size limits from backend config |
| Pro | 500 | 1,000 | 250 | 2x backend file-size limits |

---

## 2. Current Tool Inventory — 44 Direct Tool Routes

These are the currently wired tool routes in `frontend/src/App.tsx`.

### 2.1 Core PDF Tools (14)

1. Compress PDF
2. PDF to Word
3. Word to PDF
4. Merge PDF
5. Split PDF
6. Rotate PDF
7. PDF to Images
8. Images to PDF
9. Watermark PDF
10. Protect PDF
11. Unlock PDF
12. Add Page Numbers
13. PDF Editor
14. PDF Flowchart

### 2.2 Image Tools (6)

15. Image Converter
16. Image Resize
17. Compress Image
18. OCR
19. Remove Background
20. Image to SVG

### 2.3 Conversion Tools (2)

21. PDF to Excel
22. HTML to PDF

### 2.4 PDF Extra Tools (3)

23. Remove Watermark
24. Reorder PDF
25. Extract Pages

### 2.5 AI Tools (4)

26. Chat with PDF
27. Summarize PDF
28. Translate PDF
29. Extract Tables

### 2.6 Utility / Other Tools (1)

30. QR Code Generator

### 2.7 Video Tools (1)

31. Video to GIF

### 2.8 Text Tools (2)

32. Word Counter
33. Text Cleaner

### 2.9 Phase 2 — PDF Conversion (4)

34. PDF to PowerPoint
35. Excel to PDF
36. PowerPoint to PDF
37. Sign PDF

### 2.10 Phase 2 — PDF Extra (4)

38. Crop PDF
39. Flatten PDF
40. Repair PDF
41. PDF Metadata Editor

### 2.11 Phase 2 — Image & Utility (3)

42. Image Crop
43. Image Rotate / Flip
44. Barcode Generator

---

## 3. Homepage Coverage vs Full Catalog

The codebase exposes **44** tool routes, but the homepage currently surfaces **33** tools.

### Surfaced on homepage

The homepage includes the core catalog and several growth-focused tools, including:

- Core PDF tools
- Core image tools
- OCR / remove background
- PDF to Excel
- HTML to PDF
- Chat / summarize / translate / table extraction
- QR code
- Video to GIF
- Word counter / text cleaner

### Implemented but not surfaced on homepage

The following routes exist but are not currently represented on the homepage tool grid:

- PDF to PowerPoint
- Excel to PDF
- PowerPoint to PDF
- Sign PDF
- Crop PDF
- Flatten PDF
- Repair PDF
- PDF Metadata Editor
- Image Crop
- Image Rotate / Flip
- Barcode Generator

This is an important product and growth gap: implementation breadth is currently ahead of homepage discovery.

---

## 4. Backend / API Coverage

### Web app coverage

The web app has direct frontend routes for all 44 tools listed above.

### B2B API coverage

`backend/app/routes/v1/tools.py` exposes a substantial subset of the platform through `/api/v1/*`, including:

- PDF conversion and compression
- Major PDF tools
- Image conversion and resize
- Video to GIF
- OCR
- Remove background
- AI PDF workflows
- PDF to Excel
- HTML to PDF
- QR and barcode generation
- PDF to PowerPoint / Excel to PDF / PowerPoint to PDF
- Sign PDF
- Crop / flatten / repair / metadata
- Image crop / image rotate-flip

This means the platform is no longer only a consumer-facing tools site; it already has real API-product potential.

---

## 5. Test & Quality Snapshot

### Backend

- `38` backend test files currently exist under `backend/tests`
- Sample backend verification run on March 25, 2026:
  - `backend/tests/test_file_validator.py`
  - `backend/tests/test_html_to_pdf.py`
  - `backend/tests/test_auth.py`
  - `backend/tests/test_history.py`
  - Result: `24/24` tests passed

### Frontend

- `6` frontend test files currently exist under `frontend/src`
- Verified on March 25, 2026:
  - Result: `64/64` tests passed

### Build

- Frontend production build passes successfully

---

## 6. What Is No Longer Missing

The earlier inventory marked many of the following as gaps. They are now implemented in the current codebase:

- Compress Image
- PDF to Excel
- PDF to PowerPoint
- Excel to PDF
- PowerPoint to PDF
- HTML to PDF
- Reorder PDF Pages
- Extract Pages
- Sign PDF
- PDF Repair
- Flatten PDF
- Crop PDF
- QR Code Generator
- Barcode Generator
- Image Crop
- Image Rotate / Flip
- AI Chat with PDF
- PDF Summarizer
- PDF Translator
- Table Extractor
- PDF Metadata Editor

---

## 7. Remaining Competitive Gaps

Compared against iLovePDF, Smallpdf, PDF24, TinyWow, and Adobe Acrobat online flows, the main remaining gaps are now more focused.

### High-value remaining gaps

1. PDF comparison / diff
2. PDF to PDF/A
3. Batch processing workflows
4. True cryptographic digital signature / eSign
5. PDF form filler
6. PDF redaction
7. Video compression
8. Audio extraction from video
9. GIF to video
10. Image filters / adjustments

### Strategic gaps, not just feature gaps

1. Homepage/catalog mismatch
2. Documentation drift
3. Full production validation for monetization and analytics
4. Sharper positioning for the strongest tool clusters

---

## 8. Competitive Position Today

### Where Dociva is strong

- Unusually broad tool coverage for an early-stage codebase
- Trilingual product surface from the start
- Real SaaS primitives already in place: plans, quotas, billing, API keys
- Async processing architecture suitable for file workflows
- Stronger-than-average SEO foundation for this stage

### Where Dociva is still weaker than category leaders

- Brand trust and distribution
- Workflow polish on every tool
- Product discovery consistency
- Team/business collaboration features
- Proof of production traction

---

## 9. Recommended Next Sprint

### Product quality

1. Keep frontend tests green as part of CI
2. Run a broader backend validation pass
3. Audit hidden tools and decide whether to surface or intentionally defer them

### Documentation

1. Keep this file as the current source of truth for tool counts
2. Update project status and SEO docs whenever route counts or sitemap scale change

### Growth

1. Focus on 8 high-intent landing pages first:
   - Compress PDF
   - PDF to Word
   - Word to PDF
   - Merge PDF
   - PDF to Excel
   - OCR
   - Remove Background
   - HTML to PDF
2. Improve conversion from free use to account creation to Pro/API

---

## 10. Bottom Line

The project is no longer a 21-tool MVP. It is currently a **44-route document-processing platform** with a real SaaS foundation and a growing competitive surface.

The core challenge has shifted:

> The next bottleneck is no longer raw feature count. It is consistency, positioning, discovery, and turning breadth into measurable growth.
