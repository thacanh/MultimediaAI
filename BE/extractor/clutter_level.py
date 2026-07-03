"""
Đặc trưng 8 — clutter_level
Đo lường độ lộn xộn, bố cục chật chội và nhiễu thị giác thông qua phân tích mật độ cạnh (edge density).
Điểm số: 0 (bố cục cực kỳ thoáng đãng / gọn gàng) → 10 (bố cục lộn xộn / quá nhiều chi tiết thừa)
"""
import cv2
import numpy as np
from .utils import clamp_score, get_feature_config


def extract_clutter_level(frames: list[np.ndarray]) -> float:
    """
    Tham số:
        frames: Danh sách các frame BGR của phân đoạn video.
    Trả về:
        Điểm chuẩn hóa từ 0-10.
    """
    if not frames:
        return 0.0

    edge_densities: list[float] = []
    step = max(1, len(frames) // 8)

    for frame in frames[::step]:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, threshold1=50, threshold2=150)
        density = edges.sum() / (255.0 * edges.size)
        edge_densities.append(density)

    avg_density = float(np.mean(edge_densities))

    cfg = get_feature_config("clutter_level")
    density_ceil = cfg.get("density_ceil", 0.20)
    score = (avg_density / density_ceil) * 10.0
    return clamp_score(score)
