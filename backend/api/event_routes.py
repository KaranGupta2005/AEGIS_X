from fastapi import APIRouter, HTTPException
from backend.schemas.requests import BehavioralEventRequest
from backend.api.dependencies import get_processor

router = APIRouter(prefix="/api/v1", tags=["Events"])


@router.post("/event")
def process_event(request: BehavioralEventRequest):
    processor = get_processor()
    result = processor.process_behavioral_event(
        user_id=request.user_id,
        raw_event=request.to_event_dict(),
        transaction_amount=request.transaction_amount,
        is_new_beneficiary=request.is_new_beneficiary,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result.get("message", result["error"]))
    return result
