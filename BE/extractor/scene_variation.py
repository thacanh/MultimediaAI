"""
Đặc trưng 3 — scene_variation
Đo lường mức độ thay đổi nội dung hình ảnh trong một phân đoạn.
Sử dụng so sánh biểu đồ màu (histogram) của tất cả các cặp frame để tăng tính ổn định.
Điểm số: 0 (các frame giống hệt nhau / lặp lại một cảnh) → 10 (các cảnh thay đổi phong phú)
"""
import itertools
import cv2
import numpy as np
from .utils import clamp_score, get_feature_config


def extract_scene_variation(frames: list[np.ndarray]) -> float | None:
    """
    Tham số:
        frames: Danh sách các frame BGR của phân đoạn video.
    Trả về:
        Điểm số từ 0-10, hoặc None nếu không đủ frame.
    """
    if len(frames) < 2:
        return None

    def hist(frame: np.ndarray) -> np.ndarray:
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        h = cv2.calcHist([hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
        cv2.normalize(h, h)
        return h.flatten().reshape(-1, 1)

    hists = [hist(f) for f in frames]

    # So sánh TẤT CẢ các cặp frame (không chỉ các frame liền kề) để tăng tính ổn định khi có ít frame
    correl_diffs: list[float] = []
    for a, b in itertools.combinations(hists, 2):
        sim = cv2.compareHist(a, b, cv2.HISTCMP_CORREL)  # 1=giống hệt, -1=trái ngược
        correl_diffs.append(max(0.0, 1.0 - float(sim)))  # 0=giống hệt, 2=trái ngược

    avg_diff = float(np.mean(correl_diffs))

    cfg = get_feature_config("scene_variation")
    diff_ceil = cfg.get("diff_ceil", 0.30)
    power = cfg.get("power", 0.5)
    score = (avg_diff / diff_ceil) ** power * 10.0
    return clamp_score(score)
