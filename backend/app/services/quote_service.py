"""Central credit-quote engine — calculate and lock a price before dispatch.

The quote engine sits between route handlers and the credit/policy layer.
It produces a ``CreditQuote`` that is:
  1. Shown to the user in the 202 response.
  2. Used to deduct credits (instead of the old fixed-cost path).
  3. Stored in usage_events.quoted_credits for audit.

Light/medium tools still get a fixed quote (== tier cost, no size factor).
Heavy and AI tools get a dynamic quote based on file size and estimated
tokens (for AI tools).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.services.account_service import (
    consume_welcome_bonus,
    is_welcome_bonus_available,
)
from app.services.credit_config import (
    calculate_dynamic_cost,
    get_tool_credit_cost,
    is_dynamic_tool,
)
from app.services.credit_service import (
    deduct_credits_quoted,
    get_rolling_balance,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CreditQuote:
    """An immutable, pre-dispatch credit quote."""

    tool: str
    base_cost: int          # fixed tier cost
    quoted_credits: int     # final cost after dynamic calc
    charged_credits: int    # actual credits that will be deducted (0 if welcome bonus)
    welcome_bonus_applied: bool
    is_dynamic: bool
    file_size_kb: float
    estimated_tokens: int
    balance_before: int
    balance_after: int

    def to_dict(self) -> dict:
        """Serialize for JSON response payloads."""
        return {
            "tool": self.tool,
            "quoted_credits": self.quoted_credits,
            "charged_credits": self.charged_credits,
            "welcome_bonus_applied": self.welcome_bonus_applied,
            "is_dynamic": self.is_dynamic,
            "file_size_kb": round(self.file_size_kb, 1),
            "balance_before": self.balance_before,
            "balance_after": self.balance_after,
        }


class QuoteError(Exception):
    """Quote could not be fulfilled (insufficient credits, etc.)."""

    def __init__(self, message: str, status_code: int = 402):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


# ── Public API ──────────────────────────────────────────────────

def create_quote(
    user_id: int | None,
    plan: str,
    tool: str,
    file_size_kb: float = 0,
    estimated_tokens: int = 0,
) -> CreditQuote:
    """Build a quote for one tool invocation.

    For anonymous users (user_id is None), returns a zero-cost quote
    because guest budget is handled separately by guest_budget_service.
    """
    if user_id is None:
        base = get_tool_credit_cost(tool)
        return CreditQuote(
            tool=tool,
            base_cost=base,
            quoted_credits=base,
            charged_credits=0,
            welcome_bonus_applied=False,
            is_dynamic=False,
            file_size_kb=file_size_kb,
            estimated_tokens=estimated_tokens,
            balance_before=0,
            balance_after=0,
        )

    dynamic = is_dynamic_tool(tool)
    base = get_tool_credit_cost(tool)

    if dynamic:
        quoted = calculate_dynamic_cost(tool, file_size_kb, estimated_tokens)
    else:
        quoted = base

    balance = get_rolling_balance(user_id, plan)

    # Welcome bonus: first transaction is free
    bonus_available = is_welcome_bonus_available(user_id)
    if bonus_available:
        charged = 0
    else:
        charged = quoted

    if charged > balance:
        raise QuoteError(
            f"Insufficient credits: {balance} remaining, {charged} required for {tool}.",
            402,
        )

    balance_after = balance - charged

    return CreditQuote(
        tool=tool,
        base_cost=base,
        quoted_credits=quoted,
        charged_credits=charged,
        welcome_bonus_applied=bonus_available,
        is_dynamic=dynamic,
        file_size_kb=file_size_kb,
        estimated_tokens=estimated_tokens,
        balance_before=balance,
        balance_after=balance_after,
    )


def estimate_quote(
    user_id: int | None,
    plan: str,
    tool: str,
    file_size_kb: float = 0,
    estimated_tokens: int = 0,
) -> dict:
    """Return a non-binding estimate (for the frontend pre-upload panel).

    Does NOT lock or deduct anything — purely informational.
    """
    try:
        quote = create_quote(user_id, plan, tool, file_size_kb, estimated_tokens)
        result = quote.to_dict()
        result["affordable"] = True
        return result
    except QuoteError as exc:
        base = get_tool_credit_cost(tool)
        dynamic = is_dynamic_tool(tool)
        if dynamic:
            quoted = calculate_dynamic_cost(tool, file_size_kb, estimated_tokens)
        else:
            quoted = base
        balance = get_rolling_balance(user_id, plan) if user_id else 0
        return {
            "tool": tool,
            "quoted_credits": quoted,
            "charged_credits": quoted,
            "welcome_bonus_applied": False,
            "is_dynamic": dynamic,
            "file_size_kb": round(file_size_kb, 1),
            "balance_before": balance,
            "balance_after": balance - quoted,
            "affordable": False,
            "reason": exc.message,
        }


def fulfill_quote(
    quote: CreditQuote,
    user_id: int,
    plan: str,
) -> int:
    """Deduct credits based on a locked quote. Returns credits charged.

    If welcome bonus is applied, the bonus is consumed atomically and
    zero credits are deducted from the rolling window.
    """
    if quote.welcome_bonus_applied:
        consumed = consume_welcome_bonus(user_id)
        if not consumed:
            # Race condition: bonus was consumed between quote and fulfill.
            # Fall back to normal deduction.
            logger.warning(
                "Welcome bonus race for user %d — falling back to normal deduction",
                user_id,
            )
            return deduct_credits_quoted(user_id, plan, quote.quoted_credits)
        logger.info(
            "Welcome bonus applied for user %d, tool=%s, cost=%d waived",
            user_id,
            quote.tool,
            quote.quoted_credits,
        )
        return 0

    if quote.charged_credits == 0:
        return 0

    return deduct_credits_quoted(user_id, plan, quote.charged_credits)
