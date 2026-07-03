"""
analyzer.py
Two public functions:
  extract_features(video_path, filename) → AnalysisPayload
    Runs all 12 extractors, computes derived scores, returns structured JSON.

  call_vnpt_bot(payload) → VnptBotReview
    Sends AnalysisPayload to VNPT SmartBot and returns a structured creative review.

  analyse_video(video_path, filename) → AnalysisResponse
    Convenience wrapper that calls both in sequence.
"""
from __future__ import annotations

import os
import json
import tempfile
import subprocess
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import cv2
import numpy as np
import librosa

from schemas import (
    AnalysisPayload,
    FeatureScores,
    DerivedScores,
    SegmentResult,
    VnptBotReview,
    IssueItem,
    AnalysisResponse,
    SegmentReviewItem,
)
from extractor import (
    extract_visual_dynamics,
    extract_motion_level,
    extract_scene_variation,
    extract_cut_frequency,
    extract_text_density,
    extract_readability,
    extract_visual_focus,
    extract_clutter_level,
    extract_audio_energy,
    extract_pitch_variation,
    extract_sync_alignment,
)
from extractor.speech_rate import transcribe_full_audio, extract_speech_rate_from_result
from extractor.ocr_cache import prepare_segment_ocr, clear_cache as ocr_clear_cache

logger = logging.getLogger(__name__)

# Hằng số cấu hình phân đoạn
SEGMENT_DURATION_SEC = 4    # Mỗi phân đoạn dài 4 giây
OCR_FRAMES_PER_SEGMENT = 3  # Trích xuất 3 frame trải đều để chạy OCR (tối ưu hóa tài nguyên)
VISUAL_FRAMES_PER_SEGMENT = 6  # 6 frame trải đều cho biến đổi cảnh quay, tiêu điểm và độ lộn xộn
MOTION_FRAMES_PER_SEGMENT = 10  # 10 frame liên tiếp để đo optical flow và frame-diff

# Prompt hệ thống của CreativeIQ AI (dựa trên tài liệu đặc tả)
SYSTEM_PROMPT = """
Bạn là CreativeIQ AI — hệ thống phân tích và tối ưu hóa video ngắn (TikTok/Reels/Shorts) đỉnh cao, sử dụng các tiêu chuẩn khoa học thực nghiệm.
Bạn sẽ nhận một JSON chứa dữ liệu 12 đặc trưng kỹ thuật và các điểm số tổng hợp của từng phân đoạn video.

Nhiệm vụ: Tạo ra một bản đánh giá phân tích sáng tạo bằng TIẾNG VIỆT, ngắn gọn, cá nhân hóa, đậm chất chuyên môn và có tính thực chiến cao.
Hãy viết nhận xét cực kỳ sắc bén, chẩn đoán đúng bệnh, tránh dùng từ chung chung, tẻ nhạt như "Trung bình", "Bình thường", "Khá tốt". Thay vào đó, dùng ngôn từ sinh động, đậm chất chuyên môn (ví dụ: "Nhịp dựng dồn dập kích thích thị giác", "Cao độ đơn điệu dễ gây buồn ngủ", "Mật độ chữ quá cao gây ngộp thông tin").

Đặc biệt, bạn PHẢI nhận xét chi tiết cho TỪNG phân đoạn video (segment) trong mảng `segments` của dữ liệu đầu vào và đề xuất cách cải thiện thực chiến (ví dụ: "Cắt bớt 1.5 giây khoảng lặng", "Thêm hiệu ứng sound effect 'whoosh' lúc chuyển cảnh", "Bổ sung zoom nhẹ 5% vào frame tiêu điểm").

Định nghĩa các đặc trưng (thang điểm 0–10):
- visual_dynamics: Động lực học hình ảnh (Peak tối ưu 3.98). Thấp = quá tĩnh lặng; Cao = nhốn nháo quá đà.
- motion_level: Lượng chuyển động (Peak tối ưu 3.31).
- scene_variation: Biến đổi cảnh quay.
- cut_frequency: Tần suất cắt cảnh (Peak tối ưu sát 0.0 - giảm đơn điệu).
- text_density: Mật độ văn bản.
- readability: Độ dễ đọc của văn bản.
- visual_focus: Độ nét tiêu điểm thị giác.
- clutter_level: Độ lộn xộn/nhiễu bố cục.
- audio_energy: Năng lượng âm thanh.
- pitch_variation: Độ biến thiên cao độ (giọng nói hoặc nhạc).
- speech_rate: Tốc độ nói WPM (Peak tối ưu 173 WPM).
- sync_alignment: Đồng bộ âm thanh - hình ảnh (Peak tối ưu 0.465).

Chỉ trả về JSON hợp lệ theo cấu trúc sau (không kèm mã markdown hay giải thích ngoài lề):
{
  "headline": "<tóm tắt ấn tượng từ 6-10 từ bằng tiếng Việt>",
  "overall_score": <số thực 0–10>,
  "grade": "<A/B/C/D/F>",
  "insight": "<nhận xét tổng quan sắc bén và chiến lược hành động>",
  "key_issues": [
    {
      "feature": "<tên đặc trưng gặp vấn đề>",
      "severity": "<High|Medium|Low>",
      "description": "<chẩn đoán kỹ thuật cụ thể bằng tiếng Việt>",
      "recommendation": "<hướng giải quyết thực chiến bằng tiếng Việt>"
    }
  ],
  "segment_highlights": ["<điểm nhấn nổi bật nhất trong toàn video bằng tiếng Việt>", "..."],
  "suggested_fixes": ["<giải pháp sửa đổi chính bằng tiếng Việt>", "..."],
  "segment_reviews": [
    {
      "segment_index": <chỉ số phân đoạn, bắt đầu từ 0>,
      "impact": "<chẩn đoán tác động ngắn gọn, sinh động bằng tiếng Việt, ví dụ: 'Mở đầu kịch tính lôi cuốn' hoặc 'Tốc độ nói quá nhanh gây khó theo dõi'>",
      "feedback": "<nhận xét chi tiết cụ thể về âm thanh, hình ảnh hoặc phụ đề của phân đoạn này>",
      "suggested_fix": "<gợi ý sửa đổi mang tính thực chiến cao cho phân đoạn này>"
    }
  ]
}
"""

# Các hàm bổ trợ

def _extract_audio(video_path: str, tmp_dir: str) -> tuple[np.ndarray, int]:
    """Trích xuất âm thanh từ video thông qua ffmpeg thành file WAV tạm rồi dùng librosa load."""
    wav_path = os.path.join(tmp_dir, "audio.wav")
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "22050", "-ac", "1",
        wav_path,
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0 or not os.path.exists(wav_path):
        logger.warning("ffmpeg audio extraction failed — returning silent audio")
        return np.zeros(22050, dtype=np.float32), 22050

    audio, sr = librosa.load(wav_path, sr=None, mono=True)
    return audio, int(sr)


def _read_segment_frames(cap: cv2.VideoCapture, start_sec: float, end_sec: float, fps: float) -> list[np.ndarray]:
    """
    Decode TẤT CẢ frames trong [start_sec, end_sec] TUẦN TỰ (không seek lặp).
    Seek 1 lần duy nhất đến start_frame, sau đó cap.read() liên tục.

    Đây là nguồn frame duy nhất cho segment — tất cả extractor subsample từ list này.
    Tránh hàng trăm cap.set() + cap.read() random-access per video.
    """
    start_frame = int(start_sec * fps)
    end_frame   = int(end_sec   * fps)

    cap.set(cv2.CAP_PROP_POS_FRAMES, float(start_frame))
    frames: list[np.ndarray] = []
    for _ in range(end_frame - start_frame):
        ret, frame = cap.read()
        if not ret or frame is None:
            break
        frames.append(frame)
    return frames


def _subsample_evenly(frames: list[np.ndarray], n: int) -> list[np.ndarray]:
    """Lấy n frames trải đều từ danh sách đã decode. Không seek."""
    if not frames:
        return []
    if len(frames) <= n:
        return frames
    indices = np.linspace(0, len(frames) - 1, n, dtype=int)
    return [frames[i] for i in indices]


def _subsample_consecutive(frames: list[np.ndarray], n: int, stride: int = 4) -> list[np.ndarray]:
    """
    Lấy n frames liên tiếp nhau (stride=4) bắt đầu từ đầu segment.
    Dùng cho optical flow — cần frames gần nhau về thời gian.
    """
    if not frames:
        return []
    indices = [i * stride for i in range(n) if i * stride < len(frames)]
    return [frames[i] for i in indices]


def _subsample_cut(frames: list[np.ndarray], fps: float) -> list[np.ndarray]:
    """
    Subsample ~10 frames/giây cho cut_frequency detection.
    Stride = fps/10 — đủ dày để không bỏ sót cut.
    """
    if not frames:
        return []
    stride = max(1, int(fps / 10))
    return frames[::stride]


# Giá trị Optional < ngưỡng này → coi như không đo được (N/A)
_NA_THRESHOLD = 0.5


def _valid(val: float | None) -> float | None:
    """Return val nếu >= _NA_THRESHOLD, ngược lại None."""
    return val if (val is not None and val >= _NA_THRESHOLD) else None


def _compute_derived(f: FeatureScores) -> DerivedScores:
    # visual_engagement: bao gồm cả visual_focus (sự rõ nét tiêu điểm)
    vis_terms = [x for x in [
        _valid(f.visual_dynamics), _valid(f.motion_level),
        _valid(f.scene_variation), _valid(f.cut_frequency),
        _valid(f.visual_focus),   # độ nét hình ảnh — tính vào visual engagement
    ] if x is not None]
    vis_eng = round(float(np.mean(vis_terms)), 2) if vis_terms else 5.0

    # cognitive_load: Các chỉ số nghịch đảo (text_density, clutter) sử dụng giá trị thô
    # Giá trị thấp = ít chữ/gọn gàng = CÓ Ý NGHĨA (không phải N/A)
    cog_terms: list[float] = []
    if f.text_density is not None:
        cog_terms.append(f.text_density)
    if f.clutter_level is not None:
        cog_terms.append(f.clutter_level)
    r = _valid(f.readability)
    if r is not None:
        cog_terms.append(10 - r)  # readability cao = ít gánh nặng nhận thức
    cog_load = round(float(np.mean(cog_terms)), 2) if cog_terms else 2.0

    # audio_engagement: chỉ tính các chỉ số >= 0.5
    aud_terms: list[float] = []
    ae = _valid(f.audio_energy)
    if ae is not None:
        aud_terms.append(ae)
    pv = _valid(f.pitch_variation)
    if pv is not None:
        aud_terms.append(pv)
    if f.speech_rate is not None and f.speech_rate >= _NA_THRESHOLD:
        aud_terms.append(f.speech_rate)  # dạng hình chuông: 10=tối ưu, 0=quá chậm/nhanh
    aud_eng = round(float(np.mean(aud_terms)), 2) if aud_terms else 5.0

    # retention_risk: gánh nặng nhận thức cao, tương tác hình ảnh thấp, đồng bộ kém = rủi ro
    sync_val = f.sync_alignment if (f.sync_alignment is not None and f.sync_alignment >= _NA_THRESHOLD) else 5.0
    ret_risk = round((cog_load + (10 - vis_eng) + (10 - sync_val)) / 3, 2)
    quality = round((vis_eng + (10 - cog_load) + aud_eng + (10 - ret_risk)) / 4, 2)
    return DerivedScores(
        visual_engagement_score=max(0.0, min(10.0, vis_eng)),
        cognitive_load_score=max(0.0, min(10.0, cog_load)),
        audio_engagement_score=max(0.0, min(10.0, aud_eng)),
        retention_risk_score=max(0.0, min(10.0, ret_risk)),
        overall_quality_score=max(0.0, min(10.0, quality)),
    )


def _average_features(seg_results: list[SegmentResult]) -> FeatureScores:
    """Tính trung bình các đặc trưng của phân đoạn thành đặc trưng toàn cục.
    Các trường tùy chọn (visual_dynamics, scene_variation, pitch_variation) bỏ qua giá trị None.
    Nếu tất cả phân đoạn đều trả về None cho một trường tùy chọn, kết quả toàn cục cũng là None.
    """
    def avg(attr: str) -> float | None:
        """Tính trung bình trường tùy chọn, bỏ qua None và giá trị < _NA_THRESHOLD."""
        vals = [getattr(s.features, attr) for s in seg_results]
        vals = [v for v in vals if v is not None and v >= _NA_THRESHOLD]
        return round(float(np.mean(vals)), 2) if vals else None

    def avg_raw(attr: str) -> float | None:
        """Tính trung bình trường không lọc theo threshold (dùng cho các chỉ số đảo ngược: text_density, clutter_level)."""
        vals = [getattr(s.features, attr) for s in seg_results]
        vals = [v for v in vals if v is not None]
        return round(float(np.mean(vals)), 2) if vals else None

    return FeatureScores(
        visual_dynamics =avg("visual_dynamics"),
        motion_level    =avg("motion_level"),
        scene_variation =avg("scene_variation"),
        cut_frequency   =avg("cut_frequency"),
        text_density    =avg_raw("text_density"),   # inverted: 0.0 vẫn hợp lệ
        readability     =avg("readability"),
        visual_focus    =avg("visual_focus"),
        clutter_level   =avg_raw("clutter_level"),  # inverted: 0.0 vẫn hợp lệ
        audio_energy    =avg("audio_energy"),
        pitch_variation =avg("pitch_variation"),
        speech_rate     =avg("speech_rate"),
        sync_alignment  =avg("sync_alignment"),
    )


def _average_derived(seg_results: list[SegmentResult]) -> DerivedScores:
    """Global derived = trung bình trực tiếp các derived scores từng segment."""
    def avg(attr: str) -> float:
        vals = [getattr(s.derived, attr) for s in seg_results]
        return round(float(np.mean(vals)), 2) if vals else 5.0

    return DerivedScores(
        visual_engagement_score=avg("visual_engagement_score"),
        cognitive_load_score   =avg("cognitive_load_score"),
        audio_engagement_score =avg("audio_engagement_score"),
        retention_risk_score   =avg("retention_risk_score"),
        overall_quality_score  =avg("overall_quality_score"),
    )


# Trình điều phối và trích xuất đặc trưng chính


def extract_features(video_path: str, filename: str) -> AnalysisPayload:
    """
    Giai đoạn 1 — Chỉ trích xuất đặc trưng (đồng bộ, trả về payload đầy đủ).
    """
    # Consume the streaming generator and return the final payload
    payload = None
    for event in extract_features_stream(video_path, filename):
        if event.get("type") == "done":
            payload = AnalysisPayload(**event["payload"])
    if payload is None:
        raise RuntimeError("extract_features_stream ended without a 'done' event")
    return payload


def extract_features_stream(video_path: str, filename: str):
    """
    Giai đoạn 1 — Trích xuất đặc trưng với các sự kiện tiến trình thời gian thực (generator).

    Trả về các dict để endpoint SSE serialize sang JSON:
      {"type": "video_info",    "duration_sec": float, "total_segments": int}
      {"type": "segment_start", "index": int, "total": int, "start": float, "end": float}
      {"type": "segment_done",  "index": int, "total": int, "result": SegmentResult.dict()}
      {"type": "done",          "payload": AnalysisPayload.dict()}
      {"type": "error",         "message": str}
    """
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            yield {"type": "error", "message": f"Cannot open video: {video_path}"}
            return

        # Kiểm tra codec — nếu không đọc được frame (AV1/HEVC), transcode sang H.264
        ret, test_frame = cap.read()
        if not ret or test_frame is None:
            cap.release()
            logger.warning(f"Codec không hỗ trợ (có thể AV1/HEVC) — transcoding sang H.264: {video_path}")
            transcoded_path = video_path + "_h264.mp4"
            transcode_cmd = [
                "ffmpeg", "-y", "-i", video_path,
                "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
                "-c:a", "aac", "-b:a", "128k",
                transcoded_path,
            ]
            transcode_result = subprocess.run(transcode_cmd, capture_output=True)
            if transcode_result.returncode != 0 or not os.path.exists(transcoded_path):
                yield {"type": "error", "message": "Không thể transcode video — codec không được hỗ trợ."}
                return
            video_path = transcoded_path
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                yield {"type": "error", "message": "Không thể mở video sau khi transcode."}
                return
            logger.info(f"Transcode thành công → {transcoded_path}")
        else:
            # Reset về đầu vì đã đọc 1 frame test
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = total_frames / fps
        logger.info(f"Video loaded: {filename} | {duration_sec:.1f}s | {fps:.1f}fps")

        boundaries: list[tuple[float, float]] = []
        t = 0.0
        while t < duration_sec:
            boundaries.append((t, min(t + SEGMENT_DURATION_SEC, duration_sec)))
            t += SEGMENT_DURATION_SEC

        total_segs = len(boundaries)
        yield {"type": "video_info", "duration_sec": round(duration_sec, 2), "total_segments": total_segs}

        seg_results: list[SegmentResult] = []

        with tempfile.TemporaryDirectory() as tmp_dir:
            full_audio, sr = _extract_audio(video_path, tmp_dir)

            # Tối ưu 2: Dịch toàn bộ âm thanh video qua STT một lần duy nhất
            logger.info("Whisper: transcribing full audio (1 pass)...")
            whisper_result = transcribe_full_audio(full_audio, sr)
            logger.info("Whisper: transcription done.")

            for seg_idx, (start, end) in enumerate(boundaries):
                logger.info(f"  Segment {seg_idx}: {start:.1f}s – {end:.1f}s")
                yield {"type": "segment_start", "index": seg_idx, "total": total_segs,
                       "start": round(start, 2), "end": round(end, 2)}

                # Tối ưu 1: Giải mã (decode) các frame của segment một lần duy nhất
                all_frames = _read_segment_frames(cap, start, end, fps)

                # Subsample từ buffer đã decode — không seek thêm
                ocr_frames    = _subsample_evenly(all_frames, OCR_FRAMES_PER_SEGMENT)
                visual_frames = _subsample_evenly(all_frames, VISUAL_FRAMES_PER_SEGMENT)
                motion_frames = _subsample_consecutive(all_frames, MOTION_FRAMES_PER_SEGMENT, stride=4)
                cut_frames    = _subsample_cut(all_frames, fps)

                a_start = int(start * sr)
                a_end = int(end * sr)
                seg_audio = (full_audio[a_start:a_end]
                             if len(full_audio) > a_start
                             else np.zeros(sr, dtype=np.float32))
                seg_dur = end - start

                # OCR phải chạy trước (prepare_segment_ocr cache kết quả)
                prepare_segment_ocr(ocr_frames)

                # Tối ưu 3: Chạy song song các bộ trích xuất đặc trưng
                # Các bộ trích xuất độc lập nhau — chạy song song bằng ThreadPoolExecutor.
                # GIL không chặn cv2/numpy nên ThreadPool hoạt động hiệu quả cho tác vụ CPU-bound
                # mà không tốn chi phí tuần tự hóa (serialization) của ProcessPool.
                def _run_visual_dynamics():   return _valid(extract_visual_dynamics(motion_frames))
                def _run_motion_level():       return _valid(extract_motion_level(motion_frames))
                def _run_scene_variation():    return _valid(extract_scene_variation(visual_frames))
                def _run_cut_frequency():      return _valid(extract_cut_frequency(cut_frames, seg_dur))
                def _run_text_density():       return extract_text_density(ocr_frames)
                def _run_readability():        return _valid(extract_readability(ocr_frames))
                def _run_visual_focus():       return _valid(extract_visual_focus(visual_frames))
                def _run_clutter_level():      return extract_clutter_level(visual_frames)
                def _run_audio_energy():       return _valid(extract_audio_energy(seg_audio, sr))
                def _run_pitch_variation():    return _valid(extract_pitch_variation(seg_audio, sr))
                def _run_speech_rate():        return _valid(extract_speech_rate_from_result(whisper_result, start, end))
                def _run_sync_alignment():     return _valid(extract_sync_alignment(motion_frames, seg_audio, sr))

                task_map = {
                    "visual_dynamics":  _run_visual_dynamics,
                    "motion_level":     _run_motion_level,
                    "scene_variation":  _run_scene_variation,
                    "cut_frequency":    _run_cut_frequency,
                    "text_density":     _run_text_density,
                    "readability":      _run_readability,
                    "visual_focus":     _run_visual_focus,
                    "clutter_level":    _run_clutter_level,
                    "audio_energy":     _run_audio_energy,
                    "pitch_variation":  _run_pitch_variation,
                    "speech_rate":      _run_speech_rate,
                    "sync_alignment":   _run_sync_alignment,
                }

                results: dict[str, float | None] = {}
                with ThreadPoolExecutor(max_workers=6) as pool:
                    future_to_key = {pool.submit(fn): key for key, fn in task_map.items()}
                    for future in as_completed(future_to_key):
                        key = future_to_key[future]
                        try:
                            results[key] = future.result()
                        except Exception as exc:
                            logger.warning(f"Extractor '{key}' failed: {exc}")
                            results[key] = None

                features = FeatureScores(
                    visual_dynamics =results["visual_dynamics"],
                    motion_level    =results["motion_level"],
                    scene_variation =results["scene_variation"],
                    cut_frequency   =results["cut_frequency"],
                    text_density    =results["text_density"],
                    readability     =results["readability"],
                    visual_focus    =results["visual_focus"],
                    clutter_level   =results["clutter_level"],
                    audio_energy    =results["audio_energy"],
                    pitch_variation =results["pitch_variation"],
                    speech_rate     =results["speech_rate"],
                    sync_alignment  =results["sync_alignment"],
                )

                # Sử dụng VNPT SmartVision (1 frame đại diện cho mỗi segment)
                person_count = 0
                face_count = 0
                vehicle_count = 0
                license_plates: list[str] = []

                try:
                    from vnpt_client import VnptClient
                    vnpt = VnptClient()

                    if visual_frames:
                        rep_frame = visual_frames[len(visual_frames) // 2]

                        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                            tmp_path = tmp.name

                        cv2.imwrite(tmp_path, rep_frame)
                        file_hash = vnpt.upload_file(tmp_path, title=f"vision_{seg_idx}", description="Segment visual frame")

                        try:
                            os.unlink(tmp_path)
                        except Exception:
                            pass

                        if file_hash:
                            img_url = vnpt.get_file_url(file_hash)
                            if img_url:
                                with ThreadPoolExecutor(max_workers=2) as pool:
                                    fut_people = pool.submit(vnpt.detect_people, img_url)
                                    fut_faces = pool.submit(vnpt.detect_face, img_url)

                                    try:
                                        people_boxes = fut_people.result()
                                    except Exception as pe:
                                        logger.warning(f"VNPT detect_people failed: {pe}")
                                        people_boxes = []

                                    try:
                                        faces = fut_faces.result()
                                    except Exception as fe:
                                        logger.warning(f"VNPT detect_face failed: {fe}")
                                        faces = []

                                person_count = len(people_boxes)
                                face_count = len(faces)
                                vehicle_count = 0
                except Exception as e:
                    logger.warning(f"VNPT SmartVision failed for segment {seg_idx}: {e}")

                derived = _compute_derived(features)
                seg = SegmentResult(
                    segment_index=seg_idx,
                    start_sec=round(start, 2),
                    end_sec=round(end, 2),
                    features=features,
                    derived=derived,
                    person_count=person_count,
                    face_count=face_count,
                    vehicle_count=vehicle_count,
                    license_plates=license_plates,
                )
                seg_results.append(seg)
                yield {"type": "segment_done", "index": seg_idx, "total": total_segs,
                       "result": seg.model_dump()}

        cap.release()
        ocr_clear_cache()

        global_features = _average_features(seg_results)
        global_derived  = _average_derived(seg_results)  # trung bình các segment derived scores

        # Gọi API tóm tắt văn bản từ VNPT
        full_transcript = whisper_result.get("text", "")
        summary_text = ""
        from vnpt_client import VnptClient
        vnpt = VnptClient()
        try:
            if full_transcript.strip():
                summary_text = vnpt.summarize_text(full_transcript) or ""
        except Exception as e:
            logger.warning(f"VNPT text summary failed: {e}")

        global_person_count = int(np.mean([s.person_count for s in seg_results])) if seg_results else 0
        global_face_count = int(np.mean([s.face_count for s in seg_results])) if seg_results else 0
        global_vehicle_count = int(np.mean([s.vehicle_count for s in seg_results])) if seg_results else 0

        # Gộp và loại bỏ các biển số xe trùng lặp
        raw_plates = []
        if seg_results:
            for s in seg_results:
                if s.license_plates:
                    raw_plates.extend(s.license_plates)
        global_license_plates = list(set(raw_plates))

        payload = AnalysisPayload(
            filename=filename,
            duration_sec=round(duration_sec, 2),
            segments=seg_results,
            global_features=global_features,
            global_derived=global_derived,
            summary=summary_text,
            person_count=global_person_count,
            face_count=global_face_count,
            vehicle_count=global_vehicle_count,
            license_plates=global_license_plates,
        )
        yield {"type": "done", "payload": payload.model_dump()}

    except Exception as exc:
        logger.exception("extract_features_stream failed")
        yield {"type": "error", "message": str(exc)}


def analyse_video(video_path: str, filename: str) -> AnalysisResponse:
    """Hàm tiện ích: thực hiện cả trích xuất đặc trưng và gọi đánh giá AI trong một cuộc gọi."""
    payload = extract_features(video_path, filename)
    review = call_vnpt_bot(payload)
    return AnalysisResponse(payload=payload, review=review)


def call_vnpt_bot_reviewer(payload: AnalysisPayload) -> Optional[VnptBotReview]:
    """Gửi dữ liệu đặc trưng đến VNPT SmartBot để đánh giá và phân tích phản hồi JSON."""
    from vnpt_client import VnptClient
    vnpt = VnptClient()
    if vnpt.is_bot_mock_mode():
        logger.warning("[MOCK] SmartBot đang ở chế độ giả lập. Tạo kết quả đánh giá giả định.")
        return VnptBotReview(
            headline="Video giới thiệu có chất lượng âm thanh tốt, hình ảnh rõ ràng.",
            overall_score=8.5,
            grade="B",
            insight="Video có mật độ chữ và độ rõ tốt, nội dung tóm tắt rành mạch. Tuy nhiên, chuyển động visual có thể tăng tính năng động hơn.",
            key_issues=[
                IssueItem(
                    feature="visual_dynamics",
                    severity="Medium",
                    description="Chuyển động hình ảnh hơi đều và chậm ở một số phân đoạn.",
                    recommendation="Tăng cường hiệu ứng chuyển động hoặc góc quay đa dạng hơn."
                )
            ],
            segment_highlights=["Đoạn giới thiệu mở đầu ấn tượng với độ nét cao."],
            suggested_fixes=["Thêm nhạc nền động hơn để giữ chân người xem."],
            segment_reviews=[
                SegmentReviewItem(
                    segment_index=0,
                    impact="Mở đầu kịch tính lôi cuốn",
                    feedback="Hình ảnh sắc nét, tiêu điểm tập trung cực kỳ xuất sắc vào chủ thể chính. Nhịp nói rành mạch và thu hút.",
                    suggested_fix="Thêm hiệu ứng âm thanh chuyển cảnh 'whoosh' nhanh ở giây thứ 3 để tạo điểm nhấn bất ngờ."
                ),
                SegmentReviewItem(
                    segment_index=1,
                    impact="Mật độ chữ khá cao gây ngộp",
                    feedback="Mật độ phụ đề tăng lên làm giảm nhẹ độ tập trung thị giác vào hình ảnh.",
                    suggested_fix="Rút ngắn ký tự phụ đề dòng thứ 2 và tăng độ tương phản nền chữ để người xem đọc nhanh hơn."
                ),
                SegmentReviewItem(
                    segment_index=2,
                    impact="Độ động âm thanh hơi trầm lắng",
                    feedback="Nhịp điệu và năng lượng âm thanh giảm dần ở cuối phân đoạn này, có thể gây mất tập trung.",
                    suggested_fix="Tăng nhẹ âm lượng nhạc nền hoặc đẩy tốc độ dựng cảnh nhanh hơn 15%."
                ),
                SegmentReviewItem(
                    segment_index=3,
                    impact="Kết thúc ấn tượng, đồng bộ tốt",
                    feedback="Độ đồng bộ âm thanh-hình ảnh xuất sắc, nhịp cắt khớp hoàn hảo với onset nhạc nền.",
                    suggested_fix="Giữ nguyên phong cách chuyển cảnh khớp beat này cho các phân đoạn kết thúc tiếp theo."
                )
            ]
        )

    logger.info("VNPT SmartBot: Bắt đầu gọi review từ chatbot...")
    payload_json = payload.model_dump_json(indent=2)
    prompt = f"Phân tích dữ liệu video sau và trả về bản đánh giá JSON bằng tiếng Việt:\n\n{payload_json}"

    raw = vnpt.review_with_bot(prompt, SYSTEM_PROMPT)
    if not raw:
        return None

    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        data = json.loads(raw)
        key_issues = [
            IssueItem(
                feature=item.get("feature", "unknown"),
                severity=item.get("severity", "Medium"),
                description=item.get("description", ""),
                recommendation=item.get("recommendation", ""),
            )
            for item in data.get("key_issues", [])
        ]

        segment_reviews = [
            SegmentReviewItem(
                segment_index=int(item.get("segment_index", 0)),
                impact=item.get("impact", ""),
                feedback=item.get("feedback", ""),
                suggested_fix=item.get("suggested_fix", ""),
            )
            for item in data.get("segment_reviews", [])
        ]

        return VnptBotReview(
            headline=data.get("headline", ""),
            overall_score=float(data.get("overall_score", 5.0)),
            grade=data.get("grade", "C"),
            insight=data.get("insight", ""),
            key_issues=key_issues,
            segment_highlights=data.get("segment_highlights", []),
            suggested_fixes=data.get("suggested_fixes", []),
            segment_reviews=segment_reviews,
        )
    except Exception as e:
        logger.warning(f"Không thể phân tích phản hồi đánh giá của VNPT SmartBot dưới dạng JSON: {e}. Phản hồi thô: {raw}")
        return None


def call_vnpt_bot(payload: AnalysisPayload) -> VnptBotReview:
    """Giai đoạn 2 — Gửi dữ liệu đặc trưng đến VNPT SmartBot để đánh giá và nhận phản hồi."""
    logger.info("Gửi dữ liệu phân tích video đến VNPT SmartBot...")
    bot_review = call_vnpt_bot_reviewer(payload)
    if bot_review is None:
        raise RuntimeError("Đánh giá từ VNPT SmartBot thất bại hoặc trả về rỗng. Đánh giá từ chatbot là bắt buộc.")
    return bot_review


# Giữ tên cũ làm bí danh để tương thích ngược
call_gemini = call_vnpt_bot
_call_gemini = call_gemini
