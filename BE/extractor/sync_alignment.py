"""
Đặc trưng 12 — sync_alignment
Đo mức độ đồng bộ giữa nhịp hình ảnh và nhịp âm thanh (beat/onset).

Sử dụng hệ số tương quan Pearson correlation coefficient (không sử dụng cross-correlation thô)
để tránh bị lệch điểm số.
Điểm số: 0 (hoàn toàn lệch nhịp) → 10 (đồng bộ nhịp hoàn hảo)
None: không đủ frame hoặc không có âm thanh.
"""
import numpy as np
import librosa
from .utils import clamp_score, get_feature_config, compute_inverted_u_score


def extract_sync_alignment(frames: list[np.ndarray], audio: np.ndarray, sr: int) -> float | None:
    import cv2  # import nội bộ để tránh circular import

    if len(frames) < 4 or audio is None or len(audio) == 0:
        return None  # Không đủ dữ liệu → bỏ qua

    # Nhịp hình ảnh (Visual rhythm): năng lượng chênh lệch (diff) giữa các frame liên tiếp
    visual_signal: list[float] = []
    for prev, curr in zip(frames[:-1], frames[1:]):
        g_prev = cv2.cvtColor(prev, cv2.COLOR_BGR2GRAY).astype(np.float32)
        g_curr = cv2.cvtColor(curr, cv2.COLOR_BGR2GRAY).astype(np.float32)
        visual_signal.append(float(np.abs(g_curr - g_prev).mean()))

    v = np.array(visual_signal, dtype=np.float32)
    if v.std() < 1e-6:
        return None  # Hình ảnh tĩnh hoàn toàn → không thể đo đồng bộ nhịp

    # Nhịp âm thanh: envelope của cường độ onset
    onset_env = librosa.onset.onset_strength(y=audio.astype(np.float32), sr=sr)
    if onset_env.std() < 1e-6:
        return None  # Âm thanh phẳng hoàn toàn → không thể đo đồng bộ nhịp

    # Thay đổi kích thước (Resample) cả 2 tín hiệu về cùng một độ dài để tính toán tương quan
    target_len = min(len(v), len(onset_env), 64)
    if target_len < 4:
        return None

    v_r = np.interp(np.linspace(0, 1, target_len), np.linspace(0, 1, len(v)), v)
    a_r = np.interp(np.linspace(0, 1, target_len), np.linspace(0, 1, len(onset_env)), onset_env)

    # Hệ số tương quan Pearson tại các độ trễ khác nhau (lag 0 và +-2 để cho phép lệch nhẹ)
    # Pearson r nằm trong khoảng [-1, 1]: r=1 đồng bộ hoàn hảo, r=0 ngẫu nhiên, r<0 lệch pha
    def pearson(x: np.ndarray, y: np.ndarray) -> float:
        xm, ym = x - x.mean(), y - y.mean()
        denom = np.sqrt((xm ** 2).sum() * (ym ** 2).sum()) + 1e-9
        return float(np.dot(xm, ym) / denom)

    # Thử độ trễ 0, +-1, +-2 và lấy giá trị lớn nhất (cho phép nhịp hình ảnh lệch nhẹ trước/sau beat nhạc)
    best_r = max(
        pearson(v_r, a_r),
        pearson(v_r[1:], a_r[:-1]),
        pearson(v_r[:-1], a_r[1:]),
        pearson(v_r[2:], a_r[:-2]),
        pearson(v_r[:-2], a_r[2:]),
    )

    cfg = get_feature_config("sync_alignment")
    opt_min = cfg.get("opt_min", 0.343)
    opt_max = cfg.get("opt_max", 0.587)
    peak = cfg.get("peak", 0.465)
    scale_min = cfg.get("scale_min", -0.2)
    scale_max = cfg.get("scale_max", 0.9)

    score = compute_inverted_u_score(best_r, opt_min, opt_max, peak, scale_min, scale_max)
    return clamp_score(score)
