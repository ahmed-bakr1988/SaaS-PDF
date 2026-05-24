# SaaS-PDF — Project Map & Strategic Directory

## [CURRENT_ARCHITECTURE]
- Monolithic Flask backend serving API routes (`backend/app/routes/`) and executing core conversions and business logic in services (`backend/app/services/`).
- Asynchronous Celery queues broker tasks to worker instances via Redis.
- React/Vite/TS SPA frontend structure (`frontend/src/`) using state stores (`frontend/src/stores/`) and API services (`frontend/src/services/`).

## [CURRENT_TOOL_GROUPS]
1. **Quick Tools** (Strategic Group: `quick-tools`):
   - Merging, splitting, compressing, and rotating PDFs.
   - Purpose: High organic traffic, entry-level free acquisition.
2. **AI Workspace** (Strategic Group: `ai-workspace`):
   - Chat with PDF, AI Summarization, AI Translation, Smart OCR, table extraction.
   - Purpose: Direct monetization, premium subscription value.
3. **Productivity Suite** (Strategic Group: `productivity`):
   - PDF Editor, PDF to Word/Excel/PPTX conversions, format conversions.
   - Purpose: Professional user retention, high utility.
4. **Developer & Utilities** (Strategic Group: `developer`):
   - QR Codes, Barcodes, Word Counters, Text Cleaners.
   - Purpose: API integration target, utility traffic.

## [CURRENT_USER_FLOW]
- User uploads files -> Frontend triggers MIME/size validation -> Flask files saved to temporary paths -> Task queued -> Celery returns task ID -> Polling fetches finished outputs or dynamic errors -> User downloads output.

## [PRICING_FLOW]
- Plans: Free (50 credits/mo), Starter ($4.99/mo, 200 credits), Pro ($9.99/mo, 1000 credits + trial), Business ($29.99/mo).
- Paid plans trigger payment workflows. Contextual alerts redirect to pricing or checkout on credit depletion/file limits/locked features.

## [ADS_LOCATIONS]
- Ads have been completely purged from conversion tools, result views, and authenticated screens.
- Ads are kept strictly on marketing landing pages: SEO page collections, blog articles, comparisons, and footer zones.

## [HIGH_COST_TOOLS]
- AI translation, AI OCR (Tesseract OCR / Dynamic text recognition), AI document summarizing, Playwright HTML renders.

## [LOW_COST_TOOLS]
- PDF metadata edit, rotating, splitting, merging, cropping, flatting.

## [PREMIUM_CANDIDATES]
- AI translation, dynamic OCR, team workspace features, high-concurrency API integrations.

## [SEO_PAGES]
- Dynamic SEO landing pages under `/seo/` and comparison templates (e.g. `Dociva vs iLovePDF`).

## [MOBILE_UX_ISSUES]
- Fixed via `MobileBottomNav` (tab navigation for core flows) and `FloatingUploadButton` for immediate responsive file uploads.

## [ORPHANS_AND_TECH_DEBT]
- Deprecated `.ad-slot` CSS utility styles.
- Standardized tool metadata structure (`toolManifest.ts`) to avoid duplicate config arrays.
