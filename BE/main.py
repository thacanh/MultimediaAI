"""
main.py — FastAPI entry point cho CreativeIQ AI backend.

Endpoints:
  Auth:
    POST /auth/register   → Đăng ký tài khoản
    POST /auth/login      → Đăng nhập
    POST /auth/refresh    → Làm mới token
    GET  /auth/me         → Thông tin user hiện tại

  Analysis (hoạt động cả khi guest):
    POST /extract         → Upload video → trích xuất 12 đặc trưng (no LLM)
    POST /extract/stream  → Upload video → SSE streaming progress
    POST /review          → AnalysisPayload JSON → VnptBotReview
    POST /analyse         → Upload video → extract + review + lưu DB

  History:
    GET  /analyses              → Lịch sử phân tích
    GET  /analyses/{id}         → Chi tiết bản ghi
    DELETE /analyses/{id}       → Xóa bản ghi

  Analytics:
    GET  /analytics/summary     → Thống kê tổng hợp

  System:
    GET  /health          → Health check
"""
from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import init_db
from routers.auth_router import router as auth_router
from routers.analysis_router import router as analysis_router

# Khởi động

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("vnpthack")

# Khởi tạo ứng dụng FastAPI

app = FastAPI(
    title="VNPT Multimedia AI — Video Analysis API",
    version="3.0.0",
    description=(
        "## VNPT Multimedia AI Backend\n\n"
        "Phân tích chất lượng sáng tạo video bằng AI.\n\n"
        "**Hỗ trợ cả Guest (không cần đăng nhập) và Authenticated users.**\n\n"
        "### Luồng phân tích:\n"
        "1. `POST /extract/stream` — Upload video, nhận SSE progress real-time\n"
        "2. `POST /review` — Gửi payload lên VNPT SmartBot, nhận creative review\n"
        "3. Kết quả được lưu tự động vào SQLite database\n"
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo cơ sở dữ liệu khi khởi động

@app.on_event("startup")
def on_startup():
    logger.info("Initializing database…")
    init_db()
    logger.info("Database ready.")

    # Khởi tạo MinIO bucket
    try:
        from storage import ensure_bucket
        ensure_bucket()
        logger.info("MinIO storage ready.")
    except Exception as e:
        logger.warning(f"MinIO not available (non-fatal for local dev): {e}")



# Đăng ký các router

app.include_router(auth_router)
app.include_router(analysis_router)

# Endpoint kiểm tra sức khỏe hệ thống

@app.get("/health", tags=["system"])
def health():
    return {
        "status": "ok",
        "service": "VNPT Multimedia AI Backend",
        "version": "3.0.0",
        "features": ["auth", "analysis", "history", "analytics"],
    }
