"""
storage.py — Kho lưu trữ video tương thích S3 MinIO cho CreativeIQ.
"""
from __future__ import annotations

import io
import os
import logging
from datetime import timedelta
from pathlib import Path

from minio import Minio
from minio.error import S3Error

logger = logging.getLogger("vnpthack.storage")

# Cấu hình MinIO

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "vnpthack-videos")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"
# Host mà browser có thể truy cập (khác với MINIO_ENDPOINT trong Docker network)
MINIO_PUBLIC_HOST = os.getenv("MINIO_PUBLIC_HOST", "localhost:9000")

# Khởi tạo client Minio (Singleton)

_client: Minio | None = None


def get_minio_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE,
        )
    return _client


def ensure_bucket() -> None:
    """Tạo bucket nếu chưa tồn tại (idempotent)."""
    client = get_minio_client()
    try:
        if not client.bucket_exists(MINIO_BUCKET):
            client.make_bucket(MINIO_BUCKET)
            logger.info(f"Created MinIO bucket: {MINIO_BUCKET}")
    except S3Error as e:
        logger.error(f"MinIO ensure_bucket error: {e}")
        raise


# Các API lưu trữ công khai

def upload_video(object_name: str, file_path: str, content_type: str = "video/mp4") -> str:
    """
    Tải file video lên MinIO.
    Trả về object_name (key) để tham chiếu sau này.
    """
    client = get_minio_client()
    file_size = Path(file_path).stat().st_size
    with open(file_path, "rb") as f:
        client.put_object(
            MINIO_BUCKET,
            object_name,
            f,
            file_size,
            content_type=content_type,
        )
    logger.info(f"Uploaded video to MinIO: {MINIO_BUCKET}/{object_name} ({file_size / 1024:.1f} KB)")
    return object_name


def upload_video_bytes(object_name: str, data: bytes, content_type: str = "video/mp4") -> str:
    """Tải video lên từ buffer bytes."""
    client = get_minio_client()
    client.put_object(
        MINIO_BUCKET,
        object_name,
        io.BytesIO(data),
        len(data),
        content_type=content_type,
    )
    logger.info(f"Uploaded video bytes to MinIO: {object_name}")
    return object_name


def get_presigned_url(object_name: str, expires_hours: int = 24) -> str:
    """
    Tạo URL pre-signed để truy cập công khai tạm thời.
    Thay thế hostname Docker nội bộ bằng host công khai để trình duyệt truy cập được.
    """
    client = get_minio_client()
    url = client.presigned_get_object(
        MINIO_BUCKET,
        object_name,
        expires=timedelta(hours=expires_hours),
    )
    # MinIO tạo URL với MINIO_ENDPOINT (e.g. minio:9000) — browser không resolve được
    # Thay bằng MINIO_PUBLIC_HOST (e.g. localhost:9000)
    if MINIO_PUBLIC_HOST and MINIO_ENDPOINT != MINIO_PUBLIC_HOST:
        url = url.replace(
            f"http://{MINIO_ENDPOINT}/",
            f"http://{MINIO_PUBLIC_HOST}/",
            1,
        )
    return url


def delete_video(object_name: str) -> None:
    """Xóa video khỏi MinIO."""
    client = get_minio_client()
    try:
        client.remove_object(MINIO_BUCKET, object_name)
        logger.info(f"Deleted from MinIO: {object_name}")
    except S3Error as e:
        logger.warning(f"MinIO delete error (ignored): {e}")


def video_exists(object_name: str) -> bool:
    """Kiểm tra xem đối tượng video có tồn tại trên MinIO hay không."""
    client = get_minio_client()
    try:
        client.stat_object(MINIO_BUCKET, object_name)
        return True
    except S3Error:
        return False
