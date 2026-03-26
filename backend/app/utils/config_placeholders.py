"""Helpers for treating sample config values as missing runtime configuration."""
import re

_MASKED_SEQUENCE_RE = re.compile(r"(x{6,}|\*{4,})", re.IGNORECASE)


def normalize_optional_config(
    value: str | None,
    placeholder_markers: tuple[str, ...] = (),
) -> str:
    """Return a stripped config value, or blank when it still looks like a sample."""
    normalized = str(value or "").strip()
    if not normalized:
        return ""

    lowered = normalized.lower()
    if any(marker.lower() in lowered for marker in placeholder_markers if marker):
        return ""

    if _MASKED_SEQUENCE_RE.search(normalized):
        return ""

    return normalized


def has_real_config(
    value: str | None,
    placeholder_markers: tuple[str, ...] = (),
) -> bool:
    """Return True when the value is present and not an obvious placeholder."""
    return bool(normalize_optional_config(value, placeholder_markers))
