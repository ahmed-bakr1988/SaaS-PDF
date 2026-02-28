"""Scheduled cleanup of expired temporary files."""
import os
import shutil
import time

from flask import current_app


def cleanup_expired_files():
    """Remove files older than FILE_EXPIRY_SECONDS from upload/output dirs."""
    expiry = current_app.config.get("FILE_EXPIRY_SECONDS", 1800)
    now = time.time()
    removed_count = 0

    for folder_key in ["UPLOAD_FOLDER", "OUTPUT_FOLDER"]:
        folder = current_app.config.get(folder_key)
        if not folder or not os.path.exists(folder):
            continue

        for task_dir_name in os.listdir(folder):
            task_dir = os.path.join(folder, task_dir_name)
            if not os.path.isdir(task_dir):
                continue

            # Check directory age based on modification time
            dir_mtime = os.path.getmtime(task_dir)
            if now - dir_mtime > expiry:
                shutil.rmtree(task_dir, ignore_errors=True)
                removed_count += 1

    return removed_count
