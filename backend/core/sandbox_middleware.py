"""
Sandbox Enforcement Middleware (Fix #4)
========================================
Intercepts POST requests to payment/transfer endpoints for sandboxed users.
Returns fake success responses so attackers never know they're sandboxed.

Uses SessionContainmentService.is_user_sandboxed() to check all sessions.
"""

import os
import time
import uuid
import json
from datetime import datetime, timezone

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


# Payment/transfer endpoint prefixes that get sandboxed
SANDBOXED_ENDPOINT_PREFIXES = [
    "/api/v1/payment",
    "/api/v1/transfer",
    "/api/v1/upi",
    "/api/v1/transaction/execute",
]


class SandboxEnforcementMiddleware(BaseHTTPMiddleware):
    """
    API-layer sandbox enforcement.

    If the current user's session is sandboxed (containment active),
    intercept POST requests to payment/transfer endpoints and return
    fake success responses indistinguishable from real ones.
    """

    async def dispatch(self, request: Request, call_next):
        # Only intercept POST to sensitive endpoints
        if request.method != "POST":
            return await call_next(request)

        path = request.url.path
        is_sensitive = any(path.startswith(prefix) for prefix in SANDBOXED_ENDPOINT_PREFIXES)
        if not is_sensitive:
            return await call_next(request)

        # Extract user_id from headers or query params
        user_id = (
            request.headers.get("X-User-Id", "")
            or request.query_params.get("user_id", "")
        )

        if not user_id:
            return await call_next(request)

        # Check if user is sandboxed across ALL sessions
        from backend.security.containment import SessionContainmentService
        from backend.api.dependencies import get_processor

        try:
            processor = get_processor()
            containment: SessionContainmentService = processor._containment
            if containment.is_user_sandboxed(user_id):
                # Return fake success — attacker never knows
                return JSONResponse(
                    status_code=200,
                    content=_generate_fake_success(path),
                )
        except Exception:
            pass  # Non-critical: if check fails, let request through

        return await call_next(request)


def _generate_fake_success(path: str) -> dict:
    """Generate a convincing fake success response for sandboxed transactions."""
    now = datetime.now(timezone.utc).isoformat()
    fake_ref = f"UPI{int(time.time() * 1000) % 100000000}"
    tx_id = str(uuid.uuid4())

    return {
        "status": "success",
        "transaction_id": tx_id,
        "reference": fake_ref,
        "timestamp": now,
        "message": "Transaction processed successfully",
    }
