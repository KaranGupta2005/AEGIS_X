"""
Trust Fusion Engine API — Evidence submission, trust computation, timeline, explanation.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from backend.trust.fusion_engine import TrustFusionEngine, TrustPolicy
from backend.trust.evidence import Evidence, EvidenceCategory, EvidenceSource, EvidenceSeverity

router = APIRouter(prefix="/api/v1/trust", tags=["Trust Fusion"])

# Singleton engine
_engine = TrustFusionEngine()


def get_trust_engine() -> TrustFusionEngine:
    return _engine


class SubmitEvidenceRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    source: str = Field(default="behavioral_sdk")
    category: str = Field(default="behavior")
    evidence_type: str = Field(..., min_length=1)
    value: float = Field(..., ge=-1, le=1)
    confidence: float = Field(default=0.8, ge=0, le=1)
    weight: float = Field(default=1.0, ge=0)
    reason: str = Field(default="")
    severity: str = Field(default="info")


class ComputeTrustRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)


class IngestBehavioralRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    similarity: float = Field(default=0.95)
    cognitive_state: str = Field(default="calm")
    cognitive_stability: float = Field(default=1.0)
    drift_detected: bool = Field(default=False)
    drift_severity: str = Field(default="none")
    anomaly_score: float = Field(default=0.0)
    velocity: float = Field(default=0.0)


@router.post("/evidence")
def submit_evidence(req: SubmitEvidenceRequest):
    """Submit a single evidence item to the fusion engine."""
    engine = get_trust_engine()
    evidence = Evidence(
        source=EvidenceSource(req.source) if req.source in [e.value for e in EvidenceSource] else EvidenceSource.BEHAVIORAL_SDK,
        category=EvidenceCategory(req.category) if req.category in [e.value for e in EvidenceCategory] else EvidenceCategory.BEHAVIOR,
        evidence_type=req.evidence_type,
        value=req.value,
        confidence=req.confidence,
        weight=req.weight,
        reason=req.reason,
        severity=EvidenceSeverity(req.severity) if req.severity in [e.value for e in EvidenceSeverity] else EvidenceSeverity.INFO,
    )
    engine.submit_evidence(req.user_id, req.session_id, evidence)
    return {"submitted": True, "evidence_id": evidence.evidence_id}


@router.post("/compute")
def compute_trust(req: ComputeTrustRequest):
    """Compute fused trust score from all collected evidence."""
    engine = get_trust_engine()
    result = engine.compute_trust(req.user_id, req.session_id)
    return result.to_dict()


@router.post("/ingest/behavioral")
def ingest_behavioral(req: IngestBehavioralRequest):
    """Ingest a behavioral pipeline result as evidence and compute trust."""
    engine = get_trust_engine()
    engine.ingest_behavioral_event(
        user_id=req.user_id,
        session_id=req.session_id,
        similarity=req.similarity,
        cognitive_state=req.cognitive_state,
        cognitive_stability=req.cognitive_stability,
        drift_detected=req.drift_detected,
        drift_severity=req.drift_severity,
        anomaly_score=req.anomaly_score,
        velocity=req.velocity,
    )
    result = engine.compute_trust(req.user_id, req.session_id)
    return result.to_dict()


@router.get("/timeline/{user_id}/{session_id}")
def get_trust_timeline(user_id: str, session_id: str, limit: int = 100):
    """Get complete trust timeline for playback."""
    engine = get_trust_engine()
    return {
        "user_id": user_id,
        "session_id": session_id,
        "timeline": engine.get_timeline(user_id, session_id, limit),
        "trend": engine.get_trend(user_id, session_id),
    }


@router.get("/evidence/{user_id}/{session_id}")
def get_evidence_feed(user_id: str, session_id: str):
    """Get live evidence feed for a session."""
    engine = get_trust_engine()
    return {
        "user_id": user_id,
        "session_id": session_id,
        "evidence": engine.get_evidence_feed(user_id, session_id),
    }
