"""
routers/auth_router.py — Registration, login, refresh, profile endpoints.
"""
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# Khai báo các schema request/response

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_length(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username phải có ít nhất 3 ký tự")
        if len(v) > 50:
            raise ValueError("Username tối đa 50 ký tự")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password phải có ít nhất 6 ký tự")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserProfile"


class UserProfile(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}


TokenResponse.model_rebuild()


# Định nghĩa các endpoint API

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Tạo tài khoản mới và trả về token ngay."""
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email đã được sử dụng.")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username đã tồn tại.")

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(user.id, user.email),
        refresh_token=create_refresh_token(user.id),
        user=UserProfile.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Đăng nhập bằng email + password."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa.")

    return TokenResponse(
        access_token=create_access_token(user.id, user.email),
        refresh_token=create_refresh_token(user.id),
        user=UserProfile.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    """Lấy access token mới từ refresh token."""
    data = decode_token(body.refresh_token)
    if data.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Token không phải refresh token.")
    user = db.get(User, int(data["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại.")

    return TokenResponse(
        access_token=create_access_token(user.id, user.email),
        refresh_token=create_refresh_token(user.id),
        user=UserProfile.model_validate(user),
    )


@router.get("/me", response_model=UserProfile)
def me(current_user: User = Depends(get_current_user)):
    """Trả về thông tin người dùng hiện tại."""
    return UserProfile.model_validate(current_user)
