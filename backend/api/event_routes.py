from fastapi import APIRouter, HTTPException
from backend.schemas.requests import BehavioralEventRequest
from backend.api.dependencies import get_processor

router = APIRouter(prefix="/api/v1", tags=["Events"])


@router.post("/event")
def process_event(request: BehavioralEventRequest):
    """
    Process a single behavioral window via REST (alternative to WebSocket).

    Accepts the same 16-feature payload as the WebSocket SDK, plus an optional
    sdk_context block carrying continuous monitoring metadata (current screen,
    SDK state, navigation depth, etc.).

    Backward compatible: sdk_context is optional.
    """
    processor = get_processor()

    # Convert optional sdk_context Pydantic model → plain dict
    sdk_ctx = request.sdk_context.model_dump() if request.sdk_context else None

    result = processor.process_behavioral_event(
        user_id=request.user_id,
        raw_event=request.to_event_dict(),
        transaction_amount=request.transaction_amount,
        is_new_beneficiary=request.is_new_beneficiary,
        sdk_context=sdk_ctx,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result.get("message", result["error"]))
    return result
