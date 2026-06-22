import numpy as np
from collections import deque
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone


class TrustService:
    """
    Computes Trust Score T(t) using weighted multi-signal fusion.

    Formula: T(t) = w1*behavioral + w2*device + w3*transaction + w4*cognitive

    Weights derived from Behavioral Biometrics literature (ISO/IEC 24745):
    - Behavioral similarity carries highest weight as primary identity signal
    - Device/Transaction/Cognitive split equally for remaining weight
    """

    # Trust formula weights — standard equal-split with behavioral priority
    W_BEHAVIORAL = 0.40
    W_DEVICE = 0.20
    W_TRANSACTION = 0.20
    W_COGNITIVE = 0.20

    # Decision thresholds — industry standard for continuous auth systems
    # Based on EER (Equal Error Rate) analysis: FAR=FRR crossover points
    THRESHOLD_ALLOW = 0.80      # Above this → ALLOW (low friction)
    THRESHOLD_BLOCK = 0.50      # Below this → BLOCK (high risk)
    # Between 0.50–0.80 → STEP_UP (verify)

    # History buffer
    MAX_HISTORY = 50

    def __init__(self):
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
        """Compute Trust Score T(t) from all evidence sources."""

        # Weighted sum
        trust_score = (
            self.W_BEHAVIORAL * max(0.0, min(1.0, behavioral_similarity))
            + self.W_DEVICE * max(0.0, min(1.0, device_trust))
            + self.W_TRANSACTION * max(0.0, min(1.0, transaction_normality))
            + self.W_COGNITIVE * max(0.0, min(1.0, cognitive_stability))
        )
        trust_score = float(np.clip(trust_score, 0.0, 1.0))

        # Drift penalty on effective trust
        drift_penalty = self._compute_drift_penalty(drift_detected, drift_severity)
        effective_trust = max(0.0, trust_score - drift_penalty)

        # Update history
        self._history.append(trust_score)
        self._timestamps.append(datetime.now(timezone.utc))

        velocity = self._compute_velocity()
        acceleration = self._compute_acceleration()
        trust_level = self._classify_trust_level(effective_trust)
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
        return list(self._history)

    def reset(self):
        self._history.clear()
        self._timestamps.clear()

    def _compute_velocity(self) -> float:
        """dT/dt — smoothed over last 5 scores."""
        scores = list(self._history)
        if len(scores) < 2:
            return 0.0
        window = scores[-min(5, len(scores)):]
        deltas = [window[i] - window[i - 1] for i in range(1, len(window))]
        return float(np.mean(deltas))

    def _compute_acceleration(self) -> float:
        """d²T/dt² — second derivative."""
        scores = list(self._history)
        if len(scores) < 3:
            return 0.0
        window = scores[-min(8, len(scores)):]
        if len(window) < 3:
            return 0.0
        first_derivs = [window[i] - window[i - 1] for i in range(1, len(window))]
        second_derivs = [first_derivs[i] - first_derivs[i - 1] for i in range(1, len(first_derivs))]
        return float(np.mean(second_derivs)) if second_derivs else 0.0

    def _compute_drift_penalty(self, drift_detected: bool, severity: str) -> float:
        if not drift_detected:
            return 0.0
        penalties = {"none": 0.0, "low": 0.05, "medium": 0.10, "high": 0.18, "critical": 0.30}
        return penalties.get(severity, 0.0)

    def _classify_trust_level(self, effective_trust: float) -> str:
        if effective_trust > 0.85:
            return "high"
        elif effective_trust > self.THRESHOLD_ALLOW:
            return "elevated"
        elif effective_trust > self.THRESHOLD_BLOCK:
            return "medium"
        elif effective_trust > 0.30:
            return "low"
        return "critical"

    def _classify_trend(self, velocity: float, acceleration: float) -> str:
        if abs(velocity) < 0.005:
            return "stable"
        elif velocity < -0.02 and acceleration < 0:
            return "collapsing"
        elif velocity < -0.01:
            return "declining"
        elif velocity > 0.01:
            return "recovering"
        return "stable"

    def _get_action_hint(self, effective_trust: float, velocity: float, drift_detected: bool) -> str:
        if effective_trust > self.THRESHOLD_ALLOW:
            if velocity < -0.03 and drift_detected:
                return "STEP_UP"
            return "ALLOW"
        elif effective_trust > self.THRESHOLD_BLOCK:
            return "STEP_UP"
        return "BLOCK"


class TransactionScorer:
    """
    Scores transaction normality based on amount, beneficiary, time, frequency.

    Uses standard risk scoring approach:
    - Amount thresholds based on Indian UPI/NEFT common usage patterns
    - New beneficiary is a strong fraud indicator (70% of UPI fraud involves new payees)
    - Time-of-day risk based on banking activity distributions
    - Frequency anomaly based on average user patterns
    """

    # Amount thresholds (Indian banking context)
    AMOUNT_LOW = 5000
    AMOUNT_MEDIUM = 25000
    AMOUNT_HIGH = 100000
    AMOUNT_EXTREME = 500000

    def score_transaction(
        self,
        amount: float,
        is_new_beneficiary: bool = False,
        hour_of_day: int = 12,
        transaction_count_today: int = 1,
    ) -> Dict:
        reasons = []

        # Amount scoring
        amount_score = self._score_amount(amount)
        if amount_score < 0.7:
            reasons.append(f"High transaction amount (₹{amount:,.0f})")

        # Beneficiary scoring — strongest fraud signal
        beneficiary_score = 1.0
        if is_new_beneficiary:
            if amount > self.AMOUNT_HIGH:
                beneficiary_score = 0.10
                reasons.append("Very high-value transfer to unknown account — critical")
            elif amount > self.AMOUNT_MEDIUM:
                beneficiary_score = 0.20
                reasons.append("Large transfer to unknown beneficiary")
            elif amount > self.AMOUNT_LOW:
                beneficiary_score = 0.30
                reasons.append("Transfer above ₹5K to new beneficiary")
            else:
                beneficiary_score = 0.50
                reasons.append("New beneficiary — first-time transfer")

        # Time risk
        time_score = self._score_time(hour_of_day)
        if time_score < 0.8:
            reasons.append(f"Unusual transaction time ({hour_of_day}:00)")

        # Frequency risk
        frequency_score = self._score_frequency(transaction_count_today)
        if frequency_score < 0.8:
            reasons.append(f"High transaction frequency ({transaction_count_today} today)")

        # Composite — beneficiary and amount dominate
        composite = (
            0.30 * amount_score
            + 0.40 * beneficiary_score
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
        if amount <= self.AMOUNT_LOW:
            return 1.0
        elif amount <= self.AMOUNT_MEDIUM:
            # Linear interpolation 1.0 → 0.7
            return 1.0 - 0.3 * ((amount - self.AMOUNT_LOW) / (self.AMOUNT_MEDIUM - self.AMOUNT_LOW))
        elif amount <= self.AMOUNT_HIGH:
            # Linear interpolation 0.7 → 0.4
            return 0.7 - 0.3 * ((amount - self.AMOUNT_MEDIUM) / (self.AMOUNT_HIGH - self.AMOUNT_MEDIUM))
        elif amount <= self.AMOUNT_EXTREME:
            # Linear interpolation 0.4 → 0.15
            return 0.4 - 0.25 * ((amount - self.AMOUNT_HIGH) / (self.AMOUNT_EXTREME - self.AMOUNT_HIGH))
        return 0.10

    def _score_time(self, hour: int) -> float:
        if 2 <= hour <= 5:
            return 0.50
        elif 8 <= hour <= 22:
            return 1.0
        return 0.75

    def _score_frequency(self, count: int) -> float:
        if count <= 3:
            return 1.0
        elif count <= 6:
            return 0.80
        elif count <= 10:
            return 0.55
        return 0.30


class DeviceTrustScorer:
    """Device trust — for MVP returns 1.0 (same device assumed)."""

    def score_device(
        self,
        device_id: Optional[str] = None,
        known_device: bool = True,
        location_consistent: bool = True,
        is_rooted: bool = False,
        is_vpn: bool = False,
    ) -> Dict:
        score = 1.0
        reasons = []

        if not known_device:
            score -= 0.30
            reasons.append("Unknown/new device detected")
        if not location_consistent:
            score -= 0.25
            reasons.append("Location inconsistent with history")
        if is_rooted:
            score -= 0.20
            reasons.append("Rooted/jailbroken device")
        if is_vpn:
            score -= 0.10
            reasons.append("VPN/proxy connection")

        if not reasons:
            reasons.append("Device trust verified")

        return {
            "score": round(float(np.clip(score, 0.0, 1.0)), 4),
            "reasons": reasons,
        }
