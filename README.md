# SaaS-PDF — Free Online Tools Platform

A free SaaS platform offering PDF, image, video, and text processing tools. Built with **Python Flask** (backend) and **React + Vite** (frontend), powered by **Celery + Redis** for async processing, and deployed on **AWS**.

## 🛠 Tools (MVP)

1. **PDF to Word / Word to PDF** — Convert between PDF and Word documents
2. **PDF Compressor** — Reduce PDF file size with quality options
3. **Image Converter** — Convert between JPG, PNG, WebP formats
4. **Video to GIF** — Create animated GIFs from video clips
5. **Text Tools** — Word counter, text cleaner, case converter (client-side)

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Python 3.12 + Flask 3.x |
| Task Queue | Celery 5.x + Redis |
| File Processing | LibreOffice, Ghostscript, Pillow, ffmpeg |
| Frontend | React 18 + Vite 5 + TypeScript |
| Styling | Tailwind CSS (RTL support) |
| i18n | react-i18next (Arabic + English) |
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

# 3. Start all services with Docker
docker-compose up --build

# 4. Access the app
# Frontend: http://localhost:5173
# Backend API: http://localhost:5000/api
# Celery Flower: http://localhost:5555
```

## 📁 Project Structure

```
SaaS-PDF/
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
- **Freemium** (planned) — Pro features: no ads, higher limits, API access

## 📄 License

MIT
