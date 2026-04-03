# Dociva — Free Online Tools Platform

A free SaaS platform offering PDF, image, video, and text processing tools. Built with **Python Flask** (backend) and **React + Vite** (frontend), powered by **Celery + Redis** for async processing.

**Live at:** [https://dociva.io](https://dociva.io)

## 🛠 Tools (Current)

1. **PDF Conversion** — PDF↔Word
2. **PDF Optimization** — Compress PDF
3. **PDF Utilities** — Merge, split, rotate, page numbers, watermark
4. **PDF Security** — Protect and unlock PDF
5. **PDF/Image Tools** — PDF→Images, Images→PDF
6. **Image Tools** — Convert and resize images
7. **Video Tools** — Video→GIF
8. **Text Tools** — Word counter and text cleaner
9. **Flowchart Tools** — Extract procedures from PDF and generate flowcharts (+ sample mode)
10. **Accounts & History** — Email/password sign-in with recent generated-file history

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Python 3.12 + Flask 3.x |
| Task Queue | Celery 5.x + Redis |
| File Processing | LibreOffice, Ghostscript, Pillow, ffmpeg |
| Frontend | React 18 + Vite 5 + TypeScript |
| Styling | Tailwind CSS (RTL support) |
| i18n | react-i18next (Arabic + English + French) |
| Storage | AWS S3 (temp files with auto-cleanup) |
| CDN | AWS CloudFront |
| Server | AWS EC2 + Nginx |

## 🚀 Quick Start (Development)

```bash
# 1. Clone the repo
git clone https://github.com/aborayan2022/SaaS-PDF.git
cd SaaS-PDF

# 2. Copy environment file
cp .env.example .env
cp frontend/.env.example frontend/.env

# For AI tools like Chat with PDF, set your OpenRouter credentials in .env
# OPENROUTER_API_KEY=your-openrouter-key

# 3. Start all services with Docker
docker-compose up --build

# 4. Access the app
# Frontend: http://localhost:5173
# Backend API: http://localhost:5000/api
# Celery Flower: http://localhost:5555
```

## ⚙️ Runtime Limits (Default)

- File retention: **30 minutes** (`FILE_EXPIRY_SECONDS=1800`)
- PDF max size: **20MB**
- Word max size: **15MB**
- Image max size: **10MB**
- Video max size: **50MB**

## 🔐 Accounts & Sessions

- Session-backed authentication via `/api/auth/*`
- Free account creation with email + password
- Recent generated-file history via `/api/history`
- Persistent SQLite storage at `DATABASE_PATH` (defaults to `backend/data/dociva.db` locally)

## 📈 Analytics & Ads Env

- `VITE_GA_MEASUREMENT_ID`
- `VITE_ADSENSE_CLIENT_ID`
- `VITE_ADSENSE_SLOT_HOME_TOP`
- `VITE_ADSENSE_SLOT_HOME_BOTTOM`
- `VITE_ADSENSE_SLOT_TOP_BANNER`
- `VITE_ADSENSE_SLOT_BOTTOM_BANNER`
- `DATABASE_PATH`

## 🔎 IndexNow

- Verification file is published at `frontend/public/718dc0aa7c7d4d3ebe71e3f97dacef9c.txt` and copied into the production build.
- Dry-run the payload locally with `cd frontend && npm run indexnow:dry-run`.
- Submit the current sitemap URLs manually with `cd frontend && npm run indexnow:submit`.
- Production deploys call `scripts/deploy.sh`, which runs the same submission step after the health check when `INDEXNOW_AUTO_SUBMIT` is not disabled.
- Successful submissions persist a local state snapshot so later deploys only notify changed or removed URLs instead of re-sending the full sitemap every time.
- `INDEXNOW_STRICT=true` now fails the deployment when the IndexNow request fails.
- Optional env overrides: `INDEXNOW_KEY`, `INDEXNOW_ENDPOINT`, `INDEXNOW_AUTO_SUBMIT`, `INDEXNOW_STRICT`, and `INDEXNOW_FULL_SUBMIT`.

## 📁 Project Structure

```
Dociva/
├── backend/          # Flask API + Celery Workers
├── frontend/         # React + Vite + TypeScript
├── nginx/            # Reverse proxy configuration
├── scripts/          # Deployment & maintenance scripts
├── docs/             # Project documentation
├── docker-compose.yml
└── docker-compose.prod.yml
```

## 💰 Revenue Model

- **Google AdSense** — Ads on result/download pages
- **Freemium** (next phase) — Pro features: no ads, higher limits, API access

## 📄 License

MIT
