"""
Đặc trưng 10 — pitch_variation
- Nếu có giọng nói: đo biến thiên tần số cơ bản F0 (pitch contour) = độ biểu cảm của giọng nói.
- Nếu không có giọng nói (nhạc nền, im lặng): đo dải động âm thanh (dynamic range).
  → Nhạc có cường độ thay đổi nhiều = cuốn hút, cường độ phẳng = đơn điệu.
Điểm số: 0 (đơn điệu / im lặng) → 10 (rất biểu cảm / sống động)
"""
import numpy as np
import librosa
from .utils import clamp_score, get_feature_config


def extract_pitch_variation(audio: np.ndarray, sr: int) -> float:
    """
    Tham số:
        audio: Mảng tín hiệu âm thanh mono 1 chiều.
        sr: Tần số lấy mẫu (sample rate).
    Trả về:
        Điểm chuẩn hóa từ 0-10.
    """
    if audio is None or len(audio) == 0:
        return None

    # Thử đo F0 giọng nói
    f0 = librosa.yin(audio, fmin=80, fmax=400, sr=sr)
    voiced = f0[(f0 >= 80) & (f0 <= 400)]

    if len(voiced) >= 10:
        # Có giọng nói → đo độ biểu cảm cao độ
        cfg = get_feature_config("pitch_variation")
        speech_std_ceil = cfg.get("speech_std_ceil", 80.0)
        std_hz = float(np.std(voiced))
        return clamp_score((std_hz / speech_std_ceil) * 10.0)

    # Dự phòng: không có giọng nói → đo động lực học âm thanh (dành cho nhạc nền)
    # Hệ số biến thiên (Coefficient of Variation) của năng lượng RMS: nhạc có cao trào / thả nhịp = cao
    rms = librosa.feature.rms(y=audio, frame_length=2048, hop_length=512)[0]
    if len(rms) < 2:
        return None

    rms_mean = float(np.mean(rms)) + 1e-9
    rms_std = float(np.std(rms))
    cfg = get_feature_config("pitch_variation")
    fallback_coef = cfg.get("fallback_coef", 12.0)
    cv = rms_std / rms_mean  # 0 = phẳng hoàn toàn, 1+ = rất sống động
    return clamp_score(cv * fallback_coef)
