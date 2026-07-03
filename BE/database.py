"""
database.py — Thiết lập SQLAlchemy + MySQL (docker) cho CreativeIQ.
Tự động chuyển về SQLite khi chạy phát triển cục bộ không có Docker.
"""
from __future__ import annotations

import os
import time
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from typing import Generator

logger = logging.getLogger("vnpthack.db")

# Đường dẫn cơ sở dữ liệu (Database URL)
# Docker sets: mysql+pymysql://vnpthack_user:vnptpass@db:3306/vnpthack
# Local dev fallback: sqlite:///./vnpthack.db
DB_URL = os.getenv("DATABASE_URL", "sqlite:///./vnpthack.db")

# Khởi tạo Engine và Session

def _build_engine():
    kwargs: dict = {}
    if DB_URL.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        # MySQL: các thông số cấu hình pool tối ưu cho FastAPI
        kwargs.update(
            pool_pre_ping=True,
            pool_recycle=3600,
            pool_size=10,
            max_overflow=20,
        )
    return create_engine(DB_URL, echo=False, **kwargs)


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def wait_for_db(retries: int = 15, delay: float = 3.0) -> None:
    """Chờ đến khi kết nối được tới DB (hữu ích khi khởi chạy trong Docker)."""
    if DB_URL.startswith("sqlite"):
        return  # SQLite luôn khả dụng
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection established.")
            return
        except Exception as exc:
            logger.warning(f"DB not ready (attempt {attempt}/{retries}): {exc}")
            time.sleep(delay)
    raise RuntimeError(f"Cannot connect to database after {retries} attempts: {DB_URL}")


def init_db() -> None:
    """Tạo tất cả các bảng nếu chưa tồn tại (idempotent)."""
    from models import User, AnalysisRecord  # noqa: F401
    wait_for_db()
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified.")
