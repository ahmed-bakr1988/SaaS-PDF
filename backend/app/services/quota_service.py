"""
QuotaService
Manages usage quotas and limits for Free, Pro, and Business tiers
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from flask import current_app
from app.utils.database import db_connection, execute_query, is_postgres, row_to_dict
from app.services.account_service import _utc_now

logger = logging.getLogger(__name__)


class QuotaLimits:
    """Define quota limits for each tier"""

    CONVERSIONS_PER_DAY = {
        "free": 5,
        "micro": 10,  # Limits handled fully in track logic
        "pro": 100,
        "business": float("inf"),
    }

    MAX_FILE_SIZE_MB = {
        "free": 10,
        "micro": 100,
        "pro": 100,
        "business": 500,
    }

    STORAGE_LIMIT_MB = {
        "free": 500,
        "micro": 5000,
        "pro": 5000,
        "business": float("inf"),
    }

    API_RATE_LIMIT = {
        "free": 10,
        "micro": 60,
        "pro": 60,
        "business": float("inf"),
    }

    CONCURRENT_JOBS = {
        "free": 1,
        "micro": 3,
        "pro": 3,
        "business": 10,
    }

    BATCH_FILE_LIMIT = {
        "free": 1,
        "micro": 5,
        "pro": 5,
        "business": 20,
    }

    PREMIUM_FEATURES = {
        "free": set(),
        "micro": {"batch_processing", "priority_queue", "email_delivery", "api_access"},
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
        with db_connection() as conn:
            if is_postgres():
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS daily_usage (
                        id SERIAL PRIMARY KEY,
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
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS storage_usage (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        month TEXT NOT NULL,
                        total_size_mb REAL DEFAULT 0,
                        file_count INTEGER DEFAULT 0,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, month),
                        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS api_requests (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        endpoint TEXT NOT NULL,
                        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS feature_access (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        feature TEXT NOT NULL,
                        accessed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        allowed BOOLEAN DEFAULT TRUE,
                        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS micro_plan_usage (
                        user_id INTEGER PRIMARY KEY,
                        files_used INTEGER DEFAULT 0,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
            else:
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
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS api_requests (
                        id INTEGER PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        endpoint TEXT NOT NULL,
                        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
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
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS micro_plan_usage (
                        user_id INTEGER PRIMARY KEY,
                        files_used INTEGER DEFAULT 0,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)

            logger.info("Quota tables initialized")

    @staticmethod
    def init_quota_db():
        """Initialize quota tracking database"""
        QuotaService._ensure_quota_tables()

    @staticmethod
    def get_user_plan(user_id: int) -> str:
        """Get user's current plan"""
        with db_connection() as conn:
            sql = (
                "SELECT plan FROM users WHERE id = %s"
                if is_postgres()
                else "SELECT plan FROM users WHERE id = ?"
            )
            cursor = execute_query(conn, sql, (user_id,))
            row = row_to_dict(cursor.fetchone())
            return row["plan"] if row else "free"

    @staticmethod
    def get_daily_usage(user_id: int, date: Optional[str] = None) -> Dict:
        if not date:
            date = datetime.utcnow().strftime("%Y-%m-%d")

        with db_connection() as conn:
            sql = (
                "SELECT * FROM daily_usage WHERE user_id = %s AND date = %s"
                if is_postgres()
                else "SELECT * FROM daily_usage WHERE user_id = ? AND date = ?"
            )
            cursor = execute_query(conn, sql, (user_id, date))
            row = row_to_dict(cursor.fetchone())

            if not row:
                return {
                    "conversions": 0,
                    "files_processed": 0,
                    "total_size_mb": 0,
                }
            return row

    @staticmethod
    def record_conversion(user_id: int, file_size_mb: float) -> bool:
        plan = QuotaService.get_user_plan(user_id)
        today = datetime.utcnow().strftime("%Y-%m-%d")

        with db_connection() as conn:
            sql = (
                "SELECT conversions FROM daily_usage WHERE user_id = %s AND date = %s"
                if is_postgres()
                else "SELECT conversions FROM daily_usage WHERE user_id = ? AND date = ?"
            )
            cursor = execute_query(conn, sql, (user_id, today))
            usage = row_to_dict(cursor.fetchone())

            current_conversions = usage["conversions"] if usage else 0
            limit = QuotaLimits.CONVERSIONS_PER_DAY[plan]

            if current_conversions >= limit and limit != float("inf"):
                logger.warning(f"User {user_id} exceeded daily conversion limit")
                return False

            max_size = QuotaLimits.MAX_FILE_SIZE_MB[plan]
            if file_size_mb > max_size:
                logger.warning(
                    f"User {user_id} file exceeds size limit: {file_size_mb}MB > {max_size}MB"
                )
                return False

            upsert_sql = (
                """
                INSERT INTO daily_usage (user_id, date, conversions, files_processed, total_size_mb)
                VALUES (%s, %s, 1, 1, %s)
                ON CONFLICT(user_id, date) DO UPDATE SET
                    conversions = conversions + 1,
                    files_processed = files_processed + 1,
                    total_size_mb = total_size_mb + %s
            """
                if is_postgres()
                else """
                INSERT INTO daily_usage (user_id, date, conversions, files_processed, total_size_mb)
                VALUES (?, ?, 1, 1, ?)
                ON CONFLICT(user_id, date) DO UPDATE SET
                    conversions = conversions + 1,
                    files_processed = files_processed + 1,
                    total_size_mb = total_size_mb + ?
            """
            )
            execute_query(
                conn, upsert_sql, (user_id, today, file_size_mb, file_size_mb)
            )

            logger.info(f"Recorded conversion for user {user_id}: {file_size_mb}MB")
            
            # Micro Plan Usage Check
            if plan == "micro":
                upsert_micro_sql = (
                    """
                    INSERT INTO micro_plan_usage (user_id, files_used)
                    VALUES (%s, 1)
                    ON CONFLICT(user_id) DO UPDATE SET
                        files_used = micro_plan_usage.files_used + 1,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING files_used
                    """
                    if is_postgres()
                    else """
                    INSERT INTO micro_plan_usage (user_id, files_used)
                    VALUES (?, 1)
                    ON CONFLICT(user_id) DO UPDATE SET
                        files_used = micro_plan_usage.files_used + 1,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING files_used
                    """
                )
                micro_cursor = execute_query(conn, upsert_micro_sql, (user_id,))
                micro_usage_row = micro_cursor.fetchone()
                micro_files_used = micro_usage_row["files_used"] if micro_usage_row else 1
                
                if micro_files_used >= 10:
                    logger.info(f"User {user_id} reached 10 files on micro plan. Downgrading to free and cancelling subscription.")
                    from app.services.paypal_service import cancel_paypal_subscription
                    # Upgrade to free immediately
                    QuotaService.downgrade_plan(user_id, "free")
                    # Attempt to cancel PayPal subscription
                    try:
                        cancel_paypal_subscription(user_id)
                    except Exception as e:
                        logger.error(f"Failed to cancel paypal subscription for user {user_id}: {e}")

            return True

    @staticmethod
    def check_rate_limit(user_id: int) -> Tuple[bool, int]:
        plan = QuotaService.get_user_plan(user_id)
        limit = QuotaLimits.API_RATE_LIMIT[plan]

        if limit == float("inf"):
            return True, -1

        one_minute_ago = (datetime.utcnow() - timedelta(minutes=1)).isoformat()

        with db_connection() as conn:
            sql = (
                "SELECT COUNT(*) as count FROM api_requests WHERE user_id = %s AND timestamp > %s"
                if is_postgres()
                else "SELECT COUNT(*) as count FROM api_requests WHERE user_id = ? AND timestamp > ?"
            )
            cursor = execute_query(conn, sql, (user_id, one_minute_ago))
            row = row_to_dict(cursor.fetchone())
            count = row["count"] if row else 0

            if count >= limit:
                return False, 0

            sql2 = (
                "INSERT INTO api_requests (user_id, endpoint) VALUES (%s, %s)"
                if is_postgres()
                else "INSERT INTO api_requests (user_id, endpoint) VALUES (?, ?)"
            )
            execute_query(conn, sql2, (user_id, "api"))

            return True, limit - count - 1

    @staticmethod
    def has_feature(user_id: int, feature: str) -> bool:
        plan = QuotaService.get_user_plan(user_id)
        allowed = feature in QuotaLimits.PREMIUM_FEATURES[plan]

        try:
            with db_connection() as conn:
                sql = (
                    "INSERT INTO feature_access (user_id, feature, allowed) VALUES (%s, %s, %s)"
                    if is_postgres()
                    else "INSERT INTO feature_access (user_id, feature, allowed) VALUES (?, ?, ?)"
                )
                execute_query(conn, sql, (user_id, feature, allowed))
        except Exception as e:
            logger.error(f"Failed to log feature access: {e}")

        return allowed

    @staticmethod
    def get_quota_status(user_id: int) -> Dict:
        plan = QuotaService.get_user_plan(user_id)
        today = datetime.utcnow().strftime("%Y-%m-%d")

        with db_connection() as conn:
            sql = (
                "SELECT conversions FROM daily_usage WHERE user_id = %s AND date = %s"
                if is_postgres()
                else "SELECT conversions FROM daily_usage WHERE user_id = ? AND date = ?"
            )
            cursor = execute_query(conn, sql, (user_id, today))
            daily = row_to_dict(cursor.fetchone())

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

    @staticmethod
    def get_monthly_storage_usage(user_id: int, year: int, month: int) -> float:
        month_key = f"{year}-{month:02d}"

        with db_connection() as conn:
            sql = (
                "SELECT total_size_mb FROM storage_usage WHERE user_id = %s AND month = %s"
                if is_postgres()
                else "SELECT total_size_mb FROM storage_usage WHERE user_id = ? AND month = ?"
            )
            cursor = execute_query(conn, sql, (user_id, month_key))
            row = row_to_dict(cursor.fetchone())
            return row["total_size_mb"] if row else 0

    @staticmethod
    def upgrade_plan(user_id: int, new_plan: str) -> bool:
        if new_plan not in QuotaLimits.CONVERSIONS_PER_DAY:
            logger.error(f"Invalid plan: {new_plan}")
            return False

        with db_connection() as conn:
            sql = (
                "UPDATE users SET plan = %s, updated_at = %s WHERE id = %s"
                if is_postgres()
                else "UPDATE users SET plan = ?, updated_at = ? WHERE id = ?"
            )
            execute_query(conn, sql, (new_plan, _utc_now(), user_id))
            
            # Reset micro usage if upgrading to micro
            if new_plan == "micro":
                reset_micro_sql = (
                    "INSERT INTO micro_plan_usage (user_id, files_used) VALUES (%s, 0) ON CONFLICT(user_id) DO UPDATE SET files_used = 0, updated_at = CURRENT_TIMESTAMP"
                    if is_postgres()
                    else "INSERT INTO micro_plan_usage (user_id, files_used) VALUES (?, 0) ON CONFLICT(user_id) DO UPDATE SET files_used = 0, updated_at = CURRENT_TIMESTAMP"
                )
                execute_query(conn, reset_micro_sql, (user_id,))
                
            logger.info(f"User {user_id} upgraded to {new_plan}")
            return True

    @staticmethod
    def downgrade_plan(user_id: int, new_plan: str = "free") -> bool:
        return QuotaService.upgrade_plan(user_id, new_plan)


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
