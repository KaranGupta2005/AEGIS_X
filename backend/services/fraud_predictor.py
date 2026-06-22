"""
Fraud Intent Predictor.

Estimates fraud probability and classifies attack trajectory from
aggregated signals. Uses standard risk fusion approach:
    fraud_probability = max(coercion, takeover, robotic, anomaly)

Each sub-estimator uses linear mappings with standard cutoffs.
"""

import numpy as np
from typing import Dict, List
from dataclasses import dataclass


@dataclass
class IntentVector:
    coercion_probability: float
    takeover_probability: float
    anomaly_severity: float
    robotic_probability: float


class FraudPredictor:

    def __init__(self):
        self._history: List[Dict] = []
        self._max_history = 30

    def predict_intent(
        self,
        trust_score: float,
        similarity: float,
        cognitive_state: str,
        drift_detected: bool,
        drift_severity: str,
        velocity: float,
        entropy: float,
        anomaly_score: float = 0.0,
    ) -> Dict:

        coercion = self._estimate_coercion(cognitive_state, trust_score, velocity)
        takeover = self._estimate_takeover(similarity, drift_detected, drift_severity, velocity)
        robotic = self._estimate_robotic(cognitive_state, entropy)
        anomaly_sev = self._estimate_anomaly_severity(anomaly_score, drift_severity)

        intent = IntentVector(
            coercion_probability=coercion,
            takeover_probability=takeover,
            anomaly_severity=anomaly_sev,
            robotic_probability=robotic,
        )

        fraud_probability = max(coercion, takeover, robotic, anomaly_sev)
        trajectory = self._classify_trajectory(trust_score, velocity)

        self._history.append({
            "trust": trust_score,
            "fraud_prob": fraud_probability,
            "trajectory": trajectory,
        })
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]

        return {
            "fraud_probability": round(fraud_probability, 4),
            "trajectory": trajectory,
            "intent_vector": {
                "coercion_probability": round(intent.coercion_probability, 4),
                "takeover_probability": round(intent.takeover_probability, 4),
                "anomaly_severity": round(intent.anomaly_severity, 4),
                "robotic_probability": round(intent.robotic_probability, 4),
            },
        }

    def _estimate_coercion(self, state: str, trust: float, velocity: float) -> float:
        """Coercion probability based on cognitive state + trust dynamics."""
        state_base = {
            "calm": 0.0,
            "focused": 0.02,
            "distressed": 0.40,
            "panicked": 0.70,
            "coerced": 0.92,
            "robotic": 0.10,
        }
        base = state_base.get(state, 0.0)

        # Velocity modifier — rapid decline amplifies coercion signal
        if velocity < -0.03:
            base = min(1.0, base + 0.12)
        elif velocity < -0.015:
            base = min(1.0, base + 0.06)

        # Low trust amplifies
        if trust < 0.40:
            base = min(1.0, base + 0.10)
        elif trust < 0.60:
            base = min(1.0, base + 0.05)

        return base

    def _estimate_takeover(self, similarity: float, drift: bool, severity: str, velocity: float) -> float:
        """Account takeover probability based on similarity deviation + drift."""
        # Base: proportional to deviation from identity
        base = max(0.0, min(1.0, (1.0 - similarity) * 1.8))

        # Drift amplifies
        severity_boost = {"none": 0.0, "low": 0.05, "medium": 0.15, "high": 0.30, "critical": 0.45}
        if drift:
            base = min(1.0, base + severity_boost.get(severity, 0.0))

        # Velocity modifier
        if velocity < -0.03:
            base = min(1.0, base + 0.10)
        elif velocity < -0.015:
            base = min(1.0, base + 0.05)

        return base

    def _estimate_robotic(self, state: str, entropy: float) -> float:
        """Bot/automation probability based on cognitive state + entropy."""
        if state == "robotic":
            return 0.95
        # Very low entropy = very predictable behavior = bot-like
        if entropy < 0.02:
            return 0.50
        if entropy < 0.05:
            return 0.25
        return 0.0

    def _estimate_anomaly_severity(self, anomaly_score: float, drift_severity: str) -> float:
        """Combined anomaly signal from isolation forest + drift."""
        severity_map = {"none": 0.0, "low": 0.15, "medium": 0.40, "high": 0.65, "critical": 0.85}
        drift_component = severity_map.get(drift_severity, 0.0)
        return max(anomaly_score, drift_component)

    def _classify_trajectory(self, trust: float, velocity: float) -> str:
        """Classify the overall trust trajectory."""
        if abs(velocity) < 0.005 and trust > 0.75:
            return "stable"
        elif velocity < -0.03:
            return "collapsing"
        elif velocity < -0.01:
            return "escalating"
        elif velocity > 0.01:
            return "recovering"
        return "stable"
