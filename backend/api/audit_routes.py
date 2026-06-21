from fastapi import APIRouter, HTTPException
from backend.api.dependencies import get_processor
from backend.services.explanation_service import ExplainabilityService, NarrativeGenerator

router = APIRouter(prefix="/api/v1/audit", tags=["Audit & Explainability"])

_explainability = ExplainabilityService()


@router.post("/explain")
def generate_explanation(
    trust_score: float,
    similarity: float,
    cognitive_state: str,
    cognitive_stability: float,
    drift_detected: bool = False,
    drift_severity: str = "none",
    transaction_score: float = 1.0,
    velocity: float = 0.0,
    entropy: float = 0.0,
    decision: str = "ALLOW",
):
    return _explainability.explain(
        trust_score=trust_score,
        similarity=similarity,
        cognitive_state=cognitive_state,
        cognitive_stability=cognitive_stability,
        drift_detected=drift_detected,
        drift_severity=drift_severity,
        transaction_score=transaction_score,
        velocity=velocity,
        entropy=entropy,
        decision=decision,
    )


@router.get("/session/{user_id}/summary")
def get_session_summary(user_id: str):
    processor = get_processor()
    if user_id not in processor.get_active_users():
        raise HTTPException(status_code=404, detail="No active session")
    timeline = processor.get_trust_timeline(user_id)
    alerts = processor.get_session_alerts(user_id)
    if not timeline:
        raise HTTPException(status_code=404, detail="No data yet")

    summary = NarrativeGenerator.executive_summary(
        user_id=user_id,
        session_duration_seconds=len(timeline) * 2.0,
        total_events=len(timeline),
        trust_min=min(timeline),
        trust_max=max(timeline),
        final_trust=timeline[-1],
        final_decision="ALLOW" if timeline[-1] > 0.85 else ("STEP_UP" if timeline[-1] > 0.60 else "BLOCK"),
        cognitive_states_observed=[],
        incident_type="NORMAL_ACTIVITY",
        total_alerts=len(alerts),
        root_causes=[],
    )
    return {"user_id": user_id, "summary": summary, "trust_final": round(timeline[-1], 4), "total_events": len(timeline)}
