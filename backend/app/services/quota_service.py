"""
QuotaService
Manages usage quotas and limits for Free, Pro, and Business tiers

Quota Structure:
- Free: 5 conversions/day, 10MB max file size, no batch processing
- Pro: 100 conversions/day, 100MB max file size, batch processing (5 files)
- Business: Unlimited conversions, 500MB max file size, batch processing (20 files)

Tracks:
- Daily usage (resets at UTC midnight)
- Storage usage
- API rate limits
- Feature access (premium features)
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from flask import current_app
from app.services.account_service import _connect, _utc_now

logger = logging.getLogger(__name__)


class QuotaLimits:
    """Define quota limits for each tier"""

    # Conversions per day
    CONVERSIONS_PER_DAY = {
        "free": 5,
        "pro": 100,
        "business": float("inf"),
    }

    # Maximum file size in MB
    MAX_FILE_SIZE_MB = {
        "free": 10,
        "pro": 100,
        "business": 500,
    }

    # Storage limit in MB (monthly)
    STORAGE_LIMIT_MB = {
        "free": 500,
        "pro": 5000,
        "business": float("inf"),
    }

    # API rate limit (requests per minute)
    API_RATE_LIMIT = {
        "free": 10,
        "pro": 60,
        "business": float("inf"),
    }

    # Concurrent processing jobs
    CONCURRENT_JOBS = {
        "free": 1,
        "pro": 3,
        "business": 10,
    }

    # Batch file limit
    BATCH_FILE_LIMIT = {
        "free": 1,
        "pro": 5,
        "business": 20,
    }

    # Premium features (Pro/Business)
    PREMIUM_FEATURES = {
        "free": set(),
        "pro": {"batch_processing", "priority_queue", "email_delivery", "api_access"},
        "business": {
            "batch_processing",
            "priority_queue",
            "email_delivery",
            "api_access",
            "webhook",
            "sso",
        },
    }


class QuotaService:
    """Service for managing user quotas and usage tracking"""

    @staticmethod
    def _ensure_quota_tables():
        """Create quota tracking tables if they don't exist"""
        conn = _connect()
        try:
            # Daily usage tracking
            conn.execute("""
                CREATE TABLE IF NOT EXISTS daily_usage (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    conversions INTEGER DEFAULT 0,
                    files_processed INTEGER DEFAULT 0,
                    total_size_mb REAL DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, date),
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            # Storage usage tracking
            conn.execute("""
                CREATE TABLE IF NOT EXISTS storage_usage (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    month TEXT NOT NULL,
                    total_size_mb REAL DEFAULT 0,
                    file_count INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, month),
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            # API rate limiting
            conn.execute("""
                CREATE TABLE IF NOT EXISTS api_requests (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    endpoint TEXT NOT NULL,
                    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            # Feature access log
            conn.execute("""
                CREATE TABLE IF NOT EXISTS feature_access (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    feature TEXT NOT NULL,
                    accessed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    allowed BOOLEAN DEFAULT 1,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            conn.commit()
            logger.info("Quota tables initialized")
        except Exception as e:
            logger.error(f"Failed to create quota tables: {e}")
            raise
        finally:
            conn.close()

    @staticmethod
    def init_quota_db():
        """Initialize quota tracking database"""
        QuotaService._ensure_quota_tables()

    @staticmethod
    def get_user_plan(user_id: int) -> str:
        """Get user's current plan"""
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT plan FROM users WHERE id = ?", (user_id,)
            ).fetchone()
            return row["plan"] if row else "free"
        finally:
            conn.close()

    @staticmethod
    def get_daily_usage(user_id: int, date: Optional[str] = None) -> Dict:
        """
        Get daily usage for a user

        Args:
            user_id: User ID
            date: Date in YYYY-MM-DD format (defaults to today)

        Returns:
            Usage stats dict
        """
        if not date:
            date = datetime.utcnow().strftime("%Y-%m-%d")

        conn = _connect()
        try:
            row = conn.execute(
                "SELECT * FROM daily_usage WHERE user_id = ? AND date = ?",
                (user_id, date),
            ).fetchone()

            if not row:
                return {
                    "conversions": 0,
                    "files_processed": 0,
                    "total_size_mb": 0,
                }

            return dict(row)
        finally:
            conn.close()

    @staticmethod
    def record_conversion(user_id: int, file_size_mb: float) -> bool:
        """
        Record a file conversion

        Args:
            user_id: User ID
            file_size_mb: File size in MB

        Returns:
            True if allowed, False if quota exceeded
        """
        plan = QuotaService.get_user_plan(user_id)
        today = datetime.utcnow().strftime("%Y-%m-%d")

        conn = _connect()
        try:
            # Check daily conversion limit
            usage = conn.execute(
                "SELECT conversions FROM daily_usage WHERE user_id = ? AND date = ?",
                (user_id, today),
            ).fetchone()

            current_conversions = usage["conversions"] if usage else 0
            limit = QuotaLimits.CONVERSIONS_PER_DAY[plan]

            if current_conversions >= limit and limit != float("inf"):
                logger.warning(f"User {user_id} exceeded daily conversion limit")
                return False

            # Check file size limit
            max_size = QuotaLimits.MAX_FILE_SIZE_MB[plan]
            if file_size_mb > max_size:
                logger.warning(
                    f"User {user_id} file exceeds size limit: {file_size_mb}MB > {max_size}MB"
                )
                return False

            # Record the conversion
            conn.execute(
                """
                INSERT INTO daily_usage (user_id, date, conversions, files_processed, total_size_mb)
                VALUES (?, ?, 1, 1, ?)
                ON CONFLICT(user_id, date) DO UPDATE SET
                    conversions = conversions + 1,
                    files_processed = files_processed + 1,
                    total_size_mb = total_size_mb + ?
                """,
                (user_id, today, file_size_mb, file_size_mb),
            )
            conn.commit()

            logger.info(f"Recorded conversion for user {user_id}: {file_size_mb}MB")
            return True
        except Exception as e:
            logger.error(f"Failed to record conversion: {e}")
            return False
        finally:
            conn.close()

    @staticmethod
    def check_rate_limit(user_id: int) -> Tuple[bool, int]:
        """
        Check if user has exceeded API rate limit

        Args:
            user_id: User ID

        Returns:
            (allowed, remaining_requests_in_window) tuple
        """
        plan = QuotaService.get_user_plan(user_id)
        limit = QuotaLimits.API_RATE_LIMIT[plan]

        if limit == float("inf"):
            return True, -1  # Unlimited

        # Check requests in last minute
        one_minute_ago = (datetime.utcnow() - timedelta(minutes=1)).isoformat()

        conn = _connect()
        try:
            count = conn.execute(
                "SELECT COUNT(*) as count FROM api_requests WHERE user_id = ? AND timestamp > ?",
                (user_id, one_minute_ago),
            ).fetchone()["count"]

            if count >= limit:
                return False, 0

            # Record this request
            conn.execute(
                "INSERT INTO api_requests (user_id, endpoint) VALUES (?, ?)",
                (user_id, "api"),
            )
            conn.commit()

            return True, limit - count - 1
        finally:
            conn.close()

    @staticmethod
    def has_feature(user_id: int, feature: str) -> bool:
        """
        Check if user has access to a premium feature

        Args:
            user_id: User ID
            feature: Feature name (e.g., 'batch_processing')

        Returns:
            True if user can access feature
        """
        plan = QuotaService.get_user_plan(user_id)
        allowed = feature in QuotaLimits.PREMIUM_FEATURES[plan]

        # Log feature access attempt
        conn = _connect()
        try:
            conn.execute(
                "INSERT INTO feature_access (user_id, feature, allowed) VALUES (?, ?, ?)",
                (user_id, feature, allowed),
            )
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to log feature access: {e}")
        finally:
            conn.close()

        return allowed

    @staticmethod
    def get_quota_status(user_id: int) -> Dict:
        """
        Get comprehensive quota status for a user

        Args:
            user_id: User ID

        Returns:
            Complete quota status dict
        """
        plan = QuotaService.get_user_plan(user_id)
        today = datetime.utcnow().strftime("%Y-%m-%d")

        conn = _connect()
        try:
            # Get daily usage
            daily = conn.execute(
                "SELECT conversions FROM daily_usage WHERE user_id = ? AND date = ?",
                (user_id, today),
            ).fetchone()

            conversions_used = daily["conversions"] if daily else 0
            conversions_limit = QuotaLimits.CONVERSIONS_PER_DAY[plan]

            return {
                "plan": plan,
                "conversions": {
                    "used": conversions_used,
                    "limit": conversions_limit,
                    "remaining": conversions_limit - conversions_used
                    if conversions_limit != float("inf")
                    else -1,
                    "reset_at": (datetime.utcnow() + timedelta(days=1)).replace(
                        hour=0, minute=0, second=0
                    ),
                },
                "file_size_limit_mb": QuotaLimits.MAX_FILE_SIZE_MB[plan],
                "storage_limit_mb": QuotaLimits.STORAGE_LIMIT_MB[plan],
                "api_rate_limit": QuotaLimits.API_RATE_LIMIT[plan],
                "concurrent_jobs": QuotaLimits.CONCURRENT_JOBS[plan],
                "batch_file_limit": QuotaLimits.BATCH_FILE_LIMIT[plan],
                "features": list(QuotaLimits.PREMIUM_FEATURES[plan]),
                "can_batch_process": QuotaService.has_feature(
                    user_id, "batch_processing"
                ),
                "can_use_api": QuotaService.has_feature(user_id, "api_access"),
                "can_schedule_delivery": QuotaService.has_feature(
                    user_id, "email_delivery"
                ),
            }
        finally:
            conn.close()

    @staticmethod
    def get_monthly_storage_usage(user_id: int, year: int, month: int) -> float:
        """Get storage usage for a specific month"""
        month_key = f"{year}-{month:02d}"

        conn = _connect()
        try:
            row = conn.execute(
                "SELECT total_size_mb FROM storage_usage WHERE user_id = ? AND month = ?",
                (user_id, month_key),
            ).fetchone()

            return row["total_size_mb"] if row else 0
        finally:
            conn.close()

    @staticmethod
    def upgrade_plan(user_id: int, new_plan: str) -> bool:
        """
        Upgrade user to a new plan

        Args:
            user_id: User ID
            new_plan: New plan ('pro' or 'business')

        Returns:
            Success status
        """
        if new_plan not in QuotaLimits.CONVERSIONS_PER_DAY:
            logger.error(f"Invalid plan: {new_plan}")
            return False

        conn = _connect()
        try:
            conn.execute(
                "UPDATE users SET plan = ?, updated_at = ? WHERE id = ?",
                (new_plan, _utc_now(), user_id),
            )
            conn.commit()
            logger.info(f"User {user_id} upgraded to {new_plan}")
            return True
        except Exception as e:
            logger.error(f"Failed to upgrade user plan: {e}")
            return False
        finally:
            conn.close()

    @staticmethod
    def downgrade_plan(user_id: int, new_plan: str = "free") -> bool:
        """Downgrade user to a lower plan"""
        return QuotaService.upgrade_plan(user_id, new_plan)


# Convenience functions
def init_quota_db():
    return QuotaService.init_quota_db()


def get_quota_status(user_id: int) -> Dict:
    return QuotaService.get_quota_status(user_id)


def record_conversion(user_id: int, file_size_mb: float) -> bool:
    return QuotaService.record_conversion(user_id, file_size_mb)


def check_rate_limit(user_id: int) -> Tuple[bool, int]:
    return QuotaService.check_rate_limit(user_id)


def has_feature(user_id: int, feature: str) -> bool:
    return QuotaService.has_feature(user_id, feature)
