"""Celery worker entry point."""
from app import create_app
from app.extensions import celery

app = create_app()

# Import all tasks so Celery discovers them
import app.tasks.convert_tasks  # noqa: F401
import app.tasks.compress_tasks  # noqa: F401
import app.tasks.image_tasks  # noqa: F401
import app.tasks.video_tasks  # noqa: F401
import app.tasks.pdf_tools_tasks  # noqa: F401
import app.tasks.flowchart_tasks  # noqa: F401
