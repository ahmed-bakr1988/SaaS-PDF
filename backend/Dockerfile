FROM python:3.12-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# Install system dependencies with retries suitable for CI/CD and production builds.
RUN set -eux; \
    success=''; \
    for attempt in 1 2 3; do \
        if apt-get update -o Acquire::Retries=5 -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30 -o Acquire::ForceIPv4=true && \
            apt-get install -y --no-install-recommends \
                tini \
                libreoffice-core \
                libreoffice-writer \
                libreoffice-calc \
                libreoffice-draw \
                libreoffice-impress \
                ghostscript \
                ffmpeg \
                libmagic1 \
                imagemagick \
                tesseract-ocr \
                tesseract-ocr-eng \
                tesseract-ocr-ara \
                tesseract-ocr-fra \
                poppler-utils \
                default-jre-headless \
                curl; then \
            success=1; \
            break; \
        fi; \
        echo "apt install failed on attempt ${attempt}; retrying in 10s" >&2; \
        rm -rf /var/lib/apt/lists/*; \
        sleep 10; \
    done; \
    test -n "$success"; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

# Ensure Java is on PATH for tabula-py (extract-tables, pdf-to-excel)
ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy requirements first for Docker layer caching
COPY requirements.txt .
RUN pip install -r requirements.txt --retries 5 --timeout 60 \
    && python -c "import PyPDF2; print('PyPDF2 OK')"

# Copy application code
COPY . .

# Create temp and persistence directories
RUN mkdir -p /tmp/uploads /tmp/outputs /app/data

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health/live || exit 1

ENTRYPOINT ["tini", "--"]

# Run with Gunicorn using external config file
CMD ["gunicorn", "-c", "gunicorn_config.py", "wsgi:app"]
