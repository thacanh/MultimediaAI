"""
Đặc trưng 4 — cut_frequency
Đo lường tần suất cắt cảnh (cut) thực tế trong phân đoạn bằng histogram correlation.
Các chuyển động camera (pan/zoom) tạo thay đổi điểm ảnh lớn nhưng biểu đồ màu ít thay đổi → không bị đếm nhầm là cut.
Điểm số: 0 (không cắt / cắt rất chậm) → 10 (cắt cực nhanh)
"""
import cv2
import numpy as np
from .utils import clamp_score, get_feature_config, compute_monotone_down_score


def _frame_hist(gray: np.ndarray) -> np.ndarray:
    """Tính toán histogram grayscale đã được chuẩn hóa."""
    hist = cv2.calcHist([gray], [0], None, [64], [0, 256])
    cv2.normalize(hist, hist)
    return hist


def extract_cut_frequency(
    frames: list[np.ndarray],
    duration_sec: float,
) -> float | None:
    """
    Đếm các cảnh cắt cứng (hard cut) trong phân đoạn từ các frame đã decode trước.

    Tham số:
        frames: Danh sách frame BGR đã decode.
        duration_sec: Độ dài phân đoạn (giây) để tính tần suất cắt (cuts/sec).
    Trả về:
        Điểm số từ 0-10, hoặc None nếu không đủ frame.
    """
    if len(frames) < 2:
        return None

    duration = max(duration_sec, 0.01)

    hists: list[np.ndarray] = []
    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        hists.append(_frame_hist(gray))

    cfg = get_feature_config("cut_frequency")
    hist_cut_threshold = cfg.get("hist_cut_threshold", 0.85)
    opt_max = cfg.get("opt_max", 0.345)
    scale_max = cfg.get("scale_max", 2.0)

    # Đếm số lần độ tương quan histogram giảm đột ngột dưới ngưỡng → xác định là cut thật
    num_cuts = 0
    for a, b in zip(hists[:-1], hists[1:]):
        corr = float(cv2.compareHist(a, b, cv2.HISTCMP_CORREL))
        if corr < hist_cut_threshold:
            num_cuts += 1

    cuts_per_sec = num_cuts / duration

    # Tính điểm theo đường cong giảm đơn điệu thực nghiệm từ báo cáo kỹ thuật
    score = compute_monotone_down_score(cuts_per_sec, opt_max, scale_max)
    return clamp_score(score)
