"""
Transforms raw SDK behavioral events into a normalized 16-dim feature vector.

Pipeline position:
    Raw SDK Event (JSON) → Feature Vector (16-dim) → Serializer → MiniLM → 384-dim

"""

import numpy as np
from typing import Dict, Optional


# Feature bounds for normalization and anomaly flagging
FEATURE_BOUNDS = {
    "typing_speed_cps": (0.5, 12.0),
    "typing_rhythm_variance": (0.1, 350.0),
    "typing_pressure_mean": (0.1, 1.0),
    "swipe_velocity_mean": (0.05, 3.5),
    "swipe_velocity_variance": (0.001, 1.0),
    "swipe_straightness": (0.2, 1.0),
    "touch_duration_mean": (20.0, 600.0),
    "touch_duration_variance": (1.0, 6000.0),
    "touch_area_mean": (0.1, 1.0),
    "hesitation_ratio": (0.0, 1.0),
    "hesitation_count": (0, 20),
    "correction_rate": (0.0, 1.0),
    "scroll_speed_mean": (0.0, 3.0),
    "gyroscope_variance": (0.0, 0.15),
    "session_time_elapsed": (0.0, 3600.0),
    "interaction_intensity": (0, 50),
}

# The 16 features in canonical order (maps to proposal's 16-dim vector)
FEATURE_ORDER = [
    "typing_speed_cps",
    "typing_rhythm_variance",
    "typing_pressure_mean",
    "swipe_velocity_mean",
    "swipe_velocity_variance",
    "swipe_straightness",
    "touch_duration_mean",
    "touch_duration_variance",
    "touch_area_mean",
    "hesitation_ratio",
    "hesitation_count",
    "correction_rate",
    "scroll_speed_mean",
    "gyroscope_variance",
    "session_time_elapsed",
    "interaction_intensity",
]


class FeatureEngineer:
    """
    Extracts and normalizes behavioral features from raw SDK telemetry events.

    Handles:
    - Missing field imputation (graceful degradation if SDK drops a signal)
    - Boundary clipping (reject physically impossible values)
    - Optional min-max normalization for model input
    - Feature vector construction in canonical order
    """

    def __init__(self, normalize: bool = False):
        """
        Args:
            normalize: If True, apply min-max normalization to [0, 1] range.
                       For serializer pipeline, keep False (raw values → text).
                       For direct model input, set True.
        """
        self.normalize = normalize
        self.feature_order = FEATURE_ORDER
        self.bounds = FEATURE_BOUNDS

    def extract(self, raw_event: Dict) -> Dict[str, float]:
        """
        Extract 16-dim feature vector from raw SDK event.

        Args:
            raw_event: Dictionary from WebSocket payload containing raw telemetry.

        Returns:
            Dictionary with all 16 features, clipped and optionally normalized.
        """
        features = {}

        for feature_name in self.feature_order:
            # Extract value, use None if missing
            value = raw_event.get(feature_name)

            if value is None:
                # Impute with midpoint of expected range
                lo, hi = self.bounds[feature_name]
                value = (lo + hi) / 2.0

            # Clip to physical bounds
            lo, hi = self.bounds[feature_name]
            value = max(lo, min(hi, float(value)))

            # Optional normalization
            if self.normalize and hi > lo:
                value = (value - lo) / (hi - lo)

            features[feature_name] = value

        return features

    def to_vector(self, raw_event: Dict) -> np.ndarray:
        """
        Extract features and return as numpy array in canonical order.

        Args:
            raw_event: Raw SDK telemetry dictionary.

        Returns:
            numpy array of shape (16,)
        """
        features = self.extract(raw_event)
        return np.array([features[f] for f in self.feature_order], dtype=np.float32)

    def validate_event(self, raw_event: Dict) -> Dict[str, any]:
        """
        Validate a raw event and report quality metrics.

        Returns:
            Dictionary with:
            - valid: bool
            - missing_fields: list of missing feature names
            - out_of_bounds: list of features with extreme values
            - completeness: float (0-1, fraction of fields present)
        """
        missing = []
        out_of_bounds = []

        for feature_name in self.feature_order:
            value = raw_event.get(feature_name)

            if value is None:
                missing.append(feature_name)
                continue

            lo, hi = self.bounds[feature_name]
            if float(value) < lo or float(value) > hi:
                out_of_bounds.append(feature_name)

        completeness = 1.0 - (len(missing) / len(self.feature_order))

        return {
            "valid": len(missing) == 0 and len(out_of_bounds) == 0,
            "missing_fields": missing,
            "out_of_bounds": out_of_bounds,
            "completeness": completeness,
        }
