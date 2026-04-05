#!/usr/bin/env python3
"""
Build a multilingual keyword portfolio from Google Ads exports.

Usage:
  python scripts/build_keyword_portfolio.py
  python scripts/build_keyword_portfolio.py --output-dir docs/keyword-research/2026-04-05
"""

from __future__ import annotations

import argparse
import csv
import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE_INPUTS = [
    ROOT / "docs" / "KeywordStats_4_5_2026.csv",
    ROOT / "docs" / "Keyword Stats 2026-04-05 at 10_02_37.csv",
]
DEFAULT_OUTPUT_DIR = ROOT / "docs" / "keyword-research" / "2026-04-05"
SUPPLEMENTAL_INPUT_DIR = DEFAULT_OUTPUT_DIR / "Keywords"

SUPPORTED_LANGUAGES = {"en", "ar", "fr"}
GROWTH_LANGUAGES = {"es"}
WATCHLIST_LANGUAGES = {"zh", "it", "pt", "other"}

HOW_TO_MARKERS = {"how to", "comment ", "كيفية", "كيف ", "how do i"}
FREE_MARKERS = {"free", "gratis", "gratuit"}
ONLINE_MARKERS = {"online", "en ligne"}
PAGE_MARKERS = {"page", "pages", "pagina", "paginas", "página", "páginas"}
FILE_MARKERS = {"file", "files", "document", "documents", "archivo", "archivos", "fichier", "fichiers"}

SPLIT_MARKERS = {
    "split",
    "splitter",
    "splitpdf",
    "pdfsplit",
    "separate",
    "separator",
    "divide",
    "divider",
    "cut",
    "cutter",
    "slicer",
    "trimmer",
    "breaker",
    "unmerge",
    "dividir",
    "separar",
    "separa",
    "separador",
    "cortar",
    "diviser",
    "séparer",
    "separer",
    "fractionner",
    "decouper",
    "découper",
    "couper",
    "dividi",
    "تقسيم",
    "فصل",
    "拆分",
    "分割",
}
EXTRACT_MARKERS = {"extract", "extractor", "extraction", "extract pages", "استخراج"}
MERGE_MARKERS = {"merge", "merger", "combine", "join", "fusionner", "fusion", "دمج"}
COMPRESS_MARKERS = {"compress", "compressor", "compression", "reduce size", "reduce pdf", "ضغط"}
CONVERT_MARKERS = {"convert", "converter", "conversion", "to pdf", "pdf to", "تحويل"}
EDIT_MARKERS = {"edit", "editor", "editing", "software"}
IMAGE_TO_PDF_MARKERS = {"image pdf", "images to pdf", "image to pdf", "add image to pdf", "photo to pdf", "jpg to pdf", "png to pdf"}
PDF_TOOL_MARKERS = {"pdf tools", "tool pdf", "pdf tool"}
PDF_TO_WORD_MARKERS = {"pdf to word", "pdf to doc", "pdf to docx", "convert pdf to word"}
WORD_TO_PDF_MARKERS = {"word to pdf", "doc to pdf", "docx to pdf", "convert word to pdf"}
OCR_MARKERS = {
    "ocr",
    "text recognition",
    "extract text from image",
    "extract text from pdf",
    "image to text",
    "pdf to text",
    "scan to text",
    "optical character recognition",
    "استخراج النص",
}

SPANISH_MARKERS = {"dividir", "separar", "separa", "separador", "gratis", "cortar"}
FRENCH_MARKERS = {"diviser", "séparer", "separer", "fractionner", "decouper", "découper", "couper", "gratuit"}
ITALIAN_MARKERS = {"dividi"}
PORTUGUESE_MARKERS = {"separador"}

SPLIT_VALID_PATTERNS = [
    re.compile(r"^(?:online )?split pdf(?: free| online| free online| pages| pages free| file| files| document)?$"),
    re.compile(r"^pdf split(?: online| free)?$"),
    re.compile(r"^pdf splitter(?: online| free| free online)?$"),
    re.compile(r"^splitter pdf$"),
    re.compile(r"^separate pdf(?: pages| files| free| pages free)?$"),
    re.compile(r"^pdf separate(?: pages)?$"),
    re.compile(r"^pdf separator$"),
    re.compile(r"^pdf page separator$"),
    re.compile(r"^cut pdf(?: pages)?$"),
    re.compile(r"^pdf cutter(?: online)?$"),
    re.compile(r"^pdf divider$"),
    re.compile(r"^unmerge pdf(?: free| online)?$"),
    re.compile(r"^dividir pdf(?: gratis| online)?$"),
    re.compile(r"^separar pdf$"),
    re.compile(r"^separa pdf$"),
    re.compile(r"^separador de pdf$"),
    re.compile(r"^cortar pdf$"),
    re.compile(r"^diviser pdf$"),
    re.compile(r"^séparer pdf$"),
    re.compile(r"^separer pdf$"),
    re.compile(r"^fractionner pdf$"),
    re.compile(r"^decouper pdf$"),
    re.compile(r"^découper pdf$"),
    re.compile(r"^couper pdf$"),
    re.compile(r"^pdfsplit$"),
    re.compile(r"^splitpdf$"),
    re.compile(r"^(?:拆分pdf|pdf拆分|分割pdf|pdf分割)$"),
]
EXTRACT_VALID_PATTERNS = [
    re.compile(r"^extract pages? from pdf$"),
    re.compile(r"^pdf extractor$"),
    re.compile(r"^extract pdf$"),
    re.compile(r"^extract pdf pages$"),
    re.compile(r"^pdf extract(?:or)?$"),
]
MERGE_VALID_PATTERNS = [
    re.compile(r"^merge pdf(?: files| documents| free| online)?$"),
    re.compile(r"^pdf merge$"),
    re.compile(r"^pdf merger$"),
    re.compile(r"^دمج pdf$"),
]
COMPRESS_VALID_PATTERNS = [
    re.compile(r"^compress pdf(?: file| document| online| free| online free)?$"),
    re.compile(r"^pdf compressor(?: free| online)?$"),
    re.compile(r"^pdf compression$"),
    re.compile(r"^ضغط pdf$"),
]
CONVERSION_VALID_PATTERNS = [
    re.compile(r"^pdf converter$"),
    re.compile(r"^convert (?:file|file type|document|documents|image|images|photo|photos|word|doc|docx|excel|xls|xlsx|ppt|pptx|powerpoint|html|text|txt) to pdf$"),
    re.compile(r"^(?:word|doc|docx|excel|xls|xlsx|ppt|pptx|powerpoint|html|image|images|photo|photos|jpg|jpeg|png) to pdf$"),
    re.compile(r"^pdf to (?:word|excel|ppt|pptx|powerpoint|images?|jpg|jpeg|png)$"),
]
EDITOR_VALID_PATTERNS = [
    re.compile(r"^pdf editor$"),
    re.compile(r"^edit pdf$"),
    re.compile(r"^pdf editing software$"),
    re.compile(r"^online pdf editor$"),
]
IMAGE_TO_PDF_VALID_PATTERNS = [
    re.compile(r"^image pdf$"),
    re.compile(r"^image to pdf$"),
    re.compile(r"^images to pdf$"),
    re.compile(r"^add image to pdf(?: document)?$"),
    re.compile(r"^photo to pdf$"),
    re.compile(r"^jpg to pdf$"),
    re.compile(r"^png to pdf$"),
]
PDF_TO_WORD_VALID_PATTERNS = [
    re.compile(r"^pdf to (?:word|doc|docx)$"),
    re.compile(r"^convert pdf to (?:word|doc|docx)$"),
    re.compile(r"^تحويل pdf (?:الى|إلى) (?:word|وورد)$"),
    re.compile(r"^تحويل من pdf (?:الى|إلى) (?:word|وورد)$"),
    re.compile(r"^(?:pdf|بي دي اف) (?:الى|إلى) (?:word|وورد)$"),
]
WORD_TO_PDF_VALID_PATTERNS = [
    re.compile(r"^(?:word|doc|docx) to pdf$"),
    re.compile(r"^convert (?:word|doc|docx) to pdf$"),
    re.compile(r"^تحويل (?:word|وورد|doc|docx) (?:الى|إلى) pdf$"),
    re.compile(r"^تحويل من (?:word|وورد|doc|docx) (?:الى|إلى) pdf$"),
]
OCR_VALID_PATTERNS = [
    re.compile(r"^ocr(?: pdf| image| scanner)?$"),
    re.compile(r"^text recognition$"),
    re.compile(r"^extract text from (?:image|pdf|scan|scanned pdf)$"),
    re.compile(r"^image to text$"),
    re.compile(r"^pdf to text$"),
    re.compile(r"^scan to text$"),
    re.compile(r"^optical character recognition$"),
    re.compile(r"^استخراج النص من (?:pdf|صورة)$"),
    re.compile(r"^تحويل (?:pdf|صورة) (?:الى|إلى) نص$"),
]

BRAND_PATTERNS = {
    "ilovepdf": re.compile(r"\bi\s*love\s*pdf\b|\bilovepdf\b", re.IGNORECASE),
    "smallpdf": re.compile(r"\bsmall\s*pdf\b|\bsmallpdf\b", re.IGNORECASE),
    "sejda": re.compile(r"\bsejda\b", re.IGNORECASE),
    "adobe": re.compile(r"\badobe\b|\bacrobat\b", re.IGNORECASE),
    "cutepdf": re.compile(r"\bcute\s*pdf\b|\bcutepdf\b", re.IGNORECASE),
    "pdf24": re.compile(r"\bpdf\s*24\b|\bpdf24\b", re.IGNORECASE),
}

AMBIGUOUS_EXACT = {
    "split",
    "pdf",
    "pd f",
    "pdf file",
    "pdf format",
    "pdf online",
    "split pages",
    "split online",
    "page separator",
    "pdf to split",
    "pdf smart",
}

CLUSTER_METADATA = {
    "split-pdf": {
        "label": "Split PDF",
        "recommended_target": "/tools/split-pdf",
        "target_type": "live_tool",
        "implementation_note": "Prioritize this existing landing page with unbranded transactional terms and page-focused variants.",
    },
    "extract-pages": {
        "label": "Extract Pages",
        "recommended_target": "/tools/extract-pages",
        "target_type": "live_tool",
        "implementation_note": "Use as a secondary page cluster for extraction-specific and page-removal intent.",
    },
    "merge-pdf": {
        "label": "Merge PDF",
        "recommended_target": "/tools/merge-pdf",
        "target_type": "live_tool",
        "implementation_note": "Target merge-specific queries separately from split keywords to avoid mixed intent pages.",
    },
    "compress-pdf": {
        "label": "Compress PDF",
        "recommended_target": "/tools/compress-pdf",
        "target_type": "live_tool",
        "implementation_note": "This cluster broadens reach beyond split and should be treated as a parallel priority pillar.",
    },
    "pdf-to-word": {
        "label": "PDF to Word",
        "recommended_target": "/tools/pdf-to-word",
        "target_type": "live_tool",
        "implementation_note": "Map direct PDF-to-Word conversion intent to the existing converter page rather than a generic conversion hub.",
    },
    "word-to-pdf": {
        "label": "Word to PDF",
        "recommended_target": "/tools/word-to-pdf",
        "target_type": "live_tool",
        "implementation_note": "Route Word-to-PDF terms to the dedicated converter page because the intent is specific and high value.",
    },
    "ocr": {
        "label": "OCR / Text Extraction",
        "recommended_target": "/tools/ocr",
        "target_type": "live_tool",
        "implementation_note": "Send OCR and text-extraction intent to the OCR tool page instead of mixing it into broad AI copy.",
    },
    "pdf-conversion": {
        "label": "PDF Conversion Hub",
        "recommended_target": "homepage-or-future-conversion-hub",
        "target_type": "hub_or_future_page",
        "implementation_note": "Use these keywords to justify a collection page for generic converter intent.",
    },
    "pdf-editor": {
        "label": "PDF Editor",
        "recommended_target": "/tools/pdf-editor",
        "target_type": "live_tool",
        "implementation_note": "Position editor and editing-software terms on the live PDF editor page.",
    },
    "images-to-pdf": {
        "label": "Images to PDF",
        "recommended_target": "/tools/images-to-pdf",
        "target_type": "live_tool",
        "implementation_note": "Capture image-to-PDF phrasing and upload intent on the existing converter tool.",
    },
    "mixed-pdf-operations": {
        "label": "Mixed PDF Operations",
        "recommended_target": "homepage-or-future-pdf-tools-hub",
        "target_type": "hub_or_future_page",
        "implementation_note": "Mixed split-and-merge intent should point to a tools hub, not a single-action landing page.",
    },
    "pdf-tools-hub": {
        "label": "PDF Tools Hub",
        "recommended_target": "homepage-or-future-pdf-tools-hub",
        "target_type": "hub_or_future_page",
        "implementation_note": "Reserve this cluster for clear hub-style terms such as pdf tools.",
    },
    "unclear": {
        "label": "Manual Review",
        "recommended_target": "manual-review",
        "target_type": "manual_review",
        "implementation_note": "Keep unclear terms out of the primary portfolio until manually validated.",
    },
}

RECOMMENDATION_ORDER = {
    "target_now": 0,
    "target_after_localization": 1,
    "supporting_content": 2,
    "watchlist": 3,
    "exclude": 4,
}


@dataclass
class SourceRow:
    keyword: str
    normalized: str
    source_name: str
    source_path: str
    volume: int
    raw_metric_name: str
    competition: str = ""
    competition_index: int = 0
    raw_trends: str = ""


@dataclass
class KeywordAggregate:
    keyword: str
    normalized: str
    source_names: set[str] = field(default_factory=set)
    source_paths: set[str] = field(default_factory=set)
    file1_impressions: int = 0
    file2_avg_monthly_searches: int = 0
    competitions: set[str] = field(default_factory=set)
    competition_index_max: int = 0
    raw_trends: list[str] = field(default_factory=list)


def clean_int(value: str | None) -> int:
    if not value:
        return 0
    digits = re.sub(r"[^0-9]", "", str(value))
    return int(digits) if digits else 0


def normalize_keyword(value: str) -> str:
    text = unicodedata.normalize("NFKC", value or "")
    text = re.sub(r"[\u200e\u200f\u202a-\u202e\u2066-\u2069]", "", text)
    text = text.lower().replace("_", " ")
    text = text.replace("&", " and ")
    text = re.sub(r"[|/+]+", " ", text)
    text = re.sub(r"[^\w\s\u0600-\u06FF\u4E00-\u9FFF-]", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def contains_any(text: str, markers: set[str]) -> bool:
    tokens = set(text.split())
    for marker in markers:
        if re.search(r"[\u0600-\u06FF\u4E00-\u9FFF]", marker):
            if marker in text:
                return True
            continue
        if " " in marker and marker in text:
            return True
        if marker in tokens:
            return True
    return False


def has_token_or_phrase(keyword: str, markers: set[str]) -> bool:
    return contains_any(keyword, markers)


def matches_any_pattern(keyword: str, patterns: list[re.Pattern[str]]) -> bool:
    return any(pattern.search(keyword) for pattern in patterns)


def discover_default_inputs() -> list[Path]:
    input_paths = [path for path in BASE_INPUTS if path.exists()]
    seen_names = {path.name for path in input_paths}

    if SUPPLEMENTAL_INPUT_DIR.exists():
        for path in sorted(SUPPLEMENTAL_INPUT_DIR.glob("*.csv")):
            if path.name in seen_names:
                continue
            input_paths.append(path)
            seen_names.add(path.name)

    return input_paths


DEFAULT_INPUTS = discover_default_inputs()


def strip_informational_prefix(keyword: str) -> str:
    for prefix in ("how to ", "comment ", "كيفية ", "كيف ", "how do i "):
        if keyword.startswith(prefix):
            return keyword[len(prefix):].strip()
    return keyword


def detect_language(keyword: str) -> str:
    if re.search(r"[\u0600-\u06FF]", keyword):
        return "ar"
    if re.search(r"[\u4E00-\u9FFF]", keyword):
        return "zh"

    if has_token_or_phrase(keyword, FRENCH_MARKERS):
        return "fr"
    if has_token_or_phrase(keyword, SPANISH_MARKERS):
        return "es"
    if has_token_or_phrase(keyword, ITALIAN_MARKERS):
        return "it"
    if has_token_or_phrase(keyword, PORTUGUESE_MARKERS):
        return "pt"
    return "en"


def detect_brands(keyword: str) -> list[str]:
    hits = []
    for brand, pattern in BRAND_PATTERNS.items():
        if pattern.search(keyword):
            hits.append(brand)
    return sorted(hits)


def extract_modifiers(keyword: str, brand_hits: list[str]) -> list[str]:
    modifiers = []
    if contains_any(keyword, HOW_TO_MARKERS):
        modifiers.append("how_to")
    if contains_any(keyword, FREE_MARKERS):
        modifiers.append("free")
    if contains_any(keyword, ONLINE_MARKERS):
        modifiers.append("online")
    if contains_any(keyword, PAGE_MARKERS):
        modifiers.append("pages")
    if contains_any(keyword, FILE_MARKERS):
        modifiers.append("files")
    if brand_hits:
        modifiers.append("brand")
    return modifiers


def classify_cluster(keyword: str) -> str:
    has_pdf_to_word = contains_any(keyword, PDF_TO_WORD_MARKERS) or matches_any_pattern(keyword, PDF_TO_WORD_VALID_PATTERNS)
    has_word_to_pdf = contains_any(keyword, WORD_TO_PDF_MARKERS) or matches_any_pattern(keyword, WORD_TO_PDF_VALID_PATTERNS)
    has_ocr = contains_any(keyword, OCR_MARKERS) or matches_any_pattern(keyword, OCR_VALID_PATTERNS)
    has_split = contains_any(keyword, SPLIT_MARKERS)
    has_extract = contains_any(keyword, EXTRACT_MARKERS)
    has_merge = contains_any(keyword, MERGE_MARKERS)
    has_compress = contains_any(keyword, COMPRESS_MARKERS)
    has_convert = contains_any(keyword, CONVERT_MARKERS)
    has_edit = contains_any(keyword, EDIT_MARKERS)
    has_image_to_pdf = contains_any(keyword, IMAGE_TO_PDF_MARKERS)
    has_pdf_tool = contains_any(keyword, PDF_TOOL_MARKERS)

    if has_pdf_to_word:
        return "pdf-to-word"
    if has_word_to_pdf:
        return "word-to-pdf"
    if has_ocr:
        return "ocr"
    if has_split and has_merge:
        return "mixed-pdf-operations"
    if has_extract:
        return "extract-pages"
    if has_split or "to pages" in keyword:
        return "split-pdf"
    if has_merge:
        return "merge-pdf"
    if has_compress:
        return "compress-pdf"
    if has_image_to_pdf:
        return "images-to-pdf"
    if has_edit:
        return "pdf-editor"
    if has_convert or keyword.startswith("pdf to ") or keyword.endswith(" to pdf"):
        return "pdf-conversion"
    if has_pdf_tool:
        return "pdf-tools-hub"
    return "unclear"


def repeated_phrase(tokens: list[str]) -> bool:
    if len(tokens) < 4:
        return False
    for size in range(1, len(tokens) // 2 + 1):
        if len(tokens) % size:
            continue
        chunk = tokens[:size]
        repeats = len(tokens) // size
        if repeats > 1 and chunk * repeats == tokens:
            return True
    return False


def detect_noise_reason(keyword: str, cluster: str, brand_hits: list[str], file1_impressions: int, file2_searches: int) -> str:
    tokens = keyword.split()

    if keyword in AMBIGUOUS_EXACT:
        return "too_broad_or_ambiguous"

    if keyword == "page separator":
        return "not_pdf_specific"

    if repeated_phrase(tokens):
        return "repeated_phrase_spam"

    if tokens and max(Counter(tokens).values()) >= 3 and len(set(tokens)) <= 3:
        return "repeated_tokens_spam"

    if brand_hits:
        return ""

    if "pdf" not in keyword and cluster not in {"pdf-tools-hub", "pdf-editor", "images-to-pdf", "ocr"}:
        return "not_pdf_specific"

    if cluster == "unclear" and max(file1_impressions, file2_searches) < 500:
        return "unclear_low_value"

    if keyword.startswith("pd f") or keyword.endswith("pd f"):
        return "malformed_keyword"

    if cluster == "unclear":
        return "manual_review_required"

    cluster_phrase_issue = detect_cluster_phrase_issue(keyword, cluster)
    if cluster_phrase_issue:
        return cluster_phrase_issue

    return ""


def detect_cluster_phrase_issue(keyword: str, cluster: str) -> str:
    candidate = strip_informational_prefix(keyword)

    if cluster == "split-pdf":
        if candidate.count("pdf") > 1 and candidate not in {"pdf split", "pdf splitter", "pdf separator", "pdf page separator", "pdf separate", "pdf divider", "pdf cutter"}:
            return "unnatural_cluster_phrase"
        if any(pattern.search(candidate) for pattern in SPLIT_VALID_PATTERNS):
            return ""
        return "unnatural_cluster_phrase"

    if cluster == "extract-pages":
        if any(pattern.search(candidate) for pattern in EXTRACT_VALID_PATTERNS):
            return ""
        return "unnatural_cluster_phrase"

    if cluster == "merge-pdf":
        if candidate.count("pdf") > 1:
            return "unnatural_cluster_phrase"
        if any(pattern.search(candidate) for pattern in MERGE_VALID_PATTERNS):
            return ""
        return "unnatural_cluster_phrase"

    if cluster == "compress-pdf":
        if candidate.count("pdf") > 1 or candidate.count("compress") > 1 or candidate.count("compressor") > 1:
            return "unnatural_cluster_phrase"
        if any(pattern.search(candidate) for pattern in COMPRESS_VALID_PATTERNS):
            return ""
        return "unnatural_cluster_phrase"

    if cluster == "pdf-to-word":
        if any(pattern.search(candidate) for pattern in PDF_TO_WORD_VALID_PATTERNS):
            return ""
        return "unnatural_cluster_phrase"

    if cluster == "word-to-pdf":
        if any(pattern.search(candidate) for pattern in WORD_TO_PDF_VALID_PATTERNS):
            return ""
        return "unnatural_cluster_phrase"

    if cluster == "ocr":
        if any(pattern.search(candidate) for pattern in OCR_VALID_PATTERNS):
            return ""
        return "unnatural_cluster_phrase"

    if cluster == "pdf-conversion":
        if candidate == "pdf converter":
            return ""
        if candidate.count("pdf") > 1:
            return "unnatural_cluster_phrase"
        if any(pattern.search(candidate) for pattern in CONVERSION_VALID_PATTERNS):
            return ""
        return "unnatural_cluster_phrase"

    if cluster == "pdf-editor":
        if candidate.count("pdf") > 1:
            return "unnatural_cluster_phrase"
        if any(pattern.search(candidate) for pattern in EDITOR_VALID_PATTERNS):
            return ""
        return "unnatural_cluster_phrase"

    if cluster == "images-to-pdf":
        if candidate.count("pdf") > 1:
            return "unnatural_cluster_phrase"
        if any(pattern.search(candidate) for pattern in IMAGE_TO_PDF_VALID_PATTERNS):
            return ""
        return "unnatural_cluster_phrase"

    if cluster == "mixed-pdf-operations":
        if candidate in {"pdf split and merge", "split and merge pdf"}:
            return ""
        return "unnatural_cluster_phrase"

    if cluster == "pdf-tools-hub":
        if "pdf tools" in keyword:
            return ""
        return "unnatural_cluster_phrase"

    return ""


def detect_intent(keyword: str, brand_hits: list[str]) -> str:
    if brand_hits:
        return "competitor"
    if contains_any(keyword, HOW_TO_MARKERS):
        return "informational"
    if "pdf tools" in keyword:
        return "commercial_investigation"
    return "transactional"


def market_bucket(language: str) -> str:
    if language == "en":
        return "core_en"
    if language == "es":
        return "growth_es"
    if language == "ar":
        return "expansion_ar"
    if language == "fr":
        return "expansion_fr"
    return "watchlist_other"


def recommendation_for(language: str, intent: str, cluster: str, brand_hits: list[str], noise_reason: str) -> tuple[str, str]:
    if noise_reason:
        return "exclude", noise_reason

    if brand_hits:
        return "watchlist", "competitor_branded"

    if language in WATCHLIST_LANGUAGES:
        return "watchlist", "unsupported_language_market"

    if language in GROWTH_LANGUAGES:
        if intent == "informational":
            return "supporting_content", "spanish_content_after_localization"
        return "target_after_localization", "spanish_localization_required"

    if cluster == "pdf-tools-hub":
        return "supporting_content", "homepage_or_tools_hub"

    if intent == "informational":
        return "supporting_content", "blog_or_faq_support"

    return "target_now", "mapped_to_live_page_or_current_i18n"


def score_keyword(file1_impressions: int, file2_searches: int, max_file1: int, max_file2: int) -> float:
    file1_score = 0.0
    file2_score = 0.0
    if max_file1:
        file1_score = math.log10(file1_impressions + 1) / math.log10(max_file1 + 1)
    if max_file2:
        file2_score = math.log10(file2_searches + 1) / math.log10(max_file2 + 1)
    return round(file1_score * 45 + file2_score * 55, 2)


def load_keyword_stats(path: Path) -> list[SourceRow]:
    rows: list[SourceRow] = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            keyword = (row.get("Keyword") or "").strip()
            if not keyword:
                continue
            rows.append(
                SourceRow(
                    keyword=keyword,
                    normalized=normalize_keyword(keyword),
                    source_name="keyword_trends_export",
                    source_path=str(path.relative_to(ROOT)).replace("\\", "/"),
                    volume=clean_int(row.get("Impressions")),
                    raw_metric_name="impressions",
                    raw_trends=(row.get("Trends") or "").strip(),
                )
            )
    return rows


def load_keyword_planner(path: Path) -> list[SourceRow]:
    rows: list[SourceRow] = []
    with path.open("r", encoding="utf-16") as handle:
        lines = handle.read().splitlines()

    reader = csv.DictReader(lines[2:], delimiter="\t")
    for row in reader:
        keyword = (row.get("Keyword") or "").strip()
        if not keyword:
            continue
        rows.append(
            SourceRow(
                keyword=keyword,
                normalized=normalize_keyword(keyword),
                source_name="keyword_planner_export",
                source_path=str(path.relative_to(ROOT)).replace("\\", "/"),
                volume=clean_int(row.get("Avg. monthly searches")),
                raw_metric_name="avg_monthly_searches",
                competition=(row.get("Competition") or "").strip(),
                competition_index=clean_int(row.get("Competition (indexed value)")),
            )
        )
    return rows


def aggregate_rows(rows: list[SourceRow]) -> list[KeywordAggregate]:
    aggregates: dict[str, KeywordAggregate] = {}

    for row in rows:
        if not row.normalized:
            continue

        aggregate = aggregates.get(row.normalized)
        if aggregate is None:
            aggregate = KeywordAggregate(keyword=row.keyword, normalized=row.normalized)
            aggregates[row.normalized] = aggregate

        current_best = max(aggregate.file1_impressions, aggregate.file2_avg_monthly_searches)
        incoming_best = row.volume
        if incoming_best > current_best:
            aggregate.keyword = row.keyword

        aggregate.source_names.add(row.source_name)
        aggregate.source_paths.add(row.source_path)
        if row.source_name == "keyword_trends_export":
            aggregate.file1_impressions += row.volume
            if row.raw_trends:
                aggregate.raw_trends.append(row.raw_trends)
        else:
            aggregate.file2_avg_monthly_searches += row.volume
            if row.competition:
                aggregate.competitions.add(row.competition)
            aggregate.competition_index_max = max(aggregate.competition_index_max, row.competition_index)

    return list(aggregates.values())


def build_keyword_rows(aggregates: list[KeywordAggregate]) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    max_file1 = max((item.file1_impressions for item in aggregates), default=0)
    max_file2 = max((item.file2_avg_monthly_searches for item in aggregates), default=0)
    rows: list[dict[str, str]] = []
    excluded: list[dict[str, str]] = []

    for aggregate in aggregates:
        normalized = aggregate.normalized
        brand_hits = detect_brands(normalized)
        language = detect_language(normalized)
        cluster = classify_cluster(normalized)
        metadata = CLUSTER_METADATA[cluster]
        modifiers = extract_modifiers(normalized, brand_hits)
        noise_reason = detect_noise_reason(
            normalized,
            cluster,
            brand_hits,
            aggregate.file1_impressions,
            aggregate.file2_avg_monthly_searches,
        )
        intent = detect_intent(normalized, brand_hits)
        recommendation, rationale = recommendation_for(language, intent, cluster, brand_hits, noise_reason)
        priority_score = score_keyword(
            aggregate.file1_impressions,
            aggregate.file2_avg_monthly_searches,
            max_file1,
            max_file2,
        )

        row = {
            "keyword": aggregate.keyword,
            "normalized_keyword": normalized,
            "language": language,
            "market_bucket": market_bucket(language),
            "intent": intent,
            "cluster": cluster,
            "cluster_label": metadata["label"],
            "recommended_target": metadata["recommended_target"],
            "target_type": metadata["target_type"],
            "recommendation": recommendation,
            "recommendation_reason": rationale,
            "priority_score": f"{priority_score:.2f}",
            "file1_impressions": str(aggregate.file1_impressions),
            "file2_avg_monthly_searches": str(aggregate.file2_avg_monthly_searches),
            "competition_levels": ", ".join(sorted(aggregate.competitions)),
            "competition_index_max": str(aggregate.competition_index_max),
            "brands": ", ".join(brand_hits),
            "modifiers": ", ".join(modifiers),
            "source_count": str(len(aggregate.source_names)),
            "sources": ", ".join(sorted(aggregate.source_names)),
            "source_paths": ", ".join(sorted(aggregate.source_paths)),
            "notes": metadata["implementation_note"],
        }

        if recommendation == "exclude":
            excluded.append(row)
        else:
            rows.append(row)

    rows.sort(
        key=lambda item: (
            RECOMMENDATION_ORDER[item["recommendation"]],
            -float(item["priority_score"]),
            item["normalized_keyword"],
        )
    )
    excluded.sort(key=lambda item: (-float(item["priority_score"]), item["normalized_keyword"]))

    for index, row in enumerate(rows, start=1):
        row["priority_rank"] = str(index)

    return rows, excluded


def build_cluster_rows(rows: list[dict[str, str]], excluded: list[dict[str, str]]) -> list[dict[str, str]]:
    grouped: dict[str, list[dict[str, str]]] = {}
    for row in rows + excluded:
        grouped.setdefault(row["cluster"], []).append(row)

    cluster_rows = []
    for cluster, items in grouped.items():
        metadata = CLUSTER_METADATA[cluster]
        targetable = [item for item in items if item["recommendation"] != "exclude"]
        sorted_items = sorted(items, key=lambda item: -float(item["priority_score"]))
        top_candidates = sorted(targetable, key=lambda item: -float(item["priority_score"]))
        top_item = top_candidates[0] if top_candidates else sorted_items[0]
        cluster_rows.append(
            {
                "cluster": cluster,
                "cluster_label": metadata["label"],
                "recommended_target": metadata["recommended_target"],
                "target_type": metadata["target_type"],
                "cluster_score": f"{sum(float(item['priority_score']) for item in targetable):.2f}",
                "keywords_total": str(len(items)),
                "target_now_keywords": str(sum(item["recommendation"] == "target_now" for item in items)),
                "target_after_localization_keywords": str(sum(item["recommendation"] == "target_after_localization" for item in items)),
                "supporting_content_keywords": str(sum(item["recommendation"] == "supporting_content" for item in items)),
                "watchlist_keywords": str(sum(item["recommendation"] == "watchlist" for item in items)),
                "excluded_keywords": str(sum(item["recommendation"] == "exclude" for item in items)),
                "top_keyword": top_item["keyword"],
                "top_language": top_item["language"],
                "file1_impressions": str(sum(int(item["file1_impressions"]) for item in items)),
                "file2_avg_monthly_searches": str(sum(int(item["file2_avg_monthly_searches"]) for item in items)),
                "implementation_note": metadata["implementation_note"],
            }
        )

    cluster_rows.sort(key=lambda item: -float(item["cluster_score"]))
    return cluster_rows


def to_markdown_table(rows: list[dict[str, str]], headers: list[tuple[str, str]]) -> str:
    if not rows:
        return "_No rows._"
    header_row = "| " + " | ".join(label for _, label in headers) + " |"
    separator = "| " + " | ".join("---" for _ in headers) + " |"
    body = [
        "| " + " | ".join(str(row.get(key, "")) for key, _ in headers) + " |"
        for row in rows
    ]
    return "\n".join([header_row, separator, *body])


def write_csv(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_summary(
    output_path: Path,
    input_paths: list[Path],
    raw_rows: list[SourceRow],
    aggregates: list[KeywordAggregate],
    rows: list[dict[str, str]],
    excluded: list[dict[str, str]],
    clusters: list[dict[str, str]],
) -> None:
    counts_by_recommendation = Counter(row["recommendation"] for row in rows)
    counts_by_recommendation.update(row["recommendation"] for row in excluded)

    visible_rows = [row for row in rows if row["recommendation"] != "watchlist"]
    language_counts = Counter(row["language"] for row in visible_rows)
    market_counts = Counter(row["market_bucket"] for row in visible_rows)

    top_target_now = [row for row in rows if row["recommendation"] == "target_now"][:15]
    top_localization = [row for row in rows if row["recommendation"] == "target_after_localization"][:15]
    top_supporting = [row for row in rows if row["recommendation"] == "supporting_content"][:12]
    top_watchlist = [row for row in rows if row["recommendation"] == "watchlist"][:10]
    top_clusters = clusters[:10]
    top_excluded = excluded[:10]

    input_paths_display = [str(path.relative_to(ROOT)).replace("\\", "/") for path in input_paths]
    input_list = "\n".join(f"- {path}" for path in input_paths_display)

    market_table_rows = [
        {
            "bucket": "core_en",
            "execution": "Target now",
            "notes": "Current product and current data both support this market immediately.",
            "count": str(market_counts.get("core_en", 0)),
        },
        {
            "bucket": "growth_es",
            "execution": "Target after localization",
            "notes": "Highest upside after English, but the site needs Spanish landing-page coverage first.",
            "count": str(market_counts.get("growth_es", 0)),
        },
        {
            "bucket": "expansion_fr",
            "execution": "Target now where demand exists",
            "notes": "Supported in product and ready for selective rollout where the uploads show clear intent.",
            "count": str(market_counts.get("expansion_fr", 0)),
        },
        {
            "bucket": "expansion_ar",
            "execution": "Target supported terms, expand with native research",
            "notes": "Product support exists and the latest uploads surface Arabic conversion intent, but category coverage still needs broader native-language research.",
            "count": str(market_counts.get("expansion_ar", 0)),
        },
    ]

    content = f"""# Keyword Portfolio - 2026-04-05

Generated with `scripts/build_keyword_portfolio.py` from the latest Google Ads exports.

## Source Files

{input_list}

## Source Overview

- Raw rows processed: {len(raw_rows)}
- Unique normalized keywords: {len(aggregates)}
- Included or watchlist keywords: {len(rows)}
- Excluded keywords: {len(excluded)}
- `target_now`: {counts_by_recommendation.get('target_now', 0)}
- `target_after_localization`: {counts_by_recommendation.get('target_after_localization', 0)}
- `supporting_content`: {counts_by_recommendation.get('supporting_content', 0)}
- `watchlist`: {counts_by_recommendation.get('watchlist', 0)}
- `exclude`: {counts_by_recommendation.get('exclude', 0)}

## Recommended Market Mix

{to_markdown_table(market_table_rows, [('bucket', 'Market Bucket'), ('execution', 'Execution'), ('count', 'Keywords'), ('notes', 'Notes')])}

## Language Distribution (Non-Watchlist)

{to_markdown_table([
    {'language': language, 'count': str(count)}
    for language, count in sorted(language_counts.items(), key=lambda item: (-item[1], item[0]))
], [('language', 'Language'), ('count', 'Keywords')])}

## Priority Clusters

{to_markdown_table(top_clusters, [
    ('cluster_label', 'Cluster'),
    ('recommended_target', 'Recommended Target'),
    ('cluster_score', 'Cluster Score'),
    ('target_now_keywords', 'Target Now'),
    ('target_after_localization_keywords', 'Target After Localization'),
    ('watchlist_keywords', 'Watchlist'),
    ('top_keyword', 'Top Keyword'),
])}

## Top Keywords to Target Now

{to_markdown_table(top_target_now, [
    ('priority_rank', 'Rank'),
    ('keyword', 'Keyword'),
    ('language', 'Language'),
    ('cluster_label', 'Cluster'),
    ('file2_avg_monthly_searches', 'Avg Monthly Searches'),
    ('file1_impressions', 'Impressions'),
    ('priority_score', 'Score'),
    ('recommended_target', 'Target'),
])}

## Spanish Growth Keywords

{to_markdown_table(top_localization, [
    ('priority_rank', 'Rank'),
    ('keyword', 'Keyword'),
    ('cluster_label', 'Cluster'),
    ('file2_avg_monthly_searches', 'Avg Monthly Searches'),
    ('file1_impressions', 'Impressions'),
    ('priority_score', 'Score'),
    ('recommendation_reason', 'Why'),
])}

## Supporting Content Keywords

{to_markdown_table(top_supporting, [
    ('priority_rank', 'Rank'),
    ('keyword', 'Keyword'),
    ('language', 'Language'),
    ('cluster_label', 'Cluster'),
    ('priority_score', 'Score'),
    ('recommendation_reason', 'Why'),
])}

## Watchlist

{to_markdown_table(top_watchlist, [
    ('priority_rank', 'Rank'),
    ('keyword', 'Keyword'),
    ('language', 'Language'),
    ('brands', 'Brands'),
    ('priority_score', 'Score'),
    ('recommendation_reason', 'Why'),
])}

## Excluded Samples

{to_markdown_table(top_excluded, [
    ('keyword', 'Keyword'),
    ('language', 'Language'),
    ('cluster_label', 'Cluster'),
    ('priority_score', 'Score'),
    ('recommendation_reason', 'Exclusion Reason'),
])}

## Implementation Notes

- The combined exports now show immediate live-page opportunities across `split pdf`, `compress pdf`, `merge pdf`, `pdf to word`, `word to pdf`, and adjacent OCR/conversion intent.
- Spanish is the strongest growth market in the uploaded data, but those keywords are intentionally separated into `target_after_localization` until the site ships Spanish landing pages.
- Arabic and French remain strategically valid because the product already supports both languages. Use the current dataset for targeted pages now, then supplement with native-language research before scaling site-wide coverage.
- Competitor-branded phrases are kept in the watchlist only. They should not be mixed into the core unbranded landing-page portfolio.
- Generic or malformed terms are excluded when they are too broad, not PDF-specific, or obviously generated noise from Keyword Planner suggestions.

## Output Files

- `prioritized_keywords.csv` - master portfolio with recommendation status, market bucket, cluster mapping, and source metrics.
- `keyword_clusters.csv` - cluster-level rollup for page planning.
- `excluded_keywords.csv` - excluded or noisy terms with reasons.
"""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a keyword portfolio from Google Ads exports.")
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help="Directory where the generated deliverables will be written.",
    )
    parser.add_argument(
        "--inputs",
        nargs="*",
        default=[str(path) for path in DEFAULT_INPUTS],
        help="Input export files. Supports the repository's CSV and UTF-16 TSV Google Ads formats.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_paths = [Path(path) if Path(path).is_absolute() else ROOT / path for path in args.inputs]
    output_dir = Path(args.output_dir) if Path(args.output_dir).is_absolute() else ROOT / args.output_dir

    if not input_paths:
        raise FileNotFoundError("No keyword input files were found. Add exports under docs/keyword-research/2026-04-05/Keywords or pass --inputs explicitly.")

    raw_rows: list[SourceRow] = []
    for path in input_paths:
        if path.name == "KeywordStats_4_5_2026.csv":
            raw_rows.extend(load_keyword_stats(path))
        else:
            raw_rows.extend(load_keyword_planner(path))

    aggregates = aggregate_rows(raw_rows)
    rows, excluded = build_keyword_rows(aggregates)
    clusters = build_cluster_rows(rows, excluded)

    prioritized_fields = [
        "priority_rank",
        "recommendation",
        "recommendation_reason",
        "market_bucket",
        "keyword",
        "normalized_keyword",
        "language",
        "intent",
        "cluster",
        "cluster_label",
        "recommended_target",
        "target_type",
        "priority_score",
        "file2_avg_monthly_searches",
        "file1_impressions",
        "competition_levels",
        "competition_index_max",
        "brands",
        "modifiers",
        "source_count",
        "sources",
        "source_paths",
        "notes",
    ]
    excluded_fields = [
        "keyword",
        "normalized_keyword",
        "language",
        "intent",
        "cluster",
        "cluster_label",
        "priority_score",
        "file2_avg_monthly_searches",
        "file1_impressions",
        "brands",
        "modifiers",
        "recommendation_reason",
        "sources",
        "source_paths",
    ]
    cluster_fields = [
        "cluster",
        "cluster_label",
        "recommended_target",
        "target_type",
        "cluster_score",
        "keywords_total",
        "target_now_keywords",
        "target_after_localization_keywords",
        "supporting_content_keywords",
        "watchlist_keywords",
        "excluded_keywords",
        "top_keyword",
        "top_language",
        "file1_impressions",
        "file2_avg_monthly_searches",
        "implementation_note",
    ]

    write_csv(output_dir / "prioritized_keywords.csv", rows, prioritized_fields)
    write_csv(output_dir / "excluded_keywords.csv", excluded, excluded_fields)
    write_csv(output_dir / "keyword_clusters.csv", clusters, cluster_fields)
    write_summary(output_dir / "keyword_strategy.md", input_paths, raw_rows, aggregates, rows, excluded, clusters)

    print(f"Generated keyword portfolio in {output_dir}")
    print(f"Included rows: {len(rows)}")
    print(f"Excluded rows: {len(excluded)}")


if __name__ == "__main__":
    main()