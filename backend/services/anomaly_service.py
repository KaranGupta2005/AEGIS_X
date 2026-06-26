"""
Anomaly Detection using Isolation Forest.

Standard unsupervised anomaly detection:
- Contamination = 0.05 (5% expected anomaly rate — conservative)
- n_estimators = 100 (standard for Isolation Forest)
- Pre-seeded with synthetic normal behavior to eliminate cold-start vulnerability
- Returns normalized anomaly_score in [0, 1]

FIX #10: Cold-start eliminated by generating synthetic normal samples at init
when no persisted model exists. This ensures anomaly detection is ALWAYS active
from the first event, not just after 50 samples are collected.
"""

import numpy as np
from typing import Dict, Optional
from sklearn.ensemble import IsolationForest
from pathlib import Path
from joblib import dump, load


MODEL_DIR = Path(__file__).parent.parent.parent / "models" / "classifiers"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "isolation_forest.pkl"

# Feature bounds for synthetic normal data generation (matches feature_engineering.py)
_NORMAL_FEATURE_DISTRIBUTIONS = {
    # (mean, std) for normal user behavior — derived from training data ranges
    "typing_speed_cps": (3.5, 0.8),
    "typing_rhythm_variance": (40.0, 15.0),
    "typing_pressure_mean": (0.55, 0.12),
    "swipe_velocity_mean": (1.0, 0.3),
    "swipe_velocity_variance": (0.12, 0.05),
    "swipe_straightness": (0.85, 0.05),
    "touch_duration_mean": (120.0, 30.0),
    "touch_duration_variance": (400.0, 150.0),
    "touch_area_mean": (0.45, 0.1),
    "hesitation_ratio": (0.10, 0.05),
    "hesitation_count": (2.0, 1.5),
    "correction_rate": (0.06, 0.03),
    "scroll_speed_mean": (0.7, 0.3),
    "gyroscope_variance": (0.015, 0.008),
    "session_time_elapsed": (90.0, 60.0),
    "interaction_intensity": (8.0, 3.0),
}


def _generate_normal_seed_data(n_samples: int = 100) -> np.ndarray:
    """
    Generate synthetic normal behavioral data for cold-start seeding.

    Uses Gaussian distributions centered on typical normal-user values
    so the Isolation Forest has a baseline understanding of 'normal'
    from the very first event it scores.
    """
    rng = np.random.default_rng(seed=42)
    samples = np.zeros((n_samples, 16), dtype=np.float32)

    for i, (mean, std) in enumerate(_NORMAL_FEATURE_DISTRIBUTIONS.values()):
        samples[:, i] = rng.normal(loc=mean, scale=std, size=n_samples)
        # Clip to non-negative (all behavioral features are >= 0)
        samples[:, i] = np.maximum(samples[:, i], 0.0)

    return samples


class AnomalyService:

    def __init__(self):
        self._model: Optional[IsolationForest] = None
        self._sample_buffer: list = []
        self._min_samples = 50
        self._is_fitted = False

        # Try loading persisted model
        if MODEL_PATH.exists():
            try:
                self._model = load(MODEL_PATH)
                self._is_fitted = True
            except Exception:
                self._model = None
                self._is_fitted = False

        # FIX #10: If no persisted model, pre-seed with synthetic normal data
        # This ensures anomaly detection is active from the FIRST event
        if not self._is_fitted:
            self._cold_start_seed()

    def _cold_start_seed(self):
        """
        Eliminate cold-start vulnerability by fitting on synthetic normal data.
        The model will be refined as real samples arrive, but is NEVER blind.
        """
        seed_data = _generate_normal_seed_data(n_samples=100)
        self._model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )
        self._model.fit(seed_data)
        self._is_fitted = True
        self._sample_buffer = list(seed_data)
        try:
            dump(self._model, MODEL_PATH)
        except Exception:
            pass

    def feed_sample(self, feature_vector: np.ndarray):
        """Add a sample to the buffer. Auto-retrains after collecting enough real data."""
        self._sample_buffer.append(feature_vector.copy())

        # Retrain periodically as real data accumulates (every 100 new samples)
        real_sample_count = len(self._sample_buffer) - 100  # subtract seed data
        if real_sample_count > 0 and real_sample_count % 100 == 0:
            self._fit()

    def score_anomaly(self, feature_vector: np.ndarray) -> Dict:
        """Score a feature vector for anomaly. Always returns a valid score (no cold-start gap)."""
        if not self._is_fitted or self._model is None:
            return {"anomaly_score": 0.0, "is_anomaly": False, "confidence": 0.0}

        sample = feature_vector.reshape(1, -1)
        raw_score = self._model.decision_function(sample)[0]
        prediction = self._model.predict(sample)[0]

        # Normalize: raw_score is negative for anomalies, positive for normal
        # Map to [0, 1] where 1 = highly anomalous
        anomaly_score = max(0.0, min(1.0, -raw_score * 2.0))
        is_anomaly = bool(prediction == -1)

        return {
            "anomaly_score": round(float(anomaly_score), 4),
            "is_anomaly": is_anomaly,
            "raw_score": round(float(raw_score), 4),
            "confidence": round(min(1.0, len(self._sample_buffer) / 200.0), 2),
        }

    def _fit(self):
        """Fit the Isolation Forest on collected samples (seed + real)."""
        X = np.array(self._sample_buffer)
        self._model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )
        self._model.fit(X)
        self._is_fitted = True
        try:
            dump(self._model, MODEL_PATH)
        except Exception:
            pass

    def retrain(self, normal_samples: np.ndarray):
        """Retrain on provided samples."""
        self._model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )
        self._model.fit(normal_samples)
        self._is_fitted = True
        try:
            dump(self._model, MODEL_PATH)
        except Exception:
            pass

    @property
    def is_ready(self) -> bool:
        return self._is_fitted
