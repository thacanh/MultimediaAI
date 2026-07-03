from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional


class FeatureScores(BaseModel):
    # Nhịp điệu và Động lực học hình ảnh
    visual_dynamics: Optional[float] = Field(None, ge=0, le=10)
    motion_level:    Optional[float] = Field(None, ge=0, le=10)
    scene_variation: Optional[float] = Field(None, ge=0, le=10)
    cut_frequency:   Optional[float] = Field(None, ge=0, le=10)

    # Mật độ thông tin
    text_density:  Optional[float] = Field(None, ge=0, le=10)
    readability:   Optional[float] = Field(None, ge=0, le=10)
    clutter_level: Optional[float] = Field(None, ge=0, le=10)
    visual_focus:  Optional[float] = Field(None, ge=0, le=10)

    # Âm thanh
    audio_energy:    Optional[float] = Field(None, ge=0, le=10)
    pitch_variation: Optional[float] = Field(None, ge=0, le=10)
    speech_rate:     Optional[float] = Field(None, ge=0, le=10)

    # Đồng bộ
    sync_alignment: Optional[float] = Field(None, ge=0, le=10)


class DerivedScores(BaseModel):
    visual_engagement_score: float = Field(..., ge=0, le=10)
    cognitive_load_score: float = Field(..., ge=0, le=10)
    audio_engagement_score: float = Field(..., ge=0, le=10)
    retention_risk_score: float = Field(..., ge=0, le=10)
    overall_quality_score: float = Field(..., ge=0, le=10,
        description="Điểm chất lượng cân bằng: tương tác visual cao + tải nhận thức thấp + tương tác audio cao + nguy cơ rời bỏ thấp")


class SegmentResult(BaseModel):
    segment_index: int
    start_sec: float
    end_sec: float
    features: FeatureScores
    derived: DerivedScores
    person_count: Optional[int] = 0
    face_count: Optional[int] = 0
    vehicle_count: Optional[int] = 0
    license_plates: Optional[list[str]] = []


class AnalysisPayload(BaseModel):
    """Payload trích xuất đầy đủ gửi đến mô hình AI để đánh giá."""
    filename: str
    duration_sec: float
    segments: list[SegmentResult]
    global_features: FeatureScores
    global_derived: DerivedScores
    summary: Optional[str] = ""
    person_count: Optional[int] = 0
    face_count: Optional[int] = 0
    vehicle_count: Optional[int] = 0
    license_plates: Optional[list[str]] = []



class IssueItem(BaseModel):
    feature: str
    severity: str          # "High" | "Medium" | "Low"
    description: str
    recommendation: str


class SegmentReviewItem(BaseModel):
    segment_index: int
    impact: str
    feedback: str
    suggested_fix: str


class VnptBotReview(BaseModel):
    headline: str
    overall_score: float
    grade: str
    insight: str
    key_issues: list[IssueItem]
    segment_highlights: list[str]
    suggested_fixes: list[str]
    segment_reviews: Optional[list[SegmentReviewItem]] = []


class AnalysisResponse(BaseModel):
    payload: AnalysisPayload
    review: VnptBotReview
