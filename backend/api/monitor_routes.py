from fastapi import APIRouter, HTTPException
from backend.api.dependencies import get_processor

router = APIRouter(prefix="/api/v1", tags=["Monitoring"])


@router.get("/session/{user_id}")
def get_session_status(user_id: str):
    processor = get_processor()
    if user_id not in processor.get_active_users():
        raise HTTPException(status_code=404, detail="No active session for this user")
    timeline = processor.get_trust_timeline(user_id)
    alerts = processor.get_session_alerts(user_id)
    return {
        "user_id": user_id,
        "trust_history": [round(t, 4) for t in timeline],
        "history_length": len(timeline),
        "total_alerts": len(alerts),
    }


@router.get("/session/{user_id}/history")
def get_trust_history(user_id: str):
    processor = get_processor()
    timeline = processor.get_trust_timeline(user_id)
    if not timeline:
        raise HTTPException(status_code=404, detail="No history available")
    return {"user_id": user_id, "trust_history": [round(t, 4) for t in timeline], "length": len(timeline)}


@router.get("/session/{user_id}/alerts")
def get_session_alerts(user_id: str):
    processor = get_processor()
    alerts = processor.get_session_alerts(user_id)
    return {"user_id": user_id, "alerts": alerts, "count": len(alerts)}


@router.get("/sessions")
def list_active_sessions():
    processor = get_processor()
    users = processor.get_active_users()
    return {"active_users": users, "count": len(users)}
