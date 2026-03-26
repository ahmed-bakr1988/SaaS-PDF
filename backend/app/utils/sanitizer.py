"""Filename sanitization and temporary file management."""
import os
import uuid

from flask import current_app


def generate_safe_path(extension: str, folder_type: str = "upload") -> tuple[str, str]:
    """
    Generate a safe file path using UUID.

    Args:
        extension: File extension (without dot)
        folder_type: "upload" for input files, "output" for processed files

    Returns:
        tuple: (task_id, full_file_path)
    """
    task_id = str(uuid.uuid4())

    if folder_type == "upload":
        base_dir = current_app.config["UPLOAD_FOLDER"]
    else:
        base_dir = current_app.config["OUTPUT_FOLDER"]

    # Create task-specific directory
    task_dir = os.path.join(base_dir, task_id)
    os.makedirs(task_dir, exist_ok=True)

    filename = f"{task_id}.{extension}"
    file_path = os.path.join(task_dir, filename)

    return task_id, file_path


def get_output_path(task_id: str, extension: str) -> str:
    """
    Get the output file path for a processed file.

    Args:
        task_id: The task UUID
        extension: Output file extension

    Returns:
        Full output file path
    """
    output_dir = current_app.config["OUTPUT_FOLDER"]
    task_dir = os.path.join(output_dir, task_id)
    os.makedirs(task_dir, exist_ok=True)

    filename = f"{task_id}.{extension}"
    return os.path.join(task_dir, filename)


def cleanup_task_files(task_id: str, keep_outputs: bool = False):
    """
    Remove temporary files for a given task.

    Args:
        task_id: The task UUID
        keep_outputs: If True, only clean uploads (used in local storage mode)
    """
    import shutil

    upload_dir = current_app.config.get("UPLOAD_FOLDER", "/tmp/uploads")
    output_dir = current_app.config.get("OUTPUT_FOLDER", "/tmp/outputs")

    # Always clean uploads
    upload_task_dir = os.path.join(upload_dir, task_id)
    if os.path.exists(upload_task_dir):
        shutil.rmtree(upload_task_dir, ignore_errors=True)

    # Preserve local outputs whenever local fallback is enabled so download links remain valid.
    preserve_outputs = keep_outputs
    if not preserve_outputs:
        try:
            from app.services.storage_service import storage

            preserve_outputs = storage.allow_local_fallback
        except Exception:
            preserve_outputs = False

    if not preserve_outputs:
        output_task_dir = os.path.join(output_dir, task_id)
        if os.path.exists(output_task_dir):
            shutil.rmtree(output_task_dir, ignore_errors=True)
