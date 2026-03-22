"""Celery worker entry point."""
from app import create_app
from app.extensions import celery, import_celery_tasks

app = create_app()

import_celery_tasks()
