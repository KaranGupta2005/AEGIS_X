"""
HTTPS Redirect Middleware (Fix #7)
====================================
Redirects HTTP to HTTPS in production environments.

Only active when RENDER_EXTERNAL_URL is set (indicating production on Render).
Uses X-Forwarded-Proto header to detect whether the original request was HTTP.
"""

import os
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse


# Only enforce HTTPS when running on Render (production)
HTTPS_ENABLED = bool(os.getenv("RENDER_EXTERNAL_URL", ""))


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """
    Redirect HTTP requests to HTTPS via X-Forwarded-Proto header check.
    Only active in production (RENDER_EXTERNAL_URL set).
    """

    async def dispatch(self, request: Request, call_next):
        if not HTTPS_ENABLED:
            return await call_next(request)

        # Check X-Forwarded-Proto (set by reverse proxies like Render/Heroku)
        forwarded_proto = request.headers.get("x-forwarded-proto", "https")

        if forwarded_proto == "http":
            # Build HTTPS URL
            url = request.url.replace(scheme="https")
            return RedirectResponse(url=str(url), status_code=301)

        return await call_next(request)
