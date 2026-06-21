import numpy as np
import time
from typing import Dict, Optional, List
from dataclasses import dataclass, field
from datetime import datetime, timezone

from backend.services.feature_engineering import FeatureEngineer
from backend.services.serializer import BehavioralSerializer
from backend.services.embedding_service import EmbeddingService
from backend.services.similarity_service import SimilarityService
from backend.services.history_service import SimilarityHistory
from backend.services.drift_service import CUSUMDetector
from backend.services.cognitive_service import CognitiveService
from backend.services.trust_service import TrustService, TransactionScorer, DeviceTrustScorer
from backend.services.decision_service import DecisionService


@dataclass
class PipelineContext:
    """
    Per-user processing context — carries all stateful components for one session.

    The pipeline itself is stateless (shared services). State lives here:
    - baseline: the user's trusted behavioral identity
    - cusum: accumulated drift evidence
    - history: similarity time series for temporal dynamics
    - trust_engine: trust score history for velocity/acceleration
    - event_count: how many events processed in this context

    Create one PipelineContext per active session. Discard on session end.
    """
    user_id: str
    baseline: Optional[np.ndarray] = None
    cusum: CUSUMDetector = field(default_factory=CUSUMDetector)
    history: SimilarityHistory = field(default_factory=SimilarityHistory)
    trust_engine: TrustService = field(default_factory=TrustService)
    event_count: int = 0
    is_enrolled: bool = False

    def __post_init__(self):
        self.is_enrolled = self.baseline is not None


@dataclass
class TrustUpdate:
    """
    Complete output of one pipeline execution cycle.

    Contains everything the WebSocket, dashboard, and audit trail need.
    This is the single object that flows to:
    - WebSocket client (React Native SDK receives action)
    - Streamlit dashboard (visualizes trust trajectory)
    - Compliance logger (stores audit trail)
    - Session Manager (updates session state)
    """
    # Core verdict
    trust_score: float
    effective_trust: float
    decision: str
    trust_level: str

    # Components breakdown
    similarity: float
    drift_detected: bool
    drift_severity: str
    cognitive_state: str
    cognitive_stability: float
    transaction_score: float

    # Temporal dynamics
    velocity: float
    acceleration: float
    trend: str
    entropy: float

    # Decision details
    confidence: float
    reasons: List[str]
    step_up_methods: List[str]
    explanation: str

    # Metadata
    event_number: int
    latency_ms: float
    timestamp: str

    def to_dict(self) -> Dict:
        """Serialize to dictionary for JSON/WebSocket transmission."""
        return {
            "trust_state": {
                "trust_score": round(self.trust_score, 4),
                "effective_trust": round(self.effective_trust, 4),
                "trust_level": self.trust_level,
                "action": self.decision,
                "cognitive_state": self.cognitive_state,
                "cognitive_stability": self.cognitive_stability,
                "drift_score": round(1.0 - self.similarity, 4),
            },
            "similarity": {
                "score": round(self.similarity, 4),
            },
            "drift": {
                "detected": self.drift_detected,
                "severity": self.drift_severity,
            },
            "temporal_dynamics": {
                "velocity": round(self.velocity, 6),
                "acceleration": round(self.acceleration, 6),
                "trend": self.trend,
                "entropy": round(self.entropy, 4),
            },
            "decision": {
                "action": self.decision,
                "confidence": round(self.confidence, 4),
                "reasons": self.reasons,
                "step_up_methods": self.step_up_methods,
                "explanation": self.explanation,
            },
            "meta": {
                "event_number": self.event_number,
                "latency_ms": round(self.latency_ms, 1),
                "timestamp": self.timestamp,
            },
        }

    @property
    def is_safe(self) -> bool:
        """Quick check: is the session currently trusted?"""
        return self.decision == "ALLOW"

    @property
    def is_blocked(self) -> bool:
        """Quick check: has the session been blocked?"""
        return self.decision == "BLOCK"


class TrustPipeline:
    """
    The orchestrator: coordinates all AEGIS-X services into a single process() call.

    Lifecycle:
        1. __init__()         → loads models, creates shared services (once)
        2. create_context()   → creates per-user state (once per session)
        3. process()          → executes full pipeline (every 2 seconds)

    All services are injected at construction time (dependency injection).
    This makes the pipeline fully testable — swap any service with a mock.
    """

    def __init__(self):
        """
        Initialize all pipeline services.
        This is expensive (loads MiniLM model) — do it ONCE at app startup.
        """
        self._feature_engineer = FeatureEngineer()
        self._serializer = BehavioralSerializer()
        self._embedding_service = EmbeddingService()
        self._similarity_service = SimilarityService()
        self._cognitive_service = CognitiveService()
        self._transaction_scorer = TransactionScorer()
        self._device_scorer = DeviceTrustScorer()
        self._decision_service = DecisionService()

    def create_context(
        self,
        user_id: str,
        baseline: Optional[np.ndarray] = None
    ) -> PipelineContext:
        """
        Create a fresh processing context for a user session.

        Args:
            user_id: User identifier.
            baseline: User's behavioral baseline (384-dim).
                     None if user is in enrollment phase.

        Returns:
            PipelineContext ready for process() calls.
        """
        return PipelineContext(user_id=user_id, baseline=baseline)

    def process(
        self,
        ctx: PipelineContext,
        raw_event: Dict,
        transaction_amount: float = 0.0,
        is_new_beneficiary: bool = False,
        device_known: bool = True,
    ) -> TrustUpdate:
        """
        Execute the COMPLETE trust pipeline on one behavioral event.

        This is THE function that makes AEGIS-X work. Call it every 2 seconds
        with the latest SDK telemetry and get back a full trust assessment.

        10-step pipeline, target < 100ms total:
            [1] Feature extraction    (~0.1ms)
            [2] Text serialization    (~0.1ms)
            [3] MiniLM embedding      (~50-70ms)  ← bottleneck
            [4] Cosine similarity     (~0.01ms)
            [5] History + dynamics    (~0.01ms)
            [6] CUSUM drift           (~0.01ms)
            [7] Cognitive classifier  (~1ms)
            [8] Transaction scoring   (~0.01ms)
            [9] Trust computation     (~0.01ms)
            [10] Decision + explain   (~0.1ms)
            ─────────────────────────────────
            Total:                    ~55-75ms ✓

        Args:
            ctx: Per-user PipelineContext (carries session state).
            raw_event: Raw behavioral telemetry from SDK (16 features).
            transaction_amount: Pending transaction amount (₹0 if just browsing).
            is_new_beneficiary: Whether transfer target is unknown.
            device_known: Whether device matches user's registered device.

        Returns:
            TrustUpdate object with complete assessment.
        """
        t_start = time.perf_counter()
        ctx.event_count += 1

        # ═══════════════════════════════════════════════════════════════════
        # STEP 1: Feature Extraction (16-dim validated vector)
        # ═══════════════════════════════════════════════════════════════════
        features = self._feature_engineer.extract(raw_event)

        # ═══════════════════════════════════════════════════════════════════
        # STEP 2: Behavioral Text Serialization
        # ═══════════════════════════════════════════════════════════════════
        behavioral_text = self._serializer.serialize(features)

        # ═══════════════════════════════════════════════════════════════════
        # STEP 3: 384-dim Embedding (MiniLM-L6-v2)
        # ═══════════════════════════════════════════════════════════════════
        embedding = self._embedding_service.generate_embedding(behavioral_text)

        # ═══════════════════════════════════════════════════════════════════
        # STEP 4: Cosine Similarity vs Baseline
        # ═══════════════════════════════════════════════════════════════════
        if ctx.is_enrolled:
            similarity = self._similarity_service.calculate_similarity(
                ctx.baseline, embedding
            )
        else:
            similarity = 1.0  # Enrollment phase: trust by default

        # ═══════════════════════════════════════════════════════════════════
        # STEP 5: History Buffer + Temporal Dynamics
        # ═══════════════════════════════════════════════════════════════════
        ctx.history.add(similarity)
        temporal = ctx.history.compute_temporal_dynamics()

        # ═══════════════════════════════════════════════════════════════════
        # STEP 6: CUSUM Drift Detection
        # ═══════════════════════════════════════════════════════════════════
        drift_result = ctx.cusum.update(similarity)

        # ═══════════════════════════════════════════════════════════════════
        # STEP 7: Cognitive State Classification
        # ═══════════════════════════════════════════════════════════════════
        cognitive_result = self._cognitive_service.assess(features)

        # ═══════════════════════════════════════════════════════════════════
        # STEP 8: Transaction + Device Scoring
        # ═══════════════════════════════════════════════════════════════════
        tx_result = self._transaction_scorer.score_transaction(
            amount=transaction_amount,
            is_new_beneficiary=is_new_beneficiary,
        )
        device_result = self._device_scorer.score_device(known_device=device_known)

        # ═══════════════════════════════════════════════════════════════════
        # STEP 9: Trust Score T(t)
        # ═══════════════════════════════════════════════════════════════════
        trust_result = ctx.trust_engine.compute(
            behavioral_similarity=similarity,
            device_trust=device_result["score"],
            transaction_normality=tx_result["score"],
            cognitive_stability=cognitive_result["stability_score"],
            drift_detected=drift_result["drift_detected"],
            drift_severity=drift_result["severity"],
        )

        # ═══════════════════════════════════════════════════════════════════
        # STEP 10: Decision (ALLOW / STEP_UP / BLOCK)
        # ═══════════════════════════════════════════════════════════════════
        decision_result = self._decision_service.decide(
            trust_score=trust_result["effective_trust"],
            trust_velocity=trust_result["temporal"]["velocity"],
            drift_detected=drift_result["drift_detected"],
            drift_severity=drift_result["severity"],
            cognitive_state=cognitive_result["state"],
            transaction_amount=transaction_amount,
        )

        # ═══════════════════════════════════════════════════════════════════
        # BUILD RESPONSE
        # ═══════════════════════════════════════════════════════════════════
        latency_ms = (time.perf_counter() - t_start) * 1000

        return TrustUpdate(
            trust_score=trust_result["trust_score"],
            effective_trust=trust_result["effective_trust"],
            decision=decision_result["action"],
            trust_level=trust_result["trust_level"],
            similarity=similarity,
            drift_detected=drift_result["drift_detected"],
            drift_severity=drift_result["severity"],
            cognitive_state=cognitive_result["state"],
            cognitive_stability=cognitive_result["stability_score"],
            transaction_score=tx_result["score"],
            velocity=trust_result["temporal"]["velocity"],
            acceleration=trust_result["temporal"]["acceleration"],
            trend=trust_result["temporal"]["trend"],
            entropy=temporal["entropy"],
            confidence=decision_result["confidence"],
            reasons=decision_result["reasons"],
            step_up_methods=decision_result.get("step_up_methods", []),
            explanation=decision_result["explanation"],
            event_number=ctx.event_count,
            latency_ms=latency_ms,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    def process_batch(
        self,
        ctx: PipelineContext,
        events: List[Dict],
        transaction_amount: float = 0.0,
    ) -> List[TrustUpdate]:
        """
        Process a batch of events sequentially (for replay/simulation).

        Args:
            ctx: Pipeline context for the user.
            events: List of raw events in chronological order.
            transaction_amount: Fixed transaction amount for all events.

        Returns:
            List of TrustUpdate objects, one per event.
        """
        results = []
        for event in events:
            result = self.process(ctx, event, transaction_amount=transaction_amount)
            results.append(result)
        return results
