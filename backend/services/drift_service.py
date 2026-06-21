"""
Detects behavioral drift using Cumulative Sum (CUSUM) change-point detection.

Pipeline position:
    Similarity Score → History Buffer → **CUSUM Detector** → Drift Alert

CUSUM Algorithm:
    S(t) = S(t-1) + (deviation - allowance)
    where deviation = expected_similarity - actual_similarity

    When S(t) exceeds the threshold → DRIFT DETECTED

    The 'allowance' parameter (k) prevents false alarms from normal variance.
    The 'threshold' parameter (h) controls sensitivity:
        Lower threshold = more sensitive (catches subtle drift earlier)
        Higher threshold = more robust (fewer false positives)
"""

import numpy as np
from typing import Dict, Optional, Tuple
from enum import Enum


class DriftSeverity(Enum):
    """Drift severity levels based on accumulated CUSUM and instant similarity."""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CUSUMDetector:
    """
    Cumulative Sum (CUSUM) change-point detector for behavioral drift.

    Maintains a cumulative sum of deviations from expected similarity.
    When small deviations accumulate consistently in one direction,
    CUSUM detects the trend long before individual scores would trigger alerts.

    Two detection modes:
    1. GRADUAL DRIFT: CUSUM accumulates over many steps (account takeover)
       - Attacker behavior slowly diverges from victim's baseline
       - Individual steps may look innocent, but the trend is clear
       - CUSUM catches it after ~5-10 steps of consistent decay

    2. SUDDEN JUMP: Instant similarity collapse (malware/screen mirroring)
       - Single step drops similarity from 0.95 → 0.40
       - Detected immediately by the instant_jump_threshold
       - No accumulation needed — it's catastrophic on its own

    Parameters tuned against Phase 1 synthetic data:
        - Normal user variance: similarity ∈ [0.95, 0.999] (σ ≈ 0.01)
        - Account takeover end-state: similarity ∈ [0.85, 0.90]
        - Malware instant state: similarity ∈ [0.80, 0.87]
    """

    def __init__(
        self,
        expected_similarity: float = 0.995,
        allowance: float = 0.01,
        drift_threshold: float = 0.15,
        instant_jump_threshold: float = 0.08,
    ):
        """
        Args:
            expected_similarity: The similarity score expected for a genuine user.
                                 Based on Phase 2B tests: normal sessions score ~0.998.
                                 We use 0.995 as our baseline expectation.
            allowance: Slack parameter (k). Deviations below this are ignored.
                      Prevents natural variance from accumulating false drift.
                      Set to match normal session variance (~0.01).
            drift_threshold: CUSUM threshold (h) for declaring drift.
                            When cumulative sum exceeds this → DRIFT DETECTED.
                            Calibrated so ~8 steps of consistent decay triggers alert.
            instant_jump_threshold: Single-step drop that immediately triggers alert.
                                   If similarity drops by more than this in one step → INSTANT ALERT.
                                   Catches malware injection without waiting for accumulation.
        """
        self.expected_similarity = expected_similarity
        self.allowance = allowance
        self.drift_threshold = drift_threshold
        self.instant_jump_threshold = instant_jump_threshold

        # Internal state
        self._cusum_pos: float = 0.0  # Detects downward drift (similarity decreasing)
        self._cusum_neg: float = 0.0  # Detects upward recovery (not used for alerts)
        self._previous_score: Optional[float] = None
        self._step_count: int = 0
        self._drift_detected: bool = False
        self._max_cusum: float = 0.0  # Track peak CUSUM for severity assessment

    @property
    def cusum_value(self) -> float:
        """Current cumulative sum (higher = more accumulated drift)."""
        return self._cusum_pos

    @property
    def is_drifting(self) -> bool:
        """Whether drift has been detected in this session."""
        return self._drift_detected

    @property
    def steps_since_reset(self) -> int:
        """Number of update steps since last reset."""
        return self._step_count

    def reset(self):
        """Reset CUSUM state (new session or after manual review)."""
        self._cusum_pos = 0.0
        self._cusum_neg = 0.0
        self._previous_score = None
        self._step_count = 0
        self._drift_detected = False
        self._max_cusum = 0.0

    def update(self, similarity: float) -> Dict:
        """
        Process a new similarity score and check for drift.

        This is called every 2 seconds (one SDK heartbeat) with the latest
        similarity score between current behavior and user baseline.

        Args:
            similarity: Cosine similarity from SimilarityService [0, 1].

        Returns:
            Dictionary with:
            - drift_detected: bool (has CUSUM threshold been exceeded?)
            - instant_jump: bool (did a single-step catastrophic drop occur?)
            - cusum_value: current accumulated drift signal
            - severity: DriftSeverity enum value
            - deviation: how far this score is from expected
            - step: current step number
        """
        self._step_count += 1

        # Compute deviation from expected behavior
        deviation = self.expected_similarity - similarity

        # ─── CUSUM UPDATE (one-sided, detecting downward drift) ────────────
        # Only accumulate positive deviations (similarity below expected)
        # Subtract allowance to ignore normal variance
        increment = max(0.0, deviation - self.allowance)
        self._cusum_pos = max(0.0, self._cusum_pos + increment)

        # Track peak for severity assessment
        self._max_cusum = max(self._max_cusum, self._cusum_pos)

        # ─── DRIFT THRESHOLD CHECK ────────────────────────────────────────
        cusum_triggered = self._cusum_pos > self.drift_threshold

        # ─── INSTANT JUMP DETECTION ───────────────────────────────────────
        instant_jump = False
        if self._previous_score is not None:
            step_drop = self._previous_score - similarity
            if step_drop > self.instant_jump_threshold:
                instant_jump = True

        # ─── AGGREGATE DRIFT DECISION ─────────────────────────────────────
        self._drift_detected = cusum_triggered or instant_jump

        # ─── SEVERITY CLASSIFICATION ──────────────────────────────────────
        severity = self._classify_severity(similarity, instant_jump)

        # Store for next step comparison
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
        """
        Classify drift severity based on CUSUM state and current similarity.

        Combines:
        - Accumulated CUSUM (how long has drift been happening?)
        - Current similarity (how bad is it RIGHT NOW?)
        - Instant jump flag (was there a catastrophic single-step drop?)
        """
        if not self._drift_detected and similarity > 0.85:
            return DriftSeverity.NONE

        if instant_jump:
            return DriftSeverity.CRITICAL

        if similarity < 0.50:
            return DriftSeverity.CRITICAL
        elif similarity < 0.60:
            return DriftSeverity.HIGH
        elif similarity < 0.75:
            return DriftSeverity.MEDIUM
        elif self._cusum_pos > self.drift_threshold * 0.7:
            return DriftSeverity.LOW

        return DriftSeverity.NONE

    def get_state(self) -> Dict:
        """
        Return full detector state for debugging/monitoring.
        """
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
