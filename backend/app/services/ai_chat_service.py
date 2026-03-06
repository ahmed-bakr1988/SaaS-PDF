"""AI Chat Service — OpenRouter integration for flowchart improvement."""
import os
import json
import logging
import requests

logger = logging.getLogger(__name__)

# Configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3-8b-instruct")
OPENROUTER_BASE_URL = os.getenv(
    "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1/chat/completions"
)

SYSTEM_PROMPT = """You are a flowchart improvement assistant. You help users improve their flowcharts by:
1. Suggesting better step titles and descriptions
2. Identifying missing steps or decision points
3. Recommending better flow structure
4. Simplifying complex flows

When the user asks you to modify the flowchart, respond with your suggestion in plain text.
Keep responses concise and actionable. Reply in the same language the user uses."""


def chat_about_flowchart(message: str, flow_data: dict | None = None) -> dict:
    """
    Send a message to the AI about a flowchart and get improvement suggestions.

    Args:
        message: User message
        flow_data: Current flowchart data (optional)

    Returns:
        {"reply": "...", "updated_flow": {...} | None}
    """
    if not OPENROUTER_API_KEY:
        return {
            "reply": _fallback_response(message, flow_data),
            "updated_flow": None,
        }

    # Build context
    context = ""
    if flow_data:
        steps_summary = []
        for s in flow_data.get("steps", []):
            steps_summary.append(
                f"- [{s.get('type', 'process')}] {s.get('title', '')}"
            )
        context = (
            f"\nCurrent flowchart: {flow_data.get('title', 'Untitled')}\n"
            f"Steps:\n" + "\n".join(steps_summary)
        )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"{message}{context}"},
    ]

    try:
        response = requests.post(
            OPENROUTER_BASE_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": messages,
                "max_tokens": 500,
                "temperature": 0.7,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        reply = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )

        if not reply:
            reply = "I couldn't generate a response. Please try again."

        return {"reply": reply, "updated_flow": None}

    except requests.exceptions.Timeout:
        logger.warning("OpenRouter API timeout")
        return {
            "reply": "The AI service is taking too long. Please try again.",
            "updated_flow": None,
        }
    except Exception as e:
        logger.error(f"OpenRouter API error: {e}")
        return {
            "reply": _fallback_response(message, flow_data),
            "updated_flow": None,
        }


def _fallback_response(message: str, flow_data: dict | None) -> str:
    """Provide a helpful response when the AI API is unavailable."""
    msg_lower = message.lower()

    if flow_data:
        steps = flow_data.get("steps", [])
        title = flow_data.get("title", "your flowchart")
        step_count = len(steps)
        decision_count = sum(1 for s in steps if s.get("type") == "decision")

        if any(
            w in msg_lower for w in ["simplify", "reduce", "shorter", "بسط", "اختصر"]
        ):
            return (
                f"Your flowchart '{title}' has {step_count} steps. "
                f"To simplify, consider merging consecutive process steps "
                f"that perform related actions into a single step."
            )

        if any(
            w in msg_lower for w in ["missing", "add", "more", "ناقص", "أضف"]
        ):
            return (
                f"Your flowchart has {decision_count} decision points. "
                f"Consider adding error handling or validation steps "
                f"between critical process nodes."
            )

        return (
            f"Your flowchart '{title}' contains {step_count} steps "
            f"({decision_count} decisions). To get AI-powered suggestions, "
            f"please configure the OPENROUTER_API_KEY environment variable."
        )

    return (
        "AI chat requires the OPENROUTER_API_KEY to be configured. "
        "Please set up the environment variable for full AI functionality."
    )
