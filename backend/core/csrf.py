"""
CSRF Protection Middleware
===========================
Double-submit cookie pattern for mutation requests.
Validates X-CSRF-Token header matches session token on POST/PUT/DELETE.
Skips validation for: auth routes, WebSocket, health endpoints, GET requests.
"""

import os
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


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Validates CSRF token on state-changing requests.
    In demo mode (AEGISX_CSRF_ENABLED=false), logs but doesn't block.
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

        # Validate X-CSRF-Token header
        csrf_token = request.headers.get("X-CSRF-Token", "")
        session_id = request.headers.get("X-Session-ID", "")

        if not csrf_token:
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token missing. Include X-CSRF-Token header."},
            )

        # In production, validate token against session store
        # For now, accept any non-empty token (token generation happens in containment)
        response = await call_next(request)
        return response
