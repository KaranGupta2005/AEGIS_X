"""
Evidence Model — Generic interface for all trust evidence.

Every subsystem produces evidence that feeds into the Trust Fusion Engine.
Evidence is typed, weighted, time-decayed, and explainable.
"""

import uuid
import time
from enum import Enum
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from dataclasses import dataclass, field


class EvidenceCategory(str, Enum):
    BEHAVIOR = "behavior"
    IDENTITY = "identity"
    CONTEXT = "context"
    VERIFICATION = "verification"
    THREAT = "threat"
    DEVICE = "device"
    HISTORICAL = "historical"
    DELEGATE = "delegate"


class EvidenceSource(str, Enum):
    BEHAVIORAL_SDK = "behavioral_sdk"
    COGNITIVE_SERVICE = "cognitive_service"
    SIMILARITY_SERVICE = "similarity_service"
    DRIFT_DETECTOR = "drift_detector"
    ANOMALY_DETECTOR = "anomaly_detector"
    FRAUD_PREDICTOR = "fraud_predictor"
    VERIFICATION_ENGINE = "verification_engine"
    ADAPTIVE_LEARNING = "adaptive_learning"
    SECURITY_CONTAINMENT = "security_containment"
    DEVICE_INTELLIGENCE = "device_intelligence"
    TRANSACTION_SCORER = "transaction_scorer"
    SESSION_CONTEXT = "session_context"
    DELEGATE_SERVICE = "delegate_service"
    BOT_DETECTOR = "bot_detector"
    POLICY_ENGINE = "policy_engine"


class EvidenceSeverity(str, Enum):
    INFO = "info"           # Informational, neutral
    LOW = "low"             # Minor concern
    MEDIUM = "medium"       # Moderate risk signal
    HIGH = "high"           # Significant threat
    CRITICAL = "critical"   # Immediate action required


@dataclass
class Evidence:
    """
    Universal evidence interface.
    Every trust signal from any subsystem produces this.
    """
    evidence_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    source: EvidenceSource = EvidenceSource.BEHAVIORAL_SDK
    category: EvidenceCategory = EvidenceCategory.BEHAVIOR
    evidence_type: str = ""          # e.g., "behavior_drift", "voice_verification", "unknown_device"

    # Scoring
    confidence: float = 0.0          # How sure is the source about this evidence [0,1]
    weight: float = 1.0              # Relative importance in fusion [0,∞)
    value: float = 0.0               # Trust-positive (>0) or trust-negative (<0) signal [-1,1]

    # Metadata
    timestamp: float = field(default_factory=time.time)
    expiry_seconds: float = 300.0    # Evidence expires after this many seconds
    reason: str = ""                 # Human-readable explanation
    severity: EvidenceSeverity = EvidenceSeverity.INFO
    version: int = 1
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_expired(self) -> bool:
        return (time.time() - self.timestamp) > self.expiry_seconds

    @property
    def age_seconds(self) -> float:
        return time.time() - self.timestamp

    @property
    def decay_factor(self) -> float:
        """Time decay: evidence weakens over time. Half-life = expiry/2."""
        age = self.age_seconds
        half_life = self.expiry_seconds / 2
        return 2.0 ** (-age / half_life) if half_life > 0 else 1.0

    @property
    def effective_value(self) -> float:
        """Value adjusted for confidence, weight, and time decay."""
        return self.value * self.confidence * self.weight * self.decay_factor

    def to_dict(self) -> Dict:
        return {
            "evidence_id": self.evidence_id,
            "source": self.source.value,
            "category": self.category.value,
            "evidence_type": self.evidence_type,
            "confidence": round(self.confidence, 4),
            "weight": round(self.weight, 3),
            "value": round(self.value, 4),
            "effective_value": round(self.effective_value, 4),
            "timestamp": self.timestamp,
            "age_seconds": round(self.age_seconds, 1),
            "decay_factor": round(self.decay_factor, 4),
            "severity": self.severity.value,
            "reason": self.reason,
            "expired": self.is_expired,
        }
