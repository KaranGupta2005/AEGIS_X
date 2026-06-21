"""
AEGIS-X: FastAPI Backend — Real-Time Continuous Trust Infrastructure
=====================================================================
The main application server that exposes:
1. WebSocket /ws/{user_id}         — SDK behavioral event streaming
2. WebSocket /ws/dashboard         — Dashboard real-time monitoring
3. REST API endpoints              — User management, trust queries

This server is the core of the AEGIS-X architecture:
    React Native SDK → WebSocket → This Server → Trust Pipeline → Decision

Every 2 seconds, the SDK sends a behavioral heartbeat via WebSocket.
This server processes it through the full trust pipeline and pushes back
the trust score + decision in real time (< 200ms end-to-end).
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional
import json

from backend.websocket.socket_manager import ConnectionManager
from backend.services.session_manager import SessionManager


# ═══════════════════════════════════════════════════════════════════════════
# APPLICATION LIFECYCLE
# ═══════════════════════════════════════════════════════════════════════════

# Global instances (initialized at startup, shared across requests)
connection_manager = ConnectionManager()
session_manager: Optional[SessionManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan: initialize ML models and services at startup.
    MiniLM model loads once here, shared across all requests.
    """
    global session_manager
    print("[AEGIS-X] Starting trust engine...")
    session_manager = SessionManager()
    print("[AEGIS-X] Trust engine ready. Accepting connections.")
    yield
    print("[AEGIS-X] Shutting down.")


app = FastAPI(
    title="AEGIS-X",
    version="2.0",
    description="Continuous Mathematical Trust Infrastructure for Next-Gen Banking",
    lifespan=lifespan,
)

# CORS for dashboard access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
# HEALTH & STATUS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/")
def health():
    """Health check endpoint."""
    return {
        "status": "running",
        "project": "AEGIS-X",
        "version": "2.0",
        "engine": "continuous_trust_infrastructure",
    }


@app.get("/status")
def system_status():
    """System status with connection and session metrics."""
    return {
        "connections": connection_manager.get_connection_info(),
        "active_sessions": session_manager.active_session_count if session_manager else 0,
        "sessions": session_manager.get_active_sessions() if session_manager else [],
    }


# ═══════════════════════════════════════════════════════════════════════════
# WEBSOCKET: SDK BEHAVIORAL EVENT STREAM
# ═══════════════════════════════════════════════════════════════════════════

@app.websocket("/ws/{user_id}")
async def websocket_sdk(
    websocket: WebSocket,
    user_id: str,
    session_id: Optional[str] = Query(default=None),
):
    """
    SDK WebSocket endpoint — receives behavioral events, returns trust updates.

    Protocol:
        Client → Server (every 2s):
        {
            "type": "behavioral_event",
            "event": { ...16 behavioral features... },
            "transaction_amount": 0,         // optional
            "is_new_beneficiary": false       // optional
        }

        Server → Client (response):
        {
            "type": "trust_update",
            "trust_state": { trust_score, decision, cognitive_state, ... },
            "temporal_dynamics": { velocity, acceleration, trend },
            "decision": { action, confidence, reasons }
        }
    """
    # Accept connection and register
    await connection_manager.connect_sdk(websocket, user_id)

    # Create trust session for this user
    session_info = session_manager.create_session(user_id, session_id)

    # Send session confirmation
    await websocket.send_json({
        "type": "session_started",
        **session_info,
    })

    try:
        while True:
            # Receive behavioral event from SDK
            raw_message = await websocket.receive_text()
            message = json.loads(raw_message)

            msg_type = message.get("type", "behavioral_event")

            if msg_type == "behavioral_event":
                # Extract event data and transaction context
                raw_event = message.get("event", message)
                tx_amount = message.get("transaction_amount", 0.0)
                is_new_ben = message.get("is_new_beneficiary", False)

                # Process through trust pipeline
                result = session_manager.process_event(
                    user_id=user_id,
                    raw_event=raw_event,
                    transaction_amount=tx_amount,
                    is_new_beneficiary=is_new_ben,
                )

                # Send trust update back to SDK
                await websocket.send_json(result)

                # Broadcast to all connected dashboards
                await connection_manager.broadcast_to_dashboards({
                    "type": "trust_update",
                    "user_id": user_id,
                    **result,
                })

                # If BLOCK decision, send alert to dashboards
                action = (
                    result.get("trust_state", {}).get("action")
                    or result.get("decision", {}).get("action")
                )
                if action == "BLOCK":
                    await connection_manager.broadcast_alert({
                        "alert_type": "session_blocked",
                        "user_id": user_id,
                        "trust_score": result.get("trust_state", {}).get("trust_score"),
                        "cognitive_state": result.get("trust_state", {}).get("cognitive_state"),
                        "reasons": result.get("decision", {}).get("reasons", []),
                    })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[AEGIS-X] WebSocket error for {user_id}: {e}")
    finally:
        # Cleanup on disconnect
        connection_manager.disconnect_sdk(user_id)
        session_manager.end_session(user_id)


# ═══════════════════════════════════════════════════════════════════════════
# WEBSOCKET: DASHBOARD MONITORING STREAM
# ═══════════════════════════════════════════════════════════════════════════

@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """
    Dashboard WebSocket — receives ALL trust updates from ALL users.

    The dashboard doesn't compute anything. It only displays.
    All computation happens in the backend trust pipeline.

    Receives:
    - trust_update: Every 2s per active user (trust score, state, similarity)
    - security_alert: When a session is blocked or coercion detected
    """
    await connection_manager.connect_dashboard(websocket)

    try:
        while True:
            # Dashboard can send commands (e.g., "get_all_sessions")
            raw_message = await websocket.receive_text()
            message = json.loads(raw_message)

            msg_type = message.get("type", "")

            if msg_type == "get_sessions":
                sessions = session_manager.get_active_sessions()
                await websocket.send_json({
                    "type": "session_list",
                    "sessions": sessions,
                })

            elif msg_type == "get_session_detail":
                uid = message.get("user_id", "")
                summary = session_manager.get_session_summary(uid)
                await websocket.send_json({
                    "type": "session_detail",
                    "data": summary,
                })

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        connection_manager.disconnect_dashboard(websocket)


# ═══════════════════════════════════════════════════════════════════════════
# REST API: Trust Queries (for non-streaming use cases)
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/trust/{user_id}/current")
def get_current_trust(user_id: str):
    """Get current trust state for a user (polling fallback)."""
    summary = session_manager.get_session_summary(user_id)
    if summary is None:
        return {"error": "no_active_session", "user_id": user_id}
    return summary


@app.get("/api/v1/sessions")
def list_sessions():
    """List all active sessions."""
    return {
        "active_count": session_manager.active_session_count,
        "sessions": session_manager.get_active_sessions(),
    }
