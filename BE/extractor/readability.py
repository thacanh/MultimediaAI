"""
Đặc trưng 6 — readability
Đo lường độ dễ đọc của chữ trên màn hình (độ tương phản + kích thước phông chữ).
Điểm số: 0 (không thể đọc được / tương phản rất kém hoặc chữ quá nhỏ) → 10 (cực kỳ dễ đọc)
None = không phát hiện văn bản → chỉ số không áp dụng
"""
import cv2
import numpy as np
from .utils import clamp_score, get_feature_config
from .ocr_cache import get_ocr_results


def _relative_font_size(bbox: list, frame_h: int) -> float:
    """Trả về chiều cao chữ dưới dạng tỷ lệ so với chiều cao khung hình."""
    ys = [p[1] for p in bbox]
    height = max(ys) - min(ys)
    return height / frame_h if frame_h > 0 else 0.0


def _contrast_score(frame: np.ndarray, bbox: list) -> float:
    """
    Đo lường độ tương phản độ sáng giữa vùng chữ và nền xung quanh.
    Trả về 0.0 (không tương phản) → 1.0 (tương phản tối đa).
    """
    xs = [int(p[0]) for p in bbox]
    ys = [int(p[1]) for p in bbox]
    x1, x2 = max(0, min(xs)), min(frame.shape[1], max(xs))
    y1, y2 = max(0, min(ys)), min(frame.shape[0], max(ys))

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).astype(np.float32)
    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0

    roi_mean = roi.mean()
    pad = 8
    bg = gray[max(0, y1 - pad):min(frame.shape[0], y2 + pad),
              max(0, x1 - pad):min(frame.shape[1], x2 + pad)]
    mask = np.ones(bg.shape, dtype=bool)
    inner_y1 = min(pad, bg.shape[0])
    inner_y2 = min(pad + (y2 - y1), bg.shape[0])
    inner_x1 = min(pad, bg.shape[1])
    inner_x2 = min(pad + (x2 - x1), bg.shape[1])
    mask[inner_y1:inner_y2, inner_x1:inner_x2] = False
    bg_values = bg[mask]
    bg_mean = float(bg_values.mean()) if bg_values.size > 0 else roi_mean

    return float(min(abs(roi_mean - bg_mean) / 128.0, 1.0))  # Chia cho 128.0 để tăng độ nhạy


def extract_readability(frames: list[np.ndarray]) -> float | None:
    """
    Trả về:
        float 0-10: điểm độ dễ đọc nếu tìm thấy văn bản
        None:       không phát hiện văn bản → bỏ qua
    """
    if not frames:
        return None

    scores: list[float] = []

    cfg = get_feature_config("readability")
    size_ceil = cfg.get("size_ceil", 0.04)
    contrast_weight = cfg.get("contrast_weight", 0.5)
    conf_weight = cfg.get("conf_weight", 0.3)
    size_weight = cfg.get("size_weight", 0.2)

    for frame in frames:  # dùng tất cả visual_frames
        h = frame.shape[0]
        results = get_ocr_results(frame)

        for (bbox, _text, conf) in results:
            if conf < 0.4:
                continue

            rel_size = _relative_font_size(bbox, h)
            size_score = min(rel_size / size_ceil, 1.0)

            contrast = _contrast_score(frame, bbox)

            conf_score = min((conf - 0.4) / 0.6, 1.0)

            scores.append(contrast_weight * contrast + conf_weight * conf_score + size_weight * size_score)

    if not scores:
        return None

    return clamp_score(float(np.mean(scores)) * 10.0)
