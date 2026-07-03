"""
Đặc trưng 5 — text_density
Đo lường lượng văn bản hiển thị trên màn hình bằng EasyOCR.
Điểm số: 0 (ít văn bản) → 10 (văn bản quá nhiều / quá tải thông tin)
"""
import numpy as np
from .utils import clamp_score, get_feature_config
from .ocr_cache import get_ocr_results


def extract_text_density(frames: list[np.ndarray]) -> float:
    """
    Tham số:
        frames: Danh sách các frame BGR của phân đoạn video.
    Trả về:
        Điểm chuẩn hóa từ 0-10.
    """
    if not frames:
        return 0.0

    coverage_values: list[float] = []
    # Lấy mẫu tối đa 2 frame vì chạy OCR rất tốn tài nguyên CPU
    step = max(1, len(frames) // 2)

    for frame in frames[::step][:2]:
        h, w = frame.shape[:2]
        frame_area = h * w
        if frame_area == 0:
            continue

        results = get_ocr_results(frame)
        text_area = 0
        for (bbox, _text, conf) in results:
            if conf < 0.4:
                continue
            xs = [p[0] for p in bbox]
            ys = [p[1] for p in bbox]
            text_area += (max(xs) - min(xs)) * (max(ys) - min(ys))

        coverage_values.append(text_area / frame_area)

    if not coverage_values:
        return 0.0

    cfg = get_feature_config("text_density")
    coverage_ceil = cfg.get("coverage_ceil", 0.30)
    avg_coverage = float(np.mean(coverage_values))
    return clamp_score((avg_coverage / coverage_ceil) * 10.0)
