import os
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REPO_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))

# Load the repository-level .env first because the documented setup stores it there.
load_dotenv(os.path.join(REPO_ROOT, ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=False)


def _parse_csv_env(name: str) -> tuple[str, ...]:
    raw_value = os.getenv(name, "")
    return tuple(item.strip().lower() for item in raw_value.split(",") if item.strip())


def _env_or_default(name: str, default: str) -> str:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    normalized = raw_value.strip()
    return normalized or default


class BaseConfig:
    """Base configuration."""

    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    INTERNAL_ADMIN_SECRET = os.getenv("INTERNAL_ADMIN_SECRET", "")
    INTERNAL_ADMIN_EMAILS = _parse_csv_env("INTERNAL_ADMIN_EMAILS")

    # File upload settings
    MAX_CONTENT_LENGTH = (
        int(os.getenv("ABSOLUTE_MAX_CONTENT_LENGTH_MB", 100)) * 1024 * 1024
    )
    UPLOAD_FOLDER = _env_or_default("UPLOAD_FOLDER", "/tmp/uploads")
    OUTPUT_FOLDER = _env_or_default("OUTPUT_FOLDER", "/tmp/outputs")
    FILE_EXPIRY_SECONDS = int(os.getenv("FILE_EXPIRY_SECONDS", 1800))
    STORAGE_ALLOW_LOCAL_FALLBACK = (
        os.getenv("STORAGE_ALLOW_LOCAL_FALLBACK", "true").lower() == "true"
    )
    DATABASE_PATH = _env_or_default(
        "DATABASE_PATH", os.path.join(BASE_DIR, "data", "dociva.db")
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
        "html": ["text/html", "application/xhtml+xml"],
        "htm": ["text/html", "application/xhtml+xml"],
        "zip": ["application/zip", "application/x-zip-compressed"],
        "png": ["image/png"],
        "jpg": ["image/jpeg"],
        "jpeg": ["image/jpeg"],
        "webp": ["image/webp"],
        "tiff": ["image/tiff"],
        "bmp": ["image/bmp"],
        "mp4": ["video/mp4"],
        "webm": ["video/webm"],
        "pptx": [
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ],
        "ppt": ["application/vnd.ms-powerpoint"],
        "xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
        "xls": ["application/vnd.ms-excel"],
    }

    # File size limits per type (bytes)
    FILE_SIZE_LIMITS = {
        "pdf": 20 * 1024 * 1024,  # 20MB
        "doc": 15 * 1024 * 1024,  # 15MB
        "docx": 15 * 1024 * 1024,  # 15MB
        "html": 10 * 1024 * 1024,  # 10MB
        "htm": 10 * 1024 * 1024,  # 10MB
        "zip": 25 * 1024 * 1024,  # 25MB
        "png": 10 * 1024 * 1024,  # 10MB
        "jpg": 10 * 1024 * 1024,  # 10MB
        "jpeg": 10 * 1024 * 1024,  # 10MB
        "webp": 10 * 1024 * 1024,  # 10MB
        "tiff": 15 * 1024 * 1024,  # 15MB
        "bmp": 15 * 1024 * 1024,  # 15MB
        "mp4": 50 * 1024 * 1024,  # 50MB
        "webm": 50 * 1024 * 1024,  # 50MB
        "pptx": 20 * 1024 * 1024,  # 20MB
        "ppt": 20 * 1024 * 1024,  # 20MB
        "xlsx": 15 * 1024 * 1024,  # 15MB
        "xls": 15 * 1024 * 1024,  # 15MB
    }

    # Redis
    REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

    # Celery
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/1")

    # AWS S3
    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "dociva-temp-files")
    AWS_S3_REGION = os.getenv("AWS_S3_REGION", "eu-west-1")

    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

    # Rate Limiting
    RATELIMIT_STORAGE_URI = os.getenv("REDIS_URL", "redis://redis:6379/0")
    RATELIMIT_DEFAULT = "100/hour"

    # Gemini AI (primary provider — Google AI Studio)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    GEMINI_TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.0-flash")
    GEMINI_TRANSLATE_MODEL = os.getenv("GEMINI_TRANSLATE_MODEL", "gemini-2.0-flash")
    GEMINI_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-2.0-flash")

    # OpenRouter AI (temporary fallback — kept until Gemini is stable in prod)
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL = os.getenv(
        "OPENROUTER_MODEL", "nvidia/nemotron-3-super-120b-a12b:free"
    )
    OPENROUTER_BASE_URL = os.getenv(
        "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1/chat/completions"
    )

    # Premium translation provider (recommended for Translate PDF)
    DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "")
    DEEPL_API_URL = os.getenv(
        "DEEPL_API_URL", "https://api-free.deepl.com/v2/translate"
    )
    DEEPL_TIMEOUT_SECONDS = int(os.getenv("DEEPL_TIMEOUT_SECONDS", 90))

    # SMTP (for password reset emails)
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", "noreply@dociva.io")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    BACKEND_PUBLIC_URL = _env_or_default(
        "BACKEND_PUBLIC_URL", os.getenv("FRONTEND_URL", "http://localhost:5173")
    )

    # Social auth (OAuth)
    GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")
    GOOGLE_OAUTH_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "")
    FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID", "")
    FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")
    FACEBOOK_GRAPH_API_VERSION = os.getenv("FACEBOOK_GRAPH_API_VERSION", "v23.0")
    X_CLIENT_ID = os.getenv("X_CLIENT_ID", "")
    X_CLIENT_SECRET = os.getenv("X_CLIENT_SECRET", "")

    # Stripe (legacy — kept for existing subscribers during PayPal transition)
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    STRIPE_PRICE_ID_PRO_MONTHLY = os.getenv("STRIPE_PRICE_ID_PRO_MONTHLY", "")
    STRIPE_PRICE_ID_PRO_YEARLY = os.getenv("STRIPE_PRICE_ID_PRO_YEARLY", "")

    # PayPal Subscriptions (primary payment provider)
    # PAYPAL_ENVIRONMENT: "sandbox" for testing, "live" for production
    PAYPAL_ENVIRONMENT = os.getenv("PAYPAL_ENVIRONMENT", "sandbox")
    PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
    PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")
    # Webhook ID is found in PayPal Developer Dashboard → Webhooks
    PAYPAL_WEBHOOK_ID = os.getenv("PAYPAL_WEBHOOK_ID", "")
    PAYPAL_PLAN_ID_PRO_MONTHLY = os.getenv("PAYPAL_PLAN_ID_PRO_MONTHLY", "")
    PAYPAL_PLAN_ID_PRO_YEARLY = os.getenv("PAYPAL_PLAN_ID_PRO_YEARLY", "")
    PAYPAL_PLAN_ID_PRO_MONTHLY_TRIAL = os.getenv("PAYPAL_PLAN_ID_PRO_MONTHLY_TRIAL", "")
    PAYPAL_PLAN_ID_PRO_YEARLY_TRIAL = os.getenv("PAYPAL_PLAN_ID_PRO_YEARLY_TRIAL", "")

    # Sentry
    SENTRY_DSN = os.getenv("SENTRY_DSN", "")
    SENTRY_ENVIRONMENT = os.getenv("SENTRY_ENVIRONMENT", "development")

    # Site domain
    SITE_DOMAIN = os.getenv("SITE_DOMAIN", "https://dociva.io")

    # PostgreSQL (production) — set DATABASE_URL to use PG instead of SQLite
    DATABASE_URL = os.getenv("DATABASE_URL", "")

    # Feature flags (default: enabled — set to "false" to disable a feature)
    FEATURE_EDITOR = os.getenv("FEATURE_EDITOR", "true").lower() == "true"
    FEATURE_OCR = os.getenv("FEATURE_OCR", "true").lower() == "true"
    FEATURE_REMOVEBG = os.getenv("FEATURE_REMOVEBG", "true").lower() == "true"

    # HTML-to-PDF rendering
    HTML_TO_PDF_RENDERER = os.getenv("HTML_TO_PDF_RENDERER", "auto").strip().lower()
    HTML_TO_PDF_ENABLE_WEASYPRINT_FALLBACK = (
        os.getenv("HTML_TO_PDF_ENABLE_WEASYPRINT_FALLBACK", "true").lower()
        == "true"
    )
    HTML_TO_PDF_ALLOW_REMOTE_ASSETS = (
        os.getenv("HTML_TO_PDF_ALLOW_REMOTE_ASSETS", "false").lower() == "true"
    )
    HTML_TO_PDF_BROWSER_TIMEOUT_MS = int(
        os.getenv("HTML_TO_PDF_BROWSER_TIMEOUT_MS", 45000)
    )
    HTML_TO_PDF_BROWSER_DISABLE_SANDBOX = (
        os.getenv("HTML_TO_PDF_BROWSER_DISABLE_SANDBOX", "true").lower()
        == "true"
    )
    HTML_TO_PDF_ARCHIVE_MAX_ENTRIES = int(
        os.getenv("HTML_TO_PDF_ARCHIVE_MAX_ENTRIES", 512)
    )
    HTML_TO_PDF_ARCHIVE_MAX_UNCOMPRESSED_BYTES = (
        int(os.getenv("HTML_TO_PDF_ARCHIVE_MAX_UNCOMPRESSED_MB", 100))
        * 1024
        * 1024
    )


class DevelopmentConfig(BaseConfig):
    """Development configuration."""

    DEBUG = True
    TESTING = False


class ProductionConfig(BaseConfig):
    """Production configuration."""

    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = "Lax"
    # Stricter rate limits in production
    RATELIMIT_DEFAULT = "60/hour"


class TestingConfig(BaseConfig):
    """Testing configuration."""

    DEBUG = True
    TESTING = True
    UPLOAD_FOLDER = "/tmp/test_uploads"
    OUTPUT_FOLDER = "/tmp/test_outputs"
    DATABASE_PATH = "/tmp/test_dociva.db"
    FEATURE_EDITOR = False
    FEATURE_OCR = False
    FEATURE_REMOVEBG = False
    HTML_TO_PDF_RENDERER = "weasyprint"
    HTML_TO_PDF_ENABLE_WEASYPRINT_FALLBACK = True

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
