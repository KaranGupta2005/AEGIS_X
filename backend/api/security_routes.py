"""
Security Routes — Containment, Sandbox, Intelligence, Forensics API.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from backend.security.containment import (
    SessionContainmentService, TransactionSandbox, DeceptionEngine,
    AttackIntelligenceService, SecurityAuditService, SecurityPolicyEngine,
    BotIndicators, SecurityState, DEFAULT_POLICY,
)

router = APIRouter(prefix="/api/v1/security", tags=["Security"])

# Singletons
_containment = SessionContainmentService()
_sandbox = TransactionSandbox()
_deception = DeceptionEngine()
_intelligence = AttackIntelligenceService()
_audit = SecurityAuditService()
_policy = SecurityPolicyEngine()


class EvaluateRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    trust_score: float = Field(..., ge=0, le=1)
    cognitive_state: str = Field(default="calm")
    drift_detected: bool = Field(default=False)
    drift_severity: str = Field(default="none")
    velocity: float = Field(default=0.0)
    anomaly_score: float = Field(default=0.0)
    # Verification result feedback
    verification_failure: Optional[str] = Field(default=None)
    verification_success: Optional[str] = Field(default=None)
    failure_severity: Optional[str] = Field(default=None)


class SandboxTransactionRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    beneficiary: str = Field(..., min_length=1)
    payment_method: str = Field(default="UPI")


class RecordInteractionRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    screen: str = Field(..., min_length=1)
    action: str = Field(default="navigate")
    timing_ms: float = Field(default=100.0)


@router.post("/evaluate")
def evaluate_security(req: EvaluateRequest):
    """Evaluate session threat level and update security state."""
    return _containment.evaluate_and_update(
        user_id=req.user_id,
        session_id=req.session_id,
        trust_score=req.trust_score,
        cognitive_state=req.cognitive_state,
        drift_detected=req.drift_detected,
        drift_severity=req.drift_severity,
        velocity=req.velocity,
        anomaly_score=req.anomaly_score,
    )


@router.get("/status/{user_id}/{session_id}")
def get_security_status(user_id: str, session_id: str):
    """Get current security state for a session."""
    return _containment.get_status(user_id, session_id)


@router.get("/sandboxed/{user_id}/{session_id}")
def is_sandboxed(user_id: str, session_id: str):
    """Check if a session is currently sandboxed."""
    return {"sandboxed": _containment.is_sandboxed(user_id, session_id)}


@router.post("/sandbox/transaction")
def sandbox_transaction(req: SandboxTransactionRequest):
    """Process a transaction through the sandbox (no real money moves)."""
    if not _containment.is_sandboxed(req.user_id, req.session_id):
        raise HTTPException(status_code=400, detail="Session not in sandbox mode")
    return _sandbox.process_transaction(
        user_id=req.user_id,
        session_id=req.session_id,
        amount=req.amount,
        beneficiary=req.beneficiary,
        payment_method=req.payment_method,
    )


@router.post("/intelligence/record")
def record_interaction(req: RecordInteractionRequest):
    """Record an interaction for attack intelligence."""
    _intelligence.record_interaction(
        user_id=req.user_id,
        session_id=req.session_id,
        screen=req.screen,
        action=req.action,
        timing_ms=req.timing_ms,
    )
    return {"recorded": True}


@router.get("/intelligence/bot/{user_id}/{session_id}")
def detect_bot(user_id: str, session_id: str):
    """Analyze session for bot indicators."""
    indicators = _intelligence.detect_bot(user_id, session_id)
    return indicators.to_dict()


@router.get("/intelligence/fingerprint/{user_id}/{session_id}")
def get_fingerprint(user_id: str, session_id: str):
    """Get attacker fingerprint for a session."""
    fp = _intelligence.get_fingerprint(user_id, session_id)
    if not fp:
        return {"status": "no_data"}
    return fp


@router.get("/forensics/{user_id}/{session_id}")
def get_forensic_report(user_id: str, session_id: str):
    """Generate a complete forensic report for a contained session."""
    ctx = _containment.get_or_create(user_id, session_id)
    fp_data = _intelligence._fingerprints.get(f"{user_id}:{session_id}")
    report = _audit.generate_forensic_report(ctx, fp_data)
    return report


@router.get("/explanation/{user_id}/{session_id}")
def get_explanation(user_id: str, session_id: str):
    """Get human-readable containment explanation."""
    ctx = _containment.get_or_create(user_id, session_id)
    return {"explanation": _audit.generate_explanation(ctx)}


@router.get("/deception/loading")
def get_deception_loading():
    """Get a deception loading response (for sandboxed sessions)."""
    return _deception.generate_loading_response()


@router.get("/deception/confirmation")
def get_deception_confirmation():
    """Get a deception delayed confirmation."""
    return _deception.generate_delayed_confirmation()
