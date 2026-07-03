"""
models.py — Các SQLAlchemy ORM model cho CreativeIQ.
Tương thích với MySQL 8.x và SQLite.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    Text, ForeignKey, Boolean, BigInteger
)
from sqlalchemy.orm import relationship

from database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    analyses = relationship("AnalysisRecord", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"


class AnalysisRecord(Base):
    __tablename__ = "analysis_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Siêu dữ liệu của file (Metadata)
    filename = Column(String(500), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=True)          # Kích thước file gốc
    storage_key = Column(String(1000), nullable=True)            # Object key trên MinIO
    content_type = Column(String(100), nullable=True, default="video/mp4")
    duration_sec = Column(Float, nullable=False)

    # Các trường đánh giá từ AI
    headline = Column(String(500), nullable=True)
    overall_score = Column(Float, nullable=True)
    grade = Column(String(5), nullable=True)
    insight = Column(Text, nullable=True)

    # Các khối dữ liệu JSON đầy đủ (được lưu dưới dạng TEXT để tương thích với MySQL)
    payload_json = Column(Text(length=16777215), nullable=True)  # MEDIUMTEXT
    review_json = Column(Text, nullable=True)

    # Điểm đặc trưng toàn cục (cho truy vấn nhanh và phân tích)
    visual_dynamics = Column(Float, nullable=True)
    motion_level = Column(Float, nullable=True)
    scene_variation = Column(Float, nullable=True)
    cut_frequency = Column(Float, nullable=True)
    text_density = Column(Float, nullable=True)
    readability = Column(Float, nullable=True)
    clutter_level = Column(Float, nullable=True)
    visual_focus = Column(Float, nullable=True)
    audio_energy = Column(Float, nullable=True)
    pitch_variation = Column(Float, nullable=True)
    speech_rate = Column(Float, nullable=True)
    sync_alignment = Column(Float, nullable=True)

    # Các điểm số tổng hợp
    visual_engagement_score = Column(Float, nullable=True)
    cognitive_load_score = Column(Float, nullable=True)
    audio_engagement_score = Column(Float, nullable=True)
    retention_risk_score = Column(Float, nullable=True)

    created_at = Column(DateTime, default=_utcnow, index=True)

    user = relationship("User", back_populates="analyses")

    # Các hàm hỗ trợ JSON

    def set_payload(self, payload_dict: dict) -> None:
        self.payload_json = json.dumps(payload_dict, ensure_ascii=False)

    def get_payload(self) -> dict | None:
        return json.loads(self.payload_json) if self.payload_json else None

    def set_review(self, review_dict: dict) -> None:
        self.review_json = json.dumps(review_dict, ensure_ascii=False)

    def get_review(self) -> dict | None:
        return json.loads(self.review_json) if self.review_json else None

    def __repr__(self) -> str:
        return f"<AnalysisRecord id={self.id} filename={self.filename} user_id={self.user_id}>"
