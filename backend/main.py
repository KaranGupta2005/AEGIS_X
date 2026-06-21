from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional
import json

from backend.websocket.socket_manager import ConnectionManager
from backend.api.dependencies import get_processor, set_processor


connection_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[AEGIS-X] Initializing trust engine...")
    from backend.services.event_processor import EventProcessor
    processor = EventProcessor()
    set_processor(processor)
    print("[AEGIS-X] Trust engine ready.")
    yield
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.api.session_routes import router as session_router
from backend.api.event_routes import router as event_router
from backend.api.monitor_routes import router as monitor_router
from backend.api.audit_routes import router as audit_router

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
    return {
        "active_users": processor.active_user_count,
        "connections": connection_manager.get_connection_info(),
    }


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
