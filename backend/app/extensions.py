"""Flask extensions initialization."""
from importlib import import_module

from celery import Celery
from celery.schedules import crontab
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman

# Initialize extensions (will be bound to app in create_app)
cors = CORS()
limiter = Limiter(
    key_func=get_remote_address,
    # Prevent Redis connection failures from causing 500 errors on every request.
    # When Redis is unreachable, rate limiting is skipped rather than crashing.
    swallow_errors=True,
)
talisman = Talisman()
celery = Celery()

CELERY_TASK_MODULES = (
    "app.tasks.barcode_tasks",
    "app.tasks.compress_image_tasks",
    "app.tasks.compress_tasks",
    "app.tasks.convert_tasks",
    "app.tasks.flowchart_tasks",
    "app.tasks.html_to_pdf_tasks",
    "app.tasks.image_extra_tasks",
    "app.tasks.image_tasks",
    "app.tasks.maintenance_tasks",
    "app.tasks.ocr_tasks",
    "app.tasks.pdf_ai_tasks",
    "app.tasks.pdf_convert_tasks",
    "app.tasks.pdf_editor_tasks",
    "app.tasks.pdf_extra_tasks",
    "app.tasks.pdf_to_excel_tasks",
    "app.tasks.pdf_tools_tasks",
    "app.tasks.qrcode_tasks",
    "app.tasks.removebg_tasks",
    "app.tasks.video_tasks",
)


def import_celery_tasks() -> None:
    """Import all Celery task modules so task registration is centralized."""
    for module in CELERY_TASK_MODULES:
        import_module(module)


def init_celery(app):
    """Initialize Celery with Flask app context."""
    celery.conf.broker_url = app.config["CELERY_BROKER_URL"]
    celery.conf.result_backend = app.config["CELERY_RESULT_BACKEND"]
    celery.conf.result_expires = app.config.get("FILE_EXPIRY_SECONDS", 1800)
    celery.conf.task_serializer = "json"
    celery.conf.result_serializer = "json"
    celery.conf.accept_content = ["json"]
    celery.conf.timezone = "UTC"
    celery.conf.task_track_started = True
    celery.conf.imports = CELERY_TASK_MODULES

    # Set task routes
    celery.conf.task_routes = {
        "app.tasks.convert_tasks.*": {"queue": "convert"},
        "app.tasks.compress_tasks.*": {"queue": "compress"},
        "app.tasks.image_tasks.*": {"queue": "image"},
        "app.tasks.video_tasks.*": {"queue": "video"},
        "app.tasks.pdf_tools_tasks.*": {"queue": "pdf_tools"},
        "app.tasks.flowchart_tasks.*": {"queue": "flowchart"},
        "app.tasks.ocr_tasks.*": {"queue": "image"},
        "app.tasks.removebg_tasks.*": {"queue": "image"},
        "app.tasks.pdf_editor_tasks.*": {"queue": "pdf_tools"},
        "app.tasks.compress_image_tasks.*": {"queue": "image"},
        "app.tasks.pdf_to_excel_tasks.*": {"queue": "pdf_tools"},
        "app.tasks.qrcode_tasks.*": {"queue": "default"},
        "app.tasks.html_to_pdf_tasks.*": {"queue": "convert"},
        "app.tasks.pdf_ai_tasks.*": {"queue": "ai_heavy"},
        "app.tasks.pdf_convert_tasks.*": {"queue": "convert"},
        "app.tasks.pdf_extra_tasks.*": {"queue": "pdf_tools"},
        "app.tasks.image_extra_tasks.*": {"queue": "image"},
        "app.tasks.barcode_tasks.*": {"queue": "default"},
    }

    # Celery Beat — periodic tasks
    celery.conf.beat_schedule = {
        "cleanup-expired-files": {
            "task": "app.tasks.maintenance_tasks.cleanup_expired_files",
            "schedule": crontab(minute="*/30"),
        },
    }

    class ContextTask(celery.Task):
        """Make Celery tasks work with Flask app context."""
        abstract = True

        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    import_celery_tasks()
    return celery
