from fastapi import APIRouter, HTTPException
from backend.schemas.requests import StartSessionRequest, EndSessionRequest
from backend.api.dependencies import get_processor

router = APIRouter(prefix="/api/v1/session", tags=["Session"])


@router.post("/start")
def start_session(request: StartSessionRequest):
    processor = get_processor()
    return processor.start_session(request.user_id, session_id=None)


@router.post("/end")
def end_session(request: EndSessionRequest):
    processor = get_processor()
    result = processor.end_session(request.user_id)
    if result.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Session not found")
    return result
