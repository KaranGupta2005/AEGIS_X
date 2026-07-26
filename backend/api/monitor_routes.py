"""
Monitor Routes — Continuous Session Monitoring API
===================================================
Exposes the full session lifecycle for dashboard consumption:
  - Trust history (rolling window)
  - Full continuous session timeline (screen + trust + SDK state per window)
  - Session summary (duration, navigation path, behavior confidence)
  - Active session listing
  - Per-user alert feed

All endpoints are backward compatible with v1 consumers.
"""

from fastapi import APIRouter, HTTPException
from backend.api.dependencies import get_processor

router = APIRouter(prefix="/api/v1", tags=["Monitoring"])


# ─── BACKWARD-COMPATIBLE ENDPOINTS ──────────────────────────────────────────

@router.get("/session/{user_id}")
def get_session_status(user_id: str):
    """
    Quick status for a user session.
    Returns trust history, alert count, plus new continuous monitoring fields.
    """
    processor = get_processor()
    if user_id not in processor.get_active_users():
        raise HTTPException(status_code=404, detail="No active session for this user")

    timeline = processor.get_trust_timeline(user_id)
    alerts = processor.get_session_alerts(user_id)
    summary = processor.get_session_summary(user_id)

    return {
        "user_id": user_id,
        "trust_history": [round(t, 4) for t in timeline],
        "history_length": len(timeline),
        "total_alerts": len(alerts),
        # Continuous monitoring extensions
        "sdk_state": summary.get("sdk_state", "OBSERVING"),
        "current_screen": summary.get("current_screen", "home"),
        "current_activity": summary.get("current_activity", ""),
        "session_duration_s": summary.get("duration_seconds", 0.0),
        "collected_windows": summary.get("event_count", 0),
    }


@router.get("/session/{user_id}/history")
def get_trust_history(user_id: str):
    """Rolling trust score history for timeline chart."""
    processor = get_processor()
    timeline = processor.get_trust_timeline(user_id)
    if not timeline:
        raise HTTPException(status_code=404, detail="No history available")
    return {
        "user_id": user_id,
        "trust_history": [round(t, 4) for t in timeline],
        "length": len(timeline),
    }


@router.get("/session/{user_id}/alerts")
def get_session_alerts(user_id: str):
    """All security alerts generated during this session."""
    processor = get_processor()
    alerts = processor.get_session_alerts(user_id)
    return {"user_id": user_id, "alerts": alerts, "count": len(alerts)}


@router.get("/sessions")
def list_active_sessions():
    """List all users with active continuous monitoring sessions."""
    processor = get_processor()
    users = processor.get_active_users()
    return {"active_users": users, "count": len(users)}


# ─── NEW CONTINUOUS MONITORING ENDPOINTS ────────────────────────────────────

@router.get("/session/{user_id}/summary")
def get_session_summary(user_id: str):
    """
    Rich session summary for the dashboard Session tab.

    Returns the full continuous monitoring picture:
      - SDK lifecycle state (OBSERVING / LEARNING / TRANSACTION / VERIFYING)
      - Current screen and activity description
      - Session duration and window count
      - Navigation path taken through the app
      - Trust score history
      - Total alerts and decisions made
    """
    processor = get_processor()
    if user_id not in processor.get_active_users():
        raise HTTPException(status_code=404, detail="No active session for this user")
    return processor.get_session_summary(user_id)


@router.get("/session/{user_id}/timeline")
def get_session_timeline(user_id: str, limit: int = 100):
    """
    Full continuous session timeline.

    Each entry records: timestamp, trust_score, decision, cognitive_state,
    sdk_state, current_screen, event_number.

    This is the audit-trail backbone of the continuous monitoring system —
    every behavioral window, every screen, the full session story.
    """
    processor = get_processor()
    if user_id not in processor.get_active_users():
        raise HTTPException(status_code=404, detail="No active session for this user")

    full_timeline = processor.get_session_timeline(user_id)
    # Return most-recent `limit` entries
    return {
        "user_id": user_id,
        "timeline": full_timeline[-limit:],
        "total_entries": len(full_timeline),
        "returned": min(limit, len(full_timeline)),
    }


@router.get("/sessions/overview")
def get_sessions_overview():
    """
    Aggregate overview of all active continuous monitoring sessions.
    Used by the Live Monitor dashboard for multi-user surveillance.
    """
    processor = get_processor()
    users = processor.get_active_users()
    sessions = []
    for uid in users:
        summary = processor.get_session_summary(uid)
        if summary:
            sessions.append({
                "user_id": uid,
                "sdk_state": summary.get("sdk_state", "OBSERVING"),
                "current_screen": summary.get("current_screen", "home"),
                "duration_seconds": summary.get("duration_seconds", 0.0),
                "event_count": summary.get("event_count", 0),
                "total_alerts": summary.get("total_alerts", 0),
                # Latest trust score is last entry in history
                "trust_score": (summary.get("trust_history") or [1.0])[-1],
            })
    return {"sessions": sessions, "count": len(sessions)}


# ─── ADAPTIVE LEARNING ENDPOINTS ────────────────────────────────────────────

@router.get("/profile/{user_id}")
def get_behavior_profile(user_id: str):
    """
    Retrieve the adaptive behavioral profile for a user.

    Returns: profile version, confidence, maturity, thresholds, learning status,
    and full evolution metadata.
    """
    from backend.services.adaptive_learning import AdaptiveLearningService
    learning = AdaptiveLearningService()
    return learning.get_profile_status(user_id)


@router.post("/profile/{user_id}/rollback")
def rollback_profile(user_id: str, version: int = None):
    """
    Roll back a user's behavioral profile to a previous version.
    Used in case of suspected poisoning or accidental corruption.
    """
    from backend.services.adaptive_learning import AdaptiveLearningService
    learning = AdaptiveLearningService()
    result = learning.rollback_profile(user_id, target_version=version)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result
