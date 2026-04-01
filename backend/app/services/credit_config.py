"""Unified Credit System — tool cost registry and credit constants.

Every tool has a credit cost. Lighter tools cost 1 credit, heavier
server-side conversions cost 2, CPU/ML-intensive tools cost 3,
and AI-powered tools cost 5+.

This module is the single source of truth for all credit-related
constants consumed by policy_service, credit_service, and the
frontend config endpoint.
"""

import os

# ── Credit allocations per rolling 30-day window ────────────────
FREE_CREDITS_PER_WINDOW = int(os.getenv("FREE_CREDITS_PER_WINDOW", "50"))
PRO_CREDITS_PER_WINDOW = int(os.getenv("PRO_CREDITS_PER_WINDOW", "500"))
CREDIT_WINDOW_DAYS = int(os.getenv("CREDIT_WINDOW_DAYS", "30"))

# ── Guest demo budget (anonymous, pre-registration) ────────────
GUEST_DEMO_BUDGET = int(os.getenv("GUEST_DEMO_BUDGET", "3"))
GUEST_DEMO_TTL_HOURS = int(os.getenv("GUEST_DEMO_TTL_HOURS", "24"))

# ── API quota (Pro only, per rolling window) ────────────────────
PRO_API_CREDITS_PER_WINDOW = int(os.getenv("PRO_API_CREDITS_PER_WINDOW", "1000"))

# ── Cost tiers ──────────────────────────────────────────────────
TIER_LIGHT = 1       # Fast, in-memory or trivial server ops
TIER_MEDIUM = 2      # Server-side conversion (LibreOffice, Ghostscript, etc.)
TIER_HEAVY = 3       # CPU/ML-intensive (OCR, background removal, compression)
TIER_AI = 5          # AI-powered tools (LLM API calls)

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
    """Return the credit cost for a given tool slug."""
    return TOOL_CREDIT_COSTS.get(tool, DEFAULT_CREDIT_COST)


def get_credits_for_plan(plan: str) -> int:
    """Return the total credits per window for a plan."""
    return PRO_CREDITS_PER_WINDOW if plan == "pro" else FREE_CREDITS_PER_WINDOW


def get_all_tool_costs() -> dict[str, int]:
    """Return the full cost registry — used by the config API endpoint."""
    return dict(TOOL_CREDIT_COSTS)
