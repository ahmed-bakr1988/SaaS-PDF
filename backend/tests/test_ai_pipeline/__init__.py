"""Tests for the AI Pipeline — Phase 1 (Architecture Refactor).

Covers:
- ContentClassifier
- SensitiveDataCleaner
- TokenOptimizer
- LogOptimizer
- SemanticChunker
- BasePipeline end-to-end (with TXT file)
- Backward compat: MarkdownConversionResult fields

All tests must be runnable with:
    DATABASE_URL=sqlite:///test.db pytest backend/tests/test_ai_pipeline/ -q
"""
