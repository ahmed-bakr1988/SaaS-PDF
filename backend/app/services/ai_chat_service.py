"""AI Chat Service — OpenRouter integration for flowchart improvement."""
import json
import logging
import requests

from app.services.openrouter_config_service import get_openrouter_settings

logger = logging.getLogger(__name__)

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
    settings = get_openrouter_settings()

    if not settings.api_key:
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
            settings.base_url,
            headers={
                "Authorization": f"Bearer {settings.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.model,
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

        # Log usage
        try:
            from app.services.ai_cost_service import log_ai_usage
            usage = data.get("usage", {})
            log_ai_usage(
                tool="flowchart_chat",
                model=settings.model,
                input_tokens=usage.get("prompt_tokens", max(1, len(message) // 4)),
                output_tokens=usage.get("completion_tokens", max(1, len(reply) // 4)),
            )
        except Exception:
            pass

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
            f"please configure OPENROUTER_API_KEY for the application."
        )

    return (
        "AI chat requires OPENROUTER_API_KEY to be configured for the application. "
        "Set it once in the app configuration for full AI functionality."
    )
