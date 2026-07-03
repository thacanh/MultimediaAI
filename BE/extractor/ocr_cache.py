"""
ocr_cache.py — Cache kết quả OCR từ VNPT SmartReader.

API công khai:
  prepare_segment_ocr(frames)  → OCR batch, cache kết quả
  get_ocr_results(frame)       → trả về kết quả đã cache
  clear_cache()                → giải phóng bộ nhớ giữa các request
"""
from __future__ import annotations

import logging
import numpy as np

logger = logging.getLogger(__name__)

_frame_cache: dict[int, list] = {}


def prepare_segment_ocr(frames: list[np.ndarray]) -> None:
    """
    Gọi một lần cho mỗi phân đoạn. Chạy VNPT SmartReader OCR, lưu kết quả theo id(frame).
    Nếu lỗi → text_density = 0, pipeline tiếp tục bình thường.
    """
    if not frames:
        return

    try:
        from .vnpt_ocr import ocr_frames_vnpt
        logger.info(f"VNPT OCR: batch {len(frames)} frames")
        results = ocr_frames_vnpt(frames)
        for frame, res in zip(frames, results):
            _frame_cache[id(frame)] = res
    except Exception as e:
        logger.warning(f"VNPT OCR thất bại ({type(e).__name__}): {e} — text_density = 0")
        for frame in frames:
            _frame_cache.setdefault(id(frame), [])


def get_ocr_results(frame: np.ndarray) -> list:
    """Trả về kết quả OCR đã cache. [] nếu không có text."""
    return _frame_cache.get(id(frame), [])


def clear_cache() -> None:
    _frame_cache.clear()
