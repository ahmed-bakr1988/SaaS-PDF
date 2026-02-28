"""Rate limiting middleware configuration."""
from app.extensions import limiter


# Custom rate limits for specific operations
UPLOAD_LIMIT = "10/minute"
DOWNLOAD_LIMIT = "30/minute"
API_LIMIT = "100/hour"


def get_upload_limit():
    """Get the rate limit for file upload endpoints."""
    return UPLOAD_LIMIT


def get_download_limit():
    """Get the rate limit for file download endpoints."""
    return DOWNLOAD_LIMIT
