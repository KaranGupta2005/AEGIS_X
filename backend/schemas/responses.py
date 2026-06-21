from pydantic import BaseModel
from typing import List, Optional, Dict


class TrustStateResponse(BaseModel):
    trust_score: float
    effective_trust: float
    decision: str
    trust_level: str
    similarity: float
    cognitive_state: str
    cognitive_stability: float
    drift_detected: bool
    drift_severity: str


class TemporalDynamicsResponse(BaseModel):
    velocity: float
    acceleration: float
    trend: str
    entropy: float


class AlertResponse(BaseModel):
    severity: str
    message: str
    cognitive_state: str
    trust_score: float
    decision: str
    timestamp: str


class TrustUpdateResponse(BaseModel):
    type: str = "trust_update"
    user_id: str
    session_id: str
    timestamp: str
    trust_score: float
    effective_trust: float
    decision: str
    trust_level: str
    similarity: float
    cognitive_state: str
    cognitive_stability: float
    drift_detected: bool
    drift_severity: str
    temporal: TemporalDynamicsResponse
    reasons: List[str]
    explanation: str
    alerts: List[AlertResponse]
    event_number: int
    latency_ms: float
    confidence: float


class SessionStartResponse(BaseModel):
    user_id: str
    session_id: str
    has_baseline: bool
    status: str


class SessionEndResponse(BaseModel):
    user_id: str
    session_id: str
    status: str
    total_events: int
    total_alerts: int


class SessionStatusResponse(BaseModel):
    user_id: str
    session_id: str
    duration_seconds: float
    event_count: int
    trust_score: float
    cognitive_state: str
    decision: str
    drift_detected: bool


class TrustHistoryResponse(BaseModel):
    user_id: str
    trust_history: List[float]
    length: int


class ExplainabilityResponse(BaseModel):
    risk_level: str
    incident_type: str
    incident_description: str
    root_causes: List[Dict]
    summary: str
    timeline_narrative: str
    recommended_actions: List[str]


class ErrorResponse(BaseModel):
    error: str
    message: str
    detail: Optional[str] = None
