"""
AEGIS-X Phase 5C/5D: Trust Engine
===================================
The central "judge" that aggregates all evidence (similarity, drift, cognitive state,
device trust, transaction normality) into a single Trust Score T(t) with temporal dynamics.

This is THE most important service in AEGIS-X. Everything before this (embedding,
serializer, CUSUM, cognitive classifier) is gathering evidence. The Trust Engine
is the judge that makes the final decision.

Trust Score Formula (from proposal Section 6.a):
    T(t) = 0.40 × behavioral_similarity
         + 0.20 × device_trust
         + 0.20 × transaction_normality
         + 0.20 × cognitive_stability

Temporal Dynamics (from proposal Section 6.a):
    Trust Velocity:      dT/dt   — rate of trust change per 2-second window
    Trust Acceleration:  d²T/dt² — is trust decaying faster or slower?

Why these weights?
    behavioral_similarity (0.40): Strongest signal — embedding distance from baseline.
        If the behavior doesn't match, nothing else matters.
    device_trust (0.20): Device fingerprint, location, OS consistency.
        A new device from a new country is suspicious regardless of behavior.
    transaction_normality (0.20): Amount, beneficiary, frequency patterns.
        ₹500,000 to unknown account at 3AM is abnormal.
    cognitive_stability (0.20): Psychological state from Random Forest.
        Panic + coercion signals that raw metrics might miss.

Engineering note on drift:
    Drift is NOT a separate component in the trust formula.
    Drift comes FROM similarity history (it's the accumulated deviation).
    It acts as a MODIFIER on the decision — if drift is detected,
    the decision engine may escalate even if T(t) is borderline.

Reference: Section 6.a, 6.c of the proposal
"""

import numpy as np
from collections import deque
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone


class TrustService:
    """
    Computes Trust Score T(t) and tracks temporal dynamics.

    The Trust Engine aggregates 4 independent signals into a weighted score,
    then tracks how that score evolves over time (velocity, acceleration).

    A declining trust velocity is far more alarming than a single low score:
    - Single dip: user made a typo, yawned, or shifted position
    - Sustained decline: something is actively going wrong (takeover/coercion)

    Usage:
        trust_engine = TrustService()
        result = trust_engine.compute(
            behavioral_similarity=0.92,
            device_trust=1.0,
            transaction_normality=0.85,
            cognitive_stability=0.90
        )
        # result["trust_score"] = 0.918
        # result["action_hint"] = "ALLOW"
    """

    # Trust formula weights (from proposal Section 6.a)
    W_BEHAVIORAL = 0.40
    W_DEVICE = 0.20
    W_TRANSACTION = 0.20
    W_COGNITIVE = 0.20

    # Decision thresholds (from proposal Section 6.c)
    THRESHOLD_ALLOW = 0.85
    THRESHOLD_BLOCK = 0.60

    # Trust history buffer for temporal dynamics
    MAX_HISTORY = 50  # 100 seconds at 2s intervals

    def __init__(self):
        """Initialize trust engine with empty history."""
        self._history: deque = deque(maxlen=self.MAX_HISTORY)
        self._timestamps: deque = deque(maxlen=self.MAX_HISTORY)

    def compute(
        self,
        behavioral_similarity: float,
        device_trust: float = 1.0,
        transaction_normality: float = 1.0,
        cognitive_stability: float = 1.0,
        drift_detected: bool = False,
        drift_severity: str = "none",
    ) -> Dict:
        """
        Compute Trust Score T(t) from all evidence sources.

        Args:
            behavioral_similarity: Cosine similarity to baseline [0, 1].
                                   From SimilarityService.
            device_trust: Device fingerprint confidence [0, 1].
                         MVP default: 1.0 (same device assumed).
            transaction_normality: Transaction pattern score [0, 1].
                                  From TransactionScorer.
            cognitive_stability: Cognitive state stability [0, 1].
                               From CognitiveService.get_stability_score().
            drift_detected: Whether CUSUM has triggered (from DriftService).
            drift_severity: Drift severity level for decision modifier.

        Returns:
            Comprehensive trust assessment:
            - trust_score: T(t) [0, 1]
            - components: breakdown of each weighted contribution
            - velocity: dT/dt (rate of trust change)
            - acceleration: d²T/dt² (change in velocity)
            - action_hint: preliminary decision (ALLOW/STEP_UP/BLOCK)
            - trust_level: categorical ("high", "medium", "low", "critical")
            - drift_modifier: how drift affects the decision
        """
        # ─── COMPUTE RAW TRUST SCORE T(t) ─────────────────────────────────
        trust_score = (
            self.W_BEHAVIORAL * max(0.0, behavioral_similarity)
            + self.W_DEVICE * max(0.0, device_trust)
            + self.W_TRANSACTION * max(0.0, transaction_normality)
            + self.W_COGNITIVE * max(0.0, cognitive_stability)
        )
        trust_score = float(np.clip(trust_score, 0.0, 1.0))

        # ─── APPLY DRIFT PENALTY ──────────────────────────────────────────
        # Drift doesn't change T(t) directly, but affects the decision boundary
        drift_penalty = self._compute_drift_penalty(drift_detected, drift_severity)

        # Effective trust (what the decision engine sees)
        effective_trust = max(0.0, trust_score - drift_penalty)

        # ─── UPDATE HISTORY & COMPUTE TEMPORAL DYNAMICS ────────────────────
        self._history.append(trust_score)
        self._timestamps.append(datetime.now(timezone.utc))

        velocity = self._compute_velocity()
        acceleration = self._compute_acceleration()

        # ─── CLASSIFY TRUST LEVEL ──────────────────────────────────────────
        trust_level = self._classify_trust_level(effective_trust)

        # ─── PRELIMINARY DECISION HINT ─────────────────────────────────────
        action_hint = self._get_action_hint(effective_trust, velocity, drift_detected)

        return {
            "trust_score": round(trust_score, 4),
            "effective_trust": round(effective_trust, 4),
            "trust_level": trust_level,
            "action_hint": action_hint,
            "components": {
                "behavioral_similarity": round(self.W_BEHAVIORAL * behavioral_similarity, 4),
                "device_trust": round(self.W_DEVICE * device_trust, 4),
                "transaction_normality": round(self.W_TRANSACTION * transaction_normality, 4),
                "cognitive_stability": round(self.W_COGNITIVE * cognitive_stability, 4),
            },
            "temporal": {
                "velocity": round(velocity, 6),
                "acceleration": round(acceleration, 6),
                "trend": self._classify_trend(velocity, acceleration),
            },
            "drift": {
                "detected": drift_detected,
                "severity": drift_severity,
                "penalty": round(drift_penalty, 4),
            },
            "history_length": len(self._history),
        }

    def get_trust_history(self) -> List[float]:
        """Return the full trust score history."""
        return list(self._history)

    def reset(self):
        """Reset trust history (new session start)."""
        self._history.clear()
        self._timestamps.clear()

    # ═══════════════════════════════════════════════════════════════════════
    # TEMPORAL DYNAMICS
    # ═══════════════════════════════════════════════════════════════════════

    def _compute_velocity(self) -> float:
        """
        Trust Velocity: dT/dt — rate of trust change.
        Computed as smoothed first derivative over last 5 scores.

        Positive = trust recovering
        Negative = trust decaying (BAD)
        """
        scores = list(self._history)
        if len(scores) < 2:
            return 0.0

        window = scores[-min(5, len(scores)):]
        deltas = [window[i] - window[i - 1] for i in range(1, len(window))]
        return float(np.mean(deltas))

    def _compute_acceleration(self) -> float:
        """
        Trust Acceleration: d²T/dt² — is trust decaying faster or slower?

        Negative velocity + negative acceleration = ACCELERATING DECAY
        (attack is getting worse, escalate immediately)

        Negative velocity + positive acceleration = DECELERATING DECAY
        (attack slowing down or intervention working)
        """
        scores = list(self._history)
        if len(scores) < 3:
            return 0.0

        window = scores[-min(8, len(scores)):]
        if len(window) < 3:
            return 0.0

        first_derivs = [window[i] - window[i - 1] for i in range(1, len(window))]
        second_derivs = [
            first_derivs[i] - first_derivs[i - 1]
            for i in range(1, len(first_derivs))
        ]
        return float(np.mean(second_derivs)) if second_derivs else 0.0

    # ═══════════════════════════════════════════════════════════════════════
    # DRIFT PENALTY
    # ═══════════════════════════════════════════════════════════════════════

    def _compute_drift_penalty(self, drift_detected: bool, severity: str) -> float:
        """
        Compute penalty applied to trust score when drift is detected.
        Drift doesn't change the raw T(t) but lowers the effective trust
        that the decision engine uses.

        This means a user at T(t)=0.87 (normally ALLOW) can be downgraded
        to STEP_UP if drift is detected — adding an extra safety layer.
        """
        if not drift_detected:
            return 0.0

        severity_penalties = {
            "none": 0.0,
            "low": 0.03,
            "medium": 0.08,
            "high": 0.15,
            "critical": 0.25,
        }
        return severity_penalties.get(severity, 0.0)

    # ═══════════════════════════════════════════════════════════════════════
    # CLASSIFICATION
    # ═══════════════════════════════════════════════════════════════════════

    def _classify_trust_level(self, effective_trust: float) -> str:
        """Categorical trust level for dashboard/logging."""
        if effective_trust > 0.90:
            return "high"
        elif effective_trust > self.THRESHOLD_ALLOW:
            return "elevated"
        elif effective_trust > self.THRESHOLD_BLOCK:
            return "medium"
        elif effective_trust > 0.40:
            return "low"
        return "critical"

    def _classify_trend(self, velocity: float, acceleration: float) -> str:
        """Classify the trust trajectory pattern."""
        if abs(velocity) < 0.005:
            return "stable"
        elif velocity < -0.02 and acceleration < 0:
            return "collapsing"  # Accelerating decay — worst case
        elif velocity < -0.01:
            return "declining"
        elif velocity > 0.01:
            return "recovering"
        return "stable"

    def _get_action_hint(
        self, effective_trust: float, velocity: float, drift_detected: bool
    ) -> str:
        """
        Preliminary action recommendation based on trust + velocity + drift.

        Goes beyond simple threshold checking:
        - Rapid trust decline can trigger STEP_UP even if T > 0.85
        - Drift detection can escalate ALLOW → STEP_UP
        """
        # Hard thresholds
        if effective_trust > self.THRESHOLD_ALLOW:
            # Even in ALLOW zone, rapid decay is concerning
            if velocity < -0.03 and drift_detected:
                return "STEP_UP"  # Escalate: trust is high but falling fast
            return "ALLOW"
        elif effective_trust > self.THRESHOLD_BLOCK:
            return "STEP_UP"
        return "BLOCK"


class TransactionScorer:
    """
    Phase 5B: Transaction Normality Scorer.

    Evaluates how normal a transaction is relative to user's history.
    For MVP, uses simple amount-based heuristics.

    Production would include:
    - Historical amount patterns (mean, std, percentiles)
    - Beneficiary familiarity (known vs new accounts)
    - Time-of-day patterns
    - Frequency analysis (unusual burst of transactions)
    - Geographic consistency
    """

    # Amount thresholds for Indian UPI context
    AMOUNT_LOW = 5000        # ₹5,000 — everyday transactions
    AMOUNT_MEDIUM = 25000    # ₹25,000 — moderate (rent, bills)
    AMOUNT_HIGH = 100000     # ₹1,00,000 — significant
    AMOUNT_EXTREME = 500000  # ₹5,00,000 — very high risk

    def score_transaction(
        self,
        amount: float,
        is_new_beneficiary: bool = False,
        hour_of_day: int = 12,
        transaction_count_today: int = 1,
    ) -> Dict:
        """
        Score transaction normality based on multiple factors.

        Args:
            amount: Transaction amount in ₹
            is_new_beneficiary: Whether recipient is new/unknown
            hour_of_day: Hour (0-23) — late night transactions are riskier
            transaction_count_today: How many transactions already today

        Returns:
            Dictionary with:
            - score: composite normality score [0, 1]
            - amount_risk: amount-based risk factor
            - beneficiary_risk: new beneficiary penalty
            - time_risk: unusual time penalty
            - frequency_risk: unusual frequency penalty
            - reasons: list of risk factors
        """
        reasons = []

        # Amount risk
        amount_score = self._score_amount(amount)
        if amount_score < 0.7:
            reasons.append(f"High transaction amount (₹{amount:,.0f})")

        # Beneficiary risk
        beneficiary_score = 0.6 if is_new_beneficiary else 1.0
        if is_new_beneficiary:
            reasons.append("New/unknown beneficiary")

        # Time risk (2 AM - 5 AM is unusual for banking)
        time_score = self._score_time(hour_of_day)
        if time_score < 0.8:
            reasons.append(f"Unusual transaction time ({hour_of_day}:00)")

        # Frequency risk (more than 5 transactions/day is unusual)
        frequency_score = self._score_frequency(transaction_count_today)
        if frequency_score < 0.8:
            reasons.append(f"High transaction frequency ({transaction_count_today} today)")

        # Composite score (weighted)
        composite = (
            0.45 * amount_score
            + 0.25 * beneficiary_score
            + 0.15 * time_score
            + 0.15 * frequency_score
        )

        if not reasons:
            reasons.append("Transaction within normal parameters")

        return {
            "score": round(float(np.clip(composite, 0.0, 1.0)), 4),
            "amount_risk": round(amount_score, 4),
            "beneficiary_risk": round(beneficiary_score, 4),
            "time_risk": round(time_score, 4),
            "frequency_risk": round(frequency_score, 4),
            "reasons": reasons,
        }

    def _score_amount(self, amount: float) -> float:
        """Score based on transaction amount (higher amount → lower score)."""
        if amount <= self.AMOUNT_LOW:
            return 1.0
        elif amount <= self.AMOUNT_MEDIUM:
            return 0.85
        elif amount <= self.AMOUNT_HIGH:
            return 0.60
        elif amount <= self.AMOUNT_EXTREME:
            return 0.35
        return 0.15

    def _score_time(self, hour: int) -> float:
        """Score based on time of day."""
        # 2 AM - 5 AM is suspicious for banking
        if 2 <= hour <= 5:
            return 0.5
        # Normal banking hours
        elif 8 <= hour <= 22:
            return 1.0
        # Early morning / late night
        return 0.75

    def _score_frequency(self, count: int) -> float:
        """Score based on transaction count today."""
        if count <= 3:
            return 1.0
        elif count <= 6:
            return 0.85
        elif count <= 10:
            return 0.60
        return 0.35


class DeviceTrustScorer:
    """
    Phase 5A: Device Trust Module.

    For MVP/hackathon: returns 1.0 (same device assumed).

    Production would evaluate:
    - Device ID consistency (same phone?)
    - OS version (rooted/jailbroken?)
    - IP geolocation (impossible travel?)
    - Network type (VPN/Tor?)
    - Screen resolution/device model changes
    - Session history on this device
    """

    def score_device(
        self,
        device_id: Optional[str] = None,
        known_device: bool = True,
        location_consistent: bool = True,
        is_rooted: bool = False,
        is_vpn: bool = False,
    ) -> Dict:
        """
        Score device trustworthiness.

        For hackathon MVP, this returns 1.0 unless explicitly flagged.
        Production would compare against stored device fingerprints.

        Returns:
            Dictionary with score and risk factors.
        """
        score = 1.0
        reasons = []

        if not known_device:
            score -= 0.30
            reasons.append("Unknown/new device detected")

        if not location_consistent:
            score -= 0.25
            reasons.append("Location inconsistent with history (impossible travel?)")

        if is_rooted:
            score -= 0.20
            reasons.append("Rooted/jailbroken device detected")

        if is_vpn:
            score -= 0.10
            reasons.append("VPN/proxy connection detected")

        if not reasons:
            reasons.append("Device trust verified — consistent with history")

        return {
            "score": round(float(np.clip(score, 0.0, 1.0)), 4),
            "reasons": reasons,
        }
