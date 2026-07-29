from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional
import json
import asyncio
import time
import os
import httpx

from backend.websocket.socket_manager import ConnectionManager
from backend.api.dependencies import get_processor, set_processor
from backend.core.rate_limiter import RateLimitMiddleware
from backend.core.config import CORS_ALLOWED_ORIGINS, WS_RATE_LIMIT_PER_USER, WS_RATE_LIMIT_BURST


connection_manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════
# WebSocket Rate Limiter — per-user token bucket to prevent event flooding
# ═══════════════════════════════════════════════════════════════════════════════

class WebSocketRateLimiter:
    """
    Per-user token bucket rate limiter for WebSocket events.
    Prevents attackers from flooding the pipeline with thousands of events/second
    (each costing ~55ms MiniLM inference).
    """

    def __init__(self, rate: float = WS_RATE_LIMIT_PER_USER, burst: int = WS_RATE_LIMIT_BURST):
        self._rate = rate          # tokens refilled per second
        self._burst = burst        # max tokens (burst capacity)
        self._tokens: dict = {}    # user_id → current tokens
        self._last_refill: dict = {}  # user_id → last refill timestamp

    def allow(self, user_id: str) -> bool:
        """Check if user is allowed to send an event. Returns False if rate-limited."""
        now = time.time()

        if user_id not in self._tokens:
            self._tokens[user_id] = float(self._burst)
            self._last_refill[user_id] = now

        # Refill tokens based on elapsed time
        elapsed = now - self._last_refill[user_id]
        self._last_refill[user_id] = now
        self._tokens[user_id] = min(
            float(self._burst),
            self._tokens[user_id] + elapsed * self._rate,
        )

        # Consume one token
        if self._tokens[user_id] >= 1.0:
            self._tokens[user_id] -= 1.0
            return True
        return False

    def cleanup(self, user_id: str):
        """Remove user state when they disconnect."""
        self._tokens.pop(user_id, None)
        self._last_refill.pop(user_id, None)


ws_rate_limiter = WebSocketRateLimiter()


# Self-ping to prevent Render free tier sleep
async def keep_alive():
    """Ping self every 10 minutes to prevent Render spin-down. Only runs in production."""
    import os
    url = os.getenv("RENDER_EXTERNAL_URL", "")
    if not url:
        return  # Skip in local development
    async with httpx.AsyncClient() as client:
        while True:
            try:
                await client.get(f"{url}/")
            except Exception:
                pass
            await asyncio.sleep(600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[AEGIS-X] Initializing trust engine...")
    from backend.services.event_processor import EventProcessor
    processor = EventProcessor()
    set_processor(processor)
    print("[AEGIS-X] Trust engine ready.")

    # Log provider status at startup
    from backend.api.verification_routes import get_engine
    try:
        engine = get_engine()
        status = engine.get_providers_status()
        print("[AEGIS-X] ═══ Provider Status ═══")
        for name, provider in status.items():
            symbol = "✓" if provider else "✗"
            print(f"[AEGIS-X]   {symbol} {name}: {provider or 'MOCK (fallback)'}")
        print("[AEGIS-X] ══════════════════════")
    except Exception:
        print("[AEGIS-X] Provider status check skipped.")

    # Start keep-alive background task
    task = asyncio.create_task(keep_alive())
    yield
    task.cancel()
    print("[AEGIS-X] Shutting down.")


app = FastAPI(
    title="AEGIS-X",
    version="2.0",
    description="Continuous Mathematical Trust Infrastructure & Behavioral Identity Verification for Next-Gen Banking",
    lifespan=lifespan,
)

# FIX #12: Restrict CORS to known origins instead of wildcard "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key", "X-Session-ID", "X-User-Id", "X-CSRF-Token"],
    expose_headers=["X-RateLimit-Remaining"],
)

app.add_middleware(RateLimitMiddleware, requests_per_second=50, burst=100)

# Fix #4: Sandbox enforcement middleware
from backend.core.sandbox_middleware import SandboxEnforcementMiddleware
app.add_middleware(SandboxEnforcementMiddleware)

# Fix #7: HTTPS redirect middleware (only active in production)
from backend.core.https_redirect import HTTPSRedirectMiddleware
app.add_middleware(HTTPSRedirectMiddleware)

from backend.api.session_routes import router as session_router
from backend.api.event_routes import router as event_router
from backend.api.monitor_routes import router as monitor_router
from backend.api.audit_routes import router as audit_router
from backend.api.auth_routes import router as auth_router
from backend.api.verification_routes import router as verification_router
from backend.api.security_routes import router as security_router
from backend.api.trust_routes import router as trust_router

app.include_router(auth_router)
app.include_router(session_router)
app.include_router(event_router)
app.include_router(monitor_router)
app.include_router(audit_router)
app.include_router(verification_router)
app.include_router(security_router)
app.include_router(trust_router)


@app.get("/", tags=["Health"])
def health():
    return {"status": "running", "project": "AEGIS-X", "version": "2.0"}


@app.get("/health", tags=["Health"])
def health_detailed():
    """Detailed health check verifying all subsystems are operational."""
    processor = get_processor()
    checks = {
        "pipeline": processor._pipeline is not None,
        "cognitive_model": processor._pipeline._cognitive_service._model is not None,
        "embedding_service": processor._pipeline._embedding_service is not None,
        "event_processor": True,
    }
    # Check verification providers
    try:
        from backend.api.verification_routes import get_engine
        engine = get_engine()
        providers = engine.get_providers_status()
        checks["voice_provider"] = providers.get("voice_verifier") is not None
        checks["face_provider"] = providers.get("face_verifier") is not None
        checks["liveness_provider"] = providers.get("liveness") is not None
    except Exception:
        checks["providers"] = False

    all_healthy = all(checks.values())
    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks,
        "project": "AEGIS-X",
        "version": "2.0",
    }


@app.get("/status", tags=["Health"])
def system_status():
    processor = get_processor()
    from backend.services.cache_service import CacheService
    cache = CacheService()
    return {
        "active_users": processor.active_user_count,
        "connections": connection_manager.get_connection_info(),
        "cache": cache.health(),
    }


@app.get("/metrics", tags=["Health"])
def system_metrics():
    from backend.core.metrics import metrics
    return metrics.snapshot()


@app.websocket("/ws/{user_id}")
async def websocket_sdk(websocket: WebSocket, user_id: str, session_id: Optional[str] = Query(default=None), token: Optional[str] = Query(default=None)):
    # Fix #2: WebSocket auth enabled by default ("true"), bypass in demo mode
    demo_mode = os.getenv("AEGISX_DEMO_MODE", "false").lower() == "true"
    ws_auth_enabled = os.getenv("AEGISX_WS_AUTH", "true").lower() == "true"

    if ws_auth_enabled and not demo_mode:
        # Require valid token for WebSocket connections in production
        if not token:
            await websocket.close(code=4001, reason="Token required")
            return
        from backend.api.auth_routes import _verify_token
        payload = _verify_token(token)
        if not payload:
            await websocket.close(code=4001, reason="Invalid token")
            return
    elif token:
        # If token provided (even in demo mode), validate it
        from backend.api.auth_routes import _verify_token
        payload = _verify_token(token)
        if not payload:
            await websocket.close(code=4001, reason="Invalid token")
            return

    await connection_manager.connect_sdk(websocket, user_id)
    processor = get_processor()
    session_info = processor.start_session(user_id, session_id or f"ws_{user_id}")
    await websocket.send_json({"type": "session_started", **session_info})

    try:
        while True:
            raw_message = await websocket.receive_text()

            # Fix #8: WebSocket message size limit (16KB max)
            if len(raw_message) > 16384:
                await websocket.send_json({
                    "type": "error",
                    "message": "Message too large. Maximum size is 16KB.",
                    "user_id": user_id,
                })
                continue

            message = json.loads(raw_message)
            msg_type = message.get("type", "behavioral_event")

            if msg_type == "behavioral_event":
                # FIX #11: Rate limit WebSocket events per user
                if not ws_rate_limiter.allow(user_id):
                    await websocket.send_json({
                        "type": "rate_limited",
                        "message": "Event rate exceeded. Max 5 events/second.",
                        "user_id": user_id,
                    })
                    continue

                raw_event = message.get("event", message)
                tx_amount = message.get("transaction_amount", 0.0)
                is_new_ben = message.get("is_new_beneficiary", False)
                # Extract enriched SDK context if the continuous monitoring SDK sent it
                sdk_context = message.get("sdk_context", None)

                try:
                    result = processor.process_behavioral_event(
                        user_id=user_id,
                        raw_event=raw_event,
                        transaction_amount=tx_amount,
                        is_new_beneficiary=is_new_ben,
                        sdk_context=sdk_context,
                    )
                    await websocket.send_json(result)
                    await connection_manager.broadcast_to_dashboards({"user_id": user_id, **result})

                    if result.get("decision") == "BLOCK":
                        await connection_manager.broadcast_alert({
                            "alert_type": "session_blocked",
                            "user_id": user_id,
                            "trust_score": result.get("trust_score"),
                            "cognitive_state": result.get("cognitive_state"),
                            "current_screen": result.get("session_context", {}).get("current_screen", "unknown"),
                            "sdk_state": result.get("session_context", {}).get("sdk_state", "OBSERVING"),
                        })
                except Exception as proc_err:
                    print(f"[AEGIS-X] Processing error for {user_id}: {proc_err}")
                    await websocket.send_json({
                        "type": "error",
                        "message": str(proc_err),
                        "user_id": user_id,
                    })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[AEGIS-X] WebSocket error for {user_id}: {e}")
    finally:
        ws_rate_limiter.cleanup(user_id)
        connection_manager.disconnect_sdk(user_id)
        processor.end_session(user_id)


@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await connection_manager.connect_dashboard(websocket)
    try:
        while True:
            raw_message = await websocket.receive_text()

            # Fix #8: WebSocket message size limit (16KB max)
            if len(raw_message) > 16384:
                await websocket.send_json({
                    "type": "error",
                    "message": "Message too large. Maximum size is 16KB.",
                })
                continue

            message = json.loads(raw_message)
            msg_type = message.get("type", "")
            processor = get_processor()

            if msg_type == "get_sessions":
                await websocket.send_json({
                    "type": "session_list",
                    "users": processor.get_active_users(),
                })
            elif msg_type == "get_session_summary":
                uid = message.get("user_id", "")
                summary = processor.get_session_summary(uid)
                await websocket.send_json({"type": "session_summary", **summary})
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect_dashboard(websocket)
