"""
vnpt_ocr.py — Trích xuất chữ (OCR) sử dụng VNPT SmartReader API (được tối ưu hóa song song).
"""
from __future__ import annotations

import logging
import numpy as np
import concurrent.futures
import tempfile
import os
import cv2

logger = logging.getLogger(__name__)


def ocr_single_frame(index: int, frame: np.ndarray, vnpt) -> list[tuple]:
    """Thực hiện OCR cho một frame đơn lẻ: lưu ảnh tạm, upload và gọi API từ VNPT SmartReader."""
    h, w = frame.shape[:2]
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        cv2.imwrite(tmp_path, frame)
        
        # Upload lên VNPT File Service
        file_hash = vnpt.upload_file(tmp_path, title=f"frame_{index}", description="Video analysis frame")
        if not file_hash:
            logger.warning(f"VNPT File Service upload thất bại cho frame {index}")
            return []
            
        # Gọi OCR chi tiết từ VNPT
        return vnpt.ocr_image_detailed(file_hash, w, h)
    except Exception as e:
        logger.warning(f"OCR cho frame {index} thất bại: {e}")
        return []
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def ocr_frames_vnpt(frames: list[np.ndarray]) -> list[list[tuple]]:
    """
    Chạy VNPT OCR SONG SONG trên danh sách các frame qua API VNPT SmartReader.

    Trả về:
        Danh sách (theo thứ tự frame) của các kết quả [(bbox, text, conf)].
    """
    if not frames:
        return []

    from vnpt_client import VnptClient
    vnpt = VnptClient()

    # Gọi trước để cache token, tránh tranh chấp dữ liệu (race conditions) khi chạy đa luồng
    try:
        vnpt.get_access_token()
    except Exception:
        pass

    logger.info(f"VNPT OCR: Bắt đầu xử lý {len(frames)} frames SONG SONG qua API...")
    
    # Chạy song song tất cả các frame bằng ThreadPoolExecutor
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(frames)) as executor:
        futures = [executor.submit(ocr_single_frame, i, frame, vnpt) for i, frame in enumerate(frames)]
        results = [fut.result() for fut in futures]

    return results
