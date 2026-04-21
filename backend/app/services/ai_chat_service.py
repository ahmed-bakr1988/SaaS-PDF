"""AI Chat Service — Gemini integration for flowchart improvement."""
import logging

from app.services.gemini_client import (
    call_gemini_text,
    call_openrouter_fallback,
    get_gemini_settings,
    GeminiError,
)

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

    user_text = f"{message}{context}"

    try:
        reply = call_gemini_text(
            SYSTEM_PROMPT,
            user_text,
            max_tokens=500,
            temperature=0.7,
            tool_name="flowchart_chat",
        )
        return {"reply": reply, "updated_flow": None}
    except GeminiError as gemini_err:
        # Try OpenRouter as fallback
        try:
            reply = call_openrouter_fallback(
                SYSTEM_PROMPT,
                user_text,
                max_tokens=500,
                temperature=0.7,
                tool_name="flowchart_chat",
            )
            return {"reply": reply, "updated_flow": None}
        except GeminiError:
            pass

        logger.warning("AI chat failed: %s (%s)", gemini_err.user_message, gemini_err.error_code)
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
            f"({decision_count} decisions). "
            f"AI suggestions require a valid GEMINI_API_KEY to be configured."
        )

    return (
        "AI chat requires GEMINI_API_KEY to be configured. "
        "Set it in the application configuration for full AI functionality."
    )
