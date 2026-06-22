"""
Cognitive State Classification Service.

Uses a Random Forest classifier trained on behavioral features to predict
cognitive state: calm, focused, distressed, panicked, coerced, robotic.

Stability scores are standard normalized values that feed into T(t):
    calm = 1.0, focused = 0.85, distressed = 0.50, panicked = 0.30,
    coerced = 0.15, robotic = 0.05

These map to standard risk tiers used in behavioral biometrics:
    1.0 = no risk, 0.85 = minimal, 0.50 = moderate, 0.30 = high,
    0.15 = very high, 0.05 = critical
"""

import numpy as np
from pathlib import Path
from typing import Dict, List, Optional
from joblib import load


# Features used by the cognitive model (must match training order)
COGNITIVE_FEATURES = [
    "hesitation_ratio",
    "correction_rate",
    "typing_speed_cps",
    "typing_rhythm_variance",
    "touch_duration_mean",
    "gyroscope_variance",
    "interaction_intensity",
    "swipe_straightness",
]

# Stability scores — standard risk tier mapping
COGNITIVE_STABILITY_SCORES = {
    "calm": 1.00,
    "focused": 0.85,
    "distressed": 0.50,
    "panicked": 0.30,
    "coerced": 0.15,
    "robotic": 0.05,
}

# Alert messages for audit trail
COGNITIVE_ALERTS = {
    "calm": None,
    "focused": None,
    "distressed": "Elevated cognitive uncertainty. Monitoring for escalation.",
    "panicked": "Severe cognitive distress — potential social engineering.",
    "coerced": "HIGH ALERT: Behavioral signature consistent with external coercion.",
    "robotic": "CRITICAL: Automated/scripted behavior — possible remote access.",
}

# Severity ordering
STATE_SEVERITY_ORDER = {
    "calm": 0,
    "focused": 1,
    "distressed": 2,
    "panicked": 3,
    "coerced": 4,
    "robotic": 5,
}

MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "cognitive" / "cognitive_rf.pkl"


class CognitiveService:

    def __init__(self, model_path: Optional[Path] = None):
        path = model_path or MODEL_PATH
        if not path.exists():
            raise FileNotFoundError(
                f"Cognitive model not found at {path}. "
                f"Run 'python scripts/train_cognitive_model.py' first."
            )
        self._model = load(path)
        self._feature_names = COGNITIVE_FEATURES

    def predict_state(self, features: Dict[str, float]) -> str:
        vector = self._extract_feature_vector(features)
        prediction = self._model.predict([vector])[0]
        return str(prediction)

    def predict_probabilities(self, features: Dict[str, float]) -> Dict[str, float]:
        vector = self._extract_feature_vector(features)
        probas = self._model.predict_proba([vector])[0]
        classes = self._model.classes_
        return {str(cls): round(float(prob), 4) for cls, prob in zip(classes, probas)}

    def get_stability_score(self, state: str) -> float:
        return COGNITIVE_STABILITY_SCORES.get(state, 0.5)

    def get_alert(self, state: str) -> Optional[str]:
        return COGNITIVE_ALERTS.get(state)

    def assess(self, features: Dict[str, float]) -> Dict:
        """Full cognitive assessment — primary interface for the pipeline."""
        vector = self._extract_feature_vector(features)

        state = str(self._model.predict([vector])[0])
        probas = self._model.predict_proba([vector])[0]
        classes = self._model.classes_

        state_idx = list(classes).index(state)
        confidence = float(probas[state_idx])

        prob_dict = {str(cls): round(float(p), 4) for cls, p in zip(classes, probas)}
        stability_score = self.get_stability_score(state)
        alert = self.get_alert(state)
        severity = STATE_SEVERITY_ORDER.get(state, 0)

        return {
            "state": state,
            "stability_score": stability_score,
            "confidence": round(confidence, 4),
            "alert": alert,
            "severity": severity,
            "probabilities": prob_dict,
            "cognitive_component": round(0.20 * stability_score, 4),
        }

    def assess_trajectory(self, feature_sequence: List[Dict[str, float]]) -> Dict:
        states = []
        severities = []
        stability_scores = []

        for features in feature_sequence:
            state = self.predict_state(features)
            states.append(state)
            severities.append(STATE_SEVERITY_ORDER.get(state, 0))
            stability_scores.append(self.get_stability_score(state))

        escalating = False
        if len(severities) >= 3:
            recent = severities[-5:] if len(severities) >= 5 else severities
            diffs = [recent[i] - recent[i - 1] for i in range(1, len(recent))]
            escalating = sum(d > 0 for d in diffs) > sum(d <= 0 for d in diffs)

        transitions = sum(1 for i in range(1, len(states)) if states[i] != states[i - 1])

        return {
            "states": states,
            "current_state": states[-1] if states else "unknown",
            "escalating": escalating,
            "peak_severity": max(severities) if severities else 0,
            "mean_stability": round(float(np.mean(stability_scores)), 4) if stability_scores else 1.0,
            "state_transitions": transitions,
            "sequence_length": len(states),
        }

    def _extract_feature_vector(self, features: Dict[str, float]) -> np.ndarray:
        """Extract 8 cognitive features in correct order, with neutral defaults."""
        defaults = {
            "hesitation_ratio": 0.10,
            "correction_rate": 0.05,
            "typing_speed_cps": 3.5,
            "typing_rhythm_variance": 35.0,
            "touch_duration_mean": 120.0,
            "gyroscope_variance": 0.015,
            "interaction_intensity": 8.0,
            "swipe_straightness": 0.82,
        }

        vector = []
        for feat_name in self._feature_names:
            value = features.get(feat_name, defaults.get(feat_name, 0.0))
            vector.append(float(value))

        return np.array(vector, dtype=np.float64)
