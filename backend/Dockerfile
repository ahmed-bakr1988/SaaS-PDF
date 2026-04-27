FROM python:3.12-slim-bookworm

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Configure DNS and apt mirrors for reliability
RUN echo 'nameserver 8.8.8.8' > /etc/resolv.conf && \
    echo 'nameserver 1.1.1.1' >> /etc/resolv.conf && \
    sed -i 's|http://deb.debian.org|http://mirror.example.com|g' /etc/apt/sources.list || true

# Install system dependencies for file processing (with retry logic)
RUN apt-get update -o APT::Acquire::Retries=3 && apt-get install -y --no-install-recommends \
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
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Ensure Java is on PATH for tabula-py (extract-tables, pdf-to-excel)
ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy requirements first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.python.org/simple --retries 5 --timeout 60 \
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

# Run with Gunicorn (--preload ensures DB tables are created once before forking workers)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "--preload", "wsgi:app"]