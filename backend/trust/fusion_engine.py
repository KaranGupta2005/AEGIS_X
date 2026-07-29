"""
Trust Fusion Engine — Central intelligence layer.

Collects evidence from all subsystems, normalizes, fuses, and produces
a continuously evolving trust probability with full explainability.

Pipeline:
    Evidence Collection → Normalization → Weight Assignment → Bayesian Fusion
    → Confidence Calibration → Decision → Explanation
"""

import time
import math
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, field
from collections import defaultdict

from backend.trust.evidence import (
    Evidence, EvidenceCategory, EvidenceSource, EvidenceSeverity,
)


# ═══════════════════════════════════════════════════════════════════════════════
# POLICY ENGINE (configurable, no hard-coded thresholds)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TrustPolicy:
    """Bank-specific configurable policy. Everything is tunable."""
    # Decision thresholds
    allow_threshold: float = 0.85
    monitor_threshold: float = 0.70
    voice_verify_threshold: float = 0.55
    face_verify_threshold: float = 0.40
    sandbox_threshold: float = 0.30
    terminate_threshold: float = 0.15

    # Category weights (how much each evidence category matters)
    weight_behavior: float = 0.30
    weight_identity: float = 0.20
    weight_context: float = 0.15
    weight_verification: float = 0.15
    weight_threat: float = 0.10
    weight_device: float = 0.05
    weight_historical: float = 0.05

    # Risk tolerance
    max_latency_ms: float = 100.0
    max_evidence_age_seconds: float = 300.0
    min_evidence_for_decision: int = 3

    # Verification policy
    allowed_methods: List[str] = field(default_factory=lambda: [
        "ALLOW", "PASSIVE_MONITORING", "VOICE_VERIFICATION",
        "FACE_LIVENESS", "DELEGATE_VERIFICATION", "ENTER_SANDBOX",
        "TRANSACTION_HOLD", "ESCALATE_TO_ANALYST", "TERMINATE_SESSION",
    ])


DEFAULT_POLICY = TrustPolicy()


# ═══════════════════════════════════════════════════════════════════════════════
# TRUST CALCULATION RESULT
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TrustResult:
    """Complete output of one trust fusion cycle."""
    trust_score: float              # Final fused trust [0,1]
    confidence: float               # How confident we are in this score [0,1]
    decision: str                   # Action: ALLOW, VOICE_VERIFICATION, etc.
    risk_level: str                 # low/medium/high/critical
    evidence_count: int             # Number of evidence items considered
    top_contributors: List[Dict]    # Top risk/trust contributors
    explanation: str                # Human-readable explanation
    executive_summary: str          # One-line summary
    timestamp: float = 0.0
    latency_ms: float = 0.0
    policy_used: str = "default"
    containment_state: str = "NORMAL"
    verification_status: str = "none"

    def to_dict(self) -> Dict:
        return {
            "trust_score": round(self.trust_score, 4),
            "confidence": round(self.confidence, 4),
            "decision": self.decision,
            "risk_level": self.risk_level,
            "evidence_count": self.evidence_count,
            "top_contributors": self.top_contributors[:5],
            "explanation": self.explanation,
            "executive_summary": self.executive_summary,
            "timestamp": self.timestamp,
            "latency_ms": round(self.latency_ms, 1),
            "policy_used": self.policy_used,
            "containment_state": self.containment_state,
            "verification_status": self.verification_status,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# EVIDENCE COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════════

class EvidenceCollector:
    """Collects and manages evidence from all providers per session."""

    def __init__(self, max_age_seconds: float = 300.0):
        self._evidence: Dict[str, List[Evidence]] = defaultdict(list)  # session_key → evidence
        self._max_age = max_age_seconds

    def submit(self, user_id: str, session_id: str, evidence: Evidence):
        """Submit a piece of evidence."""
        key = f"{user_id}:{session_id}"
        self._evidence[key].append(evidence)
        # Prune expired
        self._evidence[key] = [e for e in self._evidence[key] if not e.is_expired]
        # Cap at 200
        if len(self._evidence[key]) > 200:
            self._evidence[key] = self._evidence[key][-200:]

    def get_active(self, user_id: str, session_id: str) -> List[Evidence]:
        """Get all non-expired evidence for a session."""
        key = f"{user_id}:{session_id}"
        active = [e for e in self._evidence.get(key, []) if not e.is_expired]
        self._evidence[key] = active
        return active

    def get_by_category(self, user_id: str, session_id: str, category: EvidenceCategory) -> List[Evidence]:
        return [e for e in self.get_active(user_id, session_id) if e.category == category]

    def clear(self, user_id: str, session_id: str):
        key = f"{user_id}:{session_id}"
        self._evidence.pop(key, None)


# ═══════════════════════════════════════════════════════════════════════════════
# EVIDENCE NORMALIZER
# ═══════════════════════════════════════════════════════════════════════════════

class EvidenceNormalizer:
    """Normalizes raw evidence values and applies time decay."""

    def normalize(self, evidence_list: List[Evidence]) -> List[Evidence]:
        """Apply decay and normalize all evidence values."""
        # Already expired items filtered by collector
        for e in evidence_list:
            # Clamp values
            e.value = max(-1.0, min(1.0, e.value))
            e.confidence = max(0.0, min(1.0, e.confidence))
            e.weight = max(0.01, e.weight)
        return evidence_list


# ═══════════════════════════════════════════════════════════════════════════════
# RISK FUSION MODEL (Weighted Bayesian)
# ═══════════════════════════════════════════════════════════════════════════════

class RiskFusionModel:
    """
    Multi-evidence fusion using weighted log-odds (Bayesian approach).

    Each evidence item shifts the trust probability up or down based on
    its value, confidence, weight, and time decay.

    This is more principled than simple weighted averaging because:
    - Multiple weak signals compound correctly
    - A single strong negative signal can override many weak positives
    - Time decay naturally reduces the influence of stale evidence
    """

    def __init__(self, policy: TrustPolicy = DEFAULT_POLICY):
        self._policy = policy
        self._category_weights = {
            EvidenceCategory.BEHAVIOR: policy.weight_behavior,
            EvidenceCategory.IDENTITY: policy.weight_identity,
            EvidenceCategory.CONTEXT: policy.weight_context,
            EvidenceCategory.VERIFICATION: policy.weight_verification,
            EvidenceCategory.THREAT: policy.weight_threat,
            EvidenceCategory.DEVICE: policy.weight_device,
            EvidenceCategory.HISTORICAL: policy.weight_historical,
            EvidenceCategory.DELEGATE: policy.weight_identity,
        }

    def fuse(self, evidence_list: List[Evidence], prior_trust: float = 0.90) -> Tuple[float, float, List[Dict]]:
        """
        Fuse all evidence into a single trust probability.

        Uses log-odds (logit) space for Bayesian update:
            logit(trust) = log(p / (1-p))
            updated_logit = prior_logit + sum(evidence_contributions)
            final_trust = sigmoid(updated_logit)

        Returns: (trust_score, confidence, top_contributors)
        """
        if not evidence_list:
            return prior_trust, 0.5, []

        # Convert prior to log-odds
        prior_clamped = max(0.01, min(0.99, prior_trust))
        logit = math.log(prior_clamped / (1 - prior_clamped))

        contributors = []

        for e in evidence_list:
            cat_weight = self._category_weights.get(e.category, 0.1)
            contribution = e.effective_value * cat_weight

            # Apply contribution to logit
            logit += contribution * 3.0  # Scale factor for sensitivity

            contributors.append({
                "evidence_type": e.evidence_type,
                "source": e.source.value,
                "category": e.category.value,
                "contribution": round(contribution, 4),
                "reason": e.reason,
                "severity": e.severity.value,
            })

        # Convert back to probability
        trust = 1.0 / (1.0 + math.exp(-logit))
        trust = max(0.0, min(1.0, trust))

        # Confidence: based on evidence quantity and consistency
        values = [e.effective_value for e in evidence_list]
        consistency = 1.0 - min(1.0, float(np.std(values)) * 2) if len(values) > 1 else 0.5
        quantity_factor = min(1.0, len(evidence_list) / 10.0)
        confidence = consistency * 0.6 + quantity_factor * 0.4

        # Sort contributors by absolute impact
        contributors.sort(key=lambda c: abs(c["contribution"]), reverse=True)

        return trust, confidence, contributors


# ═══════════════════════════════════════════════════════════════════════════════
# DECISION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class DecisionEngine:
    """Configurable policy-based decision making. No hard-coded rules."""

    def __init__(self, policy: TrustPolicy = DEFAULT_POLICY):
        self._policy = policy

    def decide(self, trust_score: float, confidence: float, evidence_list: List[Evidence]) -> str:
        """Map trust score to a decision based on policy thresholds."""
        p = self._policy

        # Check for critical signals that override thresholds
        for e in evidence_list:
            if e.severity == EvidenceSeverity.CRITICAL and not e.is_expired:
                if e.evidence_type in ("coercion_detected", "robotic_behavior"):
                    return "TERMINATE_SESSION"
                if e.evidence_type == "bot_detected":
                    return "ENTER_SANDBOX"

        if trust_score >= p.allow_threshold:
            return "ALLOW"
        elif trust_score >= p.monitor_threshold:
            return "PASSIVE_MONITORING"
        elif trust_score >= p.voice_verify_threshold:
            return "VOICE_VERIFICATION"
        elif trust_score >= p.face_verify_threshold:
            return "FACE_LIVENESS"
        elif trust_score >= p.sandbox_threshold:
            return "ENTER_SANDBOX"
        elif trust_score >= p.terminate_threshold:
            return "TRANSACTION_HOLD"
        else:
            return "TERMINATE_SESSION"

    def get_risk_level(self, trust_score: float) -> str:
        if trust_score >= 0.80:
            return "low"
        elif trust_score >= 0.60:
            return "medium"
        elif trust_score >= 0.40:
            return "high"
        return "critical"


# ═══════════════════════════════════════════════════════════════════════════════
# EXPLAINABILITY ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class ExplainabilityEngine:
    """Generates human-readable explanations for every trust decision."""

    def explain(self, trust_score: float, decision: str, contributors: List[Dict], evidence_count: int) -> Tuple[str, str]:
        """
        Generate both a technical explanation and an executive summary.

        Returns: (technical_explanation, executive_summary)
        """
        # Executive summary (one line)
        if decision == "ALLOW":
            summary = f"Session trusted ({trust_score:.0%} confidence). All signals normal."
        elif decision == "PASSIVE_MONITORING":
            summary = f"Elevated observation ({trust_score:.0%}). Minor behavioral variance detected."
        elif decision in ("VOICE_VERIFICATION", "FACE_LIVENESS"):
            summary = f"Verification required ({trust_score:.0%}). Behavioral anomaly detected."
        elif decision == "ENTER_SANDBOX":
            summary = f"Session sandboxed ({trust_score:.0%}). Significant threat indicators present."
        elif decision == "TRANSACTION_HOLD":
            summary = f"Transaction held ({trust_score:.0%}). Critical risk — awaiting manual review."
        else:
            summary = f"Session terminated ({trust_score:.0%}). Critical security violation."

        # Technical explanation
        parts = [f"Trust Fusion Result: {trust_score:.4f} → Decision: {decision}"]
        parts.append(f"Evidence items evaluated: {evidence_count}")
        parts.append("")

        if contributors:
            parts.append("Top contributing signals:")
            for c in contributors[:5]:
                direction = "↑" if c["contribution"] > 0 else "↓"
                parts.append(f"  {direction} [{c['category']}] {c['evidence_type']}: {c['reason']} (impact: {c['contribution']:+.4f})")

        parts.append("")
        parts.append(f"Risk Level: {self._risk_label(trust_score)}")

        technical = "\n".join(parts)
        return technical, summary

    def _risk_label(self, trust: float) -> str:
        if trust >= 0.80: return "LOW — normal operation"
        if trust >= 0.60: return "MEDIUM — increased monitoring"
        if trust >= 0.40: return "HIGH — verification required"
        return "CRITICAL — containment/termination"


# ═══════════════════════════════════════════════════════════════════════════════
# TRUST HISTORY SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class TrustHistoryService:
    """Stores complete trust timeline per session for playback."""

    def __init__(self):
        self._history: Dict[str, List[Dict]] = defaultdict(list)

    def record(self, user_id: str, session_id: str, result: TrustResult):
        key = f"{user_id}:{session_id}"
        entry = {
            "timestamp": result.timestamp,
            "trust_score": round(result.trust_score, 4),
            "confidence": round(result.confidence, 4),
            "decision": result.decision,
            "risk_level": result.risk_level,
            "evidence_count": result.evidence_count,
            "containment_state": result.containment_state,
            "verification_status": result.verification_status,
            "executive_summary": result.executive_summary,
        }
        self._history[key].append(entry)
        if len(self._history[key]) > 500:
            self._history[key] = self._history[key][-500:]

    def get_timeline(self, user_id: str, session_id: str, limit: int = 100) -> List[Dict]:
        key = f"{user_id}:{session_id}"
        return self._history.get(key, [])[-limit:]

    def get_trend(self, user_id: str, session_id: str) -> str:
        timeline = self.get_timeline(user_id, session_id, 10)
        if len(timeline) < 3:
            return "stable"
        scores = [t["trust_score"] for t in timeline]
        if scores[-1] > scores[0] + 0.05:
            return "improving"
        elif scores[-1] < scores[0] - 0.05:
            return "declining"
        return "stable"


# ═══════════════════════════════════════════════════════════════════════════════
# TRUST FUSION ENGINE (Central Orchestrator)
# ═══════════════════════════════════════════════════════════════════════════════

class TrustFusionEngine:
    """
    THE central intelligence layer of AEGIS-X.

    Orchestrates: Evidence Collection → Normalization → Fusion → Decision → Explanation.

    Usage:
        engine = TrustFusionEngine()
        engine.submit_evidence(user_id, session_id, evidence)
        result = engine.compute_trust(user_id, session_id)
    """

    def __init__(self, policy: TrustPolicy = DEFAULT_POLICY):
        self._policy = policy
        self._collector = EvidenceCollector(max_age_seconds=policy.max_evidence_age_seconds)
        self._normalizer = EvidenceNormalizer()
        self._fusion = RiskFusionModel(policy)
        self._decision = DecisionEngine(policy)
        self._explainer = ExplainabilityEngine()
        self._history = TrustHistoryService()
        self._prior_trust: Dict[str, float] = {}  # session → last trust (evicted on session end)

    def clear_session(self, user_id: str, session_id: str):
        """Evict session state to prevent memory leak."""
        key = f"{user_id}:{session_id}"
        self._prior_trust.pop(key, None)
        self._collector.clear(user_id, session_id)

    # ── SUBMIT EVIDENCE ───────────────────────────────────────────────────

    def submit_evidence(self, user_id: str, session_id: str, evidence: Evidence):
        """Submit a single piece of evidence from any subsystem."""
        self._collector.submit(user_id, session_id, evidence)

    def submit_batch(self, user_id: str, session_id: str, evidence_list: List[Evidence]):
        """Submit multiple evidence items at once."""
        for e in evidence_list:
            self._collector.submit(user_id, session_id, e)

    # ── COMPUTE TRUST ─────────────────────────────────────────────────────

    def compute_trust(self, user_id: str, session_id: str) -> TrustResult:
        """
        Execute the full trust fusion pipeline.

        Returns a complete TrustResult with score, decision, and explanation.
        """
        t_start = time.perf_counter()
        key = f"{user_id}:{session_id}"
        now = time.time()

        # Step 1: Collect active evidence
        evidence_list = self._collector.get_active(user_id, session_id)

        # Step 2: Normalize
        evidence_list = self._normalizer.normalize(evidence_list)

        # Step 3: Fuse (Bayesian log-odds)
        prior = self._prior_trust.get(key, 0.90)
        trust_score, confidence, contributors = self._fusion.fuse(evidence_list, prior)

        # Step 4: Decision
        decision = self._decision.decide(trust_score, confidence, evidence_list)
        risk_level = self._decision.get_risk_level(trust_score)

        # Step 5: Explain
        technical, summary = self._explainer.explain(trust_score, decision, contributors, len(evidence_list))

        # Build result
        latency_ms = (time.perf_counter() - t_start) * 1000
        result = TrustResult(
            trust_score=trust_score,
            confidence=confidence,
            decision=decision,
            risk_level=risk_level,
            evidence_count=len(evidence_list),
            top_contributors=contributors[:5],
            explanation=technical,
            executive_summary=summary,
            timestamp=now,
            latency_ms=latency_ms,
            policy_used="default",
        )

        # Update prior for next cycle
        self._prior_trust[key] = trust_score

        # Record in history
        self._history.record(user_id, session_id, result)

        return result

    # ── CONVENIENCE: Create evidence from existing subsystem outputs ──────

    def ingest_behavioral_event(
        self,
        user_id: str,
        session_id: str,
        similarity: float,
        cognitive_state: str,
        cognitive_stability: float,
        drift_detected: bool,
        drift_severity: str,
        anomaly_score: float,
        velocity: float,
    ):
        """Convert a behavioral pipeline result into evidence items."""
        evidence_list = []

        # Behavioral similarity
        evidence_list.append(Evidence(
            source=EvidenceSource.SIMILARITY_SERVICE,
            category=EvidenceCategory.BEHAVIOR,
            evidence_type="behavior_similarity",
            value=similarity * 2 - 1,  # Map [0,1] → [-1,1]
            confidence=0.9,
            weight=1.0,
            reason=f"Behavioral similarity: {similarity:.4f}",
            severity=EvidenceSeverity.INFO if similarity > 0.8 else EvidenceSeverity.MEDIUM,
        ))

        # Cognitive state
        cognitive_values = {"calm": 0.8, "focused": 0.6, "distressed": -0.3, "panicked": -0.6, "coerced": -0.9, "robotic": -1.0}
        cog_val = cognitive_values.get(cognitive_state, 0.0)
        evidence_list.append(Evidence(
            source=EvidenceSource.COGNITIVE_SERVICE,
            category=EvidenceCategory.BEHAVIOR,
            evidence_type="cognitive_state",
            value=cog_val,
            confidence=cognitive_stability,
            weight=1.2,
            reason=f"Cognitive state: {cognitive_state} (stability: {cognitive_stability:.2f})",
            severity=EvidenceSeverity.CRITICAL if cognitive_state in ("coerced", "robotic") else EvidenceSeverity.INFO,
        ))

        # Drift
        if drift_detected:
            drift_values = {"low": -0.2, "medium": -0.4, "high": -0.7, "critical": -0.9}
            evidence_list.append(Evidence(
                source=EvidenceSource.DRIFT_DETECTOR,
                category=EvidenceCategory.BEHAVIOR,
                evidence_type="behavior_drift",
                value=drift_values.get(drift_severity, -0.3),
                confidence=0.85,
                weight=1.1,
                reason=f"CUSUM drift detected: {drift_severity}",
                severity=EvidenceSeverity.HIGH if drift_severity in ("high", "critical") else EvidenceSeverity.MEDIUM,
            ))

        # Anomaly
        if anomaly_score > 0.3:
            evidence_list.append(Evidence(
                source=EvidenceSource.ANOMALY_DETECTOR,
                category=EvidenceCategory.BEHAVIOR,
                evidence_type="anomaly_detected",
                value=-(anomaly_score * 2 - 1),  # High anomaly → negative
                confidence=anomaly_score,
                weight=0.8,
                reason=f"Anomaly score: {anomaly_score:.4f}",
                severity=EvidenceSeverity.HIGH if anomaly_score > 0.7 else EvidenceSeverity.MEDIUM,
            ))

        # Velocity
        if velocity < -0.02:
            evidence_list.append(Evidence(
                source=EvidenceSource.BEHAVIORAL_SDK,
                category=EvidenceCategory.BEHAVIOR,
                evidence_type="trust_velocity_decline",
                value=max(-1.0, velocity * 20),
                confidence=0.8,
                weight=0.7,
                reason=f"Trust declining rapidly (velocity: {velocity:.4f}/step)",
                severity=EvidenceSeverity.MEDIUM,
            ))

        self.submit_batch(user_id, session_id, evidence_list)

    def ingest_transaction_context(
        self,
        user_id: str,
        session_id: str,
        amount: float,
        is_new_beneficiary: bool,
    ):
        """Convert transaction context into evidence."""
        evidence_list = []

        if amount > 50000:
            evidence_list.append(Evidence(
                source=EvidenceSource.TRANSACTION_SCORER,
                category=EvidenceCategory.CONTEXT,
                evidence_type="large_transaction",
                value=-0.3 if amount > 100000 else -0.15,
                confidence=0.9,
                weight=1.0,
                reason=f"High-value transaction: ₹{amount:,.0f}",
                severity=EvidenceSeverity.MEDIUM,
            ))

        if is_new_beneficiary:
            evidence_list.append(Evidence(
                source=EvidenceSource.TRANSACTION_SCORER,
                category=EvidenceCategory.CONTEXT,
                evidence_type="unknown_beneficiary",
                value=-0.4,
                confidence=0.95,
                weight=1.2,
                reason="Transfer to unknown/new beneficiary",
                severity=EvidenceSeverity.HIGH,
            ))

        if evidence_list:
            self.submit_batch(user_id, session_id, evidence_list)

    def ingest_verification_result(
        self,
        user_id: str,
        session_id: str,
        verification_type: str,
        success: bool,
        confidence: float,
    ):
        """Record verification outcome as evidence."""
        self.submit_evidence(user_id, session_id, Evidence(
            source=EvidenceSource.VERIFICATION_ENGINE,
            category=EvidenceCategory.VERIFICATION,
            evidence_type=f"{verification_type.lower()}_result",
            value=0.5 if success else -0.6,
            confidence=confidence,
            weight=1.5,  # Verification results are high-weight
            reason=f"{verification_type} {'passed' if success else 'failed'} (confidence: {confidence:.2f})",
            severity=EvidenceSeverity.INFO if success else EvidenceSeverity.HIGH,
            expiry_seconds=600.0,  # Verification evidence lasts longer
        ))

    # ── QUERIES ───────────────────────────────────────────────────────────

    def get_timeline(self, user_id: str, session_id: str, limit: int = 100) -> List[Dict]:
        return self._history.get_timeline(user_id, session_id, limit)

    def get_trend(self, user_id: str, session_id: str) -> str:
        return self._history.get_trend(user_id, session_id)

    def get_evidence_feed(self, user_id: str, session_id: str) -> List[Dict]:
        evidence = self._collector.get_active(user_id, session_id)
        return [e.to_dict() for e in sorted(evidence, key=lambda x: x.timestamp, reverse=True)[:20]]
