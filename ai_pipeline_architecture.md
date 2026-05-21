# AI Context Optimization Engine — Architecture Plan
### Dociva.io · Principal Engineering Design Document

> **Date:** 2026-05-19 · **Status:** ✅ Phase 1 (Architecture Refactor) IMPLEMENTED · ✅ Phase 2 (AI Metrics Layer) IMPLEMENTED

---

## 0. Baseline Audit — What Already Exists

| Component | File | State |
|---|---|---|
| Route | `backend/app/routes/markdown_convert.py` | ✅ Solid — no changes needed |
| Service | `backend/app/services/markdown_convert_service.py` | ⚠️ God service — 439 lines, `if ext ==` chains, must be refactored |
| Tasks | `backend/app/tasks/markdown_convert_tasks.py` | ✅ Good structure — 3 isolated tasks, queue-split |
| Frontend | `frontend/src/components/tools/FileToMarkdown.tsx` | ⚠️ Basic UI — needs AI metrics panel |
| Manifest | `frontend/src/config/toolManifest.ts` | ✅ Registered |
| i18n | `en.json / ar.json` | ✅ Keys present |
| SEO | `seoData.ts / seoData.json` | ✅ Registered |
| Tests | `test_markdown_convert.py / test_markdown_convert_service.py` | ✅ 6 passing |

**Critical issue:** `markdown_convert_service.py` is a growing God Service. The architecture must be redesigned **before** expanding features.

---

## 1. Architecture Diagram — AI Pipeline System

```
Input File
    │
    ▼
┌───────────────────────────────┐
│  Flask Route (unchanged)      │  POST /api/convert/to-markdown
│  Validates · Quotes · Queues  │
└───────────┬───────────────────┘
            │ Celery Task (queue-routed)
            ▼
┌───────────────────────────────────────────────────────────────┐
│                    AI PIPELINE ENGINE                         │
│                                                               │
│  ┌─────────────────┐                                          │
│  │   Classifier    │ MIME + Extension + Magic Bytes           │
│  │  ContentType    │   FileClass: CODE/PDF/IMAGE/VIDEO/...    │
│  └────────┬────────┘                                          │
│           │                                                   │
│  ┌────────▼────────┐                                          │
│  │  PipelineReg    │ registry.get_pipeline(file_class)        │
│  │   (Registry)    │   selects: analyzer + optimizer + export │
│  └────────┬────────┘                                          │
│           │                                                   │
│  ┌────────▼────────┐                                          │
│  │    Sanitizer    │ strips secrets, .env, API keys, tokens   │
│  └────────┬────────┘                                          │
│           │                                                   │
│  ┌────────▼────────┐                                          │
│  │    Analyzer     │ type-specific: PDFAnalyzer/ZipAnalyzer   │
│  └────────┬────────┘                                          │
│           │                                                   │
│  ┌────────▼────────┐                                          │
│  │ TokenOptimizer  │ removes noise, deduplicates, compresses  │
│  └────────┬────────┘                                          │
│           │                                                   │
│  ┌────────▼────────┐                                          │
│  │ SemanticChunker │ produces structured chunks for RAG       │
│  └────────┬────────┘                                          │
│           │                                                   │
│  ┌────────▼────────┐                                          │
│  │ MarkdownExport  │ final AI-ready .md output                │
│  └────────┬────────┘                                          │
│           │                                                   │
│  ┌────────▼────────┐                                          │
│  │  PromptEngine   │ auto-generates suggested AI prompt       │
│  └────────┬────────┘                                          │
│           │                                                   │
│  ┌────────▼────────┐                                          │
│  │ AIContextResult │ markdown + chunks + metrics + prompt     │
│  └─────────────────┘                                          │
└───────────────────────────────────────────────────────────────┘
            │
            ▼
     Storage + Task Result
```

---

## 2. New Directory Structure

```
backend/app/ai_pipeline/
│
├── __init__.py
│
├── registry/
│   ├── __init__.py
│   └── pipeline_registry.py       # PipelineRegistry — maps FileClass to pipeline config
│
├── models/
│   ├── __init__.py
│   ├── file_class.py              # Enum: PDF, OFFICE, CODE, IMAGE, VIDEO, LOG, CONFIG, ZIP, DATA
│   ├── ai_context_result.py       # Dataclass: markdown, chunks, metrics, prompt, method
│   └── chunk.py                   # Dataclass: section, summary, markdown, token_estimate
│
├── classifiers/
│   ├── __init__.py
│   └── content_classifier.py     # MIME + magic bytes + extension → FileClass
│
├── sanitizers/
│   ├── __init__.py
│   └── sensitive_data_cleaner.py # strips API keys, passwords, .env values, tokens
│
├── analyzers/
│   ├── __init__.py
│   ├── base_analyzer.py           # AbstractAnalyzer protocol
│   ├── text_analyzer.py           # TXT/MD/LOG/CSV/JSON/XML
│   ├── pdf_analyzer.py            # PDF → text extraction (streaming, page-by-page)
│   ├── office_analyzer.py         # DOCX/XLSX/PPTX native extraction
│   ├── image_analyzer.py          # OCR + layout + UI detection
│   ├── video_analyzer.py          # metadata + keyframes (v1), speech-to-text (v2)
│   ├── zip_analyzer.py            # project structure analysis, no full extraction
│   └── markitdown_analyzer.py     # MarkItDown fallback for unsupported types
│
├── optimizers/
│   ├── __init__.py
│   ├── base_optimizer.py          # AbstractOptimizer protocol
│   ├── token_optimizer.py         # removes noise, dedup, truncation
│   ├── log_optimizer.py           # collapses 100k INFO into summary
│   └── code_optimizer.py          # removes vendor/build/dist, extracts architecture
│
├── chunkers/
│   ├── __init__.py
│   └── semantic_chunker.py       # produces List[Chunk] from markdown
│
├── exporters/
│   ├── __init__.py
│   └── markdown_exporter.py      # assembles final .md with headers, metadata, context
│
├── prompts/
│   ├── __init__.py
│   └── prompt_engine.py          # generates AI-ready suggested prompts per FileClass
│
└── pipelines/
    ├── __init__.py
    ├── base_pipeline.py           # orchestrates: sanitize→analyze→optimize→chunk→export
    └── fallback_pipeline.py       # bounded retry: direct → intermediate → error
```

---

## 3. Queue Architecture Diagram

```
FileClass            Queue                 Worker Concurrency
──────────────────────────────────────────────────────────────
TXT/MD/JSON/CSV      lightweight_queue       4 concurrent
PDF/HTML/DOCX        pdf_processing          2 concurrent
IMAGE (OCR)          ocr_tasks               1 concurrent
VIDEO                video_processing        1 concurrent
ZIP/CODE             code_analysis_queue     2 concurrent
AI-heavy ops         ai_heavy                1 concurrent

Current routing:
  docs/text/archive → pdf_processing   (existing, correct)
  images            → ocr_tasks         (existing, correct)
  video             → video_processing  (existing, correct)

New queues to add:
  code_analysis_queue  (ZIP/code projects)
  lightweight_queue    (text/json/csv — currently misrouted to pdf_processing)
```

---

## 4. Security Threat Model

| Threat | Current State | Mitigation |
|---|---|---|
| ZIP bomb | Entry count check (256) + 100MB per-entry | Add compression ratio check (50:1 max) |
| Malicious DOCX | No macro check | Reject if `word/vbaProject.bin` present in ZIP |
| Sensitive data leakage | None | NEW: `SensitiveDataCleaner` strips regex-matched secrets |
| Path traversal in ZIP | No path validation | Reject entries with `../` in filename |
| Malformed PDF | pypdf isolation | Already sandboxed in Celery worker |
| ffprobe injection | No argument sanitization | Validate path is regular file before passing |
| Markdown XSS in output | No sanitization | Frontend: render as `<textarea>` never as HTML |
| Token overflow | `MAX_MARKDOWN_CHARS=1_000_000` | Present — keep |
| Orphaned temp files | `cleanup_task_files` called | Present — keep |
| Rate limiting | `@limiter.limit("8/minute")` | Lower to 5/minute for logged-out users |

---

## 5. Conversion Capability Matrix

| File Type | Classifier Class | Analyzer | Optimizer | v1 | v2 |
|---|---|---|---|---|---|
| PDF (text) | PDF | `pdf_analyzer` | `token_optimizer` | Yes | — |
| PDF (scanned) | PDF | `pdf_analyzer` + OCR fallback | `token_optimizer` | — | Yes |
| DOCX | OFFICE | `office_analyzer` | `token_optimizer` | Yes | — |
| XLSX | OFFICE | `office_analyzer` | `token_optimizer` | Yes | — |
| PPTX | OFFICE | `office_analyzer` | `token_optimizer` | Yes | — |
| DOC/XLS/PPT | OFFICE | `markitdown_analyzer` | `token_optimizer` | Yes | — |
| TXT/MD/LOG | TEXT | `text_analyzer` | `log_optimizer` | Yes | — |
| CSV | DATA | `text_analyzer` | `token_optimizer` | Yes | — |
| JSON/XML | DATA | `text_analyzer` | `token_optimizer` | Yes | — |
| HTML | TEXT | `text_analyzer` | `token_optimizer` | Yes | — |
| PNG/JPG/WEBP | IMAGE | `image_analyzer` (OCR + layout) | `token_optimizer` | Yes | — |
| MP4/WEBM | VIDEO | `video_analyzer` (metadata) | `token_optimizer` | Yes | — |
| MP4/WEBM | VIDEO | `video_analyzer` (STT) | `token_optimizer` | — | Yes |
| ZIP (code) | CODE | `zip_analyzer` (structure) | `code_optimizer` | Yes | — |
| ZIP (docs) | ZIP | `zip_analyzer` (index) | `token_optimizer` | Yes | — |
| .env/YAML | CONFIG | `text_analyzer` | `sensitive_data_cleaner` | Yes | — |
| SQL dump | DATA | `text_analyzer` | `token_optimizer` (schema only) | Yes | — |

---

## 6. AI Context Metrics — Output Schema

```json
{
  "status": "completed",
  "download_url": "...",
  "filename": "project.md",
  "markdown": "# project\n...",
  "chunks": [
    { "section": "Authentication", "summary": "...", "markdown": "..." }
  ],
  "prompt": "Analyze this Laravel project for scalability risks.",
  "metrics": {
    "original_size_bytes": 524288,
    "output_size_bytes": 18432,
    "char_count": 18000,
    "token_estimate": 4200,
    "token_reduction_pct": 82,
    "estimated_cost_saved_usd": 0.44,
    "noise_removed": ["vendor files", "duplicate log lines", "binary data"],
    "ai_readability_score": 91,
    "conversion_method": "zip_analyzer+code_optimizer"
  }
}
```

Token estimate: `char_count / 4` (GPT-4 approximation).
Cost saved: raw file token estimate vs. output tokens × $0.01/1k (GPT-4o pricing).
Readability score: 0–100 based on structure density, noise ratio, heading presence.

---

## 7. Memory Management Strategy

| File Type | Strategy |
|---|---|
| PDF | Page-by-page iterator, never load full document into RAM |
| ZIP | `zipfile.infolist()` for structure only; extract one file at a time with size guard |
| LOG files | Streaming line reader with rolling dedup buffer; never accumulate all lines |
| XLSX | `openpyxl` read_only mode, `iter_rows` — already correct |
| Video | `ffprobe` only in v1 (subprocess, no in-memory decode) |
| Images | Resize to 1920px max before OCR to prevent RAM spike |
| Output MD | Hard cap at `MAX_MARKDOWN_CHARS=1_000_000` — already present |
| Chunks | Lazily produced from markdown, never duplicated as full copy |

Absolute rule: No full file load into `bytes` in the worker process. All reading through file handles with explicit size guards.

---

## 8. Failure Recovery Strategy

```
Attempt 1: Primary Analyzer (type-specific)
    |__ fails
Attempt 2: MarkItDown fallback
    |__ fails
Attempt 3: Intermediate conversion (Office→PDF→extract)
    |__ fails
→ Return: structured error with user_message + error_code
```

Infinite loop prevention: `FallbackPipelineEngine` tracks attempted paths in a `set`.
An intermediate conversion path cannot feed back into itself. Max depth = 2.
All existing task timeouts preserved. New code_analysis_queue: `soft_time_limit=300, time_limit=360`.

---

## 9. AI Output Modes

| Mode | Description | Token Reduction |
|---|---|---|
| `balanced` (default) | Full text with noise removed | ~60% |
| `cheap` | Max compression, summary only | ~85% |
| `developer` | Preserves architecture, APIs, filenames, functions | ~50% |
| `rag_ready` | Returns semantic chunks, no single markdown | N/A |
| `high_context` | Minimal compression, near-raw | ~20% |

v1 ships `balanced` only. Mode is a parameter through route → task → service. Default = `"balanced"`.

---

## 10. Chunking Strategy

```python
@dataclass
class Chunk:
    section: str        # heading text
    summary: str        # 1-sentence summary
    markdown: str       # full section content
    token_estimate: int
```

Rules:
- Split on `## ` headings
- If section > 2000 tokens: sub-split on `### `
- If no headings: chunk every 1000 tokens
- Minimum chunk size: 50 tokens (merge tiny orphans)
- Chunks stored in task result as JSON array (not in the `.md` file)

---

## 11. Sensitive Data Protection Patterns

```python
PATTERNS = [
    r'(?i)(api[_\s-]?key|apikey)\s*[:=]\s*\S+',
    r'(?i)(secret|password|passwd|pwd)\s*[:=]\s*\S+',
    r'(?i)(token|bearer|auth)\s*[:=]\s*\S+',
    r'(?i)(aws_secret|AWS_SECRET)\w*\s*=\s*\S+',
    r'-----BEGIN (RSA |EC )?PRIVATE KEY-----',
    r'sk-[A-Za-z0-9]{20,}',       # OpenAI keys
    r'ghp_[A-Za-z0-9]{36}',       # GitHub tokens
    r'xoxb-[0-9]+-\S+',           # Slack tokens
]
REPLACEMENT = "[REDACTED]"
```

Applied to: all text output, before chunking, after analysis. Always-on, non-configurable.

---

## 12. Frontend Requirements (v1 Enhancement)

`FileToMarkdown.tsx` additions:
- Token reduction badge (e.g., "82% fewer tokens")
- Estimated cost saved (e.g., "Saved ~$0.44")
- AI readability score gauge (0–100)
- Noise removed chip list
- Chunk preview (collapsible section list)
- Suggested AI prompt (copy-able code block)
- Mode selector UI disabled in v1, shows "balanced" as active

Safety: markdown preview always in `<textarea readOnly>`, never `dangerouslySetInnerHTML`.
Chunk list uses virtualization if > 20 chunks.

---

## 13. MCP / API Future Support

`AIContextResult` structured for future `POST /api/v1/ai-context`:

```json
{
  "summary": "...",
  "markdown": "...",
  "chunks": [],
  "prompt": "...",
  "metrics": {}
}
```

Implemented in `backend/app/routes/v1/` (already exists). No breaking changes to `/api/convert/to-markdown`.

---

## 14. Benchmark Plan

| File | Expected RAM | Expected Time | Expected Token Reduction |
|---|---|---|---|
| 10MB PDF (text) | < 50MB | < 30s | ~60% |
| 100MB log file | < 30MB (streaming) | < 45s | ~95% |
| ZIP (Laravel project) | < 100MB | < 60s | ~80% |
| OCR image (A4 scan) | < 200MB | < 90s | ~40% |
| MP4 (5 min video) | < 20MB | < 10s | N/A (metadata) |
| Malformed/corrupt file | < 10MB | < 5s | — |

Tooling: `pytest-benchmark` + `docker stats` for resource monitoring.

---

## 15. Implementation Milestones — Phased Plan

### Phase 1: Architecture Refactor (requires approval)
Goal: Eliminate God Service. No new features added.
1. Create `backend/app/ai_pipeline/` directory structure
2. Create models: `file_class.py`, `ai_context_result.py`, `chunk.py`
3. Create `registry/pipeline_registry.py`
4. Create `classifiers/content_classifier.py`
5. Migrate existing logic into domain analyzers
6. Create `optimizers/token_optimizer.py`
7. Create `sanitizers/sensitive_data_cleaner.py`
8. Create `pipelines/base_pipeline.py` and `fallback_pipeline.py`
9. Reduce `markdown_convert_service.py` to ~50 line adapter
10. All 6 existing tests must still pass

### Phase 2: AI Metrics Layer
Goal: Add token metrics and prompt generation.
1. Create `exporters/markdown_exporter.py`
2. Create `prompts/prompt_engine.py`
3. Create `chunkers/semantic_chunker.py`
4. Update `AIContextResult` with `metrics` + `chunks` + `prompt`
5. Update task result dict with new fields
6. Update `apiTypes.ts`

### Phase 3: Frontend AI Dashboard
Goal: Show value to users.
1. Enhance `FileToMarkdown.tsx` with metrics panel
2. Add chunk preview, suggested prompt, readability score, noise badges
3. Update i18n: en.json, ar.json
4. Expand `seoData.json` supporting keywords

### Phase 4: Enhanced Analyzers
Goal: Upgrade image and ZIP handling.
1. `image_analyzer.py` — layout analysis, UI component detection
2. `zip_analyzer.py` — detect framework, routes, models, dependencies
3. `code_optimizer.py` — filter vendor/node_modules/dist/build
4. `log_optimizer.py` — rolling dedup, severity summary

### Phase 5: Security Hardening
1. ZIP bomb compression ratio check (50:1 max)
2. DOCX macro detection
3. ZIP path traversal validation
4. Rate limiting: 5/min for guests

---

## 16. Files That Will Change vs. Stay Same

### UNCHANGED
- `backend/app/routes/markdown_convert.py`
- `backend/app/tasks/markdown_convert_tasks.py`
- Frontend manifest, i18n keys, SEO entries

### REFACTORED (reduced to adapter)
- `backend/app/services/markdown_convert_service.py` → ~50 lines calling PipelineRegistry

### CREATED (new)
- All files under `backend/app/ai_pipeline/`
- `backend/tests/test_ai_pipeline/` directory

### ENHANCED (additive changes)
- `backend/app/extensions.py` — add `code_analysis_queue` and `lightweight_queue`
- `frontend/src/components/tools/FileToMarkdown.tsx` — metrics UI
- `frontend/src/services/apiTypes.ts` — new result fields
- `frontend/src/i18n/en.json / ar.json` — new keys

---

## 17. Open Questions — Requiring Approval Before Implementation

> [!IMPORTANT]
> The following 6 decisions require explicit approval before Phase 1 begins.

| # | Question | Recommendation |
|---|---|---|
| 1 | **Phase order:** Phase 1 refactor first (no new features), or Phase 3 metrics first (add to existing code)? | Phase 1 first — God Service must not grow further |
| 2 | **Output modes:** Ship `balanced` only in v1, or add mode selector UI? | `balanced` only in v1 |
| 3 | **Chunking in v1:** Return chunks in all responses or only in `rag_ready` mode? | Always return chunks (UI shows preview) |
| 4 | **New queues:** Add `code_analysis_queue` + `lightweight_queue` in Phase 1 or Phase 4? | Add both in Phase 1 |
| 5 | **Sensitive data cleaning:** Opt-in or always-on? | Always-on, non-configurable |
| 6 | **SEO expansion:** Expand supporting keywords now or in Phase 3? | Phase 3 together with UI |
