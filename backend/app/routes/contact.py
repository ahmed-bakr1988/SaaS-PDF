"""Contact form routes."""
import logging
import re

from flask import Blueprint, jsonify, request

from app.extensions import limiter
from app.services.contact_service import save_message

logger = logging.getLogger(__name__)

contact_bp = Blueprint("contact", __name__)

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


@contact_bp.route("/submit", methods=["POST"])
@limiter.limit("5/hour", override_defaults=True)
def submit_contact():
    """Accept a contact form submission."""
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    category = (data.get("category") or "general").strip()
    subject = (data.get("subject") or "").strip()
    message = (data.get("message") or "").strip()

    errors = []
    if not name or len(name) > 200:
        errors.append("Name is required (max 200 characters).")
    if not email or not EMAIL_RE.match(email):
        errors.append("A valid email address is required.")
    if not subject or len(subject) > 500:
        errors.append("Subject is required (max 500 characters).")
    if not message or len(message) > 5000:
        errors.append("Message is required (max 5000 characters).")

    if errors:
        return jsonify({"error": errors[0], "errors": errors}), 400

    result = save_message(name, email, category, subject, message)
    return jsonify({"message": "Message sent successfully.", **result}), 201
