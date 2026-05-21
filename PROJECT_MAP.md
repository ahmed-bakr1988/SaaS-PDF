[TECH_STACK]
Backend: Flask, Python 3.12, Gunicorn
Async: Celery, Redis, isolated queues
Storage: existing storage_service, S3 or local fallback
Frontend: React, Vite, TypeScript
SEO: toolManifest + seoData seed/generated SEO assets

[SYSTEM_FLOW]
User uploads file -> Flask validates file/quota -> file saved to upload temp path -> Celery task queued -> markdown_convert_service converts to .md -> output stored -> task status returns download_url + preview -> scheduled cleanup removes expired files.

[ARCHITECTURE]
Route: backend/app/routes/markdown_convert.py
Service: backend/app/services/markdown_convert_service.py
Task: backend/app/tasks/markdown_convert_tasks.py
Frontend tool: frontend/src/components/tools/FileToMarkdown.tsx
Registration: frontend/src/config/toolManifest.ts
SEO/i18n: frontend/src/config/seoData.ts, frontend/src/seo/seoData.json, frontend/src/i18n/en.json, frontend/src/i18n/ar.json

[ORPHANS & PENDING]
- MarkItDown 0.1.5 is used as the preferred direct converter, with native and one-step intermediate fallbacks.
- Image Markdown output uses OCR when available, otherwise image metadata.
- Video Markdown output is metadata-only in v1 unless a transcript-capable converter is installed.
- Legacy Office files use the existing LibreOffice-to-PDF path before Markdown extraction.
