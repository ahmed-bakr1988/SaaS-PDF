"""Storage service — S3 in production, local files in development."""
import os
import shutil
import logging

from flask import current_app

logger = logging.getLogger(__name__)


def _is_s3_configured() -> bool:
    """Check if AWS S3 credentials are provided."""
    key = current_app.config.get("AWS_ACCESS_KEY_ID")
    secret = current_app.config.get("AWS_SECRET_ACCESS_KEY")
    return bool(key and secret and key.strip() and secret.strip())


class StorageService:
    """Handle file storage — uses S3 when configured, local filesystem otherwise."""

    def __init__(self):
        self._client = None

    @property
    def use_s3(self) -> bool:
        return _is_s3_configured()

    @property
    def client(self):
        """Lazy-initialize S3 client (only when S3 is configured)."""
        if self._client is None:
            import boto3
            self._client = boto3.client(
                "s3",
                region_name=current_app.config["AWS_S3_REGION"],
                aws_access_key_id=current_app.config["AWS_ACCESS_KEY_ID"],
                aws_secret_access_key=current_app.config["AWS_SECRET_ACCESS_KEY"],
            )
        return self._client

    @property
    def bucket(self):
        return current_app.config["AWS_S3_BUCKET"]

    def upload_file(self, local_path: str, task_id: str, folder: str = "outputs") -> str:
        """
        Upload / store a file.

        In S3 mode: uploads to S3 bucket.
        In local mode: copies file to the outputs directory.

        Returns:
            S3 key or local relative path (used as identifier)
        """
        filename = os.path.basename(local_path)
        key = f"{folder}/{task_id}/{filename}"

        if self.use_s3:
            from botocore.exceptions import ClientError
            try:
                self.client.upload_file(local_path, self.bucket, key)
                return key
            except ClientError as e:
                raise RuntimeError(f"Failed to upload file to S3: {e}")
        else:
            # Local mode — keep file in the outputs directory
            output_dir = current_app.config["OUTPUT_FOLDER"]
            dest_dir = os.path.join(output_dir, task_id)
            os.makedirs(dest_dir, exist_ok=True)
            dest_path = os.path.join(dest_dir, filename)

            if os.path.abspath(local_path) != os.path.abspath(dest_path):
                shutil.copy2(local_path, dest_path)

            logger.info(f"[Local] Stored file: {dest_path}")
            return key

    def generate_presigned_url(
        self, s3_key: str, expiry: int | None = None, original_filename: str | None = None
    ) -> str:
        """
        Generate a download URL.

        S3 mode: presigned URL.
        Local mode: /api/download/<task_id>/<filename>
        """
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
            parts = s3_key.strip("/").split("/")
            # key = "outputs/<task_id>/<filename>"
            if len(parts) >= 3:
                task_id = parts[1]
                filename = parts[2]
            else:
                task_id = parts[0]
                filename = parts[-1]

            download_name = original_filename or filename
            return f"/api/download/{task_id}/{filename}?name={download_name}"

    def delete_file(self, s3_key: str):
        """Delete a file from S3 (no-op in local mode)."""
        if self.use_s3:
            from botocore.exceptions import ClientError
            try:
                self.client.delete_object(Bucket=self.bucket, Key=s3_key)
            except ClientError:
                pass

    def file_exists(self, s3_key: str) -> bool:
        """Check if a file exists."""
        if self.use_s3:
            from botocore.exceptions import ClientError
            try:
                self.client.head_object(Bucket=self.bucket, Key=s3_key)
                return True
            except ClientError:
                return False
        else:
            parts = s3_key.strip("/").split("/")
            if len(parts) >= 3:
                task_id = parts[1]
                filename = parts[2]
            else:
                task_id = parts[0]
                filename = parts[-1]
            output_dir = current_app.config["OUTPUT_FOLDER"]
            return os.path.isfile(os.path.join(output_dir, task_id, filename))


# Singleton instance
storage = StorageService()
