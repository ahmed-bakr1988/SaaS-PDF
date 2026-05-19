"""LogOptimizer — collapses repetitive log files into a structured summary.

Pure function: takes str, returns (str, list[str]).

For a 100MB log file with 100k INFO lines, this reduces output to a
few hundred lines of meaningful signal.
"""

from __future__ import annotations

import re
from collections import Counter

_MAX_LINES_BEFORE_SUMMARY = 2000
_MAX_UNIQUE_ERRORS = 20
_MAX_UNIQUE_WARNINGS = 20

# Log level detection patterns
_LEVEL_PATTERN = re.compile(
    r"\b(DEBUG|INFO|WARNING|WARN|ERROR|CRITICAL|FATAL|TRACE)\b", re.IGNORECASE
)


def optimize(text: str) -> tuple[str, list[str]]:
    """Summarize a log file, preserving errors/warnings and collapsing INFO spam.

    Returns:
        (optimized_text, noise_removed_labels)
    """
    lines = text.splitlines()
    total = len(lines)

    if total <= _MAX_LINES_BEFORE_SUMMARY:
        # Small log — just run token_optimizer
        from app.ai_pipeline.optimizers import token_optimizer
        return token_optimizer.optimize(text)

    noise: list[str] = []
    counts: Counter = Counter()
    errors: list[str] = []
    warnings: list[str] = []

    for line in lines:
        match = _LEVEL_PATTERN.search(line)
        level = match.group(1).upper() if match else "UNKNOWN"
        counts[level] += 1

        if level in {"ERROR", "CRITICAL", "FATAL"} and len(errors) < _MAX_UNIQUE_ERRORS:
            errors.append(line.strip())
        elif level in {"WARNING", "WARN"} and len(warnings) < _MAX_UNIQUE_WARNINGS:
            warnings.append(line.strip())

    noise.append("repetitive_log_lines")

    summary_lines = [
        "## Log Summary",
        "",
        f"- **Total lines:** {total:,}",
        f"- **Errors/Critical:** {counts.get('ERROR', 0) + counts.get('CRITICAL', 0) + counts.get('FATAL', 0):,}",
        f"- **Warnings:** {counts.get('WARNING', 0) + counts.get('WARN', 0):,}",
        f"- **Info:** {counts.get('INFO', 0):,}",
        f"- **Debug:** {counts.get('DEBUG', 0):,}",
        "",
    ]

    if errors:
        summary_lines += ["## Error Samples", ""]
        for e in errors:
            summary_lines.append(f"- `{e}`")
        summary_lines.append("")

    if warnings:
        summary_lines += ["## Warning Samples", ""]
        for w in warnings:
            summary_lines.append(f"- `{w}`")
        summary_lines.append("")

    summary_lines.append(
        f"_Repetitive INFO/DEBUG lines ({total - len(errors) - len(warnings):,} lines) removed for AI optimization._"
    )

    return "\n".join(summary_lines), noise
