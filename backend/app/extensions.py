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


def init_celery(app, *, import_tasks: bool = False):
    """Initialize Celery with Flask app context.

    Web processes should not eagerly import task modules during startup because
    many task modules depend on optional worker-only libraries. Workers opt in
    to importing tasks explicitly after Flask initialization.
    """
    celery.conf.broker_url = app.config["CELERY_BROKER_URL"]
    celery.conf.result_backend = app.config["CELERY_RESULT_BACKEND"]
    celery.conf.result_expires = app.config.get("FILE_EXPIRY_SECONDS", 1800)
    celery.conf.task_serializer = "json"
    celery.conf.result_serializer = "json"
    celery.conf.accept_content = ["json"]
    celery.conf.timezone = "UTC"
    celery.conf.task_track_started = True
    celery.conf.imports = CELERY_TASK_MODULES

    # --- Safety & Performance Hardening ---
    # Global time limits to prevent hanging processes
    celery.conf.task_time_limit = 3600  # 1 hour hard limit
    celery.conf.task_soft_time_limit = 3300  # 55 min soft limit
    
    # Avoid prefetching multiple heavy tasks (better for resource isolation)
    celery.conf.worker_prefetch_multiplier = 1
    # Use -Ofair behavior by default
    celery.conf.task_acks_late = True
    celery.conf.worker_send_task_events = True
    # Prevent memory leaks by restarting workers after X tasks
    celery.conf.worker_max_tasks_per_child = 50
    # Prevent memory leaks by restarting workers if memory exceeds X KB
    celery.conf.worker_max_memory_per_child = 500000  # 500MB

    # Set task routes
    celery.conf.task_routes = {
        # Light / fast tasks
        "app.tasks.maintenance_tasks.*": {"queue": "light_tasks"},
        "app.tasks.qrcode_tasks.*": {"queue": "light_tasks"},
        "app.tasks.barcode_tasks.*": {"queue": "light_tasks"},
        "app.tasks.history_tasks.*": {"queue": "light_tasks"},

        # PDF processing (CPU/Memory intensive but core)
        "app.tasks.pdf_tools_tasks.*": {"queue": "pdf_processing"},
        "app.tasks.pdf_editor_tasks.*": {"queue": "pdf_processing"},
        "app.tasks.pdf_convert_tasks.*": {"queue": "pdf_processing"},
        "app.tasks.pdf_extra_tasks.*": {"queue": "pdf_processing"},
        "app.tasks.pdf_to_excel_tasks.*": {"queue": "pdf_processing"},
        "app.tasks.convert_tasks.*": {"queue": "pdf_processing"},
        "app.tasks.html_to_pdf_tasks.*": {"queue": "pdf_processing"},

        # Image processing
        "app.tasks.image_tasks.*": {"queue": "image_processing"},
        "app.tasks.image_extra_tasks.*": {"queue": "image_processing"},
        "app.tasks.compress_image_tasks.*": {"queue": "image_processing"},
        "app.tasks.compress_tasks.*": {"queue": "image_processing"},

        # Specialized / Heavy
        "app.tasks.ocr_tasks.*": {"queue": "ocr_tasks"},
        "app.tasks.removebg_tasks.*": {"queue": "ai_heavy"},
        "app.tasks.pdf_ai_tasks.*": {"queue": "ai_heavy"},
        "app.tasks.video_tasks.*": {"queue": "video_processing"},
        "app.tasks.flowchart_tasks.*": {"queue": "pdf_processing"},

        # Default fallback
        "app.tasks.*": {"queue": "default"},
    }

    # Celery Beat — periodic tasks
    celery.conf.beat_schedule = {
        "cleanup-expired-files": {
            "task": "app.tasks.maintenance_tasks.cleanup_expired_files",
            "schedule": crontab(minute="*/10"),
        },
    }

    class ContextTask(celery.Task):
        """Make Celery tasks work with Flask app context."""
        abstract = True

        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    if import_tasks:
        import_celery_tasks()
    return celery
