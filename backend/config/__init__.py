import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class BaseConfig:
    """Base configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    INTERNAL_ADMIN_SECRET = os.getenv("INTERNAL_ADMIN_SECRET", "")

    # File upload settings
    MAX_CONTENT_LENGTH = int(
        os.getenv("ABSOLUTE_MAX_CONTENT_LENGTH_MB", 100)
    ) * 1024 * 1024
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "/tmp/uploads")
    OUTPUT_FOLDER = os.getenv("OUTPUT_FOLDER", "/tmp/outputs")
    FILE_EXPIRY_SECONDS = int(os.getenv("FILE_EXPIRY_SECONDS", 1800))
    DATABASE_PATH = os.getenv(
        "DATABASE_PATH", os.path.join(BASE_DIR, "data", "saas_pdf.db")
    )
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False

    # Allowed file extensions and MIME types
    ALLOWED_EXTENSIONS = {
        "pdf": ["application/pdf"],
        "doc": ["application/msword"],
        "docx": [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        "png": ["image/png"],
        "jpg": ["image/jpeg"],
        "jpeg": ["image/jpeg"],
        "webp": ["image/webp"],
        "tiff": ["image/tiff"],
        "bmp": ["image/bmp"],
        "mp4": ["video/mp4"],
        "webm": ["video/webm"],
    }

    # File size limits per type (bytes)
    FILE_SIZE_LIMITS = {
        "pdf": 20 * 1024 * 1024,      # 20MB
        "doc": 15 * 1024 * 1024,       # 15MB
        "docx": 15 * 1024 * 1024,      # 15MB
        "png": 10 * 1024 * 1024,       # 10MB
        "jpg": 10 * 1024 * 1024,       # 10MB
        "jpeg": 10 * 1024 * 1024,      # 10MB
        "webp": 10 * 1024 * 1024,      # 10MB
        "tiff": 15 * 1024 * 1024,      # 15MB
        "bmp": 15 * 1024 * 1024,       # 15MB
        "mp4": 50 * 1024 * 1024,       # 50MB
        "webm": 50 * 1024 * 1024,      # 50MB
    }

    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

    # Celery
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/1")

    # AWS S3
    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "saas-pdf-temp-files")
    AWS_S3_REGION = os.getenv("AWS_S3_REGION", "eu-west-1")

    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

    # Rate Limiting
    RATELIMIT_STORAGE_URI = os.getenv("REDIS_URL", "redis://redis:6379/0")
    RATELIMIT_DEFAULT = "100/hour"

    # OpenRouter AI
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3-8b-instruct")
    OPENROUTER_BASE_URL = os.getenv(
        "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1/chat/completions"
    )

    # SMTP (for password reset emails)
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", "noreply@saas-pdf.com")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Feature flags
    FEATURE_EDITOR = os.getenv("FEATURE_EDITOR", "false").lower() == "true"


class DevelopmentConfig(BaseConfig):
    """Development configuration."""
    DEBUG = True
    TESTING = False


class ProductionConfig(BaseConfig):
    """Production configuration."""
    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True
    # Stricter rate limits in production
    RATELIMIT_DEFAULT = "60/hour"


class TestingConfig(BaseConfig):
    """Testing configuration."""
    DEBUG = True
    TESTING = True
    UPLOAD_FOLDER = "/tmp/test_uploads"
    OUTPUT_FOLDER = "/tmp/test_outputs"
    DATABASE_PATH = "/tmp/test_saas_pdf.db"

    # Disable Redis-backed rate limiting; use in-memory instead
    RATELIMIT_STORAGE_URI = "memory://"
    RATELIMIT_ENABLED = False

    # Use in-memory transport for Celery so tests don't need Redis
    CELERY_BROKER_URL = "memory://"
    CELERY_RESULT_BACKEND = "cache+memory://"
    REDIS_URL = "memory://"


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
