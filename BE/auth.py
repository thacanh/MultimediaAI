"""
auth.py — Thư viện hỗ trợ xác thực JWT cho CreativeIQ.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import User

# Cấu hình JWT

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "creativeiq-super-secret-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_DAYS", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)  # auto_error=False → guest allowed


# Các hàm băm và xác thực mật khẩu

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# Các hàm tạo và giải mã token

def create_access_token(user_id: int, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "email": email, "exp": expire, "type": "access"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire, "type": "refresh"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token không hợp lệ hoặc đã hết hạn: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Các dependency của FastAPI

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Yêu cầu token Bearer hợp lệ. Trả về đối tượng User hoặc báo lỗi 401."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cần đăng nhập để thực hiện thao tác này.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    data = decode_token(credentials.credentials)
    user = db.get(User, int(data["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tài khoản không tồn tại.")
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Lấy thông tin người dùng hiện tại nếu có; trả về None nếu không có token (chế độ khách)."""
    if credentials is None:
        return None
    try:
        data = decode_token(credentials.credentials)
        return db.get(User, int(data["sub"]))
    except HTTPException:
        return None
