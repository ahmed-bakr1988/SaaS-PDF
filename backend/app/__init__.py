"""Flask Application Factory."""
import os

from flask import Flask

from config import config
from app.extensions import cors, limiter, talisman, init_celery


def create_app(config_name=None):
    """Create and configure the Flask application."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Create upload/output directories
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["OUTPUT_FOLDER"], exist_ok=True)

    # Initialize extensions
    cors.init_app(app, origins=app.config["CORS_ORIGINS"])

    limiter.init_app(app)

    # Talisman security headers (relaxed CSP for AdSense)
    csp = {
        "default-src": "'self'",
        "script-src": [
            "'self'",
            "'unsafe-inline'",
            "https://pagead2.googlesyndication.com",
            "https://www.googletagmanager.com",
            "https://www.google-analytics.com",
        ],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https://pagead2.googlesyndication.com"],
        "frame-src": ["https://googleads.g.doubleclick.net"],
        "connect-src": [
            "'self'",
            "https://www.google-analytics.com",
            "https://*.amazonaws.com",
        ],
    }
    talisman.init_app(
        app,
        content_security_policy=csp,
        force_https=config_name == "production",
    )

    # Initialize Celery
    init_celery(app)

    # Register blueprints
    from app.routes.health import health_bp
    from app.routes.convert import convert_bp
    from app.routes.compress import compress_bp
    from app.routes.image import image_bp
    from app.routes.video import video_bp
    from app.routes.tasks import tasks_bp
    from app.routes.download import download_bp

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(convert_bp, url_prefix="/api/convert")
    app.register_blueprint(compress_bp, url_prefix="/api/compress")
    app.register_blueprint(image_bp, url_prefix="/api/image")
    app.register_blueprint(video_bp, url_prefix="/api/video")
    app.register_blueprint(tasks_bp, url_prefix="/api/tasks")
    app.register_blueprint(download_bp, url_prefix="/api/download")

    return app
