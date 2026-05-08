"""Task dispatch helpers for the web process."""

from app.extensions import celery


class NamedTaskProxy:
    """Small proxy that preserves the familiar ``task.delay(...)`` API."""

    def __init__(self, task_name: str):
        self.task_name = task_name

    def delay(self, *args, **kwargs):
        return enqueue_task(self.task_name, *args, **kwargs)


def enqueue_task(task_name: str, *args, **kwargs):
    """Dispatch one Celery task by its fully qualified name."""
    return celery.send_task(task_name, args=args, kwargs=kwargs)


def named_task_proxy(task_name: str) -> NamedTaskProxy:
    """Return a task proxy compatible with existing ``.delay`` call sites."""
    return NamedTaskProxy(task_name)
