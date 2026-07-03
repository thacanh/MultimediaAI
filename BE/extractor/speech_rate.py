"""
Đặc trưng 11 — speech_rate
Dùng dịch vụ VNPT STT để nhận dạng lời nói, đếm số từ và tính số từ mỗi phút (WPM) trên thời gian nói THỰC
(loại bỏ khoảng lặng trong segment nhờ Whisper timestamps).

Tính điểm: hình thang — giữ điểm 10 tại vùng tối ưu tiếng Việt:
  Dưới 80 WPM → thấp nhưng không phải là 0 (tối thiểu 1.0 khi có tiếng nói)
  80 → 130 WPM → từ 4 → 10 (tăng dần)
  130 → 170 WPM → 10.0 (tối ưu)
  170 → 280 WPM → từ 10 → 1 (giảm dần)
  > 280 WPM → 1.0 (vẫn có tiếng nên không N/A)
Nếu không phát hiện được giọng nói: trả về None.
"""
from __future__ import annotations

import logging
import numpy as np
from .utils import clamp_score, get_feature_config, compute_inverted_u_score

logger = logging.getLogger(__name__)


def _wpm_to_score(wpm: float) -> float:
    """Hàm tính điểm dạng hình chữ U ngược thực nghiệm."""
    cfg = get_feature_config("speech_rate")
    opt_min = cfg.get("opt_min", 159.0)
    opt_max = cfg.get("opt_max", 187.0)
    peak = cfg.get("peak", 173.0)
    scale_min = cfg.get("scale_min", 60.0)
    scale_max = cfg.get("scale_max", 280.0)
    return compute_inverted_u_score(wpm, opt_min, opt_max, peak, scale_min, scale_max)


# Biên dịch toàn bộ audio của video (chạy 1 lần duy nhất để tối ưu hiệu năng)

def transcribe_full_audio(audio: np.ndarray, sr: int) -> dict:
    """
    Nhận dạng toàn bộ audio của video bằng VNPT STT.

    Trả về:
        Kết quả STT chứa thông tin segments và từ kèm timestamp.
        Trả về dict rỗng nếu xảy ra lỗi.
    """
    import soundfile as sf
    import tempfile
    import os
    from vnpt_client import VnptClient

    if audio is None or len(audio) == 0:
        return {}

    vnpt = VnptClient()
    logger.info("VNPT STT: Bắt đầu transcribe audio qua API...")
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    
    try:
        sf.write(tmp_path, audio, sr)
        result = vnpt.transcribe_audio_detailed(tmp_path)
        if not result:
            raise RuntimeError("VNPT STT API không trả về kết quả dịch giọng nói.")
        return result
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def extract_speech_rate_from_result(
    whisper_result: dict,
    start_sec: float,
    end_sec: float,
) -> float | None:
    """
    Tính tốc độ nói (speech rate) cho một phân đoạn [start_sec, end_sec] từ kết quả
    transcribe toàn bộ video của VNPT STT.
    """
    if not whisper_result:
        return None

    duration_sec = max(end_sec - start_sec, 0.01)

    # Lọc các phân đoạn con nằm trong khoảng thời gian [start_sec, end_sec]
    seg_list = whisper_result.get("segments", [])
    words_in_seg: list[str] = []
    speaking_sec = 0.0

    for ws in seg_list:
        ws_start = ws.get("start", 0.0)
        ws_end   = ws.get("end",   0.0)

        # Bỏ qua nếu phân đoạn này nằm hoàn toàn ngoài phạm vi của segment hiện tại
        if ws_end <= start_sec or ws_start >= end_sec:
            continue

        # Sử dụng timestamp ở cấp độ từ (word-level timestamps) nếu có
        words = ws.get("words", [])
        if words:
            for w in words:
                w_start = w.get("start", ws_start)
                w_end   = w.get("end",   ws_end)
                if w_end > start_sec and w_start < end_sec:
                    words_in_seg.append(w.get("word", ""))
                    # Tính tổng thời gian nói thực sự trong phân đoạn này
                    overlap_start = max(w_start, start_sec)
                    overlap_end   = min(w_end, end_sec)
                    speaking_sec += max(0.0, overlap_end - overlap_start)
        else:
            # Dự phòng: nếu không có timestamp cấp độ từ thì dùng text của segment
            overlap_start = max(ws_start, start_sec)
            overlap_end   = min(ws_end, end_sec)
            overlap_dur   = max(0.0, overlap_end - overlap_start)
            if overlap_dur > 0:
                text = ws.get("text", "").strip()
                words_in_seg.extend(text.split())
                speaking_sec += overlap_dur

    word_count = len(words_in_seg)
    if word_count == 0:
        return None  # Không phát hiện giọng nói → N/A

    speaking_sec = max(speaking_sec, 0.5)  # Tránh lỗi chia cho 0
    wpm = (word_count / speaking_sec) * 60.0
    return clamp_score(_wpm_to_score(wpm))


# Hàm hỗ trợ tương thích ngược cho từng phân đoạn đơn lẻ

def extract_speech_rate(audio: np.ndarray, sr: int, duration_sec: float) -> float | None:
    """
    API hỗ trợ tương thích ngược cho phân đoạn đơn lẻ.
    """
    if audio is None or len(audio) == 0 or duration_sec <= 0:
        return None
    res = transcribe_full_audio(audio, sr)
    return extract_speech_rate_from_result(res, 0.0, duration_sec)
