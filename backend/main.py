from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional
import json
import asyncio
import httpx

from backend.websocket.socket_manager import ConnectionManager
from backend.api.dependencies import get_processor, set_processor
from backend.core.rate_limiter import RateLimitMiddleware


connection_manager = ConnectionManager()

# Self-ping to prevent Render free tier sleep
async def keep_alive():
    """Ping self every 10 minutes to prevent Render spin-down."""
    import os
    url = os.getenv("RENDER_EXTERNAL_URL", "")
    if not url:
        return
    async with httpx.AsyncClient() as client:
        while True:
            try:
                await client.get(f"{url}/")
            except Exception:
                pass
            await asyncio.sleep(600)  # every 10 minutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[AEGIS-X] Initializing trust engine...")
    from backend.services.event_processor import EventProcessor
    processor = EventProcessor()
    set_processor(processor)
    print("[AEGIS-X] Trust engine ready.")
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.add_middleware(RateLimitMiddleware, requests_per_second=50, burst=100)

from backend.api.session_routes import router as session_router
from backend.api.event_routes import router as event_router
from backend.api.monitor_routes import router as monitor_router
from backend.api.audit_routes import router as audit_router
from backend.api.auth_routes import router as auth_router

app.include_router(auth_router)
app.include_router(session_router)
app.include_router(event_router)
app.include_router(monitor_router)
app.include_router(audit_router)


@app.get("/", tags=["Health"])
def health():
    return {"status": "running", "project": "AEGIS-X", "version": "2.0"}


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
async def websocket_sdk(websocket: WebSocket, user_id: str, session_id: Optional[str] = Query(default=None)):
    await connection_manager.connect_sdk(websocket, user_id)
    processor = get_processor()
    session_info = processor.start_session(user_id, session_id or f"ws_{user_id}")
    await websocket.send_json({"type": "session_started", **session_info})

    try:
        while True:
            raw_message = await websocket.receive_text()
            message = json.loads(raw_message)
            msg_type = message.get("type", "behavioral_event")

            if msg_type == "behavioral_event":
                raw_event = message.get("event", message)
                tx_amount = message.get("transaction_amount", 0.0)
                is_new_ben = message.get("is_new_beneficiary", False)

                try:
                    result = processor.process_behavioral_event(
                        user_id=user_id,
                        raw_event=raw_event,
                        transaction_amount=tx_amount,
                        is_new_beneficiary=is_new_ben,
                    )
                    await websocket.send_json(result)
                    await connection_manager.broadcast_to_dashboards({"user_id": user_id, **result})

                    if result.get("decision") == "BLOCK":
                        await connection_manager.broadcast_alert({
                            "alert_type": "session_blocked",
                            "user_id": user_id,
                            "trust_score": result.get("trust_score"),
                            "cognitive_state": result.get("cognitive_state"),
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
        connection_manager.disconnect_sdk(user_id)
        processor.end_session(user_id)


@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await connection_manager.connect_dashboard(websocket)
    try:
        while True:
            raw_message = await websocket.receive_text()
            message = json.loads(raw_message)
            if message.get("type") == "get_sessions":
                processor = get_processor()
                await websocket.send_json({"type": "session_list", "users": processor.get_active_users()})
    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect_dashboard(websocket)
