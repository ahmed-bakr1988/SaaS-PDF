"""Periodic maintenance tasks — file cleanup and logging."""
import logging
import os
import shutil
import time

from app.extensions import celery

logger = logging.getLogger(__name__)


@celery.task(name="app.tasks.maintenance_tasks.cleanup_expired_files")
def cleanup_expired_files():
    """Remove upload/output directories older than FILE_EXPIRY_SECONDS.

    Runs as a Celery Beat periodic task.
    Logs a summary of scanned/deleted/freed counts.
    """
    from flask import current_app

    expiry = current_app.config.get("FILE_EXPIRY_SECONDS", 1800)
    upload_dir = current_app.config.get("UPLOAD_FOLDER", "/tmp/uploads")
    output_dir = current_app.config.get("OUTPUT_FOLDER", "/tmp/outputs")

    total_stats = {"scanned": 0, "deleted": 0, "freed_bytes": 0, "errors": 0}

    for target_dir in [upload_dir, output_dir]:
        stats = _cleanup_dir(target_dir, expiry)
        for key in total_stats:
            total_stats[key] += stats[key]

    logger.info(
        "Cleanup complete: scanned=%d deleted=%d freed=%.1fMB errors=%d",
        total_stats["scanned"],
        total_stats["deleted"],
        total_stats["freed_bytes"] / (1024 * 1024),
        total_stats["errors"],
    )

    # Log cleanup event
    try:
        from app.services.account_service import log_file_event

        log_file_event(
            "cleanup",
            detail=f"deleted={total_stats['deleted']} freed={total_stats['freed_bytes']} errors={total_stats['errors']}",
        )
    except Exception:
        logger.debug("Could not log file_event for cleanup")

    return total_stats


def _cleanup_dir(directory: str, expiry_seconds: int) -> dict:
    """Scan one directory and remove expired sub-directories."""
    stats = {"scanned": 0, "deleted": 0, "freed_bytes": 0, "errors": 0}

    if not os.path.isdir(directory):
        return stats

    now = time.time()

    for entry in os.listdir(directory):
        full_path = os.path.join(directory, entry)
        if not os.path.isdir(full_path):
            continue

        stats["scanned"] += 1
        try:
            mod_time = os.path.getmtime(full_path)
        except OSError:
            stats["errors"] += 1
            continue

        if (now - mod_time) <= expiry_seconds:
            continue

        try:
            dir_size = sum(
                os.path.getsize(os.path.join(dp, f))
                for dp, _, filenames in os.walk(full_path)
                for f in filenames
            )
            shutil.rmtree(full_path)
            stats["deleted"] += 1
            stats["freed_bytes"] += dir_size
            logger.debug("Deleted expired: %s (%.1fKB)", entry, dir_size / 1024)
        except Exception:
            logger.exception("Failed to delete %s", full_path)
            stats["errors"] += 1

    return stats
