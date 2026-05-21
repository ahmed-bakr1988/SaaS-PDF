"""Unified Credit System — tool cost registry and credit constants.

Every tool has a credit cost. Lighter tools cost 1 credit, heavier
server-side conversions cost 2, CPU/ML-intensive tools cost 3,
and AI-powered tools cost 5+.

Heavy and AI tools use dynamic pricing based on file/request size.
Light and medium tools keep a fixed cost per invocation.

This module is the single source of truth for all credit-related
constants consumed by policy_service, credit_service, quote_service,
and the frontend config endpoint.
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass

# ── Credit allocations per rolling 30-day window ────────────────
FREE_CREDITS_PER_WINDOW    = int(os.getenv("FREE_CREDITS_PER_WINDOW",    "50"))
STARTER_CREDITS_PER_WINDOW = int(os.getenv("STARTER_CREDITS_PER_WINDOW", "200"))
PRO_CREDITS_PER_WINDOW     = int(os.getenv("PRO_CREDITS_PER_WINDOW",     "1000"))
BUSINESS_CREDITS_PER_WINDOW = int(os.getenv("BUSINESS_CREDITS_PER_WINDOW", "0"))  # 0 = Unlimited
CREDIT_WINDOW_DAYS = int(os.getenv("CREDIT_WINDOW_DAYS", "30"))

# ── Guest demo budget (anonymous, pre-registration) ────────────
GUEST_DEMO_BUDGET = int(os.getenv("GUEST_DEMO_BUDGET", "3"))
GUEST_DEMO_TTL_HOURS = int(os.getenv("GUEST_DEMO_TTL_HOURS", "24"))

# ── API quotas per plan (per rolling window) ────────────────────
FREE_API_CREDITS_PER_WINDOW     = 0       # No API access
STARTER_API_CREDITS_PER_WINDOW  = 0       # No API access
PRO_API_CREDITS_PER_WINDOW      = int(os.getenv("PRO_API_CREDITS_PER_WINDOW", "1000"))
BUSINESS_API_CREDITS_PER_WINDOW = int(os.getenv("BUSINESS_API_CREDITS_PER_WINDOW", "10000"))

# ── File upload size limits per plan (MB) ───────────────────────
FREE_MAX_FILE_SIZE_MB      = int(os.getenv("FREE_MAX_FILE_SIZE_MB",      "25"))
STARTER_MAX_FILE_SIZE_MB   = int(os.getenv("STARTER_MAX_FILE_SIZE_MB",   "250"))
PRO_MAX_FILE_SIZE_MB       = int(os.getenv("PRO_MAX_FILE_SIZE_MB",       "1024"))
BUSINESS_MAX_FILE_SIZE_MB  = int(os.getenv("BUSINESS_MAX_FILE_SIZE_MB",  "2048"))

# ── Plan pricing (USD) ──────────────────────────────────────────
PLAN_PRICE_MONTHLY = {"free": 0, "starter": 4.99, "pro": 9.99, "business": 29.99}
PLAN_PRICE_YEARLY  = {"free": 0, "starter": 3.99, "pro": 7.99, "business": 24.99}

# ── Cost tiers ──────────────────────────────────────────────────
TIER_LIGHT = 1       # Fast, in-memory or trivial server ops
TIER_MEDIUM = 2      # Server-side conversion (LibreOffice, Ghostscript, etc.)
TIER_HEAVY = 3       # CPU/ML-intensive (OCR, background removal, compression)
TIER_AI = 5          # AI-powered tools (LLM API calls)

# ── Dynamic pricing model ──────────────────────────────────────
# Tools marked as DYNAMIC_PRICING_TIERS use size-based cost instead of
# fixed tier cost.  The formula is:
#   cost = base + ceil(file_size_kb / step_kb) * per_step
# capped at max_credits.  AI tools also add an estimated-tokens surcharge.

DYNAMIC_PRICING_TIERS: set[str] = {"heavy", "ai"}


@dataclass(frozen=True)
class DynamicPricingRule:
    """Size-based pricing rule for one tool family."""

    base: int           # minimum credits charged
    step_kb: int        # every `step_kb` KB adds `per_step` credits
    per_step: int       # credits added per step
    max_credits: int    # hard cap on credits per invocation

    # AI-specific: extra credits per estimated 1 000 input tokens
    token_step: int = 0          # 0 means no token surcharge
    per_token_step: int = 0


# Default rules per tier — individual tools can override via
# TOOL_DYNAMIC_OVERRIDES below.
HEAVY_DEFAULT_RULE = DynamicPricingRule(
    base=3, step_kb=500, per_step=1, max_credits=10,
)
AI_DEFAULT_RULE = DynamicPricingRule(
    base=5, step_kb=200, per_step=1, max_credits=20,
    token_step=1000, per_token_step=1,
)

# Per-tool overrides (tool slug → rule).
TOOL_DYNAMIC_OVERRIDES: dict[str, DynamicPricingRule] = {
    # Translation is heavier than chat/summarize
    "translate-pdf": DynamicPricingRule(
        base=6, step_kb=150, per_step=1, max_credits=25,
        token_step=1000, per_token_step=1,
    ),
    # Layout-preserving translation (Pro) — pdf2docx + LibreOffice pipeline
    "translate-pdf-layout": DynamicPricingRule(
        base=14, step_kb=150, per_step=2, max_credits=40,
        token_step=1000, per_token_step=1,
    ),
    # Vision-based translation (Pro) — renders pages as images for Vision AI
    "translate-pdf-vision": DynamicPricingRule(
        base=8, step_kb=0, per_step=0, max_credits=80,
        token_step=500, per_token_step=2,
    ),
}


def _tier_label(cost: int) -> str:
    """Return the tier family name for a fixed cost value."""
    if cost >= TIER_AI:
        return "ai"
    if cost >= TIER_HEAVY:
        return "heavy"
    if cost >= TIER_MEDIUM:
        return "medium"
    return "light"


def _get_dynamic_rule(tool: str, tier: str) -> DynamicPricingRule | None:
    """Return the dynamic pricing rule for *tool*, or None if fixed."""
    if tier not in DYNAMIC_PRICING_TIERS:
        return None
    if tool in TOOL_DYNAMIC_OVERRIDES:
        return TOOL_DYNAMIC_OVERRIDES[tool]
    return AI_DEFAULT_RULE if tier == "ai" else HEAVY_DEFAULT_RULE


def is_dynamic_tool(tool: str) -> bool:
    """Return True if *tool* uses size-based dynamic pricing."""
    base = TOOL_CREDIT_COSTS.get(tool, DEFAULT_CREDIT_COST)
    return _tier_label(base) in DYNAMIC_PRICING_TIERS


def calculate_dynamic_cost(
    tool: str,
    file_size_kb: float = 0,
    estimated_tokens: int = 0,
) -> int:
    """Calculate the credit cost for a dynamic tool given size metrics.

    For fixed-price tools this returns the static tier cost unchanged.
    """
    base_cost = TOOL_CREDIT_COSTS.get(tool, DEFAULT_CREDIT_COST)
    tier = _tier_label(base_cost)
    rule = _get_dynamic_rule(tool, tier)
    if rule is None:
        return base_cost

    size_surcharge = (
        math.ceil(max(0, file_size_kb) / rule.step_kb) * rule.per_step
        if rule.step_kb > 0
        else 0
    )
    token_surcharge = 0
    if rule.token_step and estimated_tokens > 0:
        token_surcharge = math.ceil(estimated_tokens / rule.token_step) * rule.per_token_step

    total = rule.base + size_surcharge + token_surcharge
    return min(total, rule.max_credits)

# ── Per-tool credit costs ───────────────────────────────────────
# Keys match the `tool` parameter passed to record_usage_event / routes.
TOOL_CREDIT_COSTS: dict[str, int] = {
    # ─── PDF Core (light operations) ────────────────────────────
    "merge-pdf": TIER_LIGHT,
    "split-pdf": TIER_LIGHT,
    "rotate-pdf": TIER_LIGHT,
    "reorder-pdf": TIER_LIGHT,
    "extract-pages": TIER_LIGHT,
    "page-numbers": TIER_LIGHT,
    "watermark-pdf": TIER_LIGHT,
    "protect-pdf": TIER_LIGHT,
    "unlock-pdf": TIER_LIGHT,
    "flatten-pdf": TIER_LIGHT,
    "repair-pdf": TIER_LIGHT,
    "pdf-metadata": TIER_LIGHT,
    "crop-pdf": TIER_LIGHT,
    "sign-pdf": TIER_LIGHT,
    "pdf-to-images": TIER_LIGHT,
    "images-to-pdf": TIER_LIGHT,

    # ─── Conversion (medium — server-side rendering) ────────────
    "pdf-to-word": TIER_MEDIUM,
    "word-to-pdf": TIER_MEDIUM,
    "pdf-to-excel": TIER_MEDIUM,
    "excel-to-pdf": TIER_MEDIUM,
    "pdf-to-pptx": TIER_MEDIUM,
    "pptx-to-pdf": TIER_MEDIUM,
    "html-to-pdf": TIER_MEDIUM,
    "pdf-editor": TIER_MEDIUM,
    "file-to-markdown": TIER_HEAVY,

    # ─── Image (light to medium) ────────────────────────────────
    "image-converter": TIER_LIGHT,
    "image-resize": TIER_LIGHT,
    "image-crop": TIER_LIGHT,
    "image-rotate-flip": TIER_LIGHT,
    "image-to-svg": TIER_MEDIUM,

    # ─── Image / PDF heavy (CPU/ML) ────────────────────────────
    "compress-pdf": TIER_HEAVY,
    "compress-image": TIER_HEAVY,
    "ocr": TIER_HEAVY,
    "remove-background": TIER_HEAVY,
    "remove-watermark-pdf": TIER_HEAVY,

    # ─── Utility ────────────────────────────────────────────────
    "qr-code": TIER_LIGHT,
    "barcode-generator": TIER_LIGHT,
    "video-to-gif": TIER_MEDIUM,
    "word-counter": TIER_LIGHT,
    "text-cleaner": TIER_LIGHT,

    # ─── AI-powered ─────────────────────────────────────────────
    "chat-pdf": TIER_AI,
    "summarize-pdf": TIER_AI,
    "translate-pdf": TIER_AI,
    "translate-pdf-layout": TIER_AI,
    "translate-pdf-vision": TIER_AI,
    "extract-tables": TIER_AI,
    "pdf-flowchart": TIER_AI,
    # ─── Route-specific aliases ─────────────────────────────────────
    # Some routes record a tool name that differs from the manifest slug.
    # Both names must map to the same cost.
    "barcode": TIER_LIGHT,               # manifest: barcode-generator
    "image-convert": TIER_LIGHT,          # manifest: image-converter
    "ocr-image": TIER_HEAVY,             # manifest: ocr
    "ocr-pdf": TIER_HEAVY,              # manifest: ocr
    "pdf-flowchart-sample": TIER_AI,     # manifest: pdf-flowchart
    "pdf-edit": TIER_MEDIUM,             # manifest: pdf-editor
    "edit-metadata": TIER_LIGHT,         # manifest: pdf-metadata
    "remove-watermark": TIER_HEAVY,      # manifest: remove-watermark-pdf
    "remove-bg": TIER_HEAVY,            # manifest: remove-background
    "video-frames": TIER_MEDIUM,         # route alias for video-to-gif
    "edit-pdf-text": TIER_MEDIUM,        # route alias for pdf-editor
}

# Default cost for any tool not explicitly listed
DEFAULT_CREDIT_COST = TIER_LIGHT


def get_tool_credit_cost(tool: str) -> int:
    """Return the *fixed* credit cost for a given tool slug.

    For dynamic tools this is the base/minimum cost.
    Use :func:`calculate_dynamic_cost` when file size is known.
    """
    return TOOL_CREDIT_COSTS.get(tool, DEFAULT_CREDIT_COST)


# Sentinel value for unlimited credits (business plan)
UNLIMITED_CREDITS = -1


def get_credits_for_plan(plan: str) -> int:
    """Return the total credits per window for a plan.

    Returns UNLIMITED_CREDITS (-1) for the business plan.
    The micro plan is a legacy alias for starter (backwards compatibility).
    """
    plan_map = {
        "free":     FREE_CREDITS_PER_WINDOW,
        "starter":  STARTER_CREDITS_PER_WINDOW,
        "micro":    STARTER_CREDITS_PER_WINDOW,   # legacy alias
        "pro":      PRO_CREDITS_PER_WINDOW,
        "business": UNLIMITED_CREDITS,
    }
    return plan_map.get(plan, FREE_CREDITS_PER_WINDOW)


def get_max_file_size_for_plan(plan: str) -> int:
    """Return the maximum upload size in MB for a given plan."""
    plan_map = {
        "free":     FREE_MAX_FILE_SIZE_MB,
        "starter":  STARTER_MAX_FILE_SIZE_MB,
        "micro":    STARTER_MAX_FILE_SIZE_MB,   # legacy alias
        "pro":      PRO_MAX_FILE_SIZE_MB,
        "business": BUSINESS_MAX_FILE_SIZE_MB,
    }
    return plan_map.get(plan, FREE_MAX_FILE_SIZE_MB)


def plan_has_api_access(plan: str) -> bool:
    """Return True if the given plan includes API access."""
    return plan in ("pro", "business")


def plan_has_feature(plan: str, feature: str) -> bool:
    """Return True if the plan has access to the given premium feature.

    Feature registry:
      - ai_chat:          AI PDF Chat
      - ai_summary:       AI PDF Summarization
      - ai_translate:     AI PDF Translation
      - ocr_advanced:     Advanced Arabic/multilingual OCR
      - batch_processing: Upload and process multiple files at once
      - priority_queue:   Jobs processed ahead of free-tier jobs
      - api_access:       REST API access with token authentication
      - history_cloud:    Cloud file history retention
      - no_ads:           No advertisements
      - email_delivery:   Send results via email
      - teams:            Team workspace sharing
      - white_label:      White-label branding
      - sla_support:      Priority SLA support
    """
    _features: dict[str, set[str]] = {
        "free": set(),
        "starter": {"ai_chat", "ai_summary", "batch_processing", "email_delivery", "no_ads"},
        "micro":   {"ai_chat", "ai_summary", "batch_processing", "email_delivery", "no_ads"},  # legacy
        "pro": {
            "ai_chat", "ai_summary", "ai_translate", "ocr_advanced",
            "batch_processing", "priority_queue", "api_access",
            "history_cloud", "no_ads", "email_delivery",
        },
        "business": {
            "ai_chat", "ai_summary", "ai_translate", "ocr_advanced",
            "batch_processing", "priority_queue", "api_access",
            "history_cloud", "no_ads", "email_delivery",
            "teams", "white_label", "sla_support",
        },
    }
    return feature in _features.get(plan, set())


def get_all_tool_costs() -> dict[str, int]:
    """Return the full cost registry — used by the config API endpoint."""
    return dict(TOOL_CREDIT_COSTS)


def get_dynamic_tools_info() -> dict[str, dict]:
    """Return metadata about tools that use dynamic pricing.

    Used by the config/credit-info endpoint so the frontend can display
    "price varies by file size" for these tools.
    """
    result: dict[str, dict] = {}
    seen: set[str] = set()
    for slug, cost in TOOL_CREDIT_COSTS.items():
        tier = _tier_label(cost)
        rule = _get_dynamic_rule(slug, tier)
        if rule is None:
            continue
        if slug in seen:
            continue
        seen.add(slug)
        result[slug] = {
            "base": rule.base,
            "step_kb": rule.step_kb,
            "per_step": rule.per_step,
            "max_credits": rule.max_credits,
            "has_token_surcharge": rule.token_step > 0,
        }
    return result
