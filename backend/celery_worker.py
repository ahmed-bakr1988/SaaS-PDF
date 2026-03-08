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
import app.tasks.maintenance_tasks  # noqa: F401
import app.tasks.ocr_tasks  # noqa: F401
import app.tasks.removebg_tasks  # noqa: F401
import app.tasks.pdf_editor_tasks  # noqa: F401
import app.tasks.compress_image_tasks  # noqa: F401
import app.tasks.pdf_to_excel_tasks  # noqa: F401
import app.tasks.qrcode_tasks  # noqa: F401
import app.tasks.html_to_pdf_tasks  # noqa: F401
import app.tasks.pdf_ai_tasks  # noqa: F401
