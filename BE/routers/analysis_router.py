"""
routers/analysis_router.py — Analysis endpoints with DB persistence + local disk video storage.
"""
from __future__ import annotations

import json
import logging
import os
import re
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, Query
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, AnalysisRecord
from auth import get_optional_user
from schemas import AnalysisPayload, AnalysisResponse, VnptBotReview
from analyzer import extract_features, extract_features_stream, call_vnpt_bot, call_gemini, analyse_video

logger = logging.getLogger("vnpthack")
router = APIRouter(tags=["analysis"])

# Cấu hình lưu trữ video trên đĩa cục bộ
VIDEO_DIR = Path(os.getenv("VIDEO_DIR", "/app/videos"))
VIDEO_DIR.mkdir(parents=True, exist_ok=True)


def _local_storage_key(filename: str, user: Optional[User]) -> str:
    uid = str(user.id) if user else "guest"
    ext = Path(filename).suffix or ".mp4"
    return f"{uid}/{uuid.uuid4().hex}{ext}"


def _local_save(src_path: Path, storage_key: str) -> Path:
    dest = VIDEO_DIR / storage_key
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src_path, dest)
    return dest


def _local_delete(storage_key: str) -> None:
    (VIDEO_DIR / storage_key).unlink(missing_ok=True)


ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_FILE_SIZE_MB = 500
CONTENT_TYPE_MAP = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
}


# Các schema phản hồi của Pydantic

class AnalysisRecordOut(BaseModel):
    id: int
    filename: str
    duration_sec: float
    file_size_bytes: Optional[int] = None
    headline: Optional[str] = None
    overall_score: Optional[float] = None
    grade: Optional[str] = None
    insight: Optional[str] = None
    created_at: str
    user_id: Optional[int] = None
    has_video: bool = False

    @classmethod
    def from_record(cls, r: AnalysisRecord) -> "AnalysisRecordOut":
        return cls(
            id=r.id,
            filename=r.filename,
            duration_sec=r.duration_sec,
            file_size_bytes=r.file_size_bytes,
            headline=r.headline,
            overall_score=r.overall_score,
            grade=r.grade,
            insight=r.insight,
            created_at=r.created_at.isoformat(),
            user_id=r.user_id,
            has_video=bool(r.storage_key),
        )


class AnalysisRecordDetail(AnalysisRecordOut):
    payload: Optional[dict] = None
    review: Optional[dict] = None
    video_url: Optional[str] = None

    @classmethod
    def from_record(cls, r: AnalysisRecord, with_video_url: bool = False) -> "AnalysisRecordDetail":
        base = AnalysisRecordOut.from_record(r)
        video_url = None
        if with_video_url and r.storage_key:
            try:
                video_url = get_presigned_url(r.storage_key, expires_hours=2)
            except Exception:
                pass
        return cls(
            **base.model_dump(),
            payload=r.get_payload(),
            review=r.get_review(),
            video_url=video_url,
        )


# Các hàm bổ trợ

async def _save_upload(file: UploadFile) -> tuple[str, str, bytes, str]:
    """Lưu file upload vào thư mục tạm. Trả về (tmp_dir, tmp_path, nội dung file, đuôi file)."""
    suffix = Path(file.filename or "video.mp4").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Loại file '{suffix}' không được hỗ trợ.")
    content = await file.read()
    size_mb = len(content) / (1024 ** 2)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(413, f"File quá lớn ({size_mb:.1f} MB). Tối đa {MAX_FILE_SIZE_MB} MB.")
    tmp_dir = tempfile.mkdtemp(prefix="vnpthack_")
    tmp_path = os.path.join(tmp_dir, f"video{suffix}")
    with open(tmp_path, "wb") as f:
        f.write(content)
    return tmp_dir, tmp_path, content, suffix


def _make_storage_key(filename: str, user: Optional[User]) -> str:
    """Tạo object key duy nhất cho lưu trữ MinIO."""
    uid = str(uuid.uuid4())[:8]
    prefix = f"users/{user.id}" if user else "guests"
    stem = Path(filename).stem[:40]
    suffix = Path(filename).suffix.lower()
    return f"{prefix}/{uid}-{stem}{suffix}"


def _persist_analysis(
    db: Session,
    user: Optional[User],
    payload: AnalysisPayload,
    review: Optional[VnptBotReview],
    storage_key: Optional[str] = None,
    file_size_bytes: Optional[int] = None,
    content_type: Optional[str] = None,
) -> AnalysisRecord:
    gf = payload.global_features
    gd = payload.global_derived

    record = AnalysisRecord(
        user_id=user.id if user else None,
        filename=payload.filename,
        duration_sec=payload.duration_sec,
        storage_key=storage_key,
        file_size_bytes=file_size_bytes,
        content_type=content_type,
        headline=review.headline if review else None,
        overall_score=review.overall_score if review else None,
        grade=review.grade if review else None,
        insight=review.insight if review else None,
        visual_dynamics=gf.visual_dynamics,
        motion_level=gf.motion_level,
        scene_variation=gf.scene_variation,
        cut_frequency=gf.cut_frequency,
        text_density=gf.text_density,
        readability=gf.readability,
        clutter_level=gf.clutter_level,
        visual_focus=gf.visual_focus,
        audio_energy=gf.audio_energy,
        pitch_variation=gf.pitch_variation,
        speech_rate=gf.speech_rate,
        sync_alignment=gf.sync_alignment,
        visual_engagement_score=gd.visual_engagement_score,
        cognitive_load_score=gd.cognitive_load_score,
        audio_engagement_score=gd.audio_engagement_score,
        retention_risk_score=gd.retention_risk_score,
    )
    record.set_payload(payload.model_dump())
    if review:
        record.set_review(review.model_dump())

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# Các endpoint API phân tích

@router.post("/extract", response_model=AnalysisPayload, summary="Stage 1 — Extract features (no LLM)")
async def extract_endpoint(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    tmp_dir, tmp_path, content, suffix = await _save_upload(file)
    try:
        payload = extract_features(tmp_path, filename=file.filename or "video.mp4")
        # Upload to MinIO
        storage_key = None
        try:
            storage_key = _make_storage_key(file.filename or "video.mp4", current_user)
            upload_video(storage_key, tmp_path, CONTENT_TYPE_MAP.get(suffix, "video/mp4"))
        except Exception as e:
            logger.warning(f"MinIO upload failed (non-fatal): {e}")
            storage_key = None
        _persist_analysis(db, current_user, payload, review=None,
                          storage_key=storage_key, file_size_bytes=len(content),
                          content_type=CONTENT_TYPE_MAP.get(suffix))
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Feature extraction failed")
        raise HTTPException(500, str(exc))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@router.post("/extract/stream", summary="Stage 1 (streaming) — Extract with SSE progress")
async def extract_stream_endpoint(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    tmp_dir, tmp_path, content, suffix = await _save_upload(file)
    filename = file.filename or "video.mp4"
    content_type = CONTENT_TYPE_MAP.get(suffix, "video/mp4")

    sz = len(content)
    ct = content_type

    def sse_generator():
        try:
            final_payload = None
            for event in extract_features_stream(tmp_path, filename=filename):
                if event.get("type") == "done" and event.get("payload"):
                    final_payload = event["payload"]

                    # Chỉ lưu khi đã đăng nhập
                    storage_key = None
                    record_id = None
                    if current_user is not None:
                        try:
                            storage_key = _local_storage_key(filename, current_user)
                            _local_save(tmp_path, storage_key)
                            logger.info(f"Video saved to disk: {storage_key}")
                        except Exception as e:
                            logger.warning(f"Local save failed (non-fatal): {e}")
                            storage_key = None

                        try:
                            payload_obj = AnalysisPayload(**final_payload)
                            saved = _persist_analysis(db, current_user, payload_obj, review=None,
                                                      storage_key=storage_key, file_size_bytes=sz, content_type=ct)
                            record_id = saved.id
                        except Exception as e:
                            logger.error(f"DB persist after stream failed: {e}")
                    enriched = {**event, "record_id": record_id}
                    yield f"data: {json.dumps(enriched, ensure_ascii=False)}\n\n"
                else:
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/review", response_model=VnptBotReview, summary="Stage 2 — VNPT SmartBot review")
def review_endpoint(payload: AnalysisPayload):
    try:
        return call_vnpt_bot(payload)
    except Exception as exc:
        err = str(exc)
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            raise HTTPException(402, "VNPT SmartBot API credits đã hết.")
        raise HTTPException(500, err)


@router.post("/analyse", response_model=AnalysisResponse, summary="Combined — Extract + Review + Save")
async def analyse_endpoint(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    tmp_dir, tmp_path, content, suffix = await _save_upload(file)
    filename = file.filename or "video.mp4"
    content_type = CONTENT_TYPE_MAP.get(suffix, "video/mp4")
    try:
        result = analyse_video(tmp_path, filename=filename)
        storage_key = None
        try:
            ensure_bucket()
            storage_key = _make_storage_key(filename, current_user)
            upload_video(storage_key, tmp_path, content_type)
        except Exception as e:
            logger.warning(f"MinIO upload failed: {e}")
        _persist_analysis(db, current_user, result.payload, result.review,
                          storage_key=storage_key, file_size_bytes=len(content),
                          content_type=content_type)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Analysis pipeline failed")
        raise HTTPException(500, str(exc))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# Xem lại video

@router.get("/analyses/{record_id}/video-url", summary="Trả URL stream video (local disk)")
def get_video_url(
    record_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    record = db.get(AnalysisRecord, record_id)
    if not record:
        raise HTTPException(404, "Không tìm thấy bản ghi.")
    if record.user_id is not None and (not current_user or current_user.id != record.user_id):
        raise HTTPException(403, "Không có quyền truy cập.")
    if not record.storage_key:
        raise HTTPException(404, "Video không có trong storage.")
    # Trả URL endpoint stream (browser gọi qua /api proxy)
    return {"url": f"/api/analyses/{record_id}/video-stream"}


@router.get("/analyses/{record_id}/video-stream", summary="Stream video từ local disk")
def stream_video(
    record_id: int,
    request: Request,
    token: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Stream video từ local disk với HTTP Range support."""
    from auth import decode_token

    # Fallback auth từ query param
    effective_user = current_user
    if effective_user is None and token:
        try:
            data = decode_token(token)
            effective_user = db.get(User, int(data["sub"]))
        except Exception:
            effective_user = None

    record = db.get(AnalysisRecord, record_id)
    if not record:
        raise HTTPException(404, "Không tìm thấy bản ghi.")
    if record.user_id is not None and (not effective_user or effective_user.id != record.user_id):
        raise HTTPException(403, "Không có quyền truy cập.")
    if not record.storage_key:
        raise HTTPException(404, "Video không có trong storage.")

    video_path = VIDEO_DIR / record.storage_key
    if not video_path.exists():
        raise HTTPException(404, "File video không tìm thấy trên disk.")

    content_type = record.content_type or "video/mp4"
    total_size = video_path.stat().st_size

    # Parse Range header
    range_header = request.headers.get("range")
    start, end = 0, total_size - 1
    status_code = 200

    if range_header:
        m = re.match(r"bytes=(\d*)-(\d*)", range_header)
        if m:
            s, e = m.group(1), m.group(2)
            start = int(s) if s else (total_size - int(e) if e else 0)
            end = int(e) if e else total_size - 1
            end = min(end, total_size - 1)
            status_code = 206

    chunk_size = end - start + 1

    def file_generator():
        with open(video_path, "rb") as f:
            f.seek(start)
            remaining = chunk_size
            while remaining > 0:
                data = f.read(min(256 * 1024, remaining))
                if not data:
                    break
                remaining -= len(data)
                yield data

    from urllib.parse import quote
    safe_name = quote(record.filename, safe="")  # UTF-8 percent-encode toàn bộ tên file
    headers = {
        "Content-Range": f"bytes {start}-{end}/{total_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        # RFC 5987: hỗ trợ Unicode filename — tránh lỗi header với tiếng Việt/ký tự đặc biệt
        "Content-Disposition": f"inline; filename*=UTF-8''{safe_name}",
    }
    return StreamingResponse(
        file_generator(),
        status_code=status_code,
        media_type=content_type,
        headers=headers,
    )



@router.get("/analyses/{record_id}/video-stream", summary="Stream video với Range request support (seek được)")
def stream_video(
    record_id: int,
    request: Request,
    token: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Stream video từ MinIO qua FastAPI với HTTP Range support — có thể seek, hoạt động qua WiFi."""
    import re
    from urllib.parse import quote
    from storage import get_minio_client, MINIO_BUCKET
    from auth import decode_token

    # Fallback auth từ query param (vì <video> không set Authorization header)
    effective_user = current_user
    if effective_user is None and token:
        try:
            data = decode_token(token)
            effective_user = db.get(User, int(data["sub"]))
        except Exception:
            effective_user = None

    record = db.get(AnalysisRecord, record_id)
    if not record:
        raise HTTPException(404, "Không tìm thấy bản ghi.")
    if record.user_id is not None and (not effective_user or effective_user.id != record.user_id):
        raise HTTPException(403, "Không có quyền truy cập.")
    if not record.storage_key:
        raise HTTPException(404, "Video không có trong storage.")

    client = get_minio_client()
    content_type = record.content_type or "video/mp4"
    safe_filename = quote(record.filename, safe="")

    # Lấy tổng size từ MinIO
    try:
        stat = client.stat_object(MINIO_BUCKET, record.storage_key)
        total_size = stat.size
    except Exception:
        total_size = record.file_size_bytes or 0

    # Parse Range header (e.g. "bytes=0-1023")
    range_header = request.headers.get("range")
    start, end = 0, total_size - 1

    if range_header:
        m = re.match(r"bytes=(\d*)-(\d*)", range_header)
        if m:
            s, e = m.group(1), m.group(2)
            start = int(s) if s else (total_size - int(e) if e else 0)
            end = int(e) if e else total_size - 1
            end = min(end, total_size - 1)

    chunk_size = end - start + 1

    def ranged_generator(offset: int, length: int):
        resp = None
        try:
            resp = client.get_object(MINIO_BUCKET, record.storage_key, offset=offset, length=length)
            for chunk in resp.stream(amt=1024 * 256):
                yield chunk
        finally:
            if resp:
                try:
                    resp.close()
                    resp.release_conn()
                except Exception:
                    pass

    status_code = 206 if range_header else 200
    headers = {
        "Content-Disposition": f"inline; filename*=UTF-8''{safe_filename}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        "Cache-Control": "no-cache",
    }
    if range_header:
        headers["Content-Range"] = f"bytes {start}-{end}/{total_size}"

    return StreamingResponse(
        ranged_generator(start, chunk_size),
        status_code=status_code,
        media_type=content_type,
        headers=headers,
    )


# Lịch sử và Thống kê

@router.get("/analyses", response_model=list[AnalysisRecordOut], summary="Lịch sử phân tích")
def list_analyses(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    q = db.query(AnalysisRecord)
    if current_user:
        q = q.filter(AnalysisRecord.user_id == current_user.id)
    else:
        q = q.filter(AnalysisRecord.user_id.is_(None))
        limit = min(limit, 10)
    records = q.order_by(AnalysisRecord.created_at.desc()).offset(offset).limit(limit).all()
    return [AnalysisRecordOut.from_record(r) for r in records]


@router.get("/analyses/{record_id}", response_model=AnalysisRecordDetail, summary="Chi tiết bản ghi")
def get_analysis(
    record_id: int,
    with_video: bool = Query(False, description="Có kèm video URL không"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    record = db.get(AnalysisRecord, record_id)
    if not record:
        raise HTTPException(404, "Không tìm thấy bản ghi.")
    if record.user_id is not None:
        if not current_user or current_user.id != record.user_id:
            raise HTTPException(403, "Không có quyền truy cập bản ghi này.")
    return AnalysisRecordDetail.from_record(record, with_video_url=with_video)


@router.patch("/analyses/{record_id}/review", response_model=AnalysisRecordOut, summary="Cập nhật VNPT Bot review vào bản ghi")
def patch_review(
    record_id: int,
    review: dict,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    record = db.get(AnalysisRecord, record_id)
    if not record:
        raise HTTPException(404, "Không tìm thấy bản ghi.")
    # Cho phép các bản ghi của khách (user_id=None) hoặc khớp với user đăng nhập
    if record.user_id is not None and (not current_user or current_user.id != record.user_id):
        raise HTTPException(403, "Không có quyền.")
    try:
        gr = VnptBotReview(**review)
        record.set_review(gr.model_dump())
        record.headline = gr.headline
        record.overall_score = gr.overall_score
        record.grade = gr.grade
        record.insight = gr.insight
        db.commit()
        db.refresh(record)
    except Exception as e:
        db.rollback()
        raise HTTPException(400, f"Dữ liệu review không hợp lệ: {e}")
    return AnalysisRecordOut.from_record(record)


@router.delete("/analyses/{record_id}", status_code=204, summary="Xóa bản ghi + video")
def delete_analysis(
    record_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    record = db.get(AnalysisRecord, record_id)
    if not record:
        raise HTTPException(404, "Không tìm thấy bản ghi.")
    if record.user_id is not None:
        if not current_user or current_user.id != record.user_id:
            raise HTTPException(403, "Không có quyền xóa bản ghi này.")
    # Xóa video khỏi local disk
    if record.storage_key:
        try:
            _local_delete(record.storage_key)
        except Exception:
            pass
    db.delete(record)
    db.commit()


@router.get("/analytics/summary", summary="Thống kê tổng hợp")
def analytics_summary(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    # Bắt buộc đăng nhập — guest không có lịch sử
    if not current_user:
        return {"total": 0, "avg_score": None, "grade_distribution": {}, "recent": []}
    q = db.query(AnalysisRecord).filter(AnalysisRecord.user_id == current_user.id)
    records = q.all()
    if not records:
        return {"total": 0, "avg_score": None, "grade_distribution": {}}
    scores = [r.overall_score for r in records if r.overall_score is not None]
    grades: dict[str, int] = {}
    for r in records:
        if r.grade:
            grades[r.grade] = grades.get(r.grade, 0) + 1
    return {
        "total": len(records),
        "avg_score": round(sum(scores) / len(scores), 2) if scores else None,
        "grade_distribution": grades,
        "recent": [AnalysisRecordOut.from_record(r) for r in records[:5]],
    }
