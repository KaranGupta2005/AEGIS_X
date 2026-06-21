import hashlib
import hmac
import time
import os
from typing import Optional, Tuple
from fastapi import Request, HTTPException
from fastapi.security import APIKeyHeader

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

VALID_API_KEYS = {
    hashlib.sha256(b"aegisx_demo_key_2026").hexdigest(): {
        "client_id": "demo",
        "tier": "standard",
        "rate_limit": 100,
    },
    hashlib.sha256(b"aegisx_cbi_production").hexdigest(): {
        "client_id": "cbi_production",
        "tier": "enterprise",
        "rate_limit": 1000,
    },
}

DEMO_MODE = os.getenv("AEGISX_DEMO_MODE", "true").lower() == "true"


def verify_api_key(api_key: Optional[str]) -> Tuple[bool, dict]:
    if DEMO_MODE:
        return True, {"client_id": "demo", "tier": "standard", "rate_limit": 100}

    if not api_key:
        return False, {}

    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    client_info = VALID_API_KEYS.get(key_hash)
    if client_info:
        return True, client_info
    return False, {}


async def require_api_key(request: Request) -> dict:
    if DEMO_MODE:
        return {"client_id": "demo", "tier": "standard"}

    api_key = request.headers.get("X-API-Key")
    valid, client_info = verify_api_key(api_key)
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return client_info


def generate_session_token(user_id: str, session_id: str) -> str:
    secret = os.getenv("AEGISX_SESSION_SECRET", "aegisx_default_secret_change_in_prod")
    timestamp = str(int(time.time()))
    payload = f"{user_id}:{session_id}:{timestamp}"
    signature = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{payload}:{signature}"


def validate_session_token(token: str) -> Tuple[bool, str, str]:
    try:
        parts = token.rsplit(":", 3)
        if len(parts) != 4:
            return False, "", ""
        user_id, session_id, timestamp, signature = parts
        secret = os.getenv("AEGISX_SESSION_SECRET", "aegisx_default_secret_change_in_prod")
        payload = f"{user_id}:{session_id}:{timestamp}"
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
        if not hmac.compare_digest(signature, expected):
            return False, "", ""
        issued_at = int(timestamp)
        if time.time() - issued_at > 86400:
            return False, "", ""
        return True, user_id, session_id
    except Exception:
        return False, "", ""
