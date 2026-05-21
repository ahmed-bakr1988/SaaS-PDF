"""BasePipeline — the main orchestrator for the AI Context Optimization Engine.

Flow: Classify → Registry → Sanitize → Analyze → Optimize → Chunk → Export → Prompt
"""

from __future__ import annotations

import logging
import os

from app.ai_pipeline.classifiers import content_classifier
from app.ai_pipeline.chunkers import semantic_chunker
from app.ai_pipeline.exporters import json_exporter, markdown_exporter
from app.ai_pipeline.models.ai_context_result import AIContextMetrics, AIContextResult
from app.ai_pipeline.models.file_class import FileClass
from app.ai_pipeline.prompts import prompt_engine
from app.ai_pipeline.registry import pipeline_registry
from app.ai_pipeline.sanitizers import sensitive_data_cleaner
from app.services.markdown_convert_service import MarkdownConversionError

logger = logging.getLogger(__name__)

# GPT-4 token approximation: 1 token ≈ 4 chars
_CHARS_PER_TOKEN = 4
# Cost per 1k tokens (GPT-4o input pricing approximation)
_COST_PER_1K_TOKENS = 0.01


def run(
    input_path: str,
    output_path: str,
    *,
    original_filename: str,
    ext: str,
    mime: str = "",
    output_format: str = "md",
) -> AIContextResult:
    """Execute the full AI context optimization pipeline.

    Args:
        input_path:        Absolute path to the uploaded file.
        output_path:       Where to write the final .md or .json file.
        original_filename: Original user-supplied filename (for display).
        ext:               File extension without leading dot.
        mime:              MIME type detected by the validator (optional).
        output_format:     Output format: ``"md"`` (default) or ``"json"``.

    Returns:
        :class:`AIContextResult` with markdown, chunks, metrics, and prompt.

    Raises:
        :class:`MarkdownConversionError` if all conversion attempts fail.
    """
    original_size = os.path.getsize(input_path)
    ext = ext.lower().lstrip(".")

    # 1. Classify
    file_class = content_classifier.classify(input_path, ext, mime)
    logger.info(
        "BasePipeline: %s classified as %s", original_filename, file_class.value
    )

    # 2. Get pipeline config from registry
    config = pipeline_registry.get(file_class)

    # 3. Analyze (with MarkItDown fallback)
    raw_text = _analyze_with_fallback(config, input_path, original_filename, file_class)

    # 4. Sanitize — always-on sensitive data cleaning
    clean_text, secrets_removed = sensitive_data_cleaner.clean(raw_text)

    # 5. Optimize — remove token noise
    optimized_text, noise_removed = config.optimizer(clean_text)
    if secrets_removed:
        noise_removed = secrets_removed + noise_removed

    # 6. Export — finalize markdown and write to disk
    source_title = os.path.splitext(original_filename)[0] or "converted-file"
    method_label = f"{file_class.value}_analyzer"
    final_markdown = markdown_exporter.export(
        optimized_text, output_path, source_title, method_label
    )

    # 7. Chunk — produce semantic chunks for RAG
    chunks = semantic_chunker.chunk(final_markdown)

    # 8. Prompt — generate suggested AI prompt
    prompt = prompt_engine.generate(file_class, final_markdown)

    # 9. Compute metrics
    output_size = os.path.getsize(output_path)

    # 9b. If JSON format requested, also write a .json alongside the .md
    if output_format == "json":
        json_path = output_path.rsplit(".", 1)[0] + ".json"
        metrics_pre = _compute_metrics(
            original_size, output_size, final_markdown, noise_removed, method_label,
        )
        json_exporter.export(
            final_markdown, json_path, source_title, method_label,
            chunks=chunks, prompt=prompt, metrics=metrics_pre,
        )
        output_size = os.path.getsize(json_path)
    metrics = _compute_metrics(
        original_size=original_size,
        output_size=output_size,
        final_markdown=final_markdown,
        noise_removed=noise_removed,
        method=method_label,
    )

    logger.info(
        "BasePipeline: completed — %d chars, %d%% token reduction, method=%s",
        metrics.char_count,
        metrics.token_reduction_pct,
        method_label,
    )

    return AIContextResult(
        markdown=final_markdown,
        method=method_label,
        char_count=len(final_markdown),
        chunks=chunks,
        prompt=prompt,
        metrics=metrics,
    )


def _analyze_with_fallback(
    config,
    input_path: str,
    original_filename: str,
    file_class: FileClass,
) -> str:
    """Try primary analyzer, then MarkItDown, then raise."""
    from app.ai_pipeline.analyzers import markitdown_analyzer

    # Attempt 1: primary analyzer from registry
    try:
        return config.analyzer(input_path, original_filename)
    except MarkdownConversionError as exc:
        logger.debug("Primary analyzer failed (%s): %s", file_class.value, exc)
    except Exception as exc:
        logger.debug("Primary analyzer raised %s: %s", type(exc).__name__, exc)

    # Attempt 2: MarkItDown universal fallback (if not already the primary)
    if config.analyzer is not markitdown_analyzer.analyze:
        try:
            return markitdown_analyzer.analyze(input_path, original_filename)
        except MarkdownConversionError as exc:
            logger.debug("MarkItDown fallback failed: %s", exc)
        except Exception as exc:
            logger.debug("MarkItDown raised %s: %s", type(exc).__name__, exc)

    # Attempt 3: intermediate conversion (Office→PDF→extract)
    try:
        return _intermediate_conversion(input_path, original_filename, file_class)
    except MarkdownConversionError as exc:
        logger.debug("Intermediate conversion failed: %s", exc)
    except Exception as exc:
        logger.debug("Intermediate raised %s: %s", type(exc).__name__, exc)

    raise MarkdownConversionError(
        "This file could not be converted to AI context after all attempts."
    )


def _intermediate_conversion(
    input_path: str, original_filename: str, file_class: FileClass
) -> str:
    """Bounded intermediate conversion (max depth=1 to prevent recursion)."""
    import os
    import tempfile

    from app.ai_pipeline.analyzers import pdf_analyzer

    ext = os.path.splitext(original_filename)[1].lower().lstrip(".")

    with tempfile.TemporaryDirectory() as work_dir:
        if ext in {"doc", "docx"}:
            from app.services.pdf_service import word_to_pdf
            pdf_path = word_to_pdf(input_path, work_dir)
            return pdf_analyzer.analyze(pdf_path, original_filename)

        if ext in {"xls", "xlsx"}:
            from app.services.pdf_convert_service import excel_to_pdf
            pdf_path = excel_to_pdf(input_path, work_dir)
            return pdf_analyzer.analyze(pdf_path, original_filename)

        if ext in {"ppt", "pptx"}:
            from app.services.pdf_convert_service import pptx_to_pdf
            pdf_path = pptx_to_pdf(input_path, work_dir)
            return pdf_analyzer.analyze(pdf_path, original_filename)

    raise MarkdownConversionError(f"No intermediate conversion path for .{ext}.")


def _compute_readability_score(markdown: str, noise_removed: list[str]) -> int:
    """Multi-factor AI readability score (0-100).

    Evaluates structural quality: headings, tables, lists, code formatting,
    noise removal, content density, and overall length.
    """
    score = 0

    # 1. Structure: headings (max 25)
    h1 = markdown.count("\n# ")
    h2 = markdown.count("\n## ")
    h3 = markdown.count("\n### ")
    score += min(25, (h1 * 3) + (h2 * 5) + (h3 * 3))

    # 2. Tables present (max 15)
    table_count = markdown.count("| --- |") + markdown.count("|---|")
    score += min(15, table_count * 5)

    # 3. Organized lists (max 10)
    list_count = markdown.count("\n- ") + markdown.count("\n* ")
    score += min(10, list_count // 3)

    # 4. Code formatting (max 10)
    code_blocks = markdown.count("```") // 2
    score += min(10, code_blocks * 3)

    # 5. Noise cleanup applied (max 15)
    score += min(15, len(noise_removed) * 3)

    # 6. Content density ratio (max 15)
    lines = markdown.splitlines()
    non_empty = sum(1 for line in lines if line.strip())
    total = max(1, len(lines))
    content_ratio = non_empty / total
    score += int(content_ratio * 15)

    # 7. Reasonable length (max 10)
    char_count = len(markdown)
    if 500 < char_count < 100_000:
        score += 10
    elif char_count >= 100_000:
        score += 5
    elif char_count > 100:
        score += 3

    return min(100, max(0, score))


def _compute_metrics(
    original_size: int,
    output_size: int,
    final_markdown: str,
    noise_removed: list[str],
    method: str,
) -> AIContextMetrics:
    char_count = len(final_markdown)
    output_tokens = max(1, char_count // _CHARS_PER_TOKEN)

    # Raw file token estimate (if the whole file were sent as text)
    raw_tokens = max(1, original_size // _CHARS_PER_TOKEN)
    reduction_pct = max(0, min(99, int((1 - output_tokens / raw_tokens) * 100)))

    # Cost saving: difference in tokens × cost/1k
    tokens_saved = max(0, raw_tokens - output_tokens)
    cost_saved = (tokens_saved / 1000) * _COST_PER_1K_TOKENS

    # Readability score: 0-100 multi-factor heuristic
    score = _compute_readability_score(final_markdown, noise_removed)

    return AIContextMetrics(
        original_size_bytes=original_size,
        output_size_bytes=output_size,
        char_count=char_count,
        token_estimate=output_tokens,
        token_reduction_pct=reduction_pct,
        estimated_cost_saved_usd=round(cost_saved, 4),
        noise_removed=sorted(set(noise_removed)),
        ai_readability_score=score,
        conversion_method=method,
    )
