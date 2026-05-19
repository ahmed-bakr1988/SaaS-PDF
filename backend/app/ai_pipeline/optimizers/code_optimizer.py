"""CodeOptimizer — filters noise from code project ZIP indexes.

Removes vendor/build/dist/cache entries from project structure output.
Pure function: takes str, returns (str, list[str]).
"""

from __future__ import annotations

import re

# Directories whose lines should be removed from project structure output
_NOISE_DIRS = {
    "node_modules", "vendor", "build", "dist", ".git", "__pycache__",
    ".pytest_cache", ".venv", "venv", ".cache", "coverage", ".nyc_output",
    "tmp", "temp", "logs",
}

_NOISE_EXTENSIONS = {
    ".min.js", ".min.css", ".map", ".lock", ".sum",
    ".pyc", ".pyo", ".class", ".o", ".a",
}


def optimize(text: str) -> tuple[str, list[str]]:
    """Remove noisy build/vendor entries from a code project index.

    Returns:
        (optimized_text, noise_removed_labels)
    """
    noise: list[str] = []
    lines = text.splitlines(keepends=True)
    cleaned: list[str] = []

    for line in lines:
        if _is_noise_line(line):
            noise_label = _get_noise_label(line)
            if noise_label and noise_label not in noise:
                noise.append(noise_label)
            continue
        cleaned.append(line)

    if len(cleaned) < len(lines):
        cleaned.append(
            f"\n_Note: {len(lines) - len(cleaned)} build/vendor/cache entries removed for AI optimization._\n"
        )

    return "".join(cleaned), noise


def _is_noise_line(line: str) -> bool:
    lower = line.lower()
    # Check for noise directory patterns in path-like lines
    for nd in _NOISE_DIRS:
        if f"`{nd}/" in lower or f"/{nd}/" in lower or f"- {nd}" in lower:
            return True
    # Check for minified / compiled file extensions
    for ext in _NOISE_EXTENSIONS:
        if lower.rstrip().endswith(ext + "`") or lower.rstrip().endswith(ext):
            return True
    return False


def _get_noise_label(line: str) -> str:
    lower = line.lower()
    if "node_modules" in lower:
        return "node_modules"
    if "vendor" in lower:
        return "vendor_files"
    if any(d in lower for d in ("build", "dist", ".cache")):
        return "build_artifacts"
    if any(ext in lower for ext in _NOISE_EXTENSIONS):
        return "minified_files"
    return "build_artifacts"
