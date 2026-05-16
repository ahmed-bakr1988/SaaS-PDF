"""Flask Application Factory."""

import os
import time

from flask import Flask, jsonify

from config import config
from app.extensions import cors, limiter, talisman, init_celery
from app.services.account_service import init_account_db
from app.services.rating_service import init_ratings_db
from app.services.ai_cost_service import init_ai_cost_db
from app.services.site_assistant_service import init_site_assistant_db
from app.services.contact_service import init_contact_db
from app.services.stripe_service import init_stripe_db
from app.services.paypal_service import init_paypal_db
from app.services.paymob_service import init_paymob_db
from app.utils.csrf import (
    CSRFError,
    apply_csrf_cookie,
    should_enforce_csrf,
    validate_csrf_request,
)


def _init_sentry(app):
    """Initialize Sentry error monitoring if DSN is configured."""
    dsn = app.config.get("SENTRY_DSN", "")
    if not dsn:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        from sentry_sdk.integrations.celery import CeleryIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=app.config.get("SENTRY_ENVIRONMENT", "development"),
            integrations=[FlaskIntegration(), CeleryIntegration()],
            traces_sample_rate=0.1,
            send_default_pii=False,
        )
    except ImportError:
        app.logger.warning("sentry-sdk not installed — monitoring disabled.")


def _initialize_runtime_state(app):
    """Initialize persistent application state with bounded startup retries."""
    max_attempts = max(1, int(os.getenv("APP_STARTUP_INIT_RETRIES", "5")))
    delay_seconds = max(1, int(os.getenv("APP_STARTUP_INIT_DELAY_SECONDS", "3")))

    for attempt in range(1, max_attempts + 1):
        try:
            with app.app_context():
                init_account_db()
                init_ratings_db()
                init_ai_cost_db()
                init_site_assistant_db()
                init_contact_db()
                init_stripe_db()
                init_paypal_db()
                init_paymob_db()
            return
        except Exception:
            app.logger.exception(
                "Application initialization failed on attempt %s/%s",
                attempt,
                max_attempts,
            )
            if attempt >= max_attempts:
                raise
            time.sleep(delay_seconds)


def create_app(config_name=None, config_overrides=None):
    """Create and configure the Flask application."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config[config_name])
    if config_overrides:
        app.config.update(config_overrides)

    # Initialize Sentry early
    _init_sentry(app)

    # Create upload/output/database directories
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["OUTPUT_FOLDER"], exist_ok=True)
    if not app.config.get("DATABASE_URL"):
        db_dir = os.path.dirname(app.config["DATABASE_PATH"])
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    # Initialize extensions
    cors.init_app(
        app,
        origins=app.config["CORS_ORIGINS"],
        supports_credentials=True,
    )

    limiter.init_app(app)

    # Talisman security headers (relaxed CSP for AdSense + Clarity + PDF workers)
    csp = {
        "default-src": "'self'",
        "script-src": [
            "'self'",
            "'unsafe-inline'",
            "blob:",
            "https://pagead2.googlesyndication.com",
            "https://www.googletagmanager.com",
            "https://www.google-analytics.com",
            "https://*.clarity.ms",
            "https://unpkg.com",
        ],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": [
            "'self'",
            "data:",
            "blob:",
            "https://pagead2.googlesyndication.com",
            "https://tpc.googlesyndication.com",
            "https://www.google-analytics.com",
        ],
        "frame-src": [
            "https://googleads.g.doubleclick.net",
            "https://tpc.googlesyndication.com",
        ],
        "connect-src": [
            "'self'",
            "https://www.google-analytics.com",
            "https://pagead2.googlesyndication.com",
            "https://plausible.io",
            "https://*.amazonaws.com",
            "https://*.adtrafficquality.google",
            "https://*.clarity.ms",
        ],
        "worker-src": ["'self'", "blob:"],
    }
    talisman.init_app(
        app,
        content_security_policy=csp,
        force_https=config_name == "production",
    )

    @app.before_request
    def enforce_csrf():
        if not should_enforce_csrf():
            return None

        try:
            validate_csrf_request()
        except CSRFError as exc:
            return jsonify({"error": exc.message}), exc.status_code

        return None

    @app.after_request
    def sync_csrf_cookie(response):
        return apply_csrf_cookie(response)

    # Initialize Celery
    init_celery(app, import_tasks=False)

    _initialize_runtime_state(app)

    # Register blueprints
    from app.routes.health import health_bp
    from app.routes.auth import auth_bp
    from app.routes.account import account_bp
    from app.routes.admin import admin_bp
    from app.routes.convert import convert_bp
    from app.routes.compress import compress_bp
    from app.routes.image import image_bp
    from app.routes.video import video_bp
    from app.routes.history import history_bp
    from app.routes.tasks import tasks_bp
    from app.routes.download import download_bp
    from app.routes.pdf_tools import pdf_tools_bp
    from app.routes.flowchart import flowchart_bp
    from app.routes.v1.tools import v1_bp
    from app.routes.config import config_bp
    from app.routes.ocr import ocr_bp
    from app.routes.removebg import removebg_bp
    from app.routes.pdf_editor import pdf_editor_bp
    from app.routes.compress_image import compress_image_bp
    from app.routes.pdf_to_excel import pdf_to_excel_bp
    from app.routes.qrcode import qrcode_bp
    from app.routes.html_to_pdf import html_to_pdf_bp
    from app.routes.pdf_ai import pdf_ai_bp
    from app.routes.rating import rating_bp
    from app.routes.assistant import assistant_bp
    from app.routes.contact import contact_bp
    from app.routes.stripe import stripe_bp
    from app.routes.paypal import paypal_bp
    from app.routes.paymob import paymob_bp
    from app.routes.stats import stats_bp
    from app.routes.pdf_convert import pdf_convert_bp
    from app.routes.pdf_extra import pdf_extra_bp
    from app.routes.image_extra import image_extra_bp
    from app.routes.barcode import barcode_bp
    from app.routes.text import text_bp
    from app.routes.sitemap import sitemap_bp
    from app.routes.ai_models import ai_models_bp

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(account_bp, url_prefix="/api/account")
    app.register_blueprint(admin_bp, url_prefix="/api/internal/admin")
    app.register_blueprint(convert_bp, url_prefix="/api/convert")
    app.register_blueprint(compress_bp, url_prefix="/api/compress")
    app.register_blueprint(image_bp, url_prefix="/api/image")
    app.register_blueprint(video_bp, url_prefix="/api/video")
    app.register_blueprint(history_bp, url_prefix="/api")
    app.register_blueprint(pdf_tools_bp, url_prefix="/api/pdf-tools")
    app.register_blueprint(flowchart_bp, url_prefix="/api/flowchart")
    app.register_blueprint(tasks_bp, url_prefix="/api/tasks")
    app.register_blueprint(download_bp, url_prefix="/api/download")
    app.register_blueprint(v1_bp, url_prefix="/api/v1")
    app.register_blueprint(config_bp, url_prefix="/api/config")
    app.register_blueprint(ocr_bp, url_prefix="/api/ocr")
    app.register_blueprint(removebg_bp, url_prefix="/api/remove-bg")
    app.register_blueprint(pdf_editor_bp, url_prefix="/api/pdf-editor")
    app.register_blueprint(compress_image_bp, url_prefix="/api/image")
    app.register_blueprint(pdf_to_excel_bp, url_prefix="/api/convert")
    app.register_blueprint(qrcode_bp, url_prefix="/api/qrcode")
    app.register_blueprint(html_to_pdf_bp, url_prefix="/api/convert")
    app.register_blueprint(pdf_ai_bp, url_prefix="/api/pdf-ai")
    app.register_blueprint(rating_bp, url_prefix="/api/ratings")
    app.register_blueprint(assistant_bp, url_prefix="/api/assistant")
    app.register_blueprint(contact_bp, url_prefix="/api/contact")
    app.register_blueprint(stripe_bp, url_prefix="/api/stripe")
    app.register_blueprint(paypal_bp, url_prefix="/api/paypal")
    app.register_blueprint(paymob_bp, url_prefix="/api/paymob")
    app.register_blueprint(stats_bp, url_prefix="/api/stats")
    app.register_blueprint(pdf_convert_bp, url_prefix="/api/convert")
    app.register_blueprint(pdf_extra_bp, url_prefix="/api/pdf-tools")
    app.register_blueprint(image_extra_bp, url_prefix="/api/image")
    app.register_blueprint(barcode_bp, url_prefix="/api/barcode")
    app.register_blueprint(text_bp, url_prefix="/api/text")
    app.register_blueprint(sitemap_bp)
    app.register_blueprint(ai_models_bp, url_prefix="/api/ai-models")

    return app
