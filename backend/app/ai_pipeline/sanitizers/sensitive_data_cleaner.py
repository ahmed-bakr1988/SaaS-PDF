"""SensitiveDataCleaner — strips credentials and secrets from converted text.

Always-on, non-configurable, applied before chunking and export.
"""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

REPLACEMENT = "[REDACTED]"

# Ordered list of (compiled pattern, label) pairs.
# Labels are collected into metrics.noise_removed when any match occurs.
_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'(?i)(api[_\s\-]?key|apikey)\s*[:=]\s*\S+'), "api_key"),
    (re.compile(r'(?i)(secret)\s*[:=]\s*\S+'), "secret"),
    (re.compile(r'(?i)(password|passwd|pwd)\s*[:=]\s*\S+'), "password"),
    (re.compile(r'(?i)(token)\s*[:=]\s*\S+'), "token"),
    (re.compile(r'(?i)(bearer)\s+\S+'), "bearer_token"),
    (re.compile(r'(?i)(aws_secret|AWS_SECRET)\w*\s*=\s*\S+'), "aws_secret"),
    (re.compile(r'-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----'), "private_key"),
    (re.compile(r'sk-[A-Za-z0-9]{20,}'), "openai_key"),
    (re.compile(r'ghp_[A-Za-z0-9]{36}'), "github_token"),
    (re.compile(r'xoxb-[0-9]+-\S+'), "slack_token"),
    (re.compile(r'xoxp-[0-9]+-\S+'), "slack_token"),
    (re.compile(r'AIza[0-9A-Za-z\-_]{35}'), "google_api_key"),
]


def clean(text: str) -> tuple[str, list[str]]:
    """Apply all sensitive-data patterns to *text*.

    Returns:
        (cleaned_text, list_of_removed_labels)
    """
    removed: set[str] = set()
    for pattern, label in _PATTERNS:
        cleaned, count = pattern.subn(REPLACEMENT, text)
        if count:
            removed.add(label)
            text = cleaned
    if removed:
        logger.debug("SensitiveDataCleaner: redacted %s", sorted(removed))
    return text, sorted(removed)
