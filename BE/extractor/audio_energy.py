"""
Đặc trưng 9 — audio_energy
Đo lường cường độ năng lượng của giọng nói và âm thanh bằng librosa RMS.
Điểm số: 0 (âm thanh cực kỳ yếu / nhỏ) → 10 (âm thanh đầy năng lượng / lớn)
"""
import numpy as np
import librosa
from .utils import clamp_score, get_feature_config


def extract_audio_energy(audio: np.ndarray, sr: int) -> float:
    """
    Tham số:
        audio: Mảng tín hiệu âm thanh mono 1 chiều.
        sr: Tần số lấy mẫu (sample rate).
    Trả về:
        Điểm chuẩn hóa từ 0-10.
    """
    if audio is None or len(audio) == 0:
        return 0.0

    rms = librosa.feature.rms(y=audio, frame_length=2048, hop_length=512)[0]
    avg_rms = float(rms.mean())

    cfg = get_feature_config("audio_energy")
    rms_ceil = cfg.get("rms_ceil", 0.15)
    score = (avg_rms / rms_ceil) * 10.0
    return clamp_score(score)
