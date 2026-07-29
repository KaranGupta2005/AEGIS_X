"""
CUSUM (Cumulative Sum) Change-Point Detection for Behavioral Drift.

Standard CUSUM algorithm from quality control theory (Page, 1954):
    S(t) = max(0, S(t-1) + (deviation - allowance))
    Drift detected when S(t) > threshold

Parameters calibrated using standard approach:
    - expected_mean: center of normal distribution
    - allowance (k): half the shift you want to detect (k = delta/2)
    - threshold (h): controls ARL (Average Run Length) before false alarm
"""

import numpy as np
from typing import Dict, Optional
from enum import Enum


class DriftSeverity(Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CUSUMDetector:
    """
    One-sided upper CUSUM for detecting downward similarity drift.

    Tuned parameters (V2 — sensitive detection):
        expected_similarity = 0.88  (realistic center with diverse baselines)
        allowance = 0.02            (detect smaller deviations — 2%)
        drift_threshold = 0.08      (trigger faster — less cumulative needed)
        instant_jump_threshold = 0.07 (catch smaller sudden drops)

    Tuned for the V2 dataset which has wider normal distributions,
    meaning similarity scores naturally vary more. The lower thresholds
    ensure drift is caught sooner, especially during demo scenarios.
    """

    def __init__(
        self,
        expected_similarity: float = 0.88,
        allowance: float = 0.02,
        drift_threshold: float = 0.08,
        instant_jump_threshold: float = 0.07,
    ):
        self.expected_similarity = expected_similarity
        self.allowance = allowance
        self.drift_threshold = drift_threshold
        self.instant_jump_threshold = instant_jump_threshold

        self._cusum_pos: float = 0.0
        self._cusum_neg: float = 0.0
        self._previous_score: Optional[float] = None
        self._step_count: int = 0
        self._drift_detected: bool = False
        self._max_cusum: float = 0.0

    @property
    def cusum_value(self) -> float:
        return self._cusum_pos

    @property
    def is_drifting(self) -> bool:
        return self._drift_detected

    @property
    def steps_since_reset(self) -> int:
        return self._step_count

    def reset(self):
        self._cusum_pos = 0.0
        self._cusum_neg = 0.0
        self._previous_score = None
        self._step_count = 0
        self._drift_detected = False
        self._max_cusum = 0.0

    def update(self, similarity: float) -> Dict:
        self._step_count += 1

        # Deviation from expected
        deviation = self.expected_similarity - similarity

        # CUSUM update (only accumulate when deviation exceeds allowance)
        increment = max(0.0, deviation - self.allowance)
        self._cusum_pos = max(0.0, self._cusum_pos + increment)
        self._max_cusum = max(self._max_cusum, self._cusum_pos)

        # Threshold check
        cusum_triggered = self._cusum_pos > self.drift_threshold

        # Instant jump detection
        instant_jump = False
        if self._previous_score is not None:
            step_drop = self._previous_score - similarity
            if step_drop > self.instant_jump_threshold:
                instant_jump = True

        self._drift_detected = cusum_triggered or instant_jump
        severity = self._classify_severity(similarity, instant_jump)
        self._previous_score = similarity

        return {
            "drift_detected": self._drift_detected,
            "instant_jump": instant_jump,
            "cusum_value": round(self._cusum_pos, 6),
            "severity": severity.value,
            "deviation": round(deviation, 6),
            "step": self._step_count,
        }

    def _classify_severity(self, similarity: float, instant_jump: bool) -> DriftSeverity:
        if not self._drift_detected:
            return DriftSeverity.NONE

        if instant_jump or similarity < 0.50:
            return DriftSeverity.CRITICAL
        elif similarity < 0.62:
            return DriftSeverity.HIGH
        elif similarity < 0.75:
            return DriftSeverity.MEDIUM
        elif self._cusum_pos > self.drift_threshold:
            return DriftSeverity.LOW

        return DriftSeverity.NONE

    def get_state(self) -> Dict:
        return {
            "cusum_positive": round(self._cusum_pos, 6),
            "cusum_negative": round(self._cusum_neg, 6),
            "max_cusum_observed": round(self._max_cusum, 6),
            "drift_detected": self._drift_detected,
            "step_count": self._step_count,
            "previous_score": round(self._previous_score, 6) if self._previous_score else None,
            "config": {
                "expected_similarity": self.expected_similarity,
                "allowance": self.allowance,
                "drift_threshold": self.drift_threshold,
                "instant_jump_threshold": self.instant_jump_threshold,
            },
        }
