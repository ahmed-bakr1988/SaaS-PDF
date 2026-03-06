"""Flowchart service — Extract procedures from PDF and generate flowchart data."""
import os
import re
import json
import logging

logger = logging.getLogger(__name__)


class FlowchartError(Exception):
    """Custom exception for flowchart operations."""
    pass


# ---------------------------------------------------------------------------
# Heuristic keywords that signal procedural content
# ---------------------------------------------------------------------------
_PROCEDURE_KEYWORDS = [
    "procedure", "protocol", "checklist", "sequence", "instruction",
    "steps", "process", "workflow", "troubleshoot", "maintenance",
    "startup", "shutdown", "emergency", "inspection", "replacement",
    "installation", "calibration", "operation", "safety", "guide",
]

_STEP_PATTERNS = re.compile(
    r"(?:^|\n)\s*(?:"
    r"(?:step\s*\d+)|"           # Step 1, Step 2 …
    r"(?:\d+[\.\)]\s+)|"         # 1. or 1) …
    r"(?:[a-z][\.\)]\s+)|"       # a. or a) …
    r"(?:•\s)|"                  # bullet •
    r"(?:-\s)|"                  # dash -
    r"(?:✓\s)"                   # checkmark ✓
    r")",
    re.IGNORECASE,
)

_DECISION_KEYWORDS = re.compile(
    r"\b(?:if|whether|check|verify|confirm|decide|inspect|compare|ensure|"
    r"is\s+\w+\s*\?|does|should|can)\b",
    re.IGNORECASE,
)


def extract_text_from_pdf(input_path: str) -> list[dict]:
    """
    Extract text from each page of a PDF.

    Returns:
        List of dicts: [{"page": 1, "text": "..."}, ...]
    """
    try:
        from PyPDF2 import PdfReader

        if not os.path.exists(input_path):
            raise FlowchartError(f"File not found: {input_path}")

        reader = PdfReader(input_path)
        pages = []
        for i, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            pages.append({"page": i, "text": text.strip()})

        return pages

    except FlowchartError:
        raise
    except Exception as e:
        raise FlowchartError(f"Failed to extract text from PDF: {str(e)}")


def identify_procedures(pages: list[dict]) -> list[dict]:
    """
    Analyse extracted PDF text and identify procedures/sections.

    Uses heuristic analysis:
    1. Look for headings (lines in UPPER CASE or short bold-like lines)
    2. Match procedure keywords
    3. Group consecutive pages under the same heading

    Returns:
        List of procedures: [
            {
                "id": "proc-1",
                "title": "Emergency Shutdown Protocol",
                "description": "Extracted first paragraph...",
                "pages": [8, 9],
                "step_count": 6
            },
            ...
        ]
    """
    procedures = []
    current_proc = None
    proc_counter = 0

    for page_data in pages:
        text = page_data["text"]
        page_num = page_data["page"]

        if not text:
            continue

        lines = text.split("\n")
        heading_candidates = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            # Heading heuristic: short line, mostly uppercase or title-like
            is_heading = (
                len(stripped) < 80
                and (
                    stripped.isupper()
                    or (stripped == stripped.title() and len(stripped.split()) <= 8)
                    or any(kw in stripped.lower() for kw in _PROCEDURE_KEYWORDS)
                )
                and not stripped.endswith(",")
            )

            if is_heading:
                heading_candidates.append(stripped)

        # Check if this page has procedural content
        has_steps = bool(_STEP_PATTERNS.search(text))
        has_keywords = any(kw in text.lower() for kw in _PROCEDURE_KEYWORDS)

        if heading_candidates and (has_steps or has_keywords):
            best_heading = heading_candidates[0]

            # Check if this is a continuation of the current procedure
            if current_proc and _is_continuation(current_proc["title"], best_heading, text):
                current_proc["pages"].append(page_num)
                current_proc["_text"] += "\n" + text
            else:
                # Save previous procedure
                if current_proc:
                    _finalize_procedure(current_proc)
                    procedures.append(current_proc)

                proc_counter += 1
                first_paragraph = _extract_first_paragraph(text, best_heading)
                current_proc = {
                    "id": f"proc-{proc_counter}",
                    "title": _clean_title(best_heading),
                    "description": first_paragraph,
                    "pages": [page_num],
                    "_text": text,
                }
        elif current_proc and has_steps:
            # Continuation — same procedure on next page
            current_proc["pages"].append(page_num)
            current_proc["_text"] += "\n" + text

    # Don't forget the last one
    if current_proc:
        _finalize_procedure(current_proc)
        procedures.append(current_proc)

    # If no procedures found via headings, try splitting by page with step content
    if not procedures:
        procedures = _fallback_extraction(pages)

    return procedures


def generate_flowchart(procedure: dict, page_texts: list[dict]) -> dict:
    """
    Generate a flowchart (list of nodes + connections) from a procedure.

    Args:
        procedure: Procedure dict with id, title, pages
        page_texts: All page text data

    Returns:
        Flowchart dict: {
            "id": "flow-1",
            "procedureId": "proc-1",
            "title": "...",
            "steps": [ {id, type, title, description, connections}, ... ]
        }
    """
    # Gather text for the procedure's pages
    text = ""
    for pt in page_texts:
        if pt["page"] in procedure["pages"]:
            text += pt["text"] + "\n"

    steps = _extract_steps_from_text(text, procedure["title"])

    return {
        "id": f"flow-{procedure['id']}",
        "procedureId": procedure["id"],
        "title": procedure["title"],
        "steps": steps,
    }


def extract_and_generate(input_path: str) -> dict:
    """
    Full pipeline: extract text → identify procedures → generate flowcharts.

    Returns:
        {
            "procedures": [...],
            "flowcharts": [...],
            "total_pages": int
        }
    """
    pages = extract_text_from_pdf(input_path)
    procedures = identify_procedures(pages)

    flowcharts = []
    for proc in procedures:
        flow = generate_flowchart(proc, pages)
        flowcharts.append(flow)

    # Remove internal text field
    for proc in procedures:
        proc.pop("_text", None)

    return {
        "procedures": procedures,
        "flowcharts": flowcharts,
        "total_pages": len(pages),
        "pages": pages,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _is_continuation(current_title: str, new_heading: str, text: str) -> bool:
    """Check if a page is a continuation of the current procedure."""
    continued_markers = ["(continued)", "(cont.)", "(cont'd)"]
    heading_lower = new_heading.lower()

    # Explicit continuation marker
    if any(m in heading_lower for m in continued_markers):
        return True

    # Same title repeated
    if current_title.lower().rstrip() in heading_lower:
        return True

    return False


def _clean_title(title: str) -> str:
    """Clean up a procedure title."""
    # Remove continuation markers
    title = re.sub(r"\s*\(continued\).*", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\s*\(cont[\.\']?d?\).*", "", title, flags=re.IGNORECASE)
    # Remove leading numbers like "3.1"
    title = re.sub(r"^\d+[\.\)]\s*", "", title)
    title = re.sub(r"^\d+\.\d+\s*", "", title)
    return title.strip()


def _extract_first_paragraph(text: str, heading: str) -> str:
    """Extract the first meaningful paragraph after a heading."""
    idx = text.find(heading)
    if idx >= 0:
        after_heading = text[idx + len(heading):].strip()
    else:
        after_heading = text.strip()

    lines = after_heading.split("\n")
    paragraph = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if paragraph:
                break
            continue
        if stripped.isupper() and len(stripped) > 10:
            break
        paragraph.append(stripped)

    desc = " ".join(paragraph)[:200]
    return desc if desc else "Procedural content extracted from document."


def _finalize_procedure(proc: dict):
    """Calculate step count from the accumulated text."""
    text = proc.get("_text", "")
    matches = _STEP_PATTERNS.findall(text)
    proc["step_count"] = max(len(matches), 2)


def _fallback_extraction(pages: list[dict]) -> list[dict]:
    """When no heading-based procedures found, detect pages with step-like content."""
    procedures = []
    proc_counter = 0

    for page_data in pages:
        text = page_data["text"]
        if not text:
            continue

        has_steps = bool(_STEP_PATTERNS.search(text))
        if has_steps:
            proc_counter += 1
            first_line = text.split("\n")[0].strip()[:60]
            procedures.append({
                "id": f"proc-{proc_counter}",
                "title": first_line or f"Procedure (Page {page_data['page']})",
                "description": text[:150].strip(),
                "pages": [page_data["page"]],
                "step_count": len(_STEP_PATTERNS.findall(text)),
            })

    return procedures


def _extract_steps_from_text(text: str, procedure_title: str) -> list[dict]:
    """
    Parse text into flowchart steps (nodes).

    Strategy:
    1. Split text by numbered/bulleted lines
    2. Classify each as process or decision
    3. Add start/end nodes
    4. Wire connections
    """
    lines = text.split("\n")
    raw_steps = []
    current_step_lines = []
    step_counter = 0

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Is this the start of a new step?
        is_step_start = bool(re.match(
            r"^\s*(?:\d+[\.\)]\s+|[a-z][\.\)]\s+|•\s|-\s|✓\s|step\s*\d+)",
            stripped,
            re.IGNORECASE,
        ))

        if is_step_start:
            if current_step_lines:
                raw_steps.append(" ".join(current_step_lines))
            current_step_lines = [re.sub(r"^\s*(?:\d+[\.\)]\s*|[a-z][\.\)]\s*|•\s*|-\s*|✓\s*|step\s*\d+[:\.\)]\s*)", "", stripped, flags=re.IGNORECASE)]
        elif current_step_lines:
            current_step_lines.append(stripped)

    if current_step_lines:
        raw_steps.append(" ".join(current_step_lines))

    # Limit to reasonable number of steps
    if len(raw_steps) > 15:
        raw_steps = raw_steps[:15]

    # Build flowchart nodes
    nodes = []
    step_id = 0

    # Start node
    step_id += 1
    nodes.append({
        "id": str(step_id),
        "type": "start",
        "title": f"Begin: {procedure_title[:40]}",
        "description": "Start of procedure",
        "connections": [str(step_id + 1)] if raw_steps else [],
    })

    for i, step_text in enumerate(raw_steps):
        step_id += 1
        # Classify as decision or process
        is_decision = bool(_DECISION_KEYWORDS.search(step_text))

        node_type = "decision" if is_decision else "process"
        title = step_text[:60]
        description = step_text[:150]

        connections = []
        if i < len(raw_steps) - 1:
            if is_decision:
                # Decision: Yes goes to next, No could loop back or skip
                connections = [str(step_id + 1)]
            else:
                connections = [str(step_id + 1)]
        else:
            connections = [str(step_id + 1)]  # Connect to end

        nodes.append({
            "id": str(step_id),
            "type": node_type,
            "title": title,
            "description": description,
            "connections": connections,
        })

    # End node
    step_id += 1
    nodes.append({
        "id": str(step_id),
        "type": "end",
        "title": "Procedure Complete",
        "description": "End of procedure",
        "connections": [],
    })

    return nodes
