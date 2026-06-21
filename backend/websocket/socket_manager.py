"""
AEGIS-X Phase 6C.1: WebSocket Connection Manager
==================================================
Manages real-time bidirectional connections between the React Native SDK
and the AEGIS-X backend for continuous behavioral trust streaming.

Architecture:
    React Native SDK (client)
         ↕ WebSocket (persistent connection)
    Socket Manager (this file)
         ↓
    Session Manager → Trust Pipeline → Trust Update
         ↓
    Push trust_update back to client + broadcast to dashboard

Why WebSocket over HTTP polling?
    HTTP: Open → Send → Receive → Close (every request = new connection)
    WebSocket: Open ONCE → stream forever in both directions

    At 2-second heartbeat intervals with 100 concurrent users:
    - HTTP: 50 new TCP connections/second (wasteful)
    - WebSocket: 100 persistent connections (efficient)

    WebSocket also enables SERVER-INITIATED pushes:
    - Real-time alerts ("BLOCK" pushed to SDK instantly)
    - Dashboard live updates (no polling required)

Connection Registry:
    Maps user_id → active WebSocket connection
    Enables targeted pushes (alert specific user) and broadcasts (dashboard)

Reference: Section 5 - "streams behavioral signals to the backend via WebSocket every 2 seconds"
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Optional, Set, List
from datetime import datetime, timezone
import json
import asyncio


class ConnectionManager:
    """
    WebSocket connection registry and message routing hub.

    Manages three types of connections:
    1. SDK connections: One per active user (sends behavioral events, receives trust updates)
    2. Dashboard connections: Monitor connections that receive ALL trust updates (broadcast)
    3. Alert subscribers: Connections that only receive alerts (STEP_UP/BLOCK events)

    Thread-safe for async FastAPI usage. Handles disconnection gracefully.
    """

    def __init__(self):
        # Active SDK connections: user_id → WebSocket
        self._sdk_connections: Dict[str, WebSocket] = {}

        # Dashboard monitor connections (receive all trust updates)
        self._dashboard_connections: Set[WebSocket] = set()

        # Connection metadata
        self._connection_times: Dict[str, datetime] = {}

    # ═══════════════════════════════════════════════════════════════════════
    # SDK CONNECTIONS (one per user)
    # ═══════════════════════════════════════════════════════════════════════

    async def connect_sdk(self, websocket: WebSocket, user_id: str):
        """
        Accept and register an SDK WebSocket connection.

        Called when React Native SDK establishes connection on app open.
        If user already has a connection, the old one is replaced (device switch).
        """
        await websocket.accept()

        # Disconnect old connection if exists (user reconnected / device switch)
        if user_id in self._sdk_connections:
            old_ws = self._sdk_connections[user_id]
            try:
                await old_ws.close(code=4001, reason="New connection from same user")
            except Exception:
                pass

        self._sdk_connections[user_id] = websocket
        self._connection_times[user_id] = datetime.now(timezone.utc)

    def disconnect_sdk(self, user_id: str):
        """Remove an SDK connection (user closed app or connection dropped)."""
        self._sdk_connections.pop(user_id, None)
        self._connection_times.pop(user_id, None)

    def is_connected(self, user_id: str) -> bool:
        """Check if a user has an active SDK connection."""
        return user_id in self._sdk_connections

    async def send_to_user(self, user_id: str, data: Dict):
        """
        Send a trust update directly to a specific user's SDK.

        Used for:
        - Trust score updates (every 2s response)
        - BLOCK notifications (immediate session termination)
        - STEP_UP requests (trigger biometric prompt in app)
        """
        ws = self._sdk_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                # Connection broken — clean up
                self.disconnect_sdk(user_id)

    # ═══════════════════════════════════════════════════════════════════════
    # DASHBOARD CONNECTIONS (broadcast monitoring)
    # ═══════════════════════════════════════════════════════════════════════

    async def connect_dashboard(self, websocket: WebSocket):
        """Accept a dashboard monitoring connection."""
        await websocket.accept()
        self._dashboard_connections.add(websocket)

    def disconnect_dashboard(self, websocket: WebSocket):
        """Remove a dashboard connection."""
        self._dashboard_connections.discard(websocket)

    async def broadcast_to_dashboards(self, data: Dict):
        """
        Broadcast a trust update to ALL connected dashboards.

        Dashboards receive every trust update from every user session,
        enabling real-time monitoring of all active sessions simultaneously.
        """
        dead_connections = set()

        for ws in self._dashboard_connections:
            try:
                await ws.send_json(data)
            except Exception:
                dead_connections.add(ws)

        # Clean up broken connections
        self._dashboard_connections -= dead_connections

    # ═══════════════════════════════════════════════════════════════════════
    # ALERT BROADCASTING
    # ═══════════════════════════════════════════════════════════════════════

    async def broadcast_alert(self, alert: Dict):
        """
        Broadcast a security alert to all dashboards.

        Triggered when:
        - Trust drops below BLOCK threshold
        - Cognitive state enters COERCED/ROBOTIC
        - CUSUM drift crosses critical severity
        - High-value transaction + panicked state
        """
        alert_payload = {
            "type": "security_alert",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **alert,
        }
        await self.broadcast_to_dashboards(alert_payload)

    # ═══════════════════════════════════════════════════════════════════════
    # UTILITY
    # ═══════════════════════════════════════════════════════════════════════

    @property
    def active_sdk_count(self) -> int:
        """Number of active SDK connections."""
        return len(self._sdk_connections)

    @property
    def active_dashboard_count(self) -> int:
        """Number of active dashboard monitors."""
        return len(self._dashboard_connections)

    def get_connected_users(self) -> List[str]:
        """List all user IDs with active SDK connections."""
        return list(self._sdk_connections.keys())

    def get_connection_info(self) -> Dict:
        """Summary of all active connections (for admin/monitoring)."""
        return {
            "sdk_connections": self.active_sdk_count,
            "dashboard_connections": self.active_dashboard_count,
            "connected_users": self.get_connected_users(),
            "uptime_per_user": {
                uid: (datetime.now(timezone.utc) - t).total_seconds()
                for uid, t in self._connection_times.items()
            },
        }
