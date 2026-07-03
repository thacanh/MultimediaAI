"""
Đặc trưng 7 — visual_focus
Đo lường độ rõ nét của tiêu điểm thị giác (sự tập trung chú ý).
Điểm số: 0 (không có tiêu điểm rõ ràng) → 10 (tiêu điểm rõ ràng, sắc nét)

Thuật toán: đo mức độ tập trung của phân phối cường độ gradient (không cần dùng opencv-contrib).
Các vùng có độ tương phản/gradient cao được coi là các điểm neo thu hút sự chú ý.
Chúng ta đo lường độ tập trung của các vùng này so với phân phối đều.
"""
import cv2
import numpy as np
from .utils import clamp_score, get_feature_config


def extract_visual_focus(frames: list[np.ndarray]) -> float:
    """
    Tham số:
        frames: Danh sách các frame BGR của phân đoạn video.
    Trả về:
        Điểm chuẩn hóa từ 0-10.
    """
    if not frames:
        return 0.0

    scores: list[float] = []
    step = max(1, len(frames) // 8)

    for frame in frames[::step]:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).astype(np.float32)

        # Cường độ gradient thông qua toán tử Sobel
        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        mag = np.sqrt(gx ** 2 + gy ** 2)

        total = mag.sum()
        if total < 1e-6:
            scores.append(0.0)
            continue

        # Độ tập trung kiểu Gini: tỷ lệ năng lượng gradient nằm trong top 10% pixel
        flat = mag.flatten()
        threshold = np.percentile(flat, 90)
        top_mass = float(mag[mag >= threshold].sum())
        concentration = top_mass / total

        scores.append(concentration)

    if not scores:
        return 5.0

    avg = float(np.mean(scores))

    cfg = get_feature_config("visual_focus")
    min_concentration = cfg.get("min_concentration", 0.30)
    range_concentration = cfg.get("range_concentration", 0.40)
    score = ((avg - min_concentration) / range_concentration) * 10.0
    return clamp_score(score)
