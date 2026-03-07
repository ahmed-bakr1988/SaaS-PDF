FROM python:3.12-slim-bookworm

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies for file processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-draw \
    ghostscript \
    ffmpeg \
    libmagic1 \
    imagemagick \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-ara \
    tesseract-ocr-fra \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && python -c "import PyPDF2; print('PyPDF2 OK')"

# Copy application code
COPY . .

# Create temp and persistence directories
RUN mkdir -p /tmp/uploads /tmp/outputs /app/data

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Run with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "wsgi:app"]
