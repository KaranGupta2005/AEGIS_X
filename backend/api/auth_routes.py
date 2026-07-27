import hashlib
import secrets
import time
import os
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, field_validator

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

JWT_SECRET = os.getenv("AEGISX_SESSION_SECRET", "aegisx_hackathon_2026_secret")
TOKEN_EXPIRY = 86400

# File-backed persistent user store (survives restarts)
import json
from pathlib import Path

_USERS_FILE = Path(__file__).parent.parent.parent / "data" / "users.json"
_USERS_FILE.parent.mkdir(parents=True, exist_ok=True)


def _load_users() -> dict:
    if _USERS_FILE.exists():
        try:
            return json.loads(_USERS_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            pass
    return {}


def _save_users(users: dict):
    _USERS_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")


_users_db: dict = _load_users()


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if len(v) < 3 or len(v) > 32:
            raise ValueError("Username must be 3-32 characters")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores and dashes allowed)")
        return v.lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    username: str
    email: str


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt.encode(),
        iterations=100000,
    ).hex()


def _generate_token(user_id: str, username: str) -> str:
    timestamp = str(int(time.time()))
    payload = f"{user_id}.{username}.{timestamp}"
    signature = hashlib.sha256(f"{payload}.{JWT_SECRET}".encode()).hexdigest()[:32]
    return f"{payload}.{signature}"


def _verify_token(token: str) -> Optional[dict]:
    try:
        parts = token.rsplit(".", 1)
        if len(parts) != 2:
            return None
        payload, signature = parts
        expected = hashlib.sha256(f"{payload}.{JWT_SECRET}".encode()).hexdigest()[:32]
        if signature != expected:
            return None
        segments = payload.split(".")
        if len(segments) != 3:
            return None
        user_id, username, timestamp = segments
        if time.time() - int(timestamp) > TOKEN_EXPIRY:
            return None
        return {"user_id": user_id, "username": username}
    except Exception:
        return None


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    if req.username in _users_db:
        raise HTTPException(status_code=409, detail="Username already taken")

    for user in _users_db.values():
        if user["email"] == req.email:
            raise HTTPException(status_code=409, detail="Email already registered")

    salt = secrets.token_hex(16)
    password_hash = _hash_password(req.password, salt)
    user_id = secrets.token_hex(12)

    _users_db[req.username] = {
        "user_id": user_id,
        "username": req.username,
        "email": req.email,
        "password_hash": password_hash,
        "salt": salt,
        "created_at": time.time(),
    }
    _save_users(_users_db)

    token = _generate_token(user_id, req.username)

    return AuthResponse(
        access_token=token,
        user_id=user_id,
        username=req.username,
        email=req.email,
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    user = _users_db.get(req.username.lower())
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    password_hash = _hash_password(req.password, user["salt"])
    if password_hash != user["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = _generate_token(user["user_id"], user["username"])

    return AuthResponse(
        access_token=token,
        user_id=user["user_id"],
        username=user["username"],
        email=user["email"],
    )


@router.get("/me")
async def get_current_user(token: str = ""):
    if not token:
        raise HTTPException(status_code=401, detail="Token required")

    payload = _verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = _users_db.get(payload["username"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user["user_id"],
        "username": user["username"],
        "email": user["email"],
    }


@router.post("/verify")
async def verify_token(token: str = ""):
    payload = _verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"valid": True, **payload}
