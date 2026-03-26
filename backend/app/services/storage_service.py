"""Storage service — S3 in production, local files in development."""
import os
import shutil
import logging

from flask import current_app

from app.utils.config_placeholders import normalize_optional_config

logger = logging.getLogger(__name__)


def _resolved_s3_settings() -> tuple[str, str, str]:
    """Return sanitized S3 credentials, treating copied sample values as blank."""
    key = normalize_optional_config(
        current_app.config.get("AWS_ACCESS_KEY_ID"),
        ("your-access-key", "replace-with"),
    )
    secret = normalize_optional_config(
        current_app.config.get("AWS_SECRET_ACCESS_KEY"),
        ("your-secret-key", "replace-with"),
    )
    bucket = normalize_optional_config(
        current_app.config.get("AWS_S3_BUCKET"),
        ("your-bucket-name", "replace-with"),
    )
    return key, secret, bucket


def _is_s3_configured() -> bool:
    """Check if AWS S3 credentials are provided."""
    key, secret, bucket = _resolved_s3_settings()
    return bool(key and secret and bucket)


class StorageService:
    """Handle file storage — uses S3 when configured, local filesystem otherwise."""

    def __init__(self):
        self._client = None

    @property
    def use_s3(self) -> bool:
        return _is_s3_configured()

    @property
    def allow_local_fallback(self) -> bool:
        value = current_app.config.get("STORAGE_ALLOW_LOCAL_FALLBACK", True)
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() != "false"

    @property
    def client(self):
        """Lazy-initialize S3 client (only when S3 is configured)."""
        if self._client is None:
            import boto3
            key, secret, _ = _resolved_s3_settings()
            self._client = boto3.client(
                "s3",
                region_name=current_app.config["AWS_S3_REGION"],
                aws_access_key_id=key,
                aws_secret_access_key=secret,
            )
        return self._client

    @property
    def bucket(self):
        _, _, bucket = _resolved_s3_settings()
        return bucket

    def _local_key(self, task_id: str, filename: str, folder: str = "outputs") -> str:
        return f"{folder}/{task_id}/{filename}"

    def _local_destination(self, task_id: str, filename: str) -> str:
        output_dir = current_app.config["OUTPUT_FOLDER"]
        dest_dir = os.path.join(output_dir, task_id)
        os.makedirs(dest_dir, exist_ok=True)
        return os.path.join(dest_dir, filename)

    def _store_locally(self, local_path: str, task_id: str, folder: str = "outputs") -> str:
        """Copy a generated file into the app's local download storage."""
        filename = os.path.basename(local_path)
        dest_path = self._local_destination(task_id, filename)

        if os.path.abspath(local_path) != os.path.abspath(dest_path):
            shutil.copy2(local_path, dest_path)

        logger.info("[Local] Stored file: %s", dest_path)
        return self._local_key(task_id, filename, folder=folder)

    def _resolve_local_path(self, storage_key: str) -> str | None:
        parts = [part for part in storage_key.strip("/").split("/") if part]
        if len(parts) < 3:
            return None

        task_id = parts[1]
        filename = parts[-1]
        return os.path.join(current_app.config["OUTPUT_FOLDER"], task_id, filename)

    def upload_file(self, local_path: str, task_id: str, folder: str = "outputs") -> str:
        """
        Upload / store a file.

        In S3 mode: uploads to S3 bucket.
        In local mode: copies file to the outputs directory.

        Returns:
            S3 key or local relative path (used as identifier)
        """
        filename = os.path.basename(local_path)
        key = self._local_key(task_id, filename, folder=folder)

        if self.use_s3:
            from botocore.exceptions import ClientError
            try:
                self.client.upload_file(local_path, self.bucket, key)
                return key
            except ClientError as e:
                if not self.allow_local_fallback:
                    raise RuntimeError(f"Failed to upload file to S3: {e}") from e

                logger.exception(
                    "S3 upload failed for %s. Falling back to local storage.",
                    key,
                )
                return self._store_locally(local_path, task_id, folder=folder)

        return self._store_locally(local_path, task_id, folder=folder)

    def generate_presigned_url(
        self, s3_key: str, expiry: int | None = None, original_filename: str | None = None
    ) -> str:
        """
        Generate a download URL.

        S3 mode: presigned URL.
        Local mode: /api/download/<task_id>/<filename>
        """
        local_path = self._resolve_local_path(s3_key)
        if local_path and os.path.isfile(local_path):
            parts = [part for part in s3_key.strip("/").split("/") if part]
            task_id = parts[1]
            filename = parts[-1]
            download_name = original_filename or filename
            return f"/api/download/{task_id}/{filename}?name={download_name}"

        if self.use_s3:
            from botocore.exceptions import ClientError
            if expiry is None:
                expiry = current_app.config.get("FILE_EXPIRY_SECONDS", 1800)

            params = {
                "Bucket": self.bucket,
                "Key": s3_key,
            }
            if original_filename:
                params["ResponseContentDisposition"] = (
                    f'attachment; filename="{original_filename}"'
                )
            try:
                url = self.client.generate_presigned_url(
                    "get_object",
                    Params=params,
                    ExpiresIn=expiry,
                )
                return url
            except ClientError as e:
                raise RuntimeError(f"Failed to generate presigned URL: {e}")
        else:
            # Local mode — return path to Flask download route
            parts = [part for part in s3_key.strip("/").split("/") if part]
            task_id = parts[1] if len(parts) >= 3 else parts[0]
            filename = parts[-1]
            download_name = original_filename or filename
            return f"/api/download/{task_id}/{filename}?name={download_name}"

    def delete_file(self, s3_key: str):
        """Delete a file from S3 (no-op in local mode)."""
        local_path = self._resolve_local_path(s3_key)
        if local_path and os.path.isfile(local_path):
            try:
                os.remove(local_path)
            except OSError:
                logger.warning("Failed to delete local fallback file: %s", local_path)

        if self.use_s3:
            from botocore.exceptions import ClientError
            try:
                self.client.delete_object(Bucket=self.bucket, Key=s3_key)
            except ClientError:
                pass

    def file_exists(self, s3_key: str) -> bool:
        """Check if a file exists."""
        local_path = self._resolve_local_path(s3_key)
        if local_path and os.path.isfile(local_path):
            return True

        if self.use_s3:
            from botocore.exceptions import ClientError
            try:
                self.client.head_object(Bucket=self.bucket, Key=s3_key)
                return True
            except ClientError:
                return False

        return False


# Singleton instance
storage = StorageService()
