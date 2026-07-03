"""
Đặc trưng 2 — motion_level
Đo lường lượng chuyển động bên trong khung hình bằng Farneback optical flow.
Điểm số: 0 (không chuyển động) → 10 (chuyển động mạnh)
"""
import cv2
import numpy as np
from .utils import clamp_score, get_feature_config, compute_inverted_u_score


def extract_motion_level(frames: list[np.ndarray]) -> float:
    """
    Tham số:
        frames: Danh sách các frame BGR của phân đoạn video.
    Trả về:
        Điểm chuẩn hóa từ 0-10.
    """
    if len(frames) < 2:
        return None  # Không đủ frame → bỏ qua

    magnitudes: list[float] = []
    for prev, curr in zip(frames[:-1], frames[1:]):
        gray_prev = cv2.cvtColor(prev, cv2.COLOR_BGR2GRAY)
        gray_curr = cv2.cvtColor(curr, cv2.COLOR_BGR2GRAY)

        flow = cv2.calcOpticalFlowFarneback(
            gray_prev, gray_curr, None,
            pyr_scale=0.5, levels=3, winsize=15,
            iterations=3, poly_n=5, poly_sigma=1.2, flags=0,
        )
        mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        magnitudes.append(float(mag.mean()))

    avg_mag = float(np.mean(magnitudes))

    cfg = get_feature_config("motion_level")
    opt_min = cfg.get("opt_min", 2.22)
    opt_max = cfg.get("opt_max", 4.40)
    peak = cfg.get("peak", 3.31)
    scale_min = cfg.get("scale_min", 0.5)
    scale_max = cfg.get("scale_max", 7.0)

    # Tính điểm số theo đường cong chữ U ngược thực nghiệm từ báo cáo kỹ thuật
    score = compute_inverted_u_score(avg_mag, opt_min, opt_max, peak, scale_min, scale_max)
    return clamp_score(score)
