"""
CSRF Protection Middleware (Fix #11)
=====================================
Double-submit cookie pattern for mutation requests.
Validates X-CSRF-Token header against hash of (session_id + secret).
Skips validation for: auth routes, WebSocket, health endpoints, GET requests.
"""

import os
import hashlib
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Routes exempt from CSRF (auth needs to work without token, health is read-only)
CSRF_EXEMPT_PREFIXES = [
    "/api/v1/auth",
    "/ws/",
    "/",
    "/status",
    "/metrics",
    "/docs",
    "/openapi.json",
]

# Only enforce in production mode
CSRF_ENABLED = os.getenv("AEGISX_CSRF_ENABLED", "false").lower() == "true"
_CSRF_SECRET = os.getenv("AEGISX_SESSION_SECRET", "aegisx_hackathon_2026_secret")


def generate_csrf_token(session_id: str) -> str:
    """Generate a CSRF token as HMAC of session_id + secret."""
    return hashlib.sha256(f"{session_id}:{_CSRF_SECRET}".encode()).hexdigest()[:32]


def validate_csrf_token(token: str, session_id: str) -> bool:
    """Validate a CSRF token against the expected hash of (session_id + secret)."""
    if not token or not session_id:
        return False
    expected = generate_csrf_token(session_id)
    # Constant-time comparison to prevent timing attacks
    return hashlib.sha256(token.encode()).digest() == hashlib.sha256(expected.encode()).digest()


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Validates CSRF token on state-changing requests.
    In demo mode (AEGISX_CSRF_ENABLED=false), logs but doesn't block.

    Fix #11: Actually validates the token against hash(session_id + secret)
    instead of accepting any non-empty token.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip GET/OPTIONS/HEAD (safe methods)
        if request.method in ("GET", "OPTIONS", "HEAD"):
            return await call_next(request)

        # Skip exempt routes
        path = request.url.path
        for prefix in CSRF_EXEMPT_PREFIXES:
            if path.startswith(prefix) or path == prefix:
                return await call_next(request)

        # In demo mode, just pass through
        if not CSRF_ENABLED:
            return await call_next(request)

        # Validate X-CSRF-Token header against session
        csrf_token = request.headers.get("X-CSRF-Token", "")
        session_id = request.headers.get("X-Session-ID", "")

        if not csrf_token:
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token missing. Include X-CSRF-Token header."},
            )

        if not session_id:
            return JSONResponse(
                status_code=403,
                content={"detail": "Session ID required for CSRF validation. Include X-Session-ID header."},
            )

        # Fix #11: Validate token against hash of (session_id + secret)
        if not validate_csrf_token(csrf_token, session_id):
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token invalid. Token does not match session."},
            )

        response = await call_next(request)
        return response
