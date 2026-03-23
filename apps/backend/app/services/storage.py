"""Cloudflare R2 file storage service"""

import uuid
import mimetypes
from typing import Optional

import boto3
from botocore.config import Config
from fastapi import UploadFile, HTTPException

from app.core.config import settings


class StorageService:
    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.R2_ENDPOINT_URL,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
        self.bucket = settings.R2_BUCKET_NAME

    async def upload_file(
        self,
        file: UploadFile,
        folder: str,
        allowed_types: Optional[list] = None,
        max_size_mb: Optional[int] = None,
    ) -> str:
        """Upload file to R2, return public URL"""
        max_mb = max_size_mb or settings.MAX_UPLOAD_SIZE_MB

        # Validate content type
        if allowed_types and file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file.content_type} not allowed. Allowed: {allowed_types}",
            )

        # Read file
        content = await file.read()

        # Validate size
        size_mb = len(content) / (1024 * 1024)
        if size_mb > max_mb:
            raise HTTPException(
                status_code=400,
                detail=f"File too large: {size_mb:.1f}MB. Max: {max_mb}MB",
            )

        # Generate unique key
        ext = mimetypes.guess_extension(file.content_type or "") or ""
        key = f"{folder}/{uuid.uuid4()}{ext}"

        # Upload
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content,
            ContentType=file.content_type or "application/octet-stream",
        )

        return f"{settings.R2_PUBLIC_URL}/{key}"

    def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate presigned URL for private file access"""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    def delete_file(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)
