"""AI cost tracking service — monitors and limits AI API spending.

Supports both SQLite (development) and PostgreSQL (production).
"""

import logging
import os
from datetime import datetime, timezone

from flask import current_app

from app.utils.database import db_connection, execute_query, is_postgres, row_to_dict

logger = logging.getLogger(__name__)

AI_MONTHLY_BUDGET = float(os.getenv("AI_MONTHLY_BUDGET", "50.0"))
COST_PER_1K_INPUT_TOKENS = float(os.getenv("AI_COST_PER_1K_INPUT", "0.0"))
COST_PER_1K_OUTPUT_TOKENS = float(os.getenv("AI_COST_PER_1K_OUTPUT", "0.0"))


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _current_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def init_ai_cost_db():
    """Create AI cost tracking table if not exists."""
    with db_connection() as conn:
        if is_postgres():
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ai_cost_log (
                    id SERIAL PRIMARY KEY,
                    tool TEXT NOT NULL,
                    model TEXT NOT NULL,
                    input_tokens INTEGER DEFAULT 0,
                    output_tokens INTEGER DEFAULT 0,
                    estimated_cost_usd REAL DEFAULT 0.0,
                    period_month TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_ai_cost_period
                ON ai_cost_log(period_month)
            """)
        else:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS ai_cost_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tool TEXT NOT NULL,
                    model TEXT NOT NULL,
                    input_tokens INTEGER DEFAULT 0,
                    output_tokens INTEGER DEFAULT 0,
                    estimated_cost_usd REAL DEFAULT 0.0,
                    period_month TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_ai_cost_period
                ON ai_cost_log(period_month);
                """
            )


def log_ai_usage(
    tool: str,
    model: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cost_per_1k_input: float | None = None,
    cost_per_1k_output: float | None = None,
) -> None:
    """Log an AI API call with token usage.

    If cost_per_1k_input / cost_per_1k_output are provided they take precedence
    over the module-level env constants (useful for per-model pricing from
    the OpenRouter model registry).
    """
    in_rate = cost_per_1k_input if cost_per_1k_input is not None else COST_PER_1K_INPUT_TOKENS
    out_rate = cost_per_1k_output if cost_per_1k_output is not None else COST_PER_1K_OUTPUT_TOKENS
    estimated_cost = (input_tokens / 1000.0) * in_rate + (output_tokens / 1000.0) * out_rate

    with db_connection() as conn:
        sql = (
            """INSERT INTO ai_cost_log
           (tool, model, input_tokens, output_tokens, estimated_cost_usd, period_month, created_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s)"""
            if is_postgres()
            else """INSERT INTO ai_cost_log
           (tool, model, input_tokens, output_tokens, estimated_cost_usd, period_month, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)"""
        )
        execute_query(
            conn,
            sql,
            (
                tool,
                model,
                input_tokens,
                output_tokens,
                estimated_cost,
                _current_month(),
                _utc_now(),
            ),
        )

    logger.info(
        "AI usage: tool=%s model=%s in=%d out=%d cost=$%.4f",
        tool,
        model,
        input_tokens,
        output_tokens,
        estimated_cost,
    )


def get_monthly_spend() -> dict:
    """Get the current month's AI spending summary."""
    month = _current_month()

    with db_connection() as conn:
        sql = (
            """SELECT
             COUNT(*) as total_calls,
             COALESCE(SUM(input_tokens), 0) as total_input_tokens,
             COALESCE(SUM(output_tokens), 0) as total_output_tokens,
             COALESCE(SUM(estimated_cost_usd), 0.0) as total_cost
           FROM ai_cost_log
           WHERE period_month = %s"""
            if is_postgres()
            else """SELECT
             COUNT(*) as total_calls,
             COALESCE(SUM(input_tokens), 0) as total_input_tokens,
             COALESCE(SUM(output_tokens), 0) as total_output_tokens,
             COALESCE(SUM(estimated_cost_usd), 0.0) as total_cost
           FROM ai_cost_log
           WHERE period_month = ?"""
        )
        cursor = execute_query(conn, sql, (month,))
        row = row_to_dict(cursor.fetchone())

        return {
            "period": month,
            "total_calls": row["total_calls"],
            "total_input_tokens": row["total_input_tokens"],
            "total_output_tokens": row["total_output_tokens"],
            "total_cost_usd": round(row["total_cost"], 4),
            "budget_usd": AI_MONTHLY_BUDGET,
            "budget_remaining_usd": round(AI_MONTHLY_BUDGET - row["total_cost"], 4),
            "budget_used_percent": round(
                (row["total_cost"] / AI_MONTHLY_BUDGET * 100)
                if AI_MONTHLY_BUDGET > 0
                else 0,
                1,
            ),
        }


def is_budget_exceeded() -> bool:
    """Check if the monthly AI budget has been exceeded."""
    spend = get_monthly_spend()
    return spend["total_cost_usd"] >= AI_MONTHLY_BUDGET


def check_ai_budget() -> None:
    """Raise an error if AI budget is exceeded. Call before making AI requests."""
    if is_budget_exceeded():
        raise AiBudgetExceededError(
            "Monthly AI processing budget has been reached. Please try again next month."
        )


class AiBudgetExceededError(Exception):
    """Raised when the monthly AI budget is exceeded."""

    pass
