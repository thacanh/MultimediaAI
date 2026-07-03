"""
Đặc trưng 1 — visual_dynamics
Đo lường cường độ và sự phong phú của thay đổi hình ảnh theo thời gian bằng optical flow.
Kết hợp giữa:
  - Biên độ dòng chảy trung bình (lượng chuyển động tổng thể)
  - Phương sai thời gian (mức độ thay đổi/động của chuyển động qua các frame)
Điểm số: 0 (tĩnh / chuyển động đơn điệu) → 10 (cực kỳ sống động và chuyển động đa dạng)
"""
import cv2
import numpy as np
from .utils import clamp_score, get_feature_config, compute_inverted_u_score


def extract_visual_dynamics(frames: list[np.ndarray]) -> float | None:
    """
    Tham số:
        frames: Danh sách các frame BGR liên tiếp từ một phân đoạn video.
    Trả về:
        Điểm chuẩn hóa từ 0-10, hoặc None nếu không đủ frame.
    """
    if len(frames) < 2:
        return None

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
    std_mag = float(np.std(magnitudes)) if len(magnitudes) > 1 else 0.0

    # Trị số visual dynamics thô kết hợp giữa magnitude và variance (tương tự công thức cũ)
    raw_val = avg_mag * 0.7 + std_mag * 0.3

    cfg = get_feature_config("visual_dynamics")
    opt_min = cfg.get("opt_min", 2.77)
    opt_max = cfg.get("opt_max", 5.31)
    peak = cfg.get("peak", 3.98)
    scale_min = cfg.get("scale_min", 0.5)
    scale_max = cfg.get("scale_max", 8.0)

    # Tính điểm số theo đường cong chữ U ngược thực nghiệm từ báo cáo kỹ thuật
    score = compute_inverted_u_score(raw_val, opt_min, opt_max, peak, scale_min, scale_max)
    return clamp_score(score)
