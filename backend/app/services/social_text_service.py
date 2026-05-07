"""Social media text analysis service."""

from __future__ import annotations

from dataclasses import dataclass
import math
import re
from typing import Any


MAX_TEXT_LENGTH = 20000

WORD_RE = re.compile(r"\b[\w\u0600-\u06FF][\w\u0600-\u06FF'-]*\b", re.UNICODE)
SENTENCE_RE = re.compile(r"[.!?؟。]+")
PARAGRAPH_RE = re.compile(r"\n\s*\n|\n")
HASHTAG_RE = re.compile(r"(?<!\w)#[\w\u0600-\u06FF_]+", re.UNICODE)
MENTION_RE = re.compile(r"(?<!\w)@[\w._]+", re.UNICODE)
URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
CTA_RE = re.compile(
    r"\b("
    r"buy|shop|order|download|subscribe|sign up|signup|register|learn more|"
    r"read more|click|book|watch|comment|share|save|follow|join|start|discover|"
    r"جرّب|اشترك|سجل|سجّل|احجز|اطلب|حمّل|اقرأ|شاهد|تابع|شارك|احفظ|اكتشف"
    r")\b",
    re.IGNORECASE,
)
EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001F5FF"
    "\U0001F600-\U0001F64F"
    "\U0001F680-\U0001F6FF"
    "\U0001F700-\U0001F77F"
    "\U0001F780-\U0001F7FF"
    "\U0001F800-\U0001F8FF"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FAFF"
    "\U00002700-\U000027BF"
    "\U00002600-\U000026FF"
    "]+",
    flags=re.UNICODE,
)


class SocialTextValidationError(ValueError):
    """Raised when input text is invalid."""


@dataclass(frozen=True)
class PlatformRule:
    key: str
    name: str
    hard_limit: int
    optimal_min: int
    optimal_max: int
    recommended_hashtags_min: int
    recommended_hashtags_max: int
    recommended_paragraphs_min: int
    recommended_paragraphs_max: int
    allow_links: bool = True
    requires_cta: bool = False


PLATFORM_RULES = (
    PlatformRule(
        key="x",
        name="X",
        hard_limit=280,
        optimal_min=71,
        optimal_max=180,
        recommended_hashtags_min=0,
        recommended_hashtags_max=2,
        recommended_paragraphs_min=1,
        recommended_paragraphs_max=2,
        allow_links=True,
    ),
    PlatformRule(
        key="linkedin",
        name="LinkedIn",
        hard_limit=3000,
        optimal_min=150,
        optimal_max=600,
        recommended_hashtags_min=3,
        recommended_hashtags_max=5,
        recommended_paragraphs_min=2,
        recommended_paragraphs_max=6,
        allow_links=True,
        requires_cta=True,
    ),
    PlatformRule(
        key="instagram",
        name="Instagram",
        hard_limit=2200,
        optimal_min=125,
        optimal_max=400,
        recommended_hashtags_min=3,
        recommended_hashtags_max=8,
        recommended_paragraphs_min=2,
        recommended_paragraphs_max=5,
        allow_links=False,
        requires_cta=True,
    ),
    PlatformRule(
        key="facebook",
        name="Facebook",
        hard_limit=63206,
        optimal_min=40,
        optimal_max=280,
        recommended_hashtags_min=1,
        recommended_hashtags_max=3,
        recommended_paragraphs_min=1,
        recommended_paragraphs_max=4,
        allow_links=True,
        requires_cta=True,
    ),
    PlatformRule(
        key="tiktok",
        name="TikTok",
        hard_limit=2200,
        optimal_min=80,
        optimal_max=220,
        recommended_hashtags_min=2,
        recommended_hashtags_max=5,
        recommended_paragraphs_min=1,
        recommended_paragraphs_max=3,
        allow_links=False,
        requires_cta=True,
    ),
)


def _clamp(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))


def _normalize_text(text: str) -> str:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    return normalized.strip()


def _count_words(text: str) -> int:
    return len(WORD_RE.findall(text))


def _count_sentences(text: str) -> int:
    pieces = [piece.strip() for piece in SENTENCE_RE.split(text)]
    return len([piece for piece in pieces if piece])


def _count_paragraphs(text: str) -> int:
    pieces = [piece.strip() for piece in PARAGRAPH_RE.split(text)]
    return len([piece for piece in pieces if piece])


def _infer_tone(characters: int, paragraphs: int) -> str:
    if characters <= 120 and paragraphs <= 2:
        return "concise"
    if characters >= 500 or paragraphs >= 4:
        return "long-form"
    return "balanced"


def _score_platform(rule: PlatformRule, stats: dict[str, Any]) -> tuple[int, list[str], str]:
    penalties = 0
    recommendations: list[str] = []

    char_count = stats["characters"]
    hashtags = stats["hashtags"]
    paragraphs = stats["paragraphs"]
    links = stats["links"]
    has_cta = stats["has_cta"]

    if char_count > rule.hard_limit:
        penalties += 45 + min(35, math.ceil((char_count - rule.hard_limit) / 20))
        recommendations.append(
            f"Trim {char_count - rule.hard_limit} characters to fit {rule.name}'s hard limit."
        )
        status = "over-limit"
    else:
        status = "ready"
        if char_count < rule.optimal_min:
            penalties += 12
            recommendations.append(
                f"Add more context. {rule.name} performs better around {rule.optimal_min}-{rule.optimal_max} characters."
            )
            status = "needs-work"
        elif char_count > rule.optimal_max:
            penalties += 10
            recommendations.append(
                f"Tighten the copy for stronger scannability on {rule.name}."
            )
            status = "needs-work"

    if hashtags < rule.recommended_hashtags_min:
        penalties += 6
        recommendations.append(
            f"Add {rule.recommended_hashtags_min - hashtags} relevant hashtag(s) for {rule.name}."
        )
        if status == "ready":
            status = "needs-work"
    elif hashtags > rule.recommended_hashtags_max:
        penalties += 8
        recommendations.append(
            f"Reduce hashtags to {rule.recommended_hashtags_max} or fewer for {rule.name}."
        )
        if status == "ready":
            status = "needs-work"

    if paragraphs < rule.recommended_paragraphs_min:
        penalties += 4
        recommendations.append(f"Break the text into clearer paragraphs for {rule.name}.")
    elif paragraphs > rule.recommended_paragraphs_max:
        penalties += 4
        recommendations.append(f"Reduce paragraph fragmentation to keep {rule.name} readable.")

    if not rule.allow_links and links > 0:
        penalties += 8
        recommendations.append(
            f"Links have limited value in {rule.name} captions. Move the URL to bio or comments."
        )

    if rule.requires_cta and not has_cta:
        penalties += 6
        recommendations.append(f"Add a clear call to action for {rule.name}.")

    score = _clamp(100 - penalties, 0, 100)

    if not recommendations:
        recommendations.append(f"Copy length and structure are in a strong range for {rule.name}.")

    return score, recommendations[:3], status


def analyze_social_text(text: str) -> dict[str, Any]:
    """Analyze text for social media publishing readiness."""
    normalized_text = _normalize_text(text)
    if not normalized_text:
        raise SocialTextValidationError("Text is required.")
    if len(normalized_text) > MAX_TEXT_LENGTH:
        raise SocialTextValidationError(
            f"Text exceeds the maximum allowed length of {MAX_TEXT_LENGTH} characters."
        )

    characters = len(normalized_text)
    characters_no_spaces = len(re.sub(r"\s+", "", normalized_text))
    words = _count_words(normalized_text)
    sentences = _count_sentences(normalized_text)
    paragraphs = _count_paragraphs(normalized_text)
    hashtags = len(HASHTAG_RE.findall(normalized_text))
    mentions = len(MENTION_RE.findall(normalized_text))
    links = len(URL_RE.findall(normalized_text))
    emoji_count = len(EMOJI_RE.findall(normalized_text))
    reading_time_seconds = max(5, math.ceil((words / 180) * 60)) if words else 0
    tone = _infer_tone(characters, paragraphs)
    has_cta = bool(CTA_RE.search(normalized_text))

    stats = {
        "words": words,
        "characters": characters,
        "characters_no_spaces": characters_no_spaces,
        "sentences": sentences,
        "paragraphs": paragraphs,
        "hashtags": hashtags,
        "mentions": mentions,
        "links": links,
        "emojis": emoji_count,
        "reading_time_seconds": reading_time_seconds,
        "tone": tone,
        "has_cta": has_cta,
    }

    platform_results = []
    scores: list[int] = []
    for rule in PLATFORM_RULES:
        score, recommendations, status = _score_platform(rule, stats)
        scores.append(score)
        platform_results.append(
            {
                "id": rule.key,
                "name": rule.name,
                "hard_limit": rule.hard_limit,
                "remaining_characters": rule.hard_limit - characters,
                "optimal_range": {
                    "min": rule.optimal_min,
                    "max": rule.optimal_max,
                },
                "recommended_hashtags": {
                    "min": rule.recommended_hashtags_min,
                    "max": rule.recommended_hashtags_max,
                },
                "status": status,
                "score": score,
                "recommendations": recommendations,
            }
        )

    overall_score = round(sum(scores) / len(scores)) if scores else 0

    suggestions = {
        "top_priority": max(
            platform_results,
            key=lambda item: item["score"],
        )["name"],
        "lowest_priority": min(
            platform_results,
            key=lambda item: item["score"],
        )["name"],
        "summary": (
            "Ready for publishing with minor optimization."
            if overall_score >= 80
            else "Usable draft, but it needs refinement for platform fit."
            if overall_score >= 60
            else "Needs revision before publishing."
        ),
    }

    return {
        "input": {
            "text": normalized_text,
            "max_length": MAX_TEXT_LENGTH,
        },
        "stats": stats,
        "overall_score": overall_score,
        "platforms": platform_results,
        "suggestions": suggestions,
    }
