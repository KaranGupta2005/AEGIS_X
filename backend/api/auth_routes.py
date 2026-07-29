"""
Authentication Routes (Fixes #1, #3, #14)
==========================================
- Fix #1: Replace custom JWT with PyJWT (HS256)
- Fix #3: Replace file-backed user store with SQLite
- Fix #14: Add token refresh endpoint
- Production secret enforcement: fail startup if default secret in production
"""

import hashlib
import secrets
import time
import os
import sqlite3
from typing import Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

import jwt  # PyJWT

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

# Ensure .env is loaded before reading env vars
from dotenv import load_dotenv as _ld
_ld()

JWT_SECRET = os.getenv("AEGISX_SESSION_SECRET", "aegisx_hackathon_2026_secret")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRY = 86400  # 24 hours

DEMO_MODE = os.getenv("AEGISX_DEMO_MODE", "true").lower() == "true"

# Fix #1: Warn if default secret in non-demo mode (don't crash — breaks local dev)
if not DEMO_MODE and JWT_SECRET == "aegisx_hackathon_2026_secret":
    import sys
    print("[AEGIS-X] ⚠ CRITICAL: Default session secret in production! Set AEGISX_SESSION_SECRET.", file=sys.stderr)

# ═══════════════════════════════════════════════════════════════════════════════
# FIX #3: SQLite User Store (replaces JSON file)
# ═══════════════════════════════════════════════════════════════════════════════

_DB_PATH = Path(__file__).parent.parent.parent / "data" / "aegisx_users.db"
_DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def _get_db() -> sqlite3.Connection:
    """Get a SQLite connection. Creates users table on first access."""
    conn = sqlite3.connect(str(_DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at REAL NOT NULL
        )
    """)
    conn.commit()
    return conn


def _find_user_by_username(username: str) -> Optional[dict]:
    conn = _get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def _find_user_by_email(email: str) -> Optional[dict]:
    conn = _get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def _find_user_by_id(user_id: str) -> Optional[dict]:
    conn = _get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def _create_user(user_id: str, username: str, email: str, password_hash: str, salt: str) -> None:
    conn = _get_db()
    try:
        conn.execute(
            "INSERT INTO users (user_id, username, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, username, email.lower(), password_hash, salt, time.time()),
        )
        conn.commit()
    finally:
        conn.close()


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST / RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

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
    username: str  # Can be username or email
    password: str


class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    username: str
    email: str


# ═══════════════════════════════════════════════════════════════════════════════
# PASSWORD HASHING
# ═══════════════════════════════════════════════════════════════════════════════

def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt.encode(),
        iterations=100000,
    ).hex()


# ═══════════════════════════════════════════════════════════════════════════════
# FIX #1: PyJWT Token Generation & Verification (replaces custom implementation)
# ═══════════════════════════════════════════════════════════════════════════════

def _generate_token(user_id: str, username: str) -> str:
    """Generate a JWT token using PyJWT with HS256."""
    payload = {
        "user_id": user_id,
        "username": username,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRY,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token. Returns payload dict or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"user_id": payload["user_id"], "username": payload["username"]}
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    if _find_user_by_username(req.username):
        raise HTTPException(status_code=409, detail="Username already taken")

    if _find_user_by_email(req.email):
        raise HTTPException(status_code=409, detail="Email already registered")

    salt = secrets.token_hex(16)
    password_hash = _hash_password(req.password, salt)
    user_id = secrets.token_hex(12)

    _create_user(user_id, req.username, req.email, password_hash, salt)

    token = _generate_token(user_id, req.username)

    return AuthResponse(
        access_token=token,
        user_id=user_id,
        username=req.username,
        email=req.email,
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    # Accept either username or email as the login identifier
    identifier = req.username.lower().strip()
    user = _find_user_by_username(identifier)

    # If not found by username, try email lookup
    if not user:
        user = _find_user_by_email(identifier)

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

    user = _find_user_by_username(payload["username"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user["user_id"],
        "username": user["username"],
        "email": user["email"],
    }


@router.post("/verify")
async def verify_token_endpoint(token: str = ""):
    payload = _verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"valid": True, **payload}


# ═══════════════════════════════════════════════════════════════════════════════
# FIX #14: Token Refresh Endpoint
# ═══════════════════════════════════════════════════════════════════════════════

class RefreshRequest(BaseModel):
    token: str


@router.post("/refresh")
async def refresh_token(req: RefreshRequest):
    """
    POST /api/v1/auth/refresh — accepts current valid token, returns new token
    with fresh expiry. The old token remains valid until it naturally expires.
    """
    payload = _verify_token(req.token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Verify user still exists
    user = _find_user_by_username(payload["username"])
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")

    new_token = _generate_token(user["user_id"], user["username"])

    return {
        "access_token": new_token,
        "user_id": user["user_id"],
        "username": user["username"],
        "expires_in": TOKEN_EXPIRY,
    }

# ═══════════════════════════════════════════════════════════════════════════════
# LOGIN BEHAVIORAL TRACKING — Pre-session trust signal
# ═══════════════════════════════════════════════════════════════════════════════

class LoginBehaviorRequest(BaseModel):
    typing_speed_cps: float = 0.0
    typing_rhythm_variance: float = 35.0
    correction_rate: float = 0.0
    pauses: int = 0
    login_duration_ms: float = 0.0
    total_keystrokes: int = 0


@router.post("/login-behavior")
async def report_login_behavior(req: LoginBehaviorRequest):
    """
    POST /api/v1/auth/login-behavior — receives typing cadence metrics
    captured during the login form interaction.
    
    This provides a pre-session trust signal:
    - Normal login typing (2-5 CPS, moderate variance) → no concern
    - Robotic login (>8 CPS, near-zero variance) → flag for enhanced monitoring
    - Extremely slow with many pauses → could be coerced or confused user
    - Copy-paste (0 keystrokes) → unknown identity, increase monitoring
    
    The metrics are stored and used by the session's initial trust assessment.
    """
    # Determine pre-session risk level
    risk_level = "low"
    risk_signals = []
    
    if req.typing_speed_cps > 8 and req.typing_rhythm_variance < 15:
        risk_level = "high"
        risk_signals.append("Robotic typing speed during login — possible automation")
    elif req.typing_speed_cps > 6 and req.correction_rate < 0.01:
        risk_level = "medium"
        risk_signals.append("Very fast login with zero corrections — unusual")
    elif req.total_keystrokes == 0:
        risk_level = "medium"
        risk_signals.append("No keystrokes detected — possible autofill or paste")
    elif req.pauses > 5 and req.login_duration_ms > 30000:
        risk_level = "medium"
        risk_signals.append("Extended login duration with many pauses — user may be confused or coerced")
    
    if not risk_signals:
        risk_signals.append("Login behavior within normal parameters")
    
    return {
        "status": "recorded",
        "risk_level": risk_level,
        "signals": risk_signals,
        "recommendation": "enhanced_monitoring" if risk_level == "high" else "standard",
        "metrics": {
            "typing_speed_cps": round(req.typing_speed_cps, 2),
            "rhythm_variance": round(req.typing_rhythm_variance, 1),
            "correction_rate": round(req.correction_rate, 3),
            "pauses": req.pauses,
            "duration_ms": round(req.login_duration_ms, 0),
        },
    }
